#!/usr/bin/env python3
"""Poll a Discord application channel and publish pseudonymized application statuses."""
import hashlib
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

API = "https://discord.com/api/v10"
TOKEN = os.environ["DISCORD_BOT_TOKEN"]
CHANNEL_ID = os.environ["APPLICATION_CHANNEL_ID"]
ADMIN_ID = os.environ["ADMIN_DISCORD_ID"]
STATE_PATH = Path("anarchy-test-state.json")
STATUS_PATH = Path("anarchy-test-status.json")
MARKER = "PRISTAL-ANARCHY-APP"
APPROVE = "✅"
REJECT = "❌"


def now():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default


def save_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def api(method, route, payload=None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        API + route,
        data=data,
        method=method,
        headers={
            "Authorization": "Bot " + TOKEN,
            "User-Agent": "PristalAnarchyApplications/1.0",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            raw = response.read()
            return json.loads(raw.decode("utf-8")) if raw else None
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        raise RuntimeError(f"Discord API {method} {route}: HTTP {exc.code}: {detail}") from exc


def status_key(user_id):
    return hashlib.sha256(str(user_id).encode("utf-8")).hexdigest()


def add_reaction(message_id, emoji):
    encoded = urllib.parse.quote(emoji, safe="")
    api("PUT", f"/channels/{CHANNEL_ID}/messages/{message_id}/reactions/{encoded}/@me")


def reaction_has_admin(message_id, emoji):
    encoded = urllib.parse.quote(emoji, safe="")
    users = api("GET", f"/channels/{CHANNEL_ID}/messages/{message_id}/reactions/{encoded}?type=0&limit=100") or []
    return any(str(user.get("id")) == str(ADMIN_ID) for user in users)


def send_dm(user_id, content):
    dm = api("POST", "/users/@me/channels", {"recipient_id": str(user_id)})
    api("POST", f"/channels/{dm['id']}/messages", {"content": content, "allowed_mentions": {"parse": []}})


def notify_admin(admin_dm_id, message):
    try:
        send_dm(ADMIN_ID, message)
    except Exception as exc:
        print(f"Could not DM administrator; fallback mention in application channel: {exc}")
        api("POST", f"/channels/{CHANNEL_ID}/messages", {
            "content": f"<@{ADMIN_ID}> Новая заявка на закрытое тестирование: {message}",
            "allowed_mentions": {"users": [str(ADMIN_ID)]},
        })


def main():
    state = read_json(STATE_PATH, {"applications": {}})
    public = read_json(STATUS_PATH, {"updated_at": None, "applications": {}})
    tracked = state.setdefault("applications", {})
    public_apps = public.setdefault("applications", {})

    channel = api("GET", f"/channels/{CHANNEL_ID}")
    guild_id = channel.get("guild_id")
    messages = api("GET", f"/channels/{CHANNEL_ID}/messages?limit=100") or []

    # New applicant posts are processed oldest-first to preserve the latest status.
    for message in reversed(messages):
        author = message.get("author") or {}
        content = message.get("content") or ""
        message_id = str(message.get("id", ""))
        if not message_id or author.get("bot") or MARKER not in content or message_id in tracked:
            continue

        user_id = str(author.get("id", ""))
        if not user_id.isdigit():
            continue
        key = status_key(user_id)

        # A newer submission supersedes an older still-pending application by this user.
        for old_id, old in tracked.items():
            if old.get("user_hash") == key and old.get("status") == "pending":
                old["status"] = "superseded"

        tracked[message_id] = {"user_hash": key, "status": "pending"}
        public_apps[key] = {"status": "pending", "updated_at": now()}
        add_reaction(message_id, APPROVE)
        add_reaction(message_id, REJECT)

        preview = content.replace(MARKER, "").strip()
        jump = f"https://discord.com/channels/{guild_id}/{CHANNEL_ID}/{message_id}" if guild_id else f"Channel {CHANNEL_ID}, message {message_id}"
        admin_text = (
            "Новая заявка на закрытое тестирование анархии Pristal\n"
            f"От: <@{user_id}>\n"
            f"{preview[:1200]}\n\n"
            f"Открыть заявку: {jump}\n"
            "Поставь реакцию на исходное сообщение: ✅ — одобрить, ❌ — отказать."
        )
        try:
            send_dm(ADMIN_ID, admin_text)
        except Exception as exc:
            print(f"Administrator DM failed: {exc}")
            api("POST", f"/channels/{CHANNEL_ID}/messages", {
                "content": f"<@{ADMIN_ID}> Новая заявка от <@{user_id}>. Реагируй на исходное сообщение: ✅ — одобрить, ❌ — отказать. {jump}",
                "allowed_mentions": {"users": [str(ADMIN_ID), user_id]},
            })
        print(f"Registered application {message_id} for pseudonymous user {key[:12]}")

    # Only the configured administrator's reaction can change a status.
    for message_id, record in list(tracked.items()):
        if record.get("status") != "pending":
            continue
        approved = reaction_has_admin(message_id, APPROVE)
        rejected = reaction_has_admin(message_id, REJECT)
        if approved == rejected:  # neither reaction, or both: leave for a deliberate single choice
            continue

        message = api("GET", f"/channels/{CHANNEL_ID}/messages/{message_id}")
        applicant_id = str((message.get("author") or {}).get("id", ""))
        if not applicant_id.isdigit():
            continue
        key = record["user_hash"]
        decision = "approved" if approved else "rejected"
        record["status"] = decision
        public_apps[key] = {"status": decision, "updated_at": now()}

        if decision == "approved":
            response = "Вам одобрено! Напишите с этим скриншотом или фото в дс Skrenh в личку."
        else:
            response = "Вам отказано в участии в закрытом тестировании Pristal."
        try:
            send_dm(applicant_id, response)
        except Exception as exc:
            print(f"Could not DM applicant {applicant_id}: {exc}")
        print(f"Application {message_id}: {decision}")

    public["updated_at"] = now()
    save_json(STATE_PATH, state)
    save_json(STATUS_PATH, public)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Application sync failed: {exc}", file=sys.stderr)
        raise

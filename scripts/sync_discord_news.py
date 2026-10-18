#!/usr/bin/env python3
"""Fetch recent messages from the configured Discord news channel for GitHub Pages."""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "discord-news.json"
CHANNEL_ID = os.environ.get("DISCORD_NEWS_CHANNEL_ID", "1486375854006206494")
TOKEN = os.environ.get("DISCORD_BOT_TOKEN", "").strip()
API = "https://discord.com/api/v10"


def write_json(data):
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def request_json(url):
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bot {TOKEN}",
        "User-Agent": "PristalNewsSync/1.0",
        "Accept": "application/json",
    })
    with urllib.request.urlopen(req, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def main():
    existing = None
    if OUTPUT.exists():
        try:
            existing = json.loads(OUTPUT.read_text(encoding="utf-8"))
        except Exception:
            existing = None

    if not TOKEN:
        write_json({
            "status": "not_configured",
            "channel_id": CHANNEL_ID,
            "guild_id": None,
            "messages": [],
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "message": "Discord feed не подключён: добавьте секрет DISCORD_BOT_TOKEN в Settings → Secrets and variables → Actions.",
        })
        print("DISCORD_BOT_TOKEN is not configured; wrote setup notice.")
        return 0

    try:
        channel = request_json(f"{API}/channels/{urllib.parse.quote(CHANNEL_ID)}")
        guild_id = channel.get("guild_id")
        messages = request_json(f"{API}/channels/{urllib.parse.quote(CHANNEL_ID)}/messages?limit=10")
        result = []
        for m in messages:
            author = m.get("author") or {}
            embeds = []
            for embed in m.get("embeds") or []:
                item = {}
                if embed.get("title"): item["title"] = embed["title"]
                if embed.get("description"): item["description"] = embed["description"]
                if embed.get("url", "").startswith(("https://", "http://")): item["url"] = embed["url"]
                if item: embeds.append(item)
            attachments = []
            for a in m.get("attachments") or []:
                url = a.get("url", "")
                if url.startswith(("https://", "http://")):
                    attachments.append({"filename": a.get("filename") or "Вложение", "url": url})
            message = {
                "id": m.get("id", ""),
                "author": author.get("global_name") or author.get("username") or "Pristal",
                "content": m.get("content", ""),
                "timestamp": m.get("timestamp", ""),
                "attachments": attachments,
                "embeds": embeds,
            }
            if guild_id and CHANNEL_ID and message["id"]:
                message["url"] = f"https://discord.com/channels/{guild_id}/{CHANNEL_ID}/{message['id']}"
            result.append(message)
        write_json({
            "status": "ready",
            "channel_id": CHANNEL_ID,
            "guild_id": guild_id,
            "channel_name": channel.get("name"),
            "messages": result,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        print(f"Synchronized {len(result)} Discord messages from channel {CHANNEL_ID}.")
        return 0
    except urllib.error.HTTPError as exc:
        detail = f"Discord API returned HTTP {exc.code}. Check bot token and channel permissions."
        print(detail, file=sys.stderr)
        if existing and existing.get("status") == "ready":
            print("Keeping previously generated news JSON.")
            return 0
        write_json({
            "status": "error",
            "channel_id": CHANNEL_ID,
            "guild_id": None,
            "messages": [],
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "message": detail,
        })
        return 0
    except Exception as exc:
        detail = f"Discord news sync failed: {type(exc).__name__}: {exc}"
        print(detail, file=sys.stderr)
        if existing and existing.get("status") == "ready":
            print("Keeping previously generated news JSON.")
            return 0
        write_json({
            "status": "error",
            "channel_id": CHANNEL_ID,
            "guild_id": None,
            "messages": [],
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "message": "Не удалось подключиться к Discord. Проверь токен бота и права канала.",
        })
        return 0

if __name__ == "__main__":
    raise SystemExit(main())

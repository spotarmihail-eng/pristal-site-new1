// Pristal API: профили, вход через Discord и привязка Minecraft-ника (Cloudflare Worker + D1)
const enc = new TextEncoder();
const hex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha = async (s) => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s))));
const now = () => Math.floor(Date.now() / 1000);
const AV = Array.from({ length: 16 }, (_, i) => 'a' + (i + 1));
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 31 символ, без похожих I L O 0 1
const NICK_MC = /^[A-Za-z0-9_]{3,16}$/;
const NICK_SITE = /^[\p{L}\p{N} _.\-]{2,24}$/u;
const CODE_RE = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const CODE_TTL = 300; // секунд

function newCode() {
  const out = [];
  while (out.length < 8) for (const x of crypto.getRandomValues(new Uint8Array(32))) if (x < 248 && out.length < 8) out.push(ALPHA[x % 31]);
  return out.slice(0, 4).join('') + '-' + out.slice(4).join('');
}
function safeEq(a, b) {
  a = enc.encode(a); b = enc.encode(b);
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}
const cleanName = (s) => { s = String(s || '').replace(/[^\p{L}\p{N} _.\-]/gu, '').trim().slice(0, 24); return s.length >= 2 ? s : 'Игрок'; };

async function sessionUser(req, env) {
  const h = req.headers.get('Authorization') || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!/^[a-f0-9]{64}$/.test(t)) return null;
  return env.DB.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await sha(t), now()).first();
}
async function profile(env, u) {
  const l = await env.DB.prepare('SELECT nick,linked_at FROM links WHERE user_id=?').bind(u.id).first();
  const p = await env.DB.prepare('SELECT nick,expires_at FROM pending WHERE user_id=? AND used=0 AND expires_at>?').bind(u.id, now()).first();
  return {
    id: u.id, discord: u.discord_name, discordAvatar: u.discord_avatar, nickname: u.nickname, avatar: u.avatar,
    minecraft: l ? { nick: l.nick, linkedAt: l.linked_at } : null,
    pending: p ? { nick: p.nick, expiresAt: p.expires_at } : null,
    linkMode: env.LINK_MODE === 'plugin' ? 'plugin' : 'simple',
  };
}

export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
      'Access-Control-Allow-Headers': 'Authorization,Content-Type,X-Plugin-Key',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      Vary: 'Origin',
    };
    const send = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const path = new URL(req.url).pathname, m = req.method;
    const body = async () => { try { return (await req.json()) || {}; } catch { return {}; } };
    try {
      // ---- Плагин Minecraft: подтверждение кода (только по секретному ключу) ----
      if (path === '/api/plugin/confirm' && m === 'POST') {
        if (!env.PLUGIN_KEY || !safeEq(req.headers.get('X-Plugin-Key') || '', env.PLUGIN_KEY)) return send({ error: 'forbidden' }, 403);
        const { code, nick, uuid } = await body();
        if (typeof code !== 'string' || !CODE_RE.test(code) || typeof nick !== 'string' || !NICK_MC.test(nick)) return send({ ok: false, message: 'Неверный формат кода или ника.' }, 400);
        const nl = nick.toLowerCase(), t = now();
        const f = await env.DB.prepare('SELECT COUNT(*) c FROM fails WHERE nick_lower=? AND ts>?').bind(nl, t - 600).first();
        if (f.c >= 8) return send({ ok: false, message: 'Слишком много неверных кодов. Подождите 10 минут.' }, 429);
        const ph = await sha(code);
        const p = await env.DB.prepare('SELECT user_id,nick FROM pending WHERE code_hash=? AND used=0 AND expires_at>?').bind(ph, t).first();
        if (!p) {
          await env.DB.batch([env.DB.prepare('DELETE FROM fails WHERE ts<?').bind(t - 3600), env.DB.prepare('INSERT INTO fails(nick_lower,ts) VALUES(?,?)').bind(nl, t)]);
          return send({ ok: false, message: 'Код неверный или истёк. Создайте новый на сайте.' });
        }
        if (p.nick.toLowerCase() !== nl) return send({ ok: false, message: 'Этот код создан для ника ' + p.nick + ', а вы зашли как ' + nick + '.' });
        // одноразовость: код «забирается» атомарно
        const claim = await env.DB.prepare('UPDATE pending SET used=1 WHERE code_hash=? AND used=0').bind(ph).run();
        if (claim.meta.changes !== 1) return send({ ok: false, message: 'Код уже использован.' });
        try {
          await env.DB.batch([
            env.DB.prepare('INSERT INTO links(user_id,nick,nick_lower,uuid,linked_at) VALUES(?,?,?,?,?)').bind(p.user_id, nick, nl, typeof uuid === 'string' ? uuid.slice(0, 36) : null, t),
            env.DB.prepare('DELETE FROM pending WHERE code_hash=?').bind(ph),
          ]);
        } catch (e) {
          await env.DB.prepare('DELETE FROM pending WHERE code_hash=?').bind(ph).run();
          return send({ ok: false, message: 'Этот ник уже привязан к другому аккаунту.' });
        }
        return send({ ok: true, message: 'Готово! Ник ' + nick + ' привязан к вашему профилю на сайте.' });
      }

      // ---- Вход через Discord: токен проверяется на стороне сервера ----
      if (path === '/api/auth/discord' && m === 'POST') {
        const { access_token } = await body();
        if (typeof access_token !== 'string' || access_token.length < 10 || access_token.length > 200) return send({ error: 'bad_token' }, 400);
        const r = await fetch('https://discord.com/api/v10/oauth2/@me', { headers: { Authorization: 'Bearer ' + access_token } });
        if (!r.ok) return send({ error: 'discord_rejected' }, 401);
        const d = await r.json();
        // токен должен быть выдан именно нашему приложению
        if (!d.application || d.application.id !== env.DISCORD_CLIENT_ID || !(d.scopes || []).includes('identify') || !d.user) return send({ error: 'wrong_app' }, 401);
        const du = d.user;
        await env.DB.prepare('INSERT INTO users(id,discord_name,nickname,discord_avatar,created_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET discord_name=excluded.discord_name,discord_avatar=excluded.discord_avatar')
          .bind(String(du.id), du.username, cleanName(du.global_name || du.username), du.avatar || null, now()).run();
        const tok = hex(crypto.getRandomValues(new Uint8Array(32)));
        await env.DB.batch([
          env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(now()),
          env.DB.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(await sha(tok), String(du.id), now() + 30 * 86400),
        ]);
        const u = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(String(du.id)).first();
        return send({ token: tok, profile: await profile(env, u) });
      }

      // ---- Дальше нужен вход ----
      const u = await sessionUser(req, env);
      if (!u) return send({ error: 'auth', message: 'Войдите через Discord.' }, 401);

      if (path === '/api/me' && m === 'GET') return send(await profile(env, u));

      if (path === '/api/auth/logout' && m === 'POST') {
        const t = (req.headers.get('Authorization') || '').slice(7);
        await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha(t)).run();
        return send({ ok: true });
      }

      if (path === '/api/profile' && m === 'PUT') {
        const { nickname, avatar } = await body();
        const nn = typeof nickname === 'string' ? nickname.trim() : '';
        if (!NICK_SITE.test(nn)) return send({ error: 'bad_nickname', message: 'Никнейм: 2–24 символа — буквы, цифры, пробел, _ . -' }, 400);
        if (avatar && !AV.includes(avatar)) return send({ error: 'bad_avatar', message: 'Такой аватарки нет.' }, 400);
        await env.DB.prepare('UPDATE users SET nickname=?,avatar=? WHERE id=?').bind(nn, avatar || null, u.id).run();
        return send(await profile(env, { ...u, nickname: nn, avatar: avatar || null }));
      }

      if (path === '/api/link/start' && m === 'POST') {
        const { nick } = await body();
        if (typeof nick !== 'string' || !NICK_MC.test(nick)) return send({ error: 'bad_nick', message: 'Ник: 3–16 символов — латиница, цифры и _' }, 400);
        if (await env.DB.prepare('SELECT 1 FROM links WHERE user_id=?').bind(u.id).first()) return send({ error: 'already_linked', message: 'Сначала отвяжите текущий ник.' }, 409);
        if (await env.DB.prepare('SELECT 1 FROM links WHERE nick_lower=?').bind(nick.toLowerCase()).first()) return send({ error: 'nick_taken', message: 'Этот ник уже привязан к другому аккаунту.' }, 409);
        const recent = await env.DB.prepare('SELECT created_at FROM pending WHERE user_id=?').bind(u.id).first();
        if (recent && now() - recent.created_at < 10) return send({ error: 'slow_down', message: 'Подождите несколько секунд и повторите.' }, 429);
        const code = newCode(), exp = now() + CODE_TTL;
        await env.DB.batch([
          env.DB.prepare('DELETE FROM pending WHERE expires_at<? OR user_id=?').bind(now(), u.id),
          env.DB.prepare('INSERT INTO pending(code_hash,user_id,nick,created_at,expires_at,used) VALUES(?,?,?,?,?,0)').bind(await sha(code), u.id, nick, now(), exp),
        ]);
        return send({ code, nick, expiresAt: exp, command: '/link ' + code });
      }

      // Простой режим (по умолчанию): ник привязывается сразу, без подтверждения игровым сервером.
      if (path === '/api/link/direct' && m === 'POST') {
        if (env.LINK_MODE === 'plugin') return send({ error: 'plugin_mode', message: 'Привязка подтверждается только через игровой сервер.' }, 403);
        const { nick } = await body();
        if (typeof nick !== 'string' || !NICK_MC.test(nick)) return send({ error: 'bad_nick', message: 'Ник: 3–16 символов — латиница, цифры и _' }, 400);
        if (await env.DB.prepare('SELECT 1 FROM links WHERE user_id=?').bind(u.id).first()) return send({ error: 'already_linked', message: 'Сначала отвяжите текущий ник.' }, 409);
        try {
          await env.DB.prepare('INSERT INTO links(user_id,nick,nick_lower,uuid,linked_at) VALUES(?,?,?,?,?)').bind(u.id, nick, nick.toLowerCase(), null, now()).run();
        } catch (e) {
          return send({ error: 'nick_taken', message: 'Этот ник уже привязан к другому аккаунту.' }, 409);
        }
        return send(await profile(env, u));
      }

      if (path === '/api/link/cancel' && m === 'POST') {
        await env.DB.prepare('DELETE FROM pending WHERE user_id=?').bind(u.id).run();
        return send({ ok: true });
      }

      if (path === '/api/link' && m === 'DELETE') {
        const { confirm } = await body();
        if (confirm !== true) return send({ error: 'confirm', message: 'Нужно подтверждение.' }, 400);
        await env.DB.prepare('DELETE FROM links WHERE user_id=?').bind(u.id).run();
        return send({ ok: true });
      }

      return send({ error: 'not_found' }, 404);
    } catch (e) {
      console.error(e);
      return send({ error: 'server', message: 'Ошибка сервера.' }, 500);
    }
  },
};

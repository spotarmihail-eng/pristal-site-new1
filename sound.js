/* Pristal: звуки кнопок и музыка. Всё синтезируется в браузере (Web Audio) — аудиофайлов нет, авторских прав на чужую музыку нет. */
(() => {
  'use strict';
  const KEY = 'pristalAudio';
  const lsj = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const cfg = Object.assign({ music: true, sfx: true, vol: 0.5 }, lsj(KEY, {}));
  const saveCfg = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} };
  const MUSIC_GAIN = 1.6, SFX_GAIN = 2.2;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const CT = { M: [0, 4, 7], m: [0, 3, 7], M7: [0, 4, 7, 11], m7: [0, 3, 7, 10], s2: [0, 2, 7] };
  const detect = () => ({ about: 'story', participants: 'people', profile: 'profile' }[location.pathname.split('/').pop().replace('.html', '')] || 'home');

  // ---------------- музыкальные сцены ----------------
  // p — шаблон из 16 шестнадцатых: цифра = номер тона аккорда (>= длины аккорда — октавой выше), 0/5/o в басу = основной/квинта/октава, x = удар
  const SC = {
    home: { name: 'Приключение', bpm: 118, root: 60, delay: 0.22, prog: [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']],
      pad: { w: 'triangle', v: 0.022, a: 0.3, r: 0.8, lp: 1800 },
      arp: { w: 'square', v: 0.03, p: '0.1.2.3.4.3.2.1.', len: 1.3, oct: 0 },
      bass: { w: 'triangle', v: 0.09, p: '0.0.0.5.0.0.0.5.', len: 1.6 },
      lead: { w: 'square', v: 0.026, p: '..x...x...x...xx', pr: 0.6, oct: 12, sc: [0, 2, 4, 7, 9, 12], len: 2.2 },
      kick: 'x...x...x...x...', hat: '..x...x...x...x.', snare: '....x.......x...', kv: 0.28, hv: 0.02, sv: 0.04 },
    story: { name: 'Воспоминания', bpm: 72, root: 62, delay: 0.42, prog: [[0, 'M7'], [9, 'm7'], [5, 'M7'], [7, 'M']],
      pad: { w: 'sine', v: 0.034, a: 0.9, r: 1.6, lp: 1400 },
      arp: { w: 'triangle', v: 0.05, p: '0.1.2.1.0.1.2.3.', len: 2.6, oct: 12 },
      bass: { w: 'sine', v: 0.12, p: '0.......5.......', len: 7 } },
    hard: { name: 'Пять жизней', bpm: 90, root: 57, delay: 0.38, prog: [[0, 'm'], [8, 'M'], [3, 'M'], [7, 'M']],
      pad: { w: 'sawtooth', v: 0.016, a: 1.2, r: 1.6, lp: 520 },
      bass: { w: 'sine', v: 0.15, p: '0.......0.......', len: 5 },
      lead: { w: 'triangle', v: 0.04, p: '......x.......x.', pr: 0.75, oct: 24, sc: [0, 3, 7, 12], len: 3.5 },
      kick: 'x.x.......x.x...', kv: 0.4 },
    people: { name: 'Тёплая компания', bpm: 104, root: 55, delay: 0.2, prog: [[0, 'M'], [9, 'm'], [5, 'M'], [7, 'M']],
      pad: { w: 'triangle', v: 0.02, a: 0.3, r: 0.7, lp: 1600 },
      arp: { w: 'triangle', v: 0.06, p: '0.12.1.02.12.1.0', len: 1.4, oct: 12 },
      bass: { w: 'triangle', v: 0.1, p: '0..0..5.0..0..5.', len: 2 },
      kick: 'x...x...x...x...', hat: '..x...x...x...x.', snare: '....x.......x...', kv: 0.22, hv: 0.018, sv: 0.03 },
    profile: { name: 'Лоу-фай', bpm: 78, root: 53, delay: 0.3, swing: 0.1, prog: [[0, 'M7'], [11, 'm7'], [9, 'm7'], [7, 'M7']],
      pad: { w: 'triangle', v: 0.028, a: 0.5, r: 1.1, lp: 1200 },
      arp: { w: 'sine', v: 0.06, p: '0..1..2..1..0...', len: 2.2, oct: 12 },
      bass: { w: 'sine', v: 0.13, p: '0.....0...5.....', len: 3 },
      kick: 'x.....x...x.....', hat: '..x.x.x...x.x.x.', snare: '....x.......x...', kv: 0.26, hv: 0.014, sv: 0.03 },
    sparkle: { name: 'Достижения', bpm: 124, root: 60, delay: 0.3, prog: [[0, 'M'], [9, 'm'], [5, 'M'], [7, 'M']],
      pad: { w: 'triangle', v: 0.02, a: 0.2, r: 0.6, lp: 2400 },
      arp: { w: 'sine', v: 0.05, p: '0.1.2.3.4.3.2.1.', len: 1.6, oct: 24 },
      bass: { w: 'triangle', v: 0.09, p: '0.0.0.0.5.5.5.5.', len: 1.6 },
      lead: { w: 'triangle', v: 0.035, p: 'x...x...x..x..x.', pr: 0.55, oct: 24, sc: [0, 2, 4, 7, 9], len: 2.4 },
      kick: 'x...x...x...x...', hat: 'x.x.x.x.x.x.x.x.', kv: 0.2, hv: 0.012 },
    dream: { name: 'Мечта', bpm: 66, root: 65, delay: 0.55, prog: [[0, 'M7'], [2, 'M'], [4, 'm7'], [7, 'M']],
      pad: { w: 'sine', v: 0.04, a: 1.2, r: 2, lp: 1500 },
      arp: { w: 'triangle', v: 0.04, p: '0.....1.....2...', len: 3.5, oct: 12 } },
    block: { name: 'Блоки', bpm: 60, root: 60, delay: 0.5, prog: [[0, 'M7'], [9, 'm7'], [5, 'M7'], [7, 's2']],
      pad: { w: 'sine', v: 0.03, a: 1, r: 1.8, lp: 1000 },
      lead: { w: 'triangle', v: 0.07, p: 'x.x.x.x.x.x.x.x.', pr: 0.28, oct: 12, sc: [0, 2, 4, 7, 9, 12], len: 5 } },
  };
  const ORDER = Object.keys(SC);

  let ctx = null, master = null, musBus = null, sfxBus = null, FX = null, NB = null, want = detect();
  const M = { name: null, i: 0, next: 0, gain: null, timer: null };

  // ---------------- движок ----------------
  const setVol = () => { if (master) master.gain.value = Math.pow(cfg.vol, 2) * 0.9; };
  function build() {
    master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    musBus = ctx.createGain(); musBus.gain.value = MUSIC_GAIN;
    const dl = ctx.createDelay(2), fb = ctx.createGain(), wet = ctx.createGain();
    dl.delayTime.value = 0.4; fb.gain.value = 0.38; wet.gain.value = 0;
    musBus.connect(master); musBus.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = SFX_GAIN; sfxBus.connect(master);
    FX = { dl, wet }; NB = null; setVol();
  }
  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); build(); } catch (e) { ctx = null; }
    return ctx;
  }
  const getNB = () => { if (!NB) { NB = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = NB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return NB; };

  function tone(t, f, dur, o) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine'; osc.frequency.value = f;
    let n = osc;
    if (o.lp) { const b = ctx.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = o.lp; osc.connect(b); n = b; }
    n.connect(g); g.connect(o.dest);
    const a = Math.min(o.a || 0.01, dur), end = t + dur + (o.r || 0.1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.vol, t + a);
    g.gain.setValueAtTime(o.vol, t + Math.max(a, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.start(t); osc.stop(end + 0.05);
  }
  function noise(t, d, o) {
    const s = ctx.createBufferSource(); s.buffer = getNB(); s.loop = true;
    let n = s;
    if (o.hp) { const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = o.hp; n.connect(f); n = f; }
    if (o.bp) { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(o.bp[0], t); f.frequency.exponentialRampToValueAtTime(o.bp[1], t + d); n.connect(f); n = f; }
    const g = ctx.createGain(); g.gain.setValueAtTime(o.vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    n.connect(g); g.connect(o.dest); s.start(t); s.stop(t + d + 0.05);
  }
  function kick(t, v, dest) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.14);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.3);
  }
  function sweep(t, f1, f2, d, type, v) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type;
    o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + d + 0.05);
  }
  const stepDur = (sc, i) => 60 / sc.bpm / 4 * (sc.swing ? (i % 2 ? 1 - sc.swing : 1 + sc.swing) : 1);

  function stepScene(sc, i, t, dest) {
    const s = i % 16, bar = Math.floor(i / 16), ch = sc.prog[bar % sc.prog.length], sp = 60 / sc.bpm / 4;
    const tones = CT[ch[1]].map((x) => sc.root + ch[0] + x);
    if (sc.pad && s === 0) for (const n of tones) tone(t, mtof(n), sp * 15, { type: sc.pad.w, vol: sc.pad.v, a: sc.pad.a, r: sc.pad.r, lp: sc.pad.lp, dest });
    if (sc.arp && sc.arp.p[s] !== '.') {
      const k = +sc.arp.p[s];
      tone(t, mtof(tones[k % tones.length] + 12 * Math.floor(k / tones.length) + (sc.arp.oct || 0)), sp * (sc.arp.len || 1.5), { type: sc.arp.w, vol: sc.arp.v, a: 0.006, r: 0.14, dest });
    }
    if (sc.bass && sc.bass.p[s] !== '.') {
      const c = sc.bass.p[s];
      tone(t, mtof(sc.root + ch[0] - 12 + (c === '5' ? 7 : c === 'o' ? 12 : 0)), sp * (sc.bass.len || 2), { type: sc.bass.w, vol: sc.bass.v, a: 0.012, r: 0.16, dest });
    }
    if (sc.lead && sc.lead.p[s] === 'x' && Math.random() < sc.lead.pr) {
      const n = sc.root + sc.lead.oct + sc.lead.sc[Math.floor(Math.random() * sc.lead.sc.length)];
      tone(t, mtof(n), sp * (sc.lead.len || 2), { type: sc.lead.w, vol: sc.lead.v, a: 0.01, r: 0.3, dest });
    }
    if (sc.kick && sc.kick[s] === 'x') kick(t, sc.kv || 0.25, dest);
    if (sc.snare && sc.snare[s] === 'x') noise(t, 0.13, { vol: sc.sv || 0.04, hp: 1600, dest });
    if (sc.hat && sc.hat[s] === 'x') noise(t, 0.045, { vol: sc.hv || 0.015, hp: 7000, dest });
  }

  function label() { const el = document.getElementById('snd-now'); if (el) el.textContent = '♪ ' + (SC[want] ? SC[want].name : ''); }
  function tick() { if (!ctx || !M.name) return; const sc = SC[M.name]; while (M.next < ctx.currentTime + 0.3) { stepScene(sc, M.i, M.next, M.gain); M.next += stepDur(sc, M.i); M.i++; } }
  function startScene(name) {
    if (!ctx || !cfg.music || !SC[name]) return;
    const sc = SC[name], t = ctx.currentTime, old = M.gain;
    if (old) { old.gain.cancelScheduledValues(t); old.gain.setValueAtTime(old.gain.value, t); old.gain.linearRampToValueAtTime(0, t + 1); setTimeout(() => { try { old.disconnect(); } catch (e) {} }, 1500); }
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 1.2); g.connect(musBus);
    M.gain = g; M.name = name; M.i = 0; M.next = t + 0.08;
    FX.dl.delayTime.setTargetAtTime(60 / sc.bpm * 0.75, t, 0.1); FX.wet.gain.setTargetAtTime(sc.delay || 0, t, 0.3);
    if (!M.timer) M.timer = setInterval(tick, 60);
    label();
  }
  function stopMusic() {
    if (M.timer) { clearInterval(M.timer); M.timer = null; }
    if (M.gain && ctx) { const g = M.gain, t = ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + 0.5); setTimeout(() => { try { g.disconnect(); } catch (e) {} }, 700); }
    M.gain = null; M.name = null;
  }
  function scene(name) { if (!SC[name]) return; want = name; label(); if (ctx && cfg.music && M.name !== name) startScene(name); }
  function unlock() {
    const c = ensure(); if (!c) return;
    if (c.state === 'suspended') c.resume();
    if (cfg.music && !M.name) startScene(want);
  }

  // ---------------- звуки кнопок ----------------
  const bl = (t, fs, d, type, v) => fs.forEach((f, k) => tone(t + k * d, f, d, { type, vol: v, a: 0.003, r: 0.06, dest: sfxBus }));
  const SFX = {
    click: (t) => bl(t, [740], 0.045, 'square', 0.05),
    confirm: (t) => bl(t, [587, 880], 0.07, 'triangle', 0.09),
    tab: (t) => bl(t, [494, 622], 0.055, 'triangle', 0.08),
    pick: (t) => bl(t, [880], 0.07, 'sine', 0.1),
    on: (t) => bl(t, [587, 880], 0.055, 'sine', 0.1),
    off: (t) => bl(t, [880, 587], 0.055, 'sine', 0.09),
    nav: (t) => noise(t, 0.2, { vol: 0.08, bp: [500, 2600], dest: sfxBus }),
    warn: (t) => sweep(t, 260, 110, 0.18, 'sawtooth', 0.06),
    locked: (t) => bl(t, [160, 150], 0.08, 'square', 0.045),
    sparkle: (t) => bl(t, [1047, 1319, 1568, 2093], 0.055, 'triangle', 0.07),
    copy: (t) => bl(t, [1175, 1568], 0.045, 'triangle', 0.08),
    rise: (t) => sweep(t, 260, 1400, 0.55, 'sine', 0.09),
    death: (t) => { sweep(t, 420, 55, 0.6, 'sawtooth', 0.08); kick(t, 0.35, sfxBus); },
    fanfare: (t) => { [523, 659, 784, 1047].forEach((f, k) => tone(t + k * 0.09, f, 0.22, { type: 'triangle', vol: 0.1, a: 0.005, r: 0.25, dest: sfxBus })); bl(t + 0.4, [1568], 0.3, 'sine', 0.07); },
  };
  function play(name) {
    if (!cfg.sfx || !SFX[name]) return;
    const c = ensure(); if (!c) return;
    try { SFX[name](c.currentTime + 0.005); } catch (e) {}
  }
  const SEL = 'button,a[href],[role="button"],.tab,.chip,.want,.check,.node,.cv,.badge,summary';
  function kindOf(el) {
    if (el.dataset && el.dataset.sfx) return el.dataset.sfx;
    if (el.id === 'dieBtn') return 'death';
    if (el.id === 'peakBtn') return 'rise';
    if (el.matches('[data-ip]') || /копир/i.test(el.textContent || '')) return 'copy';
    if (el.matches('.danger')) return 'warn';
    if (el.matches('.badge')) return el.classList.contains('on') ? 'sparkle' : 'locked';
    if (el.matches('.want,.check,.pcard,.step')) return 'toggle';
    if (el.matches('.tab,.pt,.chip,.node,.media-tab,.theme-item')) return 'tab';
    if (el.matches('.cv,.gal button,.shot,.hero-img,.big-av')) return 'pick';
    if (el.matches('.primary,.discord-login')) return 'confirm';
    if (el.tagName === 'A') return 'nav';
    return 'click';
  }
  document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest(SEL + ',.pcard,.step,.theme-item,.pt,.big-av');
    if (!el || el.closest('[data-nosound]')) return;
    unlock();
    const k = kindOf(el);
    if (k === 'toggle') setTimeout(() => play(/\b(on|fav|done)\b/.test(el.className) ? 'on' : 'off'), 0);
    else play(k);
  }, true);
  ['pointerdown', 'keydown', 'touchend'].forEach((ev) => addEventListener(ev, () => { if (!ctx || ctx.state !== 'running' || (cfg.music && !M.name)) unlock(); }, { passive: true, capture: true }));
  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (cfg.music || cfg.sfx) ctx.resume(); });

  // ---------------- панель управления ----------------
  function ui() {
    if (document.getElementById('snd-ui')) return;
    const st = document.createElement('style');
    st.textContent = '#snd-ui{position:fixed;left:14px;bottom:14px;z-index:90;font:600 14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;color:#fff}'
      + '#snd-btn{width:46px;height:46px;border-radius:50%;border:1px solid color-mix(in srgb,var(--accent,#a855f7) 55%,transparent);background:rgba(13,18,25,.92);color:#fff;font-size:20px;cursor:pointer;backdrop-filter:blur(8px);box-shadow:0 8px 24px #0008;padding:0}'
      + '#snd-panel{position:absolute;left:0;bottom:56px;width:236px;padding:14px;border-radius:16px;background:rgba(13,18,25,.97);border:1px solid #ffffff1f;box-shadow:0 18px 50px #000a;display:grid;gap:10px}'
      + '#snd-panel[hidden]{display:none}#snd-panel label{display:flex;align-items:center;justify-content:space-between;gap:10px}'
      + '#snd-panel input[type=checkbox]{accent-color:var(--accent,#a855f7);width:18px;height:18px}#snd-panel input[type=range]{width:100%;accent-color:var(--accent,#a855f7)}'
      + '#snd-now{color:#aeb7c3;font-size:13px}#snd-next{border:1px solid #ffffff1f;background:#111721;color:#fff;border-radius:10px;padding:8px;cursor:pointer;font:inherit}';
    document.head.append(st);
    const box = document.createElement('div'); box.id = 'snd-ui';
    box.innerHTML = '<button id="snd-btn" type="button" data-sfx="click" aria-label="Звук и музыка" aria-expanded="false" title="Звук и музыка">🔊</button>'
      + '<div id="snd-panel" hidden><label>Музыка <input type="checkbox" id="snd-music"></label><label>Звуки кнопок <input type="checkbox" id="snd-sfx"></label>'
      + '<label>Громкость <input type="range" id="snd-vol" min="0" max="100" aria-label="Громкость"></label><div id="snd-now"></div><button type="button" id="snd-next" data-sfx="tab">🎲 Другая мелодия</button></div>';
    document.body.append(box);
    const $ = (id) => document.getElementById(id), btn = $('snd-btn'), panel = $('snd-panel');
    const icon = () => { btn.textContent = cfg.music || cfg.sfx ? '🔊' : '🔇'; };
    $('snd-music').checked = cfg.music; $('snd-sfx').checked = cfg.sfx; $('snd-vol').value = Math.round(cfg.vol * 100); icon(); label();
    btn.addEventListener('click', () => { panel.hidden = !panel.hidden; btn.setAttribute('aria-expanded', String(!panel.hidden)); });
    document.addEventListener('click', (e) => { if (!panel.hidden && !box.contains(e.target)) { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
    $('snd-music').addEventListener('change', (e) => { cfg.music = e.target.checked; saveCfg(); icon(); if (cfg.music) { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); startScene(want); } else stopMusic(); });
    $('snd-sfx').addEventListener('change', (e) => { cfg.sfx = e.target.checked; saveCfg(); icon(); if (cfg.sfx) play('on'); });
    $('snd-vol').addEventListener('input', (e) => { cfg.vol = e.target.value / 100; saveCfg(); setVol(); });
    $('snd-next').addEventListener('click', () => { ensure(); scene(ORDER[(ORDER.indexOf(want) + 1) % ORDER.length]); if (!cfg.music) { $('snd-music').checked = cfg.music = true; saveCfg(); icon(); startScene(want); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ui); else ui();

  // автоматическая проверка громкости (OfflineAudioContext, звук не воспроизводится)
  async function _test(kind, name, sec) {
    const OA = window.OfflineAudioContext || window.webkitOfflineAudioContext, off = new OA(1, 44100 * sec, 44100);
    const keep = [ctx, master, musBus, sfxBus, FX, NB];
    ctx = off; build();
    if (kind === 'music') {
      const sc = SC[name], g = ctx.createGain(); g.connect(musBus);
      FX.dl.delayTime.value = 60 / sc.bpm * 0.75; FX.wet.gain.value = sc.delay || 0;
      let i = 0, t = 0; while (t < sec) { stepScene(sc, i, t, g); t += stepDur(sc, i); i++; }
    } else SFX[name](0.01);
    const d = (await off.startRendering()).getChannelData(0); let pk = 0, sum = 0;
    for (let k = 0; k < d.length; k++) { const a = Math.abs(d[k]); if (a > pk) pk = a; sum += d[k] * d[k]; }
    [ctx, master, musBus, sfxBus, FX, NB] = keep;
    return { name, peak: +pk.toFixed(3), rms: +Math.sqrt(sum / d.length).toFixed(4) };
  }
  window.pristalSound = { scene, play, unlock, scenes: ORDER, _test };
})();

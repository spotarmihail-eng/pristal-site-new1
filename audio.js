/* Pristal Audio — звуки кнопок и фоновая музыка.
   Всё синтезируется в браузере через Web Audio: без аудиофайлов, без авторских прав, почти ничего не весит.
   Музыка стартует после первого клика/нажатия клавиши (так требуют браузеры). Настройки хранятся в localStorage. */
(() => {
'use strict';
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// ---------- композиции: у каждой страницы / вкладки своё настроение ----------
// риф ковбелла для фонка: 4 такта по 16 шагов (16-е доли), с небольшими вариациями
const PHONK_RIFF = (() => {
  const A = [69, null, null, 69, null, null, 72, null, 69, null, 67, null, 64, null, null, null];
  const B = [69, null, null, 69, null, null, 72, null, 69, null, 67, null, 72, null, 74, null];
  const C = [69, null, null, 69, null, null, 72, null, 76, null, 74, null, 72, null, 67, null];
  return [...A, ...A, ...B, ...C];
})();

const TRACKS = {
  home:   { name: 'Приключение', bpm: 84, root: 60, seed: 11, scale: [0, 2, 4, 7, 9],
    prog: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]],
    L: { pad: { vol: .05, cut: 1400 }, arp: { inst: 'pluck', vol: .075, pat: [0, 1, 2, 1, 2, 1, 0, 1] }, bass: { vol: .13, steps: [0, 4] }, mel: { inst: 'bell', vol: .06, density: .4, oct: 12 } } },
  about1: { name: 'Сказка о возрождении', bpm: 66, root: 65, seed: 23, scale: [0, 2, 4, 6, 7, 9, 11],
    prog: [[0, 4, 7, 11], [4, 7, 11, 14], [5, 9, 12, 16], [7, 11, 14, 17]],
    L: { pad: { vol: .055, cut: 1100 }, arp: { inst: 'music', vol: .06, pat: [0, 2, 1, 3, 2, 1, 3, 2] }, bass: { vol: .1, steps: [0] }, mel: { inst: 'music', vol: .055, density: .35, oct: 12 } } },
  about2: { name: 'Пять жизней', bpm: 60, root: 62, seed: 37, scale: [0, 2, 3, 5, 7, 8, 10],
    prog: [[0, 3, 7], [-4, 0, 3], [-7, -4, 0], [-5, -1, 2]],
    L: { pad: { vol: .08, cut: 650, wave: 'sawtooth' }, bass: { vol: .12, steps: [0] }, beat: { type: 'heart', vol: .24 }, mel: { inst: 'bell', vol: .045, density: .18, oct: 12 } } },
  players:{ name: 'Друзья на сервере', bpm: 96, root: 67, seed: 41, scale: [0, 2, 4, 7, 9],
    prog: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]],
    L: { pad: { vol: .03, cut: 1800 }, arp: { inst: 'pluck', vol: .075, pat: [0, 2, 1, 2, 0, 2, 1, 2] }, bass: { vol: .12, steps: [0, 4] }, beat: { type: 'hat', vol: .05 }, mel: { inst: 'pluck', vol: .065, density: .45, oct: 12 } } },
  donate: { name: 'Магазин', bpm: 100, root: 65, seed: 97, scale: [0, 2, 4, 7, 9],
    prog: [[0, 4, 7], [-5, -1, 2], [-3, 0, 4], [-7, -3, 0]],
    L: { pad: { vol: .035, cut: 1700 }, arp: { inst: 'pluck', vol: .07, pat: [0, 2, 1, 2, 0, 2, 1, 2] }, bass: { vol: .12, steps: [0, 4] }, beat: { type: 'hat', vol: .045 }, mel: { inst: 'bell', vol: .065, density: .5, oct: 12 } } },
  profile:{ name: 'Лоу-фай профиль', bpm: 78, root: 57, seed: 53, scale: [0, 3, 5, 7, 10],
    prog: [[0, 3, 7, 10], [-4, 0, 3, 7], [3, 7, 10, 14], [-2, 2, 5, 9]],
    L: { pad: { vol: .05, cut: 900 }, arp: { inst: 'epiano', vol: .08, pat: [0, null, 2, null, 1, null, 3, 2] }, bass: { vol: .12, steps: [0, 4] }, beat: { type: 'hat', vol: .03 }, mel: { inst: 'epiano', vol: .06, density: .22, oct: 12 } } },
  profile_mc:{ name: 'Блоки (8-бит)', bpm: 112, root: 64, seed: 61, scale: [0, 3, 5, 7, 10],
    prog: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]],
    L: { arp: { inst: 'chip', vol: .05, pat: [0, 1, 2, 1, 2, 1, 0, 1] }, bass: { vol: .14, steps: [0, 2, 4, 6] }, beat: { type: 'hat', vol: .035 }, mel: { inst: 'chip', vol: .045, density: .4, oct: 12 } } },
  profile_badges:{ name: 'Триумф', bpm: 100, root: 62, seed: 71, scale: [0, 2, 4, 5, 7, 9, 11],
    prog: [[0, 4, 7], [-5, -1, 2], [-3, 0, 4], [-7, -3, 0]],
    L: { pad: { vol: .045, cut: 2200 }, arp: { inst: 'bell', vol: .055, pat: [0, 1, 2, 1, 2, 1, 2, 1] }, bass: { vol: .12, steps: [0, 4] }, beat: { type: 'hat', vol: .035 }, mel: { inst: 'bell', vol: .065, density: .5, oct: 12 } } },
  profile_style:{ name: 'Мечты', bpm: 62, root: 60, seed: 83, scale: [0, 2, 4, 6, 7, 9, 11],
    prog: [[0, 4, 7, 11], [2, 6, 9, 14], [-3, 0, 4, 7], [4, 7, 11, 14]],
    L: { pad: { vol: .065, cut: 1600 }, bass: { vol: .08, steps: [0] }, mel: { inst: 'bell', vol: .05, density: .3, oct: 12 } } },
  profile_phonk: { name: 'Фонк (Memphis)', gain: .68, bpm: 140, div: 4, root: 57, seed: 7, scale: [0, 3, 5, 7, 10], riff: PHONK_RIFF,
    prog: [[0, 3, 7], [0, 3, 7], [0, 3, 7], [0, 3, 7], [-4, 0, 3], [-4, 0, 3], [-2, 2, 5], [-2, 2, 5]],
    L: { pad: { vol: .045, cut: 520, wave: 'sawtooth' }, bass: { vol: .34, follow: true }, mel: { inst: 'cow', vol: .17 },
      drums: { kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0], snare: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
               hat: [.5, .25, .35, .25, .5, .25, .35, .25, .5, .25, .35, .25, .5, .35, .5, .35] } } },
};

function genMelody(def, rnd) {
  const L = def.L.mel, sc = def.scale, out = [];
  if (!L) return out;
  let idx = sc.length;
  for (let i = 0; i < 8 * def.prog.length; i++) {
    if (rnd() < L.density && (i % 2 === 0 || rnd() < .4)) {
      idx = Math.max(0, Math.min(sc.length * 2 - 1, idx + Math.round((rnd() - .5) * 4)));
      out.push(def.root + sc[idx % sc.length] + 12 * Math.floor(idx / sc.length) + L.oct - 12);
    } else out.push(null);
  }
  return out;
}

// ---------- синтезатор ----------
function build(ctx, out) {
  const soft = ctx.createDynamicsCompressor(); soft.threshold.value = -20; soft.ratio.value = 3;
  const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -8; lim.knee.value = 6; lim.ratio.value = 20; lim.attack.value = .003; lim.release.value = .15;
  const master = ctx.createGain(); master.gain.value = .9;
  soft.connect(lim); lim.connect(master); master.connect(out);
  const musicM = ctx.createGain(), sfxM = ctx.createGain();
  musicM.gain.value = .7; sfxM.gain.value = .9; musicM.connect(soft); sfxM.connect(lim); // звуки кнопок идут мимо «склеивающего» компрессора, иначе короткие щелчки глохнут
  const rev = ctx.createConvolver(), revG = ctx.createGain(); revG.gain.value = .5;
  { const len = Math.floor(ctx.sampleRate * 2.4), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    rev.buffer = b; }
  rev.connect(revG); revG.connect(musicM);
  const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  { const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }

  const env = (g, t, a, d, v) => { g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); };
  const osc = (type, f, t, dur, dest, det) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (det) o.detune.value = det; o.connect(dest); o.start(t); o.stop(t + dur); return o; };
  const filt = (type, f, dest, q) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q) x.Q.value = q; x.connect(dest); return x; };
  const gain = (dest) => { const g = ctx.createGain(); g.connect(dest); return g; };

  // инструменты (t — время, m — нота MIDI, bus — куда играть)
  const SAT = new Float32Array(1024); for (let i = 0; i < 1024; i++) SAT[i] = Math.tanh(2.5 * (i / 512 - 1));
  const I = {
    pad(t, m, dur, vol, bus, cut, wave) {
      const g = gain(bus), f = filt('lowpass', cut || 1200, g);
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * .4); g.gain.linearRampToValueAtTime(vol * .8, t + dur); g.gain.linearRampToValueAtTime(.0001, t + dur + 1.4);
      for (const d of [-7, 7]) osc(wave || 'sawtooth', hz(m), t, dur + 1.5, f, d);
    },
    pluck(t, m, dur, vol, bus) { const g = gain(bus), f = filt('lowpass', 2600, g); env(g, t, .004, Math.min(dur, .9), vol); osc('triangle', hz(m), t, dur + 1, f); },
    bell(t, m, dur, vol, bus) { const g = gain(bus); env(g, t, .004, 1.8, vol); osc('sine', hz(m), t, 2.2, g); const g2 = gain(bus); env(g2, t, .004, .9, vol * .3); osc('sine', hz(m) * 2.76, t, 1.2, g2); },
    music(t, m, dur, vol, bus) { const g = gain(bus); env(g, t, .003, 1.2, vol); osc('sine', hz(m), t, 1.6, g); const g2 = gain(bus); env(g2, t, .003, .35, vol * .35); osc('triangle', hz(m) * 3, t, .6, g2); },
    epiano(t, m, dur, vol, bus) { const g = gain(bus), f = filt('lowpass', 2200, g); env(g, t, .01, .8, vol); osc('sine', hz(m), t, 1.2, f); const g2 = gain(bus); env(g2, t, .01, .3, vol * .3); osc('sine', hz(m) * 2, t, .5, g2); },
    chip(t, m, dur, vol, bus) { const g = gain(bus); env(g, t, .003, Math.min(dur, .22), vol); osc('square', hz(m), t, dur + .1, g); },
    bass(t, m, dur, vol, bus) { const g = gain(bus); env(g, t, .02, dur, vol); osc('triangle', hz(m), t, dur + .1, g); osc('sine', hz(m), t, dur + .1, g); },
    thump(t, vol, bus) { const g = gain(bus), o = osc('sine', 80, t, .3, g); o.frequency.exponentialRampToValueAtTime(38, t + .14); env(g, t, .005, .22, vol); },
    hat(t, vol, bus) { const s = ctx.createBufferSource(); s.buffer = nb; const g = gain(bus), f = filt('highpass', 7000, g); env(g, t, .002, .04, vol); s.connect(f); s.start(t, Math.random() * .5, .08); },
    kick(t, vol, bus) {
      const g = gain(bus), o = osc('sine', 150, t, .5, g); o.frequency.exponentialRampToValueAtTime(42, t + .12);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + .38);
      const s = ctx.createBufferSource(); s.buffer = nb; const g2 = gain(bus), f = filt('lowpass', 3000, g2); env(g2, t, .001, .02, vol * .4); s.connect(f); s.start(t, 0, .03);
    },
    sub808(t, m, dur, vol, bus) {
      const sh = ctx.createWaveShaper(); sh.curve = SAT; const g = gain(bus); sh.connect(g);
      const o = osc('sine', hz(m) * 1.6, t, dur + .2, sh); o.frequency.exponentialRampToValueAtTime(hz(m), t + .05);
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    },
    cow(t, m, dur, vol, bus) { const g = gain(bus), f = filt('bandpass', hz(m) * 2, g, 1.4); env(g, t, .002, .3, vol); osc('square', hz(m), t, .4, f); osc('square', hz(m) * 1.51, t, .4, f); },
    clap(t, vol, bus) {
      for (const d of [0, .011, .024]) { const s = ctx.createBufferSource(); s.buffer = nb; const g = gain(bus), f = filt('bandpass', 1700, g, .9); env(g, t + d, .001, d === .024 ? .14 : .03, vol); s.connect(f); s.start(t + d, Math.random() * .5, .2); }
    },
  };

  function playStep(def, mel, bus, step, t, spb) {
    const L = def.L, bar = Math.floor(step / 8) % def.prog.length, bs = step % 8, chord = def.prog[bar], R = def.root, barDur = spb * 8;
    if (bs === 0 && L.pad) chord.forEach((c) => I.pad(t, R + c, barDur, L.pad.vol, bus, L.pad.cut, L.pad.wave));
    if (L.arp) { const k = L.arp.pat[bs]; if (k != null) I[L.arp.inst](t, R + chord[k % chord.length] + 12, spb * 3, L.arp.vol, bus); }
    if (L.bass && L.bass.steps && L.bass.steps.includes(bs)) I[L.bass.inst || 'bass'](t, R + chord[0] - 12, spb * 3.5, L.bass.vol, bus);
    if (L.mel) { const m = mel[bar * 8 + bs]; if (m != null) I[L.mel.inst](t, m, spb * 3, L.mel.vol, bus); }
    if (L.beat) {
      if (L.beat.type === 'heart' && bs % 4 === 0) { I.thump(t, L.beat.vol, bus); I.thump(t + .2, L.beat.vol * .7, bus); }
      if (L.beat.type === 'hat' && bs % 2 === 1) I.hat(t, L.beat.vol, bus);
    }
    if (L.drums) {
      const d = L.drums, i = step % 16;
      if (d.kick[i]) { I.kick(t, .55 * d.kick[i], bus); if (L.bass && L.bass.follow) I.sub808(t, R + chord[0] - 24, spb * 5, L.bass.vol, bus); }
      if (d.snare[i]) I.clap(t, .3 * d.snare[i], bus);
      if (d.hat[i]) I.hat(t, .1 * d.hat[i], bus);
    }
  }

  function startTrack(name) {
    const def = TRACKS[name], T = { name, stopped: false };
    const bus = ctx.createGain(), send = ctx.createGain(); send.gain.value = .4;
    bus.connect(musicM); bus.connect(send); send.connect(rev);
    const now = ctx.currentTime; bus.gain.setValueAtTime(.0001, now); bus.gain.linearRampToValueAtTime(def.gain || 1, now + 2);
    const mel = def.riff || genMelody(def, mulberry(def.seed)), spb = 60 / def.bpm / (def.div || 2);
    let step = 0, next = now + .12;
    T.tick = (until) => { if (T.stopped) return; while (next < until) { playStep(def, mel, bus, step, next, spb); step++; next += spb; } };
    T.stop = (fade) => {
      T.stopped = true; const n = ctx.currentTime;
      bus.gain.cancelScheduledValues(n); bus.gain.setValueAtTime(Math.max(bus.gain.value, .0001), n); bus.gain.linearRampToValueAtTime(.0001, n + fade);
      setTimeout(() => { try { bus.disconnect(); send.disconnect(); } catch (e) {} }, fade * 1000 + 3000);
    };
    return T;
  }

  // звуки интерфейса
  const blip = (t, f, dur, vol, type, cut) => {
    const g = gain(sfxM), dest = cut ? filt('lowpass', cut, g) : g, o = osc(type, f[0], t, dur + .03, dest);
    if (f[1] && f[1] !== f[0]) o.frequency.exponentialRampToValueAtTime(f[1], t + dur);
    env(g, t, .005, dur, vol * 1.5);
  };
  const whoosh = (t, dur, vol) => {
    const s = ctx.createBufferSource(); s.buffer = nb; const g = gain(sfxM), f = filt('bandpass', 500, g, 1.2);
    f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(2600, t + dur); env(g, t, .02, dur, vol); s.connect(f); s.start(t, 0, dur + .1);
  };
  const sparkle = (t, n) => { for (let i = 0; i < n; i++) I.bell(t + i * .05 + Math.random() * .02, 84 + Math.floor(Math.random() * 12), .5, .06, sfxM); };
  const SF = {
    click: (t) => blip(t, [520, 700], .07, .24, 'triangle'),
    click2: (t) => { blip(t, [660, 740], .06, .16, 'triangle'); blip(t + .06, [880, 1100], .09, .16, 'triangle'); },
    tab: (t) => whoosh(t, .14, 1),
    pop: (t) => blip(t, [300, 620], .08, .24, 'sine'),
    warn: (t) => blip(t, [210, 150], .14, .18, 'square', 900),
    error: (t) => { blip(t, [180, 160], .11, .18, 'square', 700); blip(t + .14, [160, 140], .14, .18, 'square', 700); },
    success: (t) => [72, 76, 79, 84].forEach((m, i) => blip(t + i * .07, [hz(m), hz(m)], .16, .14, 'triangle')),
    sparkle: (t) => sparkle(t, 7),
    level: (t) => { [67, 72, 76, 79].forEach((m, i) => blip(t + i * .09, [hz(m), hz(m)], .28, .15, 'triangle')); sparkle(t + .3, 8); },
    hurt: (t) => blip(t, [240, 90], .22, .3, 'sawtooth', 700),
    dice: (t) => { for (let i = 0; i < 4; i++) { const f = 400 + Math.random() * 500; blip(t + i * .045, [f, f], .04, .12, 'square', 2000); } },
    tick: (t, x) => { const f = 420 + (x || 0) * 700; blip(t, [f, f], .04, .16, 'sine'); },
    on: (t) => { blip(t, [440, 440], .07, .14, 'triangle'); blip(t + .07, [660, 660], .09, .14, 'triangle'); },
    off: (t) => { blip(t, [660, 660], .07, .14, 'triangle'); blip(t + .07, [440, 440], .09, .14, 'triangle'); },
    coin: (t) => { blip(t, [hz(83), hz(83)], .09, .16, 'square', 3200); blip(t + .08, [hz(88), hz(88)], .3, .16, 'square', 3200); },
    boom: (t) => { I.kick(t, .5, sfxM); I.cow(t + .12, 69, .3, .12, sfxM); I.cow(t + .24, 72, .3, .12, sfxM); },
  };
  return {
    startTrack,
    sfx: (name, arg) => { const f = SF[name]; if (f) f(ctx.currentTime + .005, arg); return !!f; },
    setVol: (v) => { musicM.gain.value = .7 * v; sfxM.gain.value = .9 * v; },
  };
}

// ---------- проигрывание на странице ----------
const KEY = 'pristalAudio';
const load = () => { try { return Object.assign({ music: true, sfx: true, vol: .6 }, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { return { music: true, sfx: true, vol: .6 }; } };
const S = load(); const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
const me = document.currentScript;
let wanted = window.PRISTAL_TRACK || (me && me.dataset.track) || 'home', ctx = null, A = null, cur = null, curName = '', timer = null, lastSfx = 0;
const log = [];

function ensure() {
  if (ctx) return true;
  try { const C = window.AudioContext || window.webkitAudioContext; ctx = new C(); } catch (e) { return false; }
  A = build(ctx, ctx.destination); A.setVol(S.vol); return true;
}
function pump() { if (timer) return; timer = setInterval(() => { if (cur && ctx) cur.tick(ctx.currentTime + .6); }, 30); }
function switchTo(name) {
  if (!ctx || !S.music || ctx.state !== 'running' || !TRACKS[name]) return;
  if (cur && curName === name) return;
  if (cur) cur.stop(1.6);
  cur = A.startTrack(name); curName = name; pump(); refresh();
}
function stopMusic() { if (cur) { cur.stop(.8); cur = null; curName = ''; } clearInterval(timer); timer = null; }
function startMusic() { if (S.music && ctx && ctx.state === 'running') switchTo(wanted); }
function setTrack(name) { if (!TRACKS[name]) return; wanted = name; if (cur) switchTo(name); refresh(); }
function setMusic(on) { S.music = !!on; save(); if (S.music) { if (ensure()) ctx.resume().then(startMusic).catch(() => {}); } else stopMusic(); refresh(); }
function play(name, arg) {
  if (!S.sfx || !ensure()) return;
  const n = performance.now(); if (name === lastSfx.n && n - lastSfx.t < 25) return; lastSfx = { n: name, t: n };
  if (ctx.state === 'suspended') ctx.resume();
  if (A.sfx(name, arg)) { log.push(name); if (log.length > 40) log.shift(); }
}
const first = () => {
  if (!ensure()) return;
  ctx.resume().then(startMusic).catch(() => {});
  for (const e of ['pointerdown', 'keydown', 'touchstart']) removeEventListener(e, first, true);
};
for (const e of ['pointerdown', 'keydown', 'touchstart']) addEventListener(e, first, { capture: true, passive: true });
document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });

function sfxFor(el) {
  const d = el.closest('[data-sfx]'); if (d) return d.dataset.sfx;
  if (el.matches('.danger')) return 'warn';
  if (el.matches('.tab,.chip,.pt,nav a,.navlinks a,.nav-toggle')) return 'tab';
  if (el.matches('.pcard,.want,.check,.badge,.step,.node,.cv,.theme-item,.thumbs button,.gal button,.shot,.tile')) return 'pop';
  if (el.matches('.primary')) return 'click2';
  return 'click';
}
addEventListener('click', (e) => {
  const t = e.target && e.target.closest ? e.target.closest('[data-sfx],button,a[href],[role="button"],summary') : null;
  if (!t || t.disabled || t.closest('#pAudio')) return;
  play(sfxFor(t));
}, true);

// ---------- панель управления ----------
let ui = null;
function refresh() {
  if (!ui) return;
  ui.btn.textContent = S.music || S.sfx ? '🔊' : '🔇';
  ui.m.checked = S.music; ui.s.checked = S.sfx; ui.v.value = Math.round(S.vol * 100);
  ui.n.textContent = S.music ? 'Сейчас играет: ' + TRACKS[wanted].name : 'Музыка выключена';
}
function mountUI() {
  const st = document.createElement('style');
  st.textContent = '#pAudio{position:fixed;left:14px;bottom:14px;z-index:90;font-family:inherit;color:#fff}'
    + '#pAudio .pa-b{width:46px;height:46px;border-radius:14px;border:1px solid #ffffff2a;background:rgba(13,18,25,.92);color:#fff;font-size:20px;cursor:pointer;backdrop-filter:blur(8px);transition:.2s}'
    + '#pAudio .pa-b:hover{border-color:var(--accent,#a855f7);transform:translateY(-2px)}'
    + '#pAudio .pa-p{position:absolute;left:0;bottom:56px;width:250px;padding:14px;border-radius:16px;background:rgba(13,18,25,.97);border:1px solid #ffffff1f;display:grid;gap:10px;box-shadow:0 16px 40px #000a}'
    + '#pAudio .pa-p[hidden]{display:none}#pAudio label{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;cursor:pointer}'
    + '#pAudio input[type=range]{flex:1;min-width:0;accent-color:var(--accent,#a855f7)}#pAudio small{color:#9aa3b2;font-size:12px;line-height:1.4}';
  document.head.append(st);
  const w = document.createElement('div'); w.id = 'pAudio';
  w.innerHTML = '<button class="pa-b" type="button" aria-label="Звук и музыка" aria-expanded="false"></button>'
    + '<div class="pa-p" hidden><b>Звук и музыка</b><label><input type="checkbox" id="paM"> Музыка</label><label><input type="checkbox" id="paS"> Звуки кнопок</label>'
    + '<label>Громкость <input type="range" id="paV" min="0" max="100"></label><small id="paN"></small></div>';
  document.body.append(w);
  ui = { btn: w.querySelector('.pa-b'), p: w.querySelector('.pa-p'), m: w.querySelector('#paM'), s: w.querySelector('#paS'), v: w.querySelector('#paV'), n: w.querySelector('#paN') };
  ui.btn.addEventListener('click', () => { ui.p.hidden = !ui.p.hidden; ui.btn.setAttribute('aria-expanded', String(!ui.p.hidden)); });
  document.addEventListener('click', (e) => { if (!w.contains(e.target)) { ui.p.hidden = true; ui.btn.setAttribute('aria-expanded', 'false'); } });
  ui.m.addEventListener('change', () => {
    S.music = ui.m.checked; save();
    if (S.music) { if (ensure()) ctx.resume().then(startMusic).catch(() => {}); } else stopMusic();
    play(S.music ? 'on' : 'off'); refresh();
  });
  ui.s.addEventListener('change', () => { S.sfx = ui.s.checked; save(); if (S.sfx) play('on'); refresh(); });
  ui.v.addEventListener('input', () => { S.vol = ui.v.value / 100; save(); if (A) A.setVol(S.vol); });
  refresh();
}
if (document.body) mountUI(); else document.addEventListener('DOMContentLoaded', mountUI);

// проверка без колонок: «рендер» звука в память (используется только для тестов)
async function renderTest(kind, name, secs) {
  const rate = 22050, off = new OfflineAudioContext(2, Math.ceil(rate * secs), rate), a = build(off, off.destination);
  if (kind === 'music') { const T = a.startTrack(name); T.tick(secs); } else a.sfx(name, .5);
  const buf = await off.startRendering(); let peak = 0, sum = 0, n = 0, bad = 0;
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const v = d[i]; if (!isFinite(v)) bad++; const x = Math.abs(v); if (x > peak) peak = x; sum += v * v; n++; } }
  const d0 = buf.getChannelData(0), w = Math.floor(rate * .05), win = [];
  for (let i = 0; i + w <= d0.length; i += w) { let q = 0; for (let j = 0; j < w; j++) q += d0[i + j] * d0[i + j]; win.push(Math.sqrt(q / w)); }
  return { peak, rms: Math.sqrt(sum / n), bad, win };
}
window.PristalAudio = { play, setTrack, setMusic, log, renderTest, tracks: Object.keys(TRACKS), state: () => ({ track: curName, wanted, music: S.music, sfx: S.sfx, vol: S.vol, ctx: ctx ? ctx.state : 'none' }) };
})();

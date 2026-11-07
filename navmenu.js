/* Мобильное меню (бургер) для страниц с простой шапкой: «О нас», «Профиль», «Донаты». На узких экранах ссылки уходят в выпадающую панель. */
(() => {
  const nav = document.querySelector('header nav'), bar = document.querySelector('header .wrap');
  if (!nav || !bar) return;
  const st = document.createElement('style');
  st.textContent = '.nav-toggle{display:none;width:42px;height:42px;border:1px solid #ffffff22;border-radius:12px;background:#0d1219;color:#fff;font-size:20px;cursor:pointer;flex:none}'
    + 'header .wrap.nav{position:relative}'
    + '.mmenu{display:none;position:absolute;top:68px;left:0;right:0;flex-direction:column;background:rgba(7,10,15,.98);border:1px solid #ffffff14;border-radius:0 0 16px 16px;padding:6px 14px 12px;box-shadow:0 18px 40px #000a}'
    + '.mmenu.open{display:flex}.mmenu a{padding:13px 4px;border-bottom:1px solid #ffffff0f;color:#c8ced7;text-decoration:none;font-weight:700;font-size:16px}.mmenu a:last-child{border-bottom:0}.mmenu a.on{color:var(--accent,#a855f7)}'
    + '@media(max-width:700px){.nav-toggle{display:block}header nav>a:not(.dc){display:none}}'
    + '@media(min-width:701px){.mmenu{display:none!important}}';
  document.head.append(st);
  const b = document.createElement('button'); b.className = 'nav-toggle'; b.type = 'button'; b.setAttribute('aria-label', 'Меню'); b.textContent = '☰'; nav.append(b);
  const m = document.createElement('div'); m.className = 'mmenu'; bar.append(m);
  const close = () => { m.classList.remove('open'); b.textContent = '☰'; };
  b.addEventListener('click', () => {
    m.replaceChildren(...[...nav.querySelectorAll(':scope>a:not(.dc)')].filter((a) => !a.hidden).map((a) => { const c = a.cloneNode(true); c.removeAttribute('id'); c.className = a.classList.contains('on') ? 'on' : ''; return c; }));
    const o = m.classList.toggle('open'); b.textContent = o ? '✕' : '☰';
  });
  document.addEventListener('click', (e) => { if (!bar.contains(e.target)) close(); });
  addEventListener('resize', () => { if (innerWidth > 700) close(); });
})();

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isSmallScreen = window.matchMedia('(max-width: 760px)').matches;

/* ── Parallax ── */
const layers = document.querySelectorAll<HTMLElement>('.parallax-layer');

if (!reduceMotion && !isSmallScreen && layers.length > 0) {
  let ticking = false;

  const update = () => {
    const offset = Math.min(window.scrollY * 0.12, 120);
    for (const layer of layers) {
      layer.style.setProperty('--parallax-y', `${-offset}px`);
    }
    ticking = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true }
  );

  update();
}

/* ── Nav scrolled state ── */
const nav = document.querySelector<HTMLElement>('.site-nav');
if (nav) {
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ── Button glow tracking ── */
const buttons = document.querySelectorAll<HTMLElement>('.button');
for (const btn of buttons) {
  btn.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    btn.style.setProperty('--glow-x', `${x}%`);
    btn.style.setProperty('--glow-y', `${y}%`);
  });
}

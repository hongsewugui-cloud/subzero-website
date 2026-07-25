if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (window.location.hash) history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
window.scrollTo({ top: 0, behavior: 'auto' });

const intro = document.querySelector('#intro');
const skipIntro = document.querySelector('#skip-intro');
const replayIntro = document.querySelector('#replay-intro');
const menuPanel = document.querySelector('#menu-panel');
const menuTrigger = document.querySelector('#menu-trigger');
const menuClose = document.querySelector('#menu-close');
const menuLinks = document.querySelectorAll('.menu-links a');
const revealItems = document.querySelectorAll('.reveal');
const introAnimations = document.querySelectorAll('.launch-letter');
const reactiveGlyphs = document.querySelectorAll('.audio-word span');
const reactiveBars = document.querySelectorAll('.audio-field i');
const vinylStage = document.querySelector('#vinyl-stage');
const waveButtons = document.querySelectorAll('.wave-button');
const interactiveControls = document.querySelectorAll('button, .round-link, .wordmark, .instagram-link, .menu-links a, .label-intro-link');
const motionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let introDismissTimer;
let introHideTimer;
let waveResetTimer;

function dismissIntro() {
  if (intro.classList.contains('is-impact-transition') || intro.classList.contains('is-dismissed')) return;
  window.clearTimeout(introDismissTimer);
  intro.classList.add('is-impact-transition');
  document.body.classList.remove('intro-active');
  introHideTimer = window.setTimeout(() => intro.classList.add('is-dismissed'), 520);
}

function playIntro() {
  window.clearTimeout(introDismissTimer);
  window.clearTimeout(introHideTimer);
  document.body.classList.add('intro-active');
  intro.classList.remove('is-dismissed', 'is-impact-transition');
  introAnimations.forEach((item) => {
    item.style.animation = 'none';
    void item.offsetWidth;
    item.style.animation = '';
  });
  introDismissTimer = window.setTimeout(dismissIntro, 980);
}

introDismissTimer = window.setTimeout(dismissIntro, 980);
skipIntro.addEventListener('click', dismissIntro);
replayIntro.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  window.setTimeout(playIntro, 350);
});

function setMenu(open) {
  menuPanel.classList.toggle('is-open', open);
  menuPanel.setAttribute('aria-hidden', String(!open));
  menuTrigger.classList.toggle('is-menu-open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}

menuTrigger.addEventListener('click', () => setMenu(true));
menuClose.addEventListener('click', () => setMenu(false));
menuLinks.forEach((link) => link.addEventListener('click', () => setMenu(false)));

function triggerWave(kind) {
  window.clearTimeout(waveResetTimer);
  vinylStage.classList.remove('wave-bass', 'wave-kick', 'wave-noise');
  void vinylStage.offsetWidth;
  vinylStage.classList.add(`wave-${kind}`);
  waveButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.wave === kind));
  waveResetTimer = window.setTimeout(() => {
    vinylStage.classList.remove('wave-bass', 'wave-kick', 'wave-noise');
    waveButtons.forEach((button) => button.classList.remove('is-active'));
  }, 1100);
}

waveButtons.forEach((button) => {
  button.addEventListener('click', () => triggerWave(button.dataset.wave));
});

function animateControl(control) {
  if (motionReduced) return;
  control.classList.remove('is-clicked');
  void control.offsetWidth;
  control.classList.add('is-clicked');
  window.setTimeout(() => control.classList.remove('is-clicked'), 440);
}

interactiveControls.forEach((control) => {
  control.addEventListener('pointerdown', () => control.classList.add('is-pressed'));
  control.addEventListener('pointerup', () => control.classList.remove('is-pressed'));
  control.addEventListener('pointerleave', () => control.classList.remove('is-pressed'));
  control.addEventListener('click', () => animateControl(control));
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  },
  { threshold: 0.2 }
);

revealItems.forEach((item) => observer.observe(item));

function animateTypography(time) {
  const downbeat = Math.pow(Math.max(0, Math.sin(time * 0.0046)), 7);

  reactiveGlyphs.forEach((glyph, index) => {
    const wave = Math.sin(time * 0.003 + index * 1.31);
    const lift = Math.round(wave * (7 + downbeat * 19));
    const stretch = 1 + Math.max(0, wave) * 0.1 + downbeat * (index % 2 ? 0.16 : 0.08);
    glyph.style.setProperty('--lift', `${lift}px`);
    glyph.style.setProperty('--stretch', stretch.toFixed(3));
  });

  reactiveBars.forEach((bar, index) => {
    const wave = (Math.sin(time * 0.005 + index * 0.82) + 1) / 2;
    const height = Math.round(5 + wave * 18 + downbeat * (index % 3 === 0 ? 18 : 8));
    bar.style.setProperty('--bar-height', `${height}px`);
  });

  window.requestAnimationFrame(animateTypography);
}

if (!motionReduced) window.requestAnimationFrame(animateTypography);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setMenu(false);
});

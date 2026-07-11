/* js/pill-nav.js — Desktop pill navigation hover effects + scroll-spy
 * Ported from React Bits PillNav (GSAP-free, class-based)
 * Only activates on desktop (>= 761px).
 */
(function () {
  'use strict';

  var DESKTOP = window.matchMedia('(min-width: 761px)');
  var REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!DESKTOP.matches) return;

  /* ─── Selection ─────────────────────────────────────────────── */
  var LINKS = document.querySelectorAll('.nav-links a, .nav-links button');
  var BRAND = document.querySelector('.brand');
  var BRAND_IMG = document.querySelector('.brand-avatar');
  var logoAnimation = null;

  if (!LINKS.length) return;

  /* ─── Section → nav-index map for scroll-spy ────────────────── */
  var SECTION_IDS = ['about', 'skills', 'ppt', 'projects'];

  /* ─── Layout: dynamic circle geometry from pill dimensions ──── */
  function layoutPill(link) {
    var circle = link.querySelector('.hover-circle');
    if (!circle) return;

    var rect = link.getBoundingClientRect();
    var w = rect.width;
    var h = rect.height;
    if (w <= 0 || h <= 0) return;

    /* React Bits PillNav formula:
     *   R = (w²/4 + h²) / (2h)   — circumscribed circle radius
     *   D = ceil(2R) + 2          — circle diameter
     *   delta = ceil(R - sqrt(R² - w²/4)) + 1  — how far circle hangs below
     *   originY = D - delta       — transform origin from bottom
     */
    var R = ((w * w) / 4 + h * h) / (2 * h);
    var D = Math.ceil(2 * R) + 2;
    var delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
    var originY = D - delta;

    /* Write inline style on the circle element */
    circle.style.width = D + 'px';
    circle.style.height = D + 'px';
    circle.style.bottom = '-' + delta + 'px';
    /* CSS custom properties for class-based transitions */
    circle.style.setProperty('--circle-size', D + 'px');
    circle.style.setProperty('--circle-bottom', '-' + delta + 'px');
    circle.style.setProperty('--circle-origin', '50% ' + originY + 'px');

    /* Store pill height for label displacements · no px suffix so calc() works */
    link.style.setProperty('--pill-h', h + 'px');
  }

  function layoutAll() {
    for (var i = 0; i < LINKS.length; i++) {
      layoutPill(LINKS[i]);
    }
  }

  /* ─── Hover / focus class toggling ──────────────────────────── */
  function setupHover(link) {
    /* mouse */
    link.addEventListener('mouseenter', function () { this.classList.add('is-pill-hovered'); });
    link.addEventListener('mouseleave', function () { this.classList.remove('is-pill-hovered'); });
    /* keyboard — is-pill-hovered mirrors :focus-visible for asymmetry */
    link.addEventListener('focusin', function () { this.classList.add('is-pill-hovered'); });
    link.addEventListener('focusout', function () { this.classList.remove('is-pill-hovered'); });
  }

  /* ─── Logo spin: every mouseenter = full 0→360° ────────────── */
  function setupLogoSpin() {
    if (!BRAND || !BRAND_IMG) return;

    BRAND.addEventListener('mouseenter', function () {
      if (REDUCED_MOTION) return;
      if (logoAnimation) logoAnimation.cancel();
      logoAnimation = BRAND_IMG.animate(
        [
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(360deg)' },
        ],
        {
          duration: 200,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        }
      );
    });
  }

  /* ─── Scroll-spy: highlight active section ──────────────────── */
  function setupScrollSpy() {
    var sections = [];
    for (var i = 0; i < SECTION_IDS.length; i++) {
      var el = document.getElementById(SECTION_IDS[i]);
      if (el) sections.push(el);
    }
    if (!sections.length) return;

    var activeIndex = -1;

    function onIntersect(entries) {
      var bestRatio = 0;
      var bestIdx = -1;

      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        var idx = SECTION_IDS.indexOf(entry.target.id);
        if (idx === -1) continue;
        if (entry.intersectionRatio > bestRatio) {
          bestRatio = entry.intersectionRatio;
          bestIdx = idx;
        }
      }

      if (bestIdx === activeIndex) return;
      activeIndex = bestIdx;

      for (var j = 0; j < LINKS.length; j++) {
        LINKS[j].classList.toggle('is-active', j === bestIdx);
      }
    }

    var observer = new IntersectionObserver(onIntersect, {
      rootMargin: '-40% 0px -55% 0px',
      threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5],
    });

    for (var k = 0; k < sections.length; k++) {
      observer.observe(sections[k]);
    }
  }

  /* ─── Debounce ──────────────────────────────────────────────── */
  function debounce(fn, ms) {
    var timer = null;
    return function () {
      var args = arguments;
      var ctx = this;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { timer = null; fn.apply(ctx, args); }, ms);
    };
  }

  /* ─── Init ──────────────────────────────────────────────────── */
  function init() {
    layoutAll();
    for (var i = 0; i < LINKS.length; i++) setupHover(LINKS[i]);
    setupLogoSpin();
    setupScrollSpy();

    var onResize = debounce(layoutAll, 100);
    window.addEventListener('resize', onResize);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(layoutAll).catch(function () { /* ignore */ });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

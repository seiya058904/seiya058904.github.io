/* border-glow.js
 * Vanilla JS adaptation of React Bits <BorderGlow />.
 * Injects .edge-light + .border-glow-inner into existing card elements.
 * Glow ::before/::after are handled by the CSS cascade.
 */

(function () {
  "use strict";

  /* ── Helpers ── */

  function parseHSL(hslStr) {
    var match = hslStr.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
    if (!match) return { h: 40, s: 80, l: 80 };
    return {
      h: parseFloat(match[1]),
      s: parseFloat(match[2]),
      l: parseFloat(match[3]),
    };
  }

  function buildGlowVars(glowColor, intensity) {
    var _a = parseHSL(glowColor),
      h = _a.h,
      s = _a.s,
      l = _a.l;
    var base = h + "deg " + s + "% " + l + "%";
    var opacities = [100, 60, 50, 40, 30, 20, 10];
    var keys = ["", "-60", "-50", "-40", "-30", "-20", "-10"];
    var vars = {};
    for (var i = 0; i < opacities.length; i++) {
      vars["--glow-color" + keys[i]] =
        "hsl(" + base + " / " + Math.min(opacities[i] * intensity, 100) + "%)";
    }
    return vars;
  }

  var GRADIENT_POSITIONS = [
    "80% 55%",
    "69% 34%",
    "8% 6%",
    "41% 38%",
    "86% 85%",
    "82% 18%",
    "51% 4%",
  ];
  var COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

  function buildGradientVars(colors) {
    var vars = {};
    for (var i = 0; i < 7; i++) {
      var c = colors[Math.min(COLOR_MAP[i], colors.length - 1)];
      vars["--gradient-" + ["one", "two", "three", "four", "five", "six", "seven"][i]] =
        "radial-gradient(at " + GRADIENT_POSITIONS[i] + ", " + c + " 0px, transparent 50%)";
    }
    vars["--gradient-base"] = "linear-gradient(" + colors[0] + " 0 100%)";
    return vars;
  }

  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
  function easeInCubic(x) { return x * x * x; }

  function animateValue(_a) {
    var start = _a.start,
      end = _a.end,
      duration = _a.duration,
      delay = _a.delay,
      ease = _a.ease,
      onUpdate = _a.onUpdate,
      onEnd = _a.onEnd;
    if (delay === void 0) delay = 0;
    if (ease === void 0) ease = easeOutCubic;
    var t0 = performance.now() + delay;
    function tick() {
      var elapsed = performance.now() - t0;
      var t = Math.min(elapsed / duration, 1);
      onUpdate(start + (end - start) * ease(t));
      if (t < 1) requestAnimationFrame(tick);
      else if (onEnd) onEnd();
    }
    setTimeout(function () {
      requestAnimationFrame(tick);
    }, delay);
  }

  /* ── Main init ── */

  function initBorderGlow(selector, options) {
    if (selector === void 0) selector = ".card";
    if (options === void 0) options = {};
    var cards = document.querySelectorAll(selector);
    if (!cards.length) return;

    var DEFAULTS = {
      edgeSensitivity: 30,
      glowColor: "40 80 80",
      glowIntensity: 1.0,
      coneSpread: 25,
      glowRadius: 40,
      borderRadius: 0,        // 0 = auto-detect from computed style
      fillOpacity: 0.5,
      colors: ["#c084fc", "#f472b6", "#38bdf8"],
      animated: false,
      backgroundColor: null,
      wrapContent: true,      // false = skip .border-glow-inner wrapper (use for grid-layout cards)
    };

    var opts = {};
    for (var k in DEFAULTS) {
      opts[k] = options[k] !== undefined ? options[k] : DEFAULTS[k];
    }

    /* Pre-computed style-vars shared by all cards */
    var glowVars = buildGlowVars(opts.glowColor, opts.glowIntensity);
    var gradientVars = buildGradientVars(opts.colors);
    var staticVars = {};
    for (var k2 in glowVars) staticVars[k2] = glowVars[k2];
    for (var k3 in gradientVars) staticVars[k3] = gradientVars[k3];

    cards.forEach(function (card) {
      if (card.borderGlowInitialized) return;

      /* 1. Add the class that activates ::before / ::after in CSS */
      card.classList.add("border-glow-card");

      /* 2. Inject .edge-light glow layer. */
      var edgeLight = document.createElement("span");
      edgeLight.className = "edge-light";
      card.appendChild(edgeLight);

      /* 3. If wrapping, collect children into .border-glow-inner.
            When wrapContent is false, children stay in place (preserves
            grid / other direct-child layout). */
      if (opts.wrapContent) {
        var existingChildren = [];
        while (card.firstChild) {
          var child = card.firstChild;
          if (child === edgeLight) { card.removeChild(child); continue; }
          card.removeChild(child);
          existingChildren.push(child);
        }
        /* Re-attach edge-light first, then inner */
        card.appendChild(edgeLight);
        var inner = document.createElement("div");
        inner.className = "border-glow-inner";
        for (var ci = 0; ci < existingChildren.length; ci++) {
          inner.appendChild(existingChildren[ci]);
        }
        card.appendChild(inner);
      }

      /* 4. Apply CSS custom properties */
      var computedStyle = window.getComputedStyle(card);
      var br = opts.borderRadius || parseFloat(computedStyle.borderRadius) || 28;
      var bg = opts.backgroundColor;
      if (!bg) {
        var rawBg = computedStyle.backgroundColor;
        bg = (rawBg && rawBg !== "rgba(0, 0, 0, 0)" && rawBg !== "transparent")
          ? rawBg : "#f4f2f9";
      }

      card.style.setProperty("--card-bg", bg);
      /* Override card's own background to match — inline !important beats
         the stylesheet's rgba(255,255,255,0.72) !important */
      card.style.setProperty("background", bg, "important");
      card.style.setProperty("--border-radius", br + "px");
      card.style.setProperty("--edge-sensitivity", String(opts.edgeSensitivity));
      card.style.setProperty("--cone-spread", String(opts.coneSpread));
      card.style.setProperty("--color-sensitivity", String(opts.edgeSensitivity + 20));
      card.style.setProperty("--glow-padding", opts.glowRadius + "px");
      card.style.setProperty("--fill-opacity", String(opts.fillOpacity));

      for (var key in staticVars) {
        card.style.setProperty(key, staticVars[key]);
      }

      /* 5. Pointer tracking — updates --edge-proximity / --cursor-angle immediately
            (no rAF throttling; matches original React Bits behaviour). */
      function onPointerMove(e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var cx = rect.width / 2;
        var cy = rect.height / 2;

        /* Edge proximity 0-1 */
        var dx = x - cx;
        var dy = y - cy;
        var kx = Infinity, ky = Infinity;
        if (dx !== 0) kx = cx / Math.abs(dx);
        if (dy !== 0) ky = cy / Math.abs(dy);
        var edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);

        /* Cursor angle (degrees, 0 = top) */
        var angleDeg = 0;
        if (dx !== 0 || dy !== 0) {
          var rad = Math.atan2(dy, dx);
          var deg = rad * (180 / Math.PI) + 90;
          angleDeg = deg < 0 ? deg + 360 : deg;
        }

        card.style.setProperty("--edge-proximity", (edge * 100).toFixed(3));
        card.style.setProperty("--cursor-angle", angleDeg.toFixed(3) + "deg");
      }

      card.addEventListener("pointermove", onPointerMove);

      /* 6. Animated intro sweep */
      if (opts.animated) {
        var ANGLE_START = 110;
        var ANGLE_END = 465;
        card.classList.add("sweep-active");
        card.style.setProperty("--cursor-angle", ANGLE_START + "deg");

        animateValue({ duration: 500, onUpdate: function (v) {
          card.style.setProperty("--edge-proximity", String(v));
        }});
        animateValue({
          ease: easeInCubic,
          duration: 1500,
          end: 50,
          onUpdate: function (v) {
            var a = (ANGLE_END - ANGLE_START) * (v / 100) + ANGLE_START;
            card.style.setProperty("--cursor-angle", a + "deg");
          },
        });
        animateValue({
          ease: easeOutCubic,
          delay: 1500,
          duration: 2250,
          start: 50,
          end: 100,
          onUpdate: function (v) {
            var a = (ANGLE_END - ANGLE_START) * (v / 100) + ANGLE_START;
            card.style.setProperty("--cursor-angle", a + "deg");
          },
        });
        animateValue({
          ease: easeInCubic,
          delay: 2500,
          duration: 1500,
          start: 100,
          end: 0,
          onUpdate: function (v) {
            card.style.setProperty("--edge-proximity", String(v));
          },
          onEnd: function () {
            card.classList.remove("sweep-active");
          },
        });
      }

      card.borderGlowInitialized = true;
    });
  }

  window.BorderGlow = { init: initBorderGlow };

  /* Auto-init */
  function autoInit() {
    /* Small cards (about, skills): higher sensitivity so glow only appears very close to edge */
    initBorderGlow(
      ".about-card, .section-skills > .container > .grid > .card",
      { edgeSensitivity: 45, coneSpread: 18,
        colors: ["#5b21b6", "#be123c", "#1e40af"] }
    );
    /* Larger cards (ppt, project): normal sensitivity */
    initBorderGlow(
      ".ppt-card, .project-card:not(.ppt-card)"
    );
    /* Hero cards (Featured Project, Collection Snapshot):
       wrapContent: false preserves CSS grid layout */
    initBorderGlow(
      ".hero-card-intro, .hero-card-project, .hero-card-stats",
      { wrapContent: false }
    );
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }
})();

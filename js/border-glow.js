/* border-glow.js — Vanilla JS adaptation of React Bits <BorderGlow />
 * Injects edge-tracking glow layers into existing card elements.
 * Self-initializes; call BorderGlow.init(selector, options) to customise.
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
  var GRADIENT_KEYS = [
    "--gradient-one",
    "--gradient-two",
    "--gradient-three",
    "--gradient-four",
    "--gradient-five",
    "--gradient-six",
    "--gradient-seven",
  ];
  var COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

  function buildGradientVars(colors) {
    var vars = {};
    for (var i = 0; i < 7; i++) {
      var c = colors[Math.min(COLOR_MAP[i], colors.length - 1)];
      vars[GRADIENT_KEYS[i]] =
        "radial-gradient(at " + GRADIENT_POSITIONS[i] + ", " + c + " 0px, transparent 50%)";
    }
    vars["--gradient-base"] = "linear-gradient(" + colors[0] + " 0 100%)";
    return vars;
  }

  function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
  }
  function easeInCubic(x) {
    return x * x * x;
  }

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

    var defaults = {
      edgeSensitivity: 30,
      glowColor: "40 80 80",
      glowIntensity: 1.0,
      coneSpread: 25,
      glowRadius: 40,
      fillOpacity: 0.5,
      colors: ["#c084fc", "#f472b6", "#38bdf8"],
      animated: false,
      cardBg: "", // auto-detect if empty
    };

    var opts = {};
    for (var k in defaults) {
      opts[k] = options[k] !== undefined ? options[k] : defaults[k];
    }

    /* Pre-compute static CSS vars (same for every card) */
    var staticVars = {};
    var glowVars = buildGlowVars(opts.glowColor, opts.glowIntensity);
    var gradientVars = buildGradientVars(opts.colors);
    for (var k2 in glowVars) staticVars[k2] = glowVars[k2];
    for (var k3 in gradientVars) staticVars[k3] = gradientVars[k3];

    var sensitivity = opts.edgeSensitivity;
    var coneSpread = opts.coneSpread;

    cards.forEach(function (card) {
      if (card.borderGlowInitialized) return; // guard

      /* 1. Wrap existing children in .border-glow-inner */
      var inner = document.createElement("div");
      inner.className = "border-glow-inner";
      while (card.firstChild) inner.appendChild(card.firstChild);
      card.appendChild(inner);

      /* 2. Inject glow layers (order: edge-light first for z-stacking, then before, after) */
      var edgeLight = document.createElement("div");
      edgeLight.className = "glow-edge-light";
      var edgeLightInner = document.createElement("div");
      edgeLight.appendChild(edgeLightInner);
      card.appendChild(edgeLight);

      var glowBefore = document.createElement("div");
      glowBefore.className = "glow-before";
      card.appendChild(glowBefore);

      var glowAfter = document.createElement("div");
      glowAfter.className = "glow-after";
      card.appendChild(glowAfter);

      card.classList.add("border-glow-card");

      /* 3. Apply CSS vars */
      var borderRadius = window.getComputedStyle(card).borderRadius;
      var parsedBr = parseFloat(borderRadius) || 28;

      card.style.setProperty("--edge-sensitivity", String(sensitivity));
      card.style.setProperty("--cone-spread", String(coneSpread));
      card.style.setProperty("--color-sensitivity", String(sensitivity + 20));
      card.style.setProperty("--glow-padding", opts.glowRadius + "px");
      card.style.setProperty("--fill-opacity", String(opts.fillOpacity));

      for (var key in staticVars) {
        card.style.setProperty(key, staticVars[key]);
      }

      /* Auto-detect card background if not provided */
      var bg = opts.cardBg;
      if (!bg) {
        var computedBg = window.getComputedStyle(card).backgroundColor;
        if (computedBg && computedBg !== "rgba(0, 0, 0, 0)" && computedBg !== "transparent") {
          bg = computedBg;
        } else {
          bg = "#ffffff";
        }
      }
      card.style.setProperty("--card-bg", bg);

      /* 4. Pointer tracking */
      function getCenter(el) {
        var rect = el.getBoundingClientRect();
        return { x: rect.width / 2, y: rect.height / 2 };
      }

      function getEdgeProximity(el, clientX, clientY) {
        var rect = el.getBoundingClientRect();
        var cx = rect.width / 2;
        var cy = rect.height / 2;
        var x = clientX - rect.left;
        var y = clientY - rect.top;
        var dx = x - cx;
        var dy = y - cy;
        var kx = Infinity,
          ky = Infinity;
        if (dx !== 0) kx = cx / Math.abs(dx);
        if (dy !== 0) ky = cy / Math.abs(dy);
        var edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
        return edge;
      }

      function getCursorAngle(el, clientX, clientY) {
        var rect = el.getBoundingClientRect();
        var cx = rect.width / 2;
        var cy = rect.height / 2;
        var x = clientX - rect.left;
        var y = clientY - rect.top;
        var dx = x - cx;
        var dy = y - cy;
        if (dx === 0 && dy === 0) return 0;
        var radians = Math.atan2(dy, dx);
        var degrees = radians * (180 / Math.PI) + 90;
        if (degrees < 0) degrees += 360;
        return degrees;
      }

      var pendingFrame = null;

      function onPointerMove(e) {
        if (pendingFrame) {
          cancelAnimationFrame(pendingFrame);
        }
        pendingFrame = requestAnimationFrame(function () {
          pendingFrame = null;
          var edge = getEdgeProximity(card, e.clientX, e.clientY);
          var angle = getCursorAngle(card, e.clientX, e.clientY);
          card.style.setProperty("--edge-proximity", String((edge * 100).toFixed(3)));
          card.style.setProperty("--cursor-angle", angle.toFixed(3) + "deg");
        });
      }

      card.addEventListener("pointermove", onPointerMove);

      /* Animated intro sweep */
      if (opts.animated) {
        var angleStart = 110;
        var angleEnd = 465;
        card.classList.add("glow-sweep-active");
        card.style.setProperty("--cursor-angle", angleStart + "deg");

        animateValue({
          duration: 500,
          onUpdate: function (v) {
            card.style.setProperty("--edge-proximity", String(v));
          },
        });
        animateValue({
          ease: easeInCubic,
          duration: 1500,
          end: 50,
          onUpdate: function (v) {
            var a = (angleEnd - angleStart) * (v / 100) + angleStart;
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
            var a = (angleEnd - angleStart) * (v / 100) + angleStart;
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
            card.classList.remove("glow-sweep-active");
          },
        });
      }

      card.borderGlowInitialized = true;
    });
  }

  /* Expose for use by main.js etc. */
  window.BorderGlow = {
    init: initBorderGlow,
  };

  /* Auto-init on DOMContentLoaded for all content cards */
  function autoInit() {
    initBorderGlow(
      ".ppt-card, .project-card:not(.ppt-card), .about-card, .section-skills > .container > .grid > .card"
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }
})();

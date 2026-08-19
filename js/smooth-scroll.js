(function () {
  "use strict";

  var desktopQuery = window.matchMedia("(min-width: 761px)");
  var reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var lenis = null;
  var frameId = null;

  function cancelFrame() {
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }
  }

  function frame(time) {
    frameId = null;
    if (!lenis || document.hidden) return;
    lenis.raf(time);
    frameId = window.requestAnimationFrame(frame);
  }

  function scheduleFrame() {
    if (lenis && !document.hidden && frameId === null) {
      frameId = window.requestAnimationFrame(frame);
    }
  }

  function nativeScrollTo(target, options) {
    var immediate = options && options.immediate;
    var behavior = immediate || reducedMotionQuery.matches ? "auto" : "smooth";

    if (target === "top" || target === "start" || target === "#") {
      window.scrollTo({ top: 0, behavior: behavior });
      return;
    }

    if (typeof target === "number") {
      window.scrollTo({ top: target, behavior: behavior });
      return;
    }

    var element = target instanceof HTMLElement
      ? target
      : typeof target === "string"
        ? document.querySelector(target)
        : null;

    if (element) {
      element.scrollIntoView({ block: "start", behavior: behavior });
    }
  }

  function start() {
    if (lenis || !desktopQuery.matches || typeof window.Lenis !== "function") return;

    lenis = new window.Lenis({
      autoRaf: false,
      syncTouch: false,
      respectReducedMotion: true,
      anchors: false,
      stopInertiaOnNavigate: true,
      prevent: function (element) {
        return Boolean(element.closest("[data-lenis-prevent], textarea, input, select"));
      },
    });

    scheduleFrame();
  }

  function destroy() {
    cancelFrame();
    if (lenis) {
      lenis.destroy();
      lenis = null;
    }
  }

  window.MPW_SMOOTH_SCROLL = {
    get isActive() {
      return Boolean(lenis);
    },
    scrollTo: function (target, options) {
      if (lenis) {
        lenis.resize();
        lenis.scrollTo(target, options || {});
      } else {
        nativeScrollTo(target, options || {});
      }
    },
    destroy: destroy,
  };

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      cancelFrame();
      return;
    }

    if (lenis) lenis.resize();
    scheduleFrame();
  });

  window.addEventListener("pagehide", destroy);
  window.addEventListener("pageshow", start);

  if (desktopQuery.addEventListener) {
    desktopQuery.addEventListener("change", function (event) {
      if (event.matches) start();
      else destroy();
    });
  }

  start();
})();

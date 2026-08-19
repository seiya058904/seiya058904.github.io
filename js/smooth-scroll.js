(function () {
  "use strict";

  var desktopQuery = window.matchMedia("(min-width: 761px)");
  var reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var lenis = null;
  var startScheduled = false;

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
      autoRaf: true,
      syncTouch: false,
      respectReducedMotion: true,
      anchors: false,
      stopInertiaOnNavigate: true,
      prevent: function (element) {
        return Boolean(element.closest("[data-lenis-prevent], textarea, select"));
      },
    });
  }

  function scheduleStart() {
    if (lenis || startScheduled || !desktopQuery.matches) return;
    startScheduled = true;

    var run = function () {
      window.requestAnimationFrame(function () {
        startScheduled = false;
        start();
      });
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", run, { once: true });
    } else {
      run();
    }
  }

  function destroy() {
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
    resize: function () {
      if (lenis) lenis.resize();
    },
    destroy: destroy,
    stop: function () {
      if (lenis) lenis.stop();
    },
    start: function () {
      if (lenis) lenis.start();
    },
  };

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && lenis) lenis.resize();
  });

  window.addEventListener("pagehide", destroy);
  window.addEventListener("pageshow", scheduleStart);

  if (desktopQuery.addEventListener) {
    desktopQuery.addEventListener("change", function (event) {
      if (event.matches) scheduleStart();
      else destroy();
    });
  }

  scheduleStart();
})();

(function () {
  const selector = ".reveal";
  const reduceMotionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? { matches: false };
  let observer = null;

  function showImmediately(element) {
    element.classList.add("is-visible");
  }

  function applyDelay(element, delay) {
    const value = Number.parseInt(delay, 10);
    if (Number.isFinite(value)) {
      element.style.setProperty("--reveal-delay", `${Math.min(Math.max(value, 0), 160)}ms`);
    }
  }

  function applyStagger(root) {
    const cards = root.querySelectorAll?.(
      ".about-cards > .about-card, .grid:not(.ppt-grid):not(.ppt-overflow-grid) > .card"
    ) || [];

    cards.forEach((card, index) => {
      card.style.setProperty("--reveal-delay", `${Math.min(index * 40, 160)}ms`);
    });
  }

  function register(root = document) {
    const elements = [];

    if (root instanceof Element && root.matches(selector)) {
      elements.push(root);
    }

    if (root.querySelectorAll) {
      elements.push(...root.querySelectorAll(selector));
    }

    elements.forEach((element) => {
      if (element.classList.contains("is-visible")) {
        return;
      }

      if (reduceMotionQuery.matches || !observer) {
        showImmediately(element);
        return;
      }

      applyDelay(element, element.dataset.revealDelay);
      observer.observe(element);
    });

    applyStagger(root);
  }

  function init() {
    if (reduceMotionQuery.matches || !("IntersectionObserver" in window)) {
      register(document);
      return;
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            entry.target.classList.remove("is-visible");
            return;
          }

          showImmediately(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    register(document);
  }

  window.MPWScrollReveal = { init, register };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

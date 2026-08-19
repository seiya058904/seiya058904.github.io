(function () {
  "use strict";

  var mode = new URLSearchParams(window.location.search).get("render-test");
  var validModes = [
    "baseline",
    "no-backdrop",
    "no-borderglow",
    "no-border-pseudo",
    "no-edge-light",
    "no-glow-shadow",
    "no-webgl",
    "no-pointer",
    "image-borderglow",
  ];
  if (!validModes.includes(mode)) return;

  window.MPW_RENDER_TEST = {
    mode: mode,
    disableWebglRaf: mode === "no-webgl",
    disablePointerTracking: mode === "no-pointer",
    enableImageCardGlow: mode === "image-borderglow",
  };

  if (mode !== "baseline" && mode !== "no-webgl" && mode !== "no-pointer" && mode !== "image-borderglow") {
    var style = document.createElement("style");
    style.dataset.renderTest = mode;
    var glowPseudo = "#ppt .border-glow-card::before, #ppt .border-glow-card::after, #projects .border-glow-card::before, #projects .border-glow-card::after";
    var edgeLayers = "#ppt .border-glow-card > .edge-light, #projects .border-glow-card > .edge-light";
    var glowLayers = "#ppt .border-glow-card::before, #ppt .border-glow-card::after, #ppt .border-glow-card > .edge-light, #projects .border-glow-card::before, #projects .border-glow-card::after, #projects .border-glow-card > .edge-light";
    style.textContent = mode === "no-backdrop"
      ? "#ppt .ppt-card, #projects .project-card { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }"
        : mode === "no-borderglow"
        ? glowLayers + " { display: none !important; opacity: 0 !important; box-shadow: none !important; mix-blend-mode: normal !important; }"
        : mode === "no-border-pseudo"
          ? glowPseudo + " { display: none !important; opacity: 0 !important; }"
          : mode === "no-edge-light"
            ? edgeLayers + " { display: none !important; opacity: 0 !important; }"
            : "#ppt .border-glow-card > .edge-light::before, #projects .border-glow-card > .edge-light::before { box-shadow: none !important; }";
    document.head.appendChild(style);
  }
})();

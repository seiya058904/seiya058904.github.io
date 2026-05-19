if (!window.matchMedia("(max-width: 760px)").matches && !window.location.pathname.endsWith("/index.html")) {
  window.location.replace("./index.html");
}

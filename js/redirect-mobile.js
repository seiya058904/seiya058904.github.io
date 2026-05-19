if (window.matchMedia("(max-width: 760px)").matches && !window.location.pathname.endsWith("/mobile.html")) {
  window.location.replace("./mobile.html");
}

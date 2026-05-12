// 这是手机导航按钮和菜单的元素。
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

// 点击按钮时，展开或收起手机菜单。
menuToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

// 点击导航链接后，自动关闭手机菜单，避免遮挡页面。
navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

// 返回顶部按钮：滚动超过一定距离后显示。
const backToTop = document.getElementById("backToTop");

window.addEventListener("scroll", () => {
  if (window.scrollY > 420) {
    backToTop.classList.add("show");
  } else {
    backToTop.classList.remove("show");
  }
});

// 点击后平滑回到页面顶部。
backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

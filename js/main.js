// 这是手机导航按钮和菜单的元素。
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
const reduceMotionQuery = window.matchMedia
  ? window.matchMedia("(prefers-reduced-motion: reduce)")
  : { matches: false };
const getScrollBehavior = () => (reduceMotionQuery.matches ? "auto" : "smooth");

// 点击按钮时，展开或收起手机菜单。
if (menuToggle && navLinks) {
  const closeMenu = () => {
    navLinks.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  // 点击导航链接后，自动关闭手机菜单，避免遮挡页面。
  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".nav")) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      menuToggle.focus();
    }
  });
}

// 返回顶部按钮：滚动超过一定距离后显示。
const backToTop = document.getElementById("backToTop");

if (backToTop) {
  window.addEventListener(
    "scroll",
    () => {
      if (window.scrollY > 420) {
        backToTop.classList.add("show");
      } else {
        backToTop.classList.remove("show");
      }
    },
    { passive: true }
  );

  // 点击后平滑回到页面顶部。
  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: getScrollBehavior() });
  });
}

// 页面滚动到对应区域时，卡片区域会平滑出现。
const revealElements = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window && !reduceMotionQuery.matches) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    },
    { threshold: 0.18 }
  );

  revealElements.forEach((el) => observer.observe(el));
} else {
  revealElements.forEach((el) => el.classList.add("is-visible"));
}

// PPT 展示区：默认只显示精选作品，点击按钮再展开全部。
const pptSection = document.getElementById("ppt");
const pptGrid = pptSection?.querySelector(".ppt-grid");
const pptCards = pptGrid ? Array.from(pptGrid.querySelectorAll(".ppt-card")) : [];
const pptCount = document.getElementById("pptCount");
const pptToggle = document.getElementById("pptToggle");
const pptHeading = pptSection?.querySelector(".section-head-ppt");
const defaultVisibleCount = 5;

if (pptGrid && pptToggle && pptCount && pptCards.length > 0) {
  const total = pptCards.length;
  pptCount.textContent = String(total);

  if (total > defaultVisibleCount) {
    const overflowGrid = document.createElement("div");
    overflowGrid.className = "grid cards-2 ppt-grid ppt-overflow-grid";
    overflowGrid.hidden = true;

    pptCards.slice(defaultVisibleCount).forEach((card) => {
      overflowGrid.appendChild(card);
    });

    pptGrid.insertAdjacentElement("afterend", overflowGrid);

    const getExpandLabel = () => `展开全部 ${total} 个作品`;
    const getCollapseLabel = () => "收起作品";

    pptToggle.hidden = false;
    pptToggle.textContent = getExpandLabel();

    pptToggle.addEventListener("click", () => {
      const expanded = pptToggle.getAttribute("aria-expanded") === "true";
      const nextExpanded = !expanded;

      overflowGrid.hidden = !nextExpanded;
      pptToggle.setAttribute("aria-expanded", String(nextExpanded));
      pptToggle.textContent = nextExpanded ? getCollapseLabel() : getExpandLabel();

      if (!nextExpanded) {
        pptHeading?.scrollIntoView({ behavior: getScrollBehavior(), block: "start" });
      }
    });
  } else {
    pptToggle.hidden = true;
  }
}

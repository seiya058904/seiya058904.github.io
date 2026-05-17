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

// 首页点赞：只保存当前浏览器状态，不代表公共点赞数。
const LIKE_STORAGE_PREFIX = "mpw-like-v1:";
const likeCardSelector = ".project-card[data-like-id]";
const likeButtonSelector = ".like-button";
const likeIdPattern = /^[a-z0-9-]+$/;
const LIKES_API_BASE =
  window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
    ? "http://127.0.0.1:8787"
    : "https://ppt-likes-api.seiya-api.workers.dev";

function sanitizeLikeId(id) {
  if (typeof id !== "string") {
    return null;
  }

  const normalizedId = id.trim().toLowerCase();
  return likeIdPattern.test(normalizedId) ? normalizedId : null;
}

function getLikeStorageKey(id) {
  const normalizedId = sanitizeLikeId(id);
  return normalizedId ? `${LIKE_STORAGE_PREFIX}${normalizedId}` : null;
}

function readLikeState(id) {
  const storageKey = getLikeStorageKey(id);

  if (!storageKey) {
    return false;
  }

  try {
    return window.localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

function writeLikeState(id, liked) {
  const storageKey = getLikeStorageKey(id);

  if (!storageKey) {
    return false;
  }

  try {
    if (liked) {
      window.localStorage.setItem(storageKey, "1");
    } else {
      window.localStorage.removeItem(storageKey);
    }

    return true;
  } catch {
    return false;
  }
}

function getLikeCountFromButton(button) {
  if (!(button instanceof HTMLElement)) {
    return 0;
  }

  const count = Number.parseInt(button.dataset.likeCount ?? "0", 10);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function getLikeMeta(liked, count) {
  const safeCount = Number.isFinite(count) && count >= 0 ? count : 0;

  return liked
    ? {
        icon: "♥",
        count: safeCount,
        ariaLabel: `已点赞，当前 ${safeCount} 个赞，点击取消点赞`,
      }
    : {
        icon: "♡",
        count: safeCount,
        ariaLabel: `未点赞，当前 ${safeCount} 个赞，点击点赞`,
      };
}

function renderLikeButton(button, liked, count) {
  if (!(button instanceof HTMLElement)) {
    return;
  }

  const meta = getLikeMeta(liked, count);
  const icon = button.querySelector(".like-button__icon");
  const countLabel = button.querySelector(".like-button__count");

  button.setAttribute("aria-pressed", String(liked));
  button.setAttribute("aria-label", meta.ariaLabel);
  button.dataset.liked = String(liked);
  button.dataset.likeCount = String(meta.count);

  if (icon) {
    icon.textContent = meta.icon;
  }

  if (countLabel) {
    countLabel.textContent = String(meta.count);
  }
}

function setLikeButtonPending(button, pending) {
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  button.disabled = pending;
  button.dataset.pending = String(pending);
}

async function fetchLikeCounts() {
  const response = await fetch(`${LIKES_API_BASE}/api/likes`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch likes: ${response.status}`);
  }

  const payload = await response.json();
  if (!payload?.success || typeof payload.likes !== "object" || payload.likes === null) {
    throw new Error("Invalid likes payload");
  }

  return payload.likes;
}

async function sendLikeAction(itemId, action) {
  const response = await fetch(`${LIKES_API_BASE}/api/like`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ itemId, action }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update like: ${response.status}`);
  }

  const payload = await response.json();
  if (!payload?.success || payload.itemId !== itemId || typeof payload.count !== "number") {
    throw new Error("Invalid like mutation payload");
  }

  return payload;
}

function toggleLocalLike(id) {
  const normalizedId = sanitizeLikeId(id);

  if (!normalizedId) {
    return null;
  }

  const nextLiked = !readLikeState(normalizedId);
  writeLikeState(normalizedId, nextLiked);

  return {
    id: normalizedId,
    liked: nextLiked,
  };
}

function createLikeButton(id) {
  const normalizedId = sanitizeLikeId(id);

  if (!normalizedId) {
    return null;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "like-button";
  button.dataset.role = "like-button";
  button.dataset.likeId = normalizedId;
  button.innerHTML = '<span class="like-button__icon" aria-hidden="true"></span><span class="like-button__count"></span>';

  renderLikeButton(button, readLikeState(normalizedId), 0);
  return button;
}

function ensureCardActions(card) {
  let actions = card.querySelector(".card-actions");

  if (actions) {
    return actions;
  }

  actions = document.createElement("div");
  actions.className = "card-actions";

  const primaryAction = card.querySelector(".btn-small");
  if (primaryAction) {
    actions.appendChild(primaryAction);
  }

  card.appendChild(actions);
  return actions;
}

function enhanceLikeCards() {
  document.querySelectorAll(likeCardSelector).forEach((card) => {
    const likeId = sanitizeLikeId(card.dataset.likeId);
    if (!likeId) {
      return;
    }

    card.dataset.likeId = likeId;

    const actions = ensureCardActions(card);
    if (actions.querySelector(likeButtonSelector)) {
      renderLikeButton(
        actions.querySelector(likeButtonSelector),
        readLikeState(likeId),
        getLikeCountFromButton(actions.querySelector(likeButtonSelector))
      );
      return;
    }

    const likeButton = createLikeButton(likeId);
    if (!likeButton) {
      return;
    }

    actions.appendChild(likeButton);
  });
}

async function hydratePublicLikeCounts() {
  try {
    const likes = await fetchLikeCounts();

    document.querySelectorAll(likeCardSelector).forEach((card) => {
      const likeId = sanitizeLikeId(card.dataset.likeId);
      const button = card.querySelector(likeButtonSelector);
      if (!likeId || !(button instanceof HTMLElement)) {
        return;
      }

      if (button.dataset.pending === "true") {
        return;
      }

      const count = Number.isFinite(likes[likeId]) && likes[likeId] >= 0 ? likes[likeId] : 0;
      renderLikeButton(button, readLikeState(likeId), count);
    });
  } catch (error) {
    console.warn("Unable to load public like counts.", error);
  }
}

function initLikeModule() {
  enhanceLikeCards();
  hydratePublicLikeCounts();

  document.addEventListener("click", (event) => {
    const button = event.target.closest(likeButtonSelector);
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const card = button.closest(likeCardSelector);
    if (!(card instanceof HTMLElement)) {
      return;
    }

    const likeId = sanitizeLikeId(card.dataset.likeId);
    if (!likeId) {
      return;
    }

    if (button.disabled) {
      return;
    }

    const previousLiked = readLikeState(likeId);
    const previousCount = getLikeCountFromButton(button);
    const result = toggleLocalLike(likeId);
    if (!result) {
      return;
    }

    const nextAction = result.liked ? "like" : "unlike";
    const optimisticCount = result.liked ? previousCount + 1 : Math.max(0, previousCount - 1);

    renderLikeButton(button, result.liked, optimisticCount);
    setLikeButtonPending(button, true);

    sendLikeAction(likeId, nextAction)
      .then((payload) => {
        renderLikeButton(button, result.liked, payload.count);
      })
      .catch((error) => {
        console.warn("Unable to update public like count.", error);
        writeLikeState(likeId, previousLiked);
        renderLikeButton(button, previousLiked, previousCount);
      })
      .finally(() => {
        setLikeButtonPending(button, false);
      });
  });
}

initLikeModule();

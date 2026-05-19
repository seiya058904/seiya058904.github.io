(function () {
  const config = window.MPW_COMMENTS_CONFIG;
  const likeIdPattern = /^[a-z0-9-]+$/;
  const cardSelector = ".project-card[data-like-id]";
  const commentButtonSelector = ".comment-button";
  const interactionGroupSelector = ".card-interactions";
  const maxCommentLength = 500;

  const state = {
    currentItemId: null,
    currentItemTitle: "",
  };

  function sanitizeItemId(id) {
    if (typeof id !== "string") {
      return null;
    }

    const normalizedId = id.trim().toLowerCase();
    return likeIdPattern.test(normalizedId) ? normalizedId : null;
  }

  function getCardTitle(card) {
    const heading = card.querySelector("h3");
    return heading?.textContent?.trim() || card.dataset.likeId || "Comments";
  }

  function getActionsContainer(card) {
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

  function getInteractionGroup(card) {
    const actions = getActionsContainer(card);
    let group = actions.querySelector(interactionGroupSelector);

    if (!group) {
      group = document.createElement("div");
      group.className = "card-interactions";
      actions.appendChild(group);
    }

    const likeButton = actions.querySelector(".like-button");
    if (likeButton && !group.contains(likeButton)) {
      group.insertBefore(likeButton, group.firstChild);
    }

    return group;
  }

  function createCommentButton(itemId) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "comment-button";
    button.dataset.commentItemId = itemId;
    button.setAttribute("aria-label", "查看评论");
    button.innerHTML = '<span class="comment-button__icon" aria-hidden="true">💬</span>';
    return button;
  }

  function enhanceCommentCards() {
    document.querySelectorAll(cardSelector).forEach((card) => {
      const itemId = sanitizeItemId(card.dataset.likeId);
      if (!itemId || card.querySelector(commentButtonSelector)) {
        return;
      }

      const group = getInteractionGroup(card);
      group.appendChild(createCommentButton(itemId));
    });
  }

  function createCommentModal() {
    if (document.getElementById("commentsModal")) {
      return;
    }

    const modal = document.createElement("div");
    modal.id = "commentsModal";
    modal.className = "comments-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="comments-modal__backdrop" data-comments-close></div>
      <section class="comments-modal__panel" role="dialog" aria-modal="true" aria-labelledby="commentsTitle">
        <header class="comments-modal__header">
          <div>
            <p class="comments-modal__eyebrow" id="commentsItemLabel"></p>
            <h2 id="commentsTitle">Comments</h2>
            <p class="comments-modal__count" id="commentsCount">0 comments</p>
          </div>
          <button class="comments-modal__close" type="button" data-comments-close aria-label="关闭评论">×</button>
        </header>
        <div class="comments-auth-state" id="commentsAuthState"></div>
        <div class="comments-list" id="commentsList" aria-live="polite"></div>
        <form class="comments-form" id="commentsForm">
          <label class="comments-form__label" for="commentsInput">Comment</label>
          <textarea id="commentsInput" class="comments-form__input" maxlength="500" rows="4" placeholder="写下你的评论"></textarea>
          <div class="comments-form__footer">
            <span class="comments-form__hint" id="commentsHint">最多 500 字</span>
            <button class="comments-form__submit" type="submit">发送</button>
          </div>
        </form>
        <p class="comments-status" id="commentsStatus" role="status"></p>
      </section>
    `;

    document.body.appendChild(modal);
  }

  function getElements() {
    return {
      modal: document.getElementById("commentsModal"),
      itemLabel: document.getElementById("commentsItemLabel"),
      count: document.getElementById("commentsCount"),
      list: document.getElementById("commentsList"),
      form: document.getElementById("commentsForm"),
      input: document.getElementById("commentsInput"),
      hint: document.getElementById("commentsHint"),
      status: document.getElementById("commentsStatus"),
      authState: document.getElementById("commentsAuthState"),
    };
  }

  function formatErrorMessage(error, fallback) {
    const message = error?.message || fallback;

    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      return "连接服务失败。请确认 Worker 和 Supabase 配置正常。";
    }

    return message;
  }

  function setStatus(message, tone) {
    const { status } = getElements();
    if (!status) {
      return;
    }

    status.textContent = message || "";
    status.dataset.tone = tone || "neutral";
  }

  function renderAuthState() {
    const { authState } = getElements();
    if (!authState) {
      return;
    }

    const user = window.MPWAuth?.getCurrentUser?.();
    const email = user?.email || "";
    const label = email ? `已登录：${email.split("@")[0]}` : "登录后发表评论";
    const actionText = email ? "Account" : "Sign in";

    authState.innerHTML = "";
    const labelEl = document.createElement("span");
    labelEl.textContent = label;

    const action = document.createElement("button");
    action.type = "button";
    action.className = "comments-account-open";
    action.textContent = actionText;
    action.addEventListener("click", () => {
      if (email) {
        window.location.href = "./account.html";
        return;
      }

      window.MPWAuth?.openAuthModal?.({
        mode: "signin",
        message: "登录后可以继续发表评论。",
      });
    });

    authState.append(labelEl, action);
  }

  function renderComments(comments, count) {
    const { list, count: countEl } = getElements();
    if (!list || !countEl) {
      return;
    }

    countEl.textContent = `${count} comments`;
    list.innerHTML = "";

    if (!comments.length) {
      const empty = document.createElement("p");
      empty.className = "comments-empty";
      empty.textContent = "No comments yet.";
      list.appendChild(empty);
      return;
    }

    comments.forEach((comment) => {
      const item = document.createElement("article");
      item.className = "comments-item";

      const meta = document.createElement("div");
      meta.className = "comments-item__meta";

      const author = document.createElement("strong");
      author.textContent = comment.author || "User";

      const time = document.createElement("time");
      time.dateTime = comment.createdAt;
      time.textContent = new Date(comment.createdAt).toLocaleString("zh-CN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const body = document.createElement("p");
      body.textContent = comment.content;

      meta.append(author, time);
      item.append(meta, body);
      list.appendChild(item);
    });
  }

  async function loadComments(itemId) {
    const { list } = getElements();
    if (list) {
      list.innerHTML = '<p class="comments-empty">Loading comments...</p>';
    }

    const response = await fetch(`${config.API_BASE}/api/comments?itemId=${encodeURIComponent(itemId)}&limit=50`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || "Unable to load comments");
    }

    renderComments(payload.comments || [], payload.count || 0);
  }

  async function submitComment() {
    const { input } = getElements();
    const itemId = state.currentItemId;
    const content = input?.value.trim() || "";

    if (!itemId) {
      return;
    }

    if (!content) {
      setStatus("评论不能为空。", "error");
      return;
    }

    if (content.length > maxCommentLength) {
      setStatus("评论不能超过 500 字。", "error");
      return;
    }

    const token = await window.MPWAuth?.getAccessToken?.();
    if (!token) {
      window.MPWAuth?.openAuthModal?.({
        mode: "signin",
        message: "请先登录或注册。登录成功后，评论内容会保留，请再点击一次发送。",
        onSuccess: () => {
          renderAuthState();
          setStatus("登录成功。评论内容已保留，请再点击一次发送。", "success");
        },
      });
      setStatus("请先登录或注册。登录成功后，评论内容会保留。", "neutral");
      return;
    }

    const response = await fetch(`${config.API_BASE}/api/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        itemId,
        content,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || "Unable to save comment");
    }

    input.value = "";
    const { hint } = getElements();
    if (hint) {
      hint.textContent = `0/${maxCommentLength}`;
    }
    setStatus("评论已发送。", "success");
    await loadComments(itemId);
  }

  async function openCommentsModal(card) {
    const itemId = sanitizeItemId(card.dataset.likeId);
    if (!itemId) {
      return;
    }

    state.currentItemId = itemId;
    state.currentItemTitle = getCardTitle(card);

    const { modal, itemLabel } = getElements();
    if (!modal || !itemLabel) {
      return;
    }

    itemLabel.textContent = state.currentItemTitle;
    modal.hidden = false;
    document.body.classList.add("comments-modal-open");
    setStatus("", "neutral");
    renderAuthState();

    try {
      await loadComments(itemId);
    } catch (error) {
      console.warn("Unable to load comments.", error);
      renderComments([], 0);
      setStatus(formatErrorMessage(error, "评论暂时无法加载。请确认 Worker secrets 和 Supabase SQL 已配置。"), "error");
    }

    const { input } = getElements();
    input?.focus();
  }

  function closeCommentsModal() {
    const { modal } = getElements();
    if (!modal) {
      return;
    }

    modal.hidden = true;
    document.body.classList.remove("comments-modal-open");
    setStatus("", "neutral");
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (event.target.closest("[data-comments-close]")) {
        closeCommentsModal();
        return;
      }

      const button = event.target.closest(commentButtonSelector);
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      const card = button.closest(cardSelector);
      if (card instanceof HTMLElement) {
        openCommentsModal(card);
      }
    });

    document.addEventListener("keydown", (event) => {
      const { modal } = getElements();
      if (event.key === "Escape" && modal && !modal.hidden) {
        closeCommentsModal();
      }
    });

    const { form, input } = getElements();
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await submitComment();
      } catch (error) {
        setStatus(formatErrorMessage(error, "评论发送失败。"), "error");
      }
    });

    input?.addEventListener("input", () => {
      const { hint } = getElements();
      if (hint) {
        hint.textContent = `${input.value.length}/${maxCommentLength}`;
      }
    });
  }

  async function initComments() {
    if (!config?.API_BASE) {
      console.warn("Comments config is missing.");
      return;
    }

    enhanceCommentCards();
    createCommentModal();
    bindEvents();
    renderAuthState();
    window.MPWAuth?.onAuthStateChange?.(() => renderAuthState());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initComments);
  } else {
    initComments();
  }
})();

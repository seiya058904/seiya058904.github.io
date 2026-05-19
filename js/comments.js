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
    button.setAttribute("aria-label", "Open comments");
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
          <div class="comments-modal__title">
            <p class="comments-modal__eyebrow" id="commentsItemLabel"></p>
            <h2 id="commentsTitle">Comments</h2>
            <p class="comments-modal__count" id="commentsCount">0 comments</p>
          </div>
          <button class="comments-modal__close" type="button" data-comments-close aria-label="Close comments">×</button>
        </header>
        <div class="comments-list" id="commentsList" aria-live="polite"></div>
        <div class="comments-composer">
          <div class="comments-auth-state" id="commentsAuthState"></div>
          <form class="comments-form" id="commentsForm">
            <label class="comments-form__label" for="commentsInput">Comment</label>
            <textarea id="commentsInput" class="comments-form__input" maxlength="500" rows="4" placeholder="Write a comment"></textarea>
            <div class="comments-form__footer">
              <span class="comments-form__hint" id="commentsHint">0/500</span>
              <button class="comments-form__submit" type="submit">Send</button>
            </div>
          </form>
          <p class="comments-status" id="commentsStatus" role="status"></p>
        </div>
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
      return "Service connection failed. Check Worker and Supabase settings.";
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
    const isSignedIn = Boolean(user);

    authState.innerHTML = "";

    const labelEl = document.createElement("span");
    labelEl.textContent = isSignedIn ? "Signed in" : "Sign in to comment";

    const action = document.createElement("button");
    action.type = "button";
    action.className = "comments-account-open";
    action.textContent = isSignedIn ? "Account" : "Sign in";
    action.addEventListener("click", () => {
      if (isSignedIn) {
        window.location.href = "./account.html";
        return;
      }

      window.MPWAuth?.openAuthModal?.({
        mode: "signin",
        message: "Sign in to comment.",
      });
    });

    authState.append(labelEl, action);
  }

  function renderComments(comments, count) {
    const { list, count: countEl } = getElements();
    if (!list || !countEl) {
      return;
    }

    countEl.textContent = `${count} ${count === 1 ? "comment" : "comments"}`;
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
      setStatus("Comment cannot be empty.", "error");
      return;
    }

    if (content.length > maxCommentLength) {
      setStatus("Comment cannot exceed 500 characters.", "error");
      return;
    }

    const token = await window.MPWAuth?.getAccessToken?.();
    if (!token) {
      window.MPWAuth?.openAuthModal?.({
        mode: "signin",
        message: "Sign in or create an account first. Your comment will stay here.",
        onSuccess: () => {
          renderAuthState();
          setStatus("Signed in. Click Send again to post your comment.", "success");
        },
      });
      setStatus("Sign in to comment.", "neutral");
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
    setStatus("Comment posted.", "success");
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
      setStatus(formatErrorMessage(error, "Comments are not available right now."), "error");
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
        setStatus(formatErrorMessage(error, "Comment failed."), "error");
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

(function () {
  const config = window.MPW_COMMENTS_CONFIG;
  const likeIdPattern = /^[a-z0-9-]+$/;
  const cardSelector = ".project-card[data-like-id]";
  const commentButtonSelector = ".comment-button";
  const interactionGroupSelector = ".card-interactions";
  const maxCommentLength = 500;

  const state = {
    supabase: null,
    session: null,
    currentItemId: null,
    currentItemTitle: "",
    authMode: "signin",
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

  function createModal() {
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
        <section class="comments-auth-panel" id="commentsAuthPanel" hidden>
          <div class="comments-auth-tabs" role="tablist" aria-label="登录或注册">
            <button type="button" class="comments-auth-tab is-active" data-auth-mode="signin">登录</button>
            <button type="button" class="comments-auth-tab" data-auth-mode="signup">注册</button>
          </div>
          <form class="comments-login-form" id="commentsLoginForm">
            <label>
              <span>邮箱</span>
              <input type="email" id="commentsEmail" autocomplete="email" required />
            </label>
            <label>
              <span>密码</span>
              <input type="password" id="commentsPassword" autocomplete="current-password" required minlength="6" />
            </label>
            <div class="comments-auth-actions">
              <button type="submit" class="comments-auth-submit" id="commentsAuthSubmit">登录</button>
              <button type="button" class="comments-auth-link" id="commentsResetPassword">忘记密码</button>
            </div>
          </form>
        </section>
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
      authPanel: document.getElementById("commentsAuthPanel"),
      loginForm: document.getElementById("commentsLoginForm"),
      email: document.getElementById("commentsEmail"),
      password: document.getElementById("commentsPassword"),
      authSubmit: document.getElementById("commentsAuthSubmit"),
    };
  }

  function formatErrorMessage(error, fallback) {
    const message = error?.message || fallback;

    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      return "连接服务失败。请确认本地 Worker 正在运行，并且 Supabase 配置已填写。";
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

  function setAuthPanelVisible(visible) {
    const { authPanel } = getElements();
    if (authPanel) {
      authPanel.hidden = !visible;
    }
  }

  function setAuthMode(mode) {
    state.authMode = mode === "signup" ? "signup" : "signin";
    document.querySelectorAll(".comments-auth-tab").forEach((tab) => {
      tab.classList.toggle("is-active", tab.dataset.authMode === state.authMode);
    });

    const { authSubmit } = getElements();
    if (authSubmit) {
      authSubmit.textContent = state.authMode === "signup" ? "注册" : "登录";
    }
  }

  function renderAuthState() {
    const { authState } = getElements();
    if (!authState) {
      return;
    }

    authState.innerHTML = "";
    const label = document.createElement("span");

    if (state.session?.user?.email) {
      label.textContent = `已登录：${state.session.user.email.split("@")[0]}`;
      const signOut = document.createElement("button");
      signOut.type = "button";
      signOut.textContent = "退出";
      signOut.addEventListener("click", async () => {
        await state.supabase?.auth.signOut();
        state.session = null;
        setStatus("已退出登录。", "neutral");
        renderAuthState();
      });
      authState.append(label, signOut);
      return;
    }

    label.textContent = "登录后发表评论";
    authState.appendChild(label);
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

  async function getAccessToken() {
    if (!state.supabase) {
      return null;
    }

    const { data } = await state.supabase.auth.getSession();
    state.session = data.session || null;
    renderAuthState();
    return state.session?.access_token || null;
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

    const token = await getAccessToken();
    if (!token) {
      setAuthPanelVisible(true);
      setStatus("请先登录或注册。登录成功后，评论内容会保留，请再点击一次发送。", "neutral");
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
    setAuthPanelVisible(false);
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

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const { email, password } = getElements();
    const emailValue = email?.value.trim();
    const passwordValue = password?.value || "";

    if (!state.supabase) {
      setStatus("Supabase 登录没有初始化。请检查 comments-config.js 和 Supabase JS CDN 是否加载成功。", "error");
      return;
    }

    if (!emailValue || !passwordValue) {
      setStatus("请输入邮箱和密码。", "error");
      return;
    }

    try {
      if (state.authMode === "signup") {
        const { data, error } = await state.supabase.auth.signUp({
          email: emailValue,
          password: passwordValue,
          options: {
            emailRedirectTo: window.location.href,
          },
        });

        if (error) {
          throw error;
        }

        state.session = data.session || null;
        renderAuthState();

        if (!data.session) {
          setStatus("请检查邮箱完成验证。验证后回到这里登录。", "success");
          return;
        }

        setAuthPanelVisible(false);
        setStatus("注册成功。评论内容已保留，请再点击一次发送。", "success");
        return;
      }

      const { data, error } = await state.supabase.auth.signInWithPassword({
        email: emailValue,
        password: passwordValue,
      });

      if (error) {
        throw error;
      }

      state.session = data.session || null;
      renderAuthState();
      setAuthPanelVisible(false);
      setStatus("登录成功。评论内容已保留，请再点击一次发送。", "success");
    } catch (error) {
      setStatus(formatErrorMessage(error, "登录或注册失败。"), "error");
    }
  }

  async function handlePasswordReset() {
    const { email } = getElements();
    const emailValue = email?.value.trim();
    if (!state.supabase || !emailValue) {
      setStatus("请先输入邮箱。", "error");
      return;
    }

    const { error } = await state.supabase.auth.resetPasswordForEmail(emailValue, {
      redirectTo: window.location.href,
    });

    if (error) {
      setStatus(formatErrorMessage(error, "密码找回邮件发送失败。"), "error");
      return;
    }

    setStatus("密码找回邮件已发送，请检查邮箱。", "success");
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const closeTarget = event.target.closest("[data-comments-close]");
      if (closeTarget) {
        closeCommentsModal();
        return;
      }

      const authModeTarget = event.target.closest("[data-auth-mode]");
      if (authModeTarget) {
        setAuthMode(authModeTarget.dataset.authMode);
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
      if (event.key === "Escape") {
        closeCommentsModal();
      }
    });

    const { form, loginForm, input } = getElements();
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

    loginForm?.addEventListener("submit", handleAuthSubmit);
    document.getElementById("commentsResetPassword")?.addEventListener("click", handlePasswordReset);
  }

  async function initSupabase() {
    if (!config?.SUPABASE_URL || !config?.SUPABASE_ANON_KEY) {
      console.warn("Supabase public config is missing.");
      return;
    }

    if (!window.supabase?.createClient) {
      console.warn("Supabase JS is not loaded.");
      return;
    }

    state.supabase = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    const { data } = await state.supabase.auth.getSession();
    state.session = data.session || null;
    state.supabase.auth.onAuthStateChange((_event, session) => {
      state.session = session || null;
      renderAuthState();
    });
  }

  async function initComments() {
    if (!config?.API_BASE) {
      console.warn("Comments config is missing.");
      return;
    }

    enhanceCommentCards();
    createModal();
    bindEvents();
    setAuthMode("signin");
    await initSupabase();
    renderAuthState();
  }

  initComments();
})();

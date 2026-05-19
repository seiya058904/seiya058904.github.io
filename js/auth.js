(function () {
  const config = window.MPW_COMMENTS_CONFIG;
  const state = {
    client: null,
    session: null,
    initialized: false,
    listeners: new Set(),
    authMode: "signin",
    successCallback: null,
  };

  function getEmailPrefix(email) {
    return (email || "").split("@")[0] || "Account";
  }

  function formatErrorMessage(error, fallback) {
    const message = error?.message || fallback;

    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      return "连接服务失败。请检查网络和 Supabase 配置。";
    }

    return message;
  }

  function getElements() {
    return {
      modal: document.getElementById("authModal"),
      title: document.getElementById("authTitle"),
      subtitle: document.getElementById("authSubtitle"),
      tabs: document.querySelectorAll("[data-auth-mode]"),
      form: document.getElementById("authForm"),
      email: document.getElementById("authEmail"),
      password: document.getElementById("authPassword"),
      submit: document.getElementById("authSubmit"),
      reset: document.getElementById("authResetPassword"),
      status: document.getElementById("authStatus"),
    };
  }

  function setStatus(message, tone) {
    const { status } = getElements();
    if (!status) {
      return;
    }

    status.textContent = message || "";
    status.dataset.tone = tone || "neutral";
  }

  function emitAuthChange() {
    updateAccountLinks();
    state.listeners.forEach((listener) => {
      listener(state.session);
    });
  }

  function updateAccountLinks() {
    document.querySelectorAll("[data-account-link]").forEach((link) => {
      const email = state.session?.user?.email;
      link.textContent = email ? getEmailPrefix(email) : "Account / 我的";
      link.setAttribute("aria-label", email ? `打开 ${getEmailPrefix(email)} 的账户页` : "打开账户页");
    });
  }

  function ensureModal() {
    if (document.getElementById("authModal")) {
      return;
    }

    const modal = document.createElement("div");
    modal.id = "authModal";
    modal.className = "auth-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="auth-modal__backdrop" data-auth-close></div>
      <section class="auth-modal__panel" role="dialog" aria-modal="true" aria-labelledby="authTitle">
        <header class="auth-modal__header">
          <div>
            <p class="auth-modal__eyebrow">Account</p>
            <h2 id="authTitle">登录账户</h2>
            <p id="authSubtitle">登录后可以发表评论</p>
          </div>
          <button class="auth-modal__close" type="button" data-auth-close aria-label="关闭登录窗口">×</button>
        </header>
        <div class="auth-tabs" role="tablist" aria-label="登录或注册">
          <button type="button" class="auth-tab is-active" data-auth-mode="signin">登录</button>
          <button type="button" class="auth-tab" data-auth-mode="signup">注册</button>
        </div>
        <form class="auth-form" id="authForm">
          <label>
            <span>邮箱</span>
            <input type="email" id="authEmail" autocomplete="email" required />
          </label>
          <label>
            <span>密码</span>
            <input type="password" id="authPassword" autocomplete="current-password" required minlength="6" />
          </label>
          <div class="auth-actions">
            <button type="submit" class="auth-submit" id="authSubmit">登录</button>
            <button type="button" class="auth-link" id="authResetPassword">忘记密码</button>
          </div>
        </form>
        <p class="auth-status" id="authStatus" role="status"></p>
      </section>
    `;

    document.body.appendChild(modal);
  }

  function setAuthMode(mode) {
    state.authMode = mode === "signup" ? "signup" : "signin";
    const { title, subtitle, tabs, submit, password } = getElements();

    tabs.forEach((tab) => {
      tab.classList.toggle("is-active", tab.dataset.authMode === state.authMode);
    });

    if (title) {
      title.textContent = state.authMode === "signup" ? "创建账户" : "登录账户";
    }

    if (subtitle) {
      subtitle.textContent =
        state.authMode === "signup" ? "注册后如果需要邮箱验证，请先完成验证" : "登录后可以发表评论";
    }

    if (submit) {
      submit.textContent = state.authMode === "signup" ? "注册" : "登录";
    }

    if (password) {
      password.autocomplete = state.authMode === "signup" ? "new-password" : "current-password";
    }
  }

  function openAuthModal(options = {}) {
    ensureModal();
    state.successCallback = typeof options.onSuccess === "function" ? options.onSuccess : null;
    setAuthMode(options.mode || "signin");
    setStatus(options.message || "", "neutral");

    const { modal, email } = getElements();
    if (modal) {
      modal.hidden = false;
      document.body.classList.add("auth-modal-open");
      window.setTimeout(() => email?.focus(), 0);
    }
  }

  function closeAuthModal() {
    const { modal } = getElements();
    if (!modal) {
      return;
    }

    modal.hidden = true;
    document.body.classList.remove("auth-modal-open");
    setStatus("", "neutral");
  }

  async function signIn(email, password) {
    if (!state.client) {
      throw new Error("Supabase 登录没有初始化。");
    }

    const { data, error } = await state.client.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }

    state.session = data.session || null;
    emitAuthChange();
    return state.session;
  }

  async function signUp(email, password) {
    if (!state.client) {
      throw new Error("Supabase 登录没有初始化。");
    }

    const { data, error } = await state.client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.href,
      },
    });

    if (error) {
      throw error;
    }

    state.session = data.session || null;
    emitAuthChange();
    return {
      session: state.session,
      needsEmailVerification: !data.session,
    };
  }

  async function signOut() {
    if (!state.client) {
      return;
    }

    await state.client.auth.signOut();
    state.session = null;
    emitAuthChange();
  }

  async function resetPassword(email) {
    if (!state.client) {
      throw new Error("Supabase 登录没有初始化。");
    }

    const { error } = await state.client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.href,
    });

    if (error) {
      throw error;
    }
  }

  async function getCurrentSession() {
    if (!state.client) {
      return null;
    }

    const { data } = await state.client.auth.getSession();
    state.session = data.session || null;
    emitAuthChange();
    return state.session;
  }

  function getCurrentUser() {
    return state.session?.user || null;
  }

  async function getAccessToken() {
    const session = await getCurrentSession();
    return session?.access_token || null;
  }

  function onAuthStateChange(callback) {
    if (typeof callback !== "function") {
      return () => {};
    }

    state.listeners.add(callback);
    callback(state.session);
    return () => state.listeners.delete(callback);
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const { email, password } = getElements();
    const emailValue = email?.value.trim();
    const passwordValue = password?.value || "";

    if (!emailValue || !passwordValue) {
      setStatus("请输入邮箱和密码。", "error");
      return;
    }

    try {
      if (state.authMode === "signup") {
        const result = await signUp(emailValue, passwordValue);
        if (result.needsEmailVerification) {
          setStatus("请检查邮箱完成验证。验证后回到这里登录。", "success");
          return;
        }
      } else {
        await signIn(emailValue, passwordValue);
      }

      closeAuthModal();
      state.successCallback?.(state.session);
      state.successCallback = null;
    } catch (error) {
      setStatus(formatErrorMessage(error, "登录或注册失败。"), "error");
    }
  }

  async function handlePasswordReset() {
    const { email } = getElements();
    const emailValue = email?.value.trim();

    if (!emailValue) {
      setStatus("请先输入邮箱。", "error");
      return;
    }

    try {
      await resetPassword(emailValue);
      setStatus("密码找回邮件已发送，请检查邮箱。", "success");
    } catch (error) {
      setStatus(formatErrorMessage(error, "密码找回邮件发送失败。"), "error");
    }
  }

  function bindModalEvents() {
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (event.target.closest("[data-auth-close]")) {
        closeAuthModal();
        return;
      }

      const authModeButton = event.target.closest("[data-auth-mode]");
      if (authModeButton) {
        setAuthMode(authModeButton.dataset.authMode);
        setStatus("", "neutral");
      }
    });

    document.addEventListener("keydown", (event) => {
      const { modal } = getElements();
      if (event.key === "Escape" && modal && !modal.hidden) {
        closeAuthModal();
      }
    });
  }

  async function init() {
    if (state.initialized) {
      return;
    }

    state.initialized = true;
    ensureModal();
    bindModalEvents();
    getElements().form?.addEventListener("submit", handleAuthSubmit);
    getElements().reset?.addEventListener("click", handlePasswordReset);

    if (!config?.SUPABASE_URL || !config?.SUPABASE_ANON_KEY) {
      console.warn("Supabase public config is missing.");
      updateAccountLinks();
      return;
    }

    if (!window.supabase?.createClient) {
      console.warn("Supabase JS is not loaded.");
      updateAccountLinks();
      return;
    }

    state.client = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    const { data } = await state.client.auth.getSession();
    state.session = data.session || null;
    updateAccountLinks();

    state.client.auth.onAuthStateChange((_event, session) => {
      state.session = session || null;
      emitAuthChange();
    });
  }

  window.MPWAuth = {
    init,
    getCurrentSession,
    getCurrentUser,
    getAccessToken,
    signIn,
    signUp,
    signOut,
    resetPassword,
    onAuthStateChange,
    openAuthModal,
    closeAuthModal,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

(function () {
  const config = window.MPW_COMMENTS_CONFIG;
  const state = {
    profile: null,
    listeners: new Set(),
    successCallback: null,
    userId: null,
    authGeneration: 0,
    loadRequest: 0,
    mutation: 0,
    saving: null,
    modalGeneration: 0,
    modalSaving: false,
  };

  function syncIdentity() {
    const userId = window.MPWAuth?.getCurrentUser?.()?.id || null;
    if (state.userId !== userId) {
      state.userId = userId;
      state.authGeneration++;
      state.profile = null;
      state.saving = null;
      closeProfileModal();
      emitProfileChange();
    }
    return { userId, generation: state.authGeneration };
  }

  function ownsIdentity(owner) {
    syncIdentity();
    return Boolean(owner.userId) && owner.userId === state.userId && owner.generation === state.authGeneration;
  }

  function staleRequest() {
    const error = new Error("资料请求已失效 / Profile request expired");
    error.code = "STALE_PROFILE";
    return error;
  }

  function requireOwner(owner) {
    if (!ownsIdentity(owner)) throw staleRequest();
  }

  function validateDisplayName(rawName) {
    const value = String(rawName || "").trim().replace(/\s+/g, " ");

    if (value.length < 2 || value.length > 24) {
      return { valid: false, value, error: "名称无效 / Invalid name" };
    }

    if (/[<>]/.test(value)) {
      return { valid: false, value, error: "名称无效 / Invalid name" };
    }

    if (/^\d+$/.test(value)) {
      return { valid: false, value, error: "名称无效 / Invalid name" };
    }

    if (!/^[\u4e00-\u9fffA-Za-z0-9 _-]+$/u.test(value)) {
      return {
        valid: false,
        value,
        error: "名称无效 / Invalid name",
      };
    }

    return { valid: true, value, error: "" };
  }

  function emitProfileChange() {
    state.listeners.forEach((listener) => listener(state.profile));
  }

  let cachedElements = null;

  function getElements() {
    if (cachedElements) {
      return cachedElements;
    }

    cachedElements = {
      modal: document.getElementById("profileModal"),
      title: document.getElementById("profileTitle"),
      message: document.getElementById("profileMessage"),
      form: document.getElementById("profileForm"),
      input: document.getElementById("profileDisplayName"),
      submit: document.getElementById("profileSubmit"),
      status: document.getElementById("profileStatus"),
    };

    return cachedElements;
  }

  function setStatus(message, tone) {
    const { status } = getElements();
    if (!status) {
      return;
    }

    status.textContent = message || "";
    status.dataset.tone = tone || "neutral";
  }

  function ensureModal() {
    if (document.getElementById("profileModal")) {
      return;
    }

    const modal = document.createElement("div");
    modal.id = "profileModal";
    modal.className = "profile-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="profile-modal__backdrop" data-profile-close></div>
      <section class="profile-modal__panel reveal" role="dialog" aria-modal="true" aria-labelledby="profileTitle">
        <header class="profile-modal__header">
          <div>
            <p class="profile-modal__eyebrow">Profile</p>
            <h2 id="profileTitle">设置显示名称</h2>
            <p id="profileMessage">评论区将显示此名称 / Shown with your comments</p>
          </div>
          <button class="profile-modal__close" type="button" data-profile-close aria-label="关闭显示名称设置">×</button>
        </header>
        <form class="profile-form" id="profileForm">
          <label>
            <span>显示名称 Display name</span>
            <input type="text" id="profileDisplayName" maxlength="24" autocomplete="nickname" required />
          </label>
          <p class="profile-form__hint">评论区将显示此名称 / Shown with your comments</p>
          <button type="submit" class="profile-submit" id="profileSubmit">保存 Save</button>
        </form>
        <p class="profile-status" id="profileStatus" role="status"></p>
      </section>
    `;

    document.body.appendChild(modal);
    window.MPWScrollReveal?.register(modal);
  }

  function openProfileModal(options = {}) {
    ensureModal();
    syncIdentity();
    const generation = ++state.modalGeneration;
    state.modalSaving = false;
    const { submit } = getElements();
    if (submit) submit.disabled = false;
    state.successCallback = typeof options.onSuccess === "function" ? options.onSuccess : null;

    const { modal, title, message, input } = getElements();
    if (title) {
      title.textContent = options.title || "设置显示名称";
    }
    if (message) {
      message.textContent = options.message || "评论区将显示此名称 / Shown with your comments";
    }
    if (input) {
      input.value = options.displayName || state.profile?.displayName || "";
    }

    setStatus("", "neutral");
    if (modal) {
      modal.hidden = false;
      document.body.classList.add("profile-modal-open");
      window.setTimeout(() => {
        if (generation === state.modalGeneration && !modal.hidden) input?.focus();
      }, 0);
    }
  }

  function closeProfileModal() {
    state.modalGeneration++;
    state.modalSaving = false;
    state.successCallback = null;
    const { modal } = getElements();
    if (!modal) {
      return;
    }

    modal.hidden = true;
    document.body.classList.remove("profile-modal-open");
    setStatus("", "neutral");
  }

  async function getToken(owner) {
    requireOwner(owner);
    const token = await window.MPWAuth?.getAccessToken?.();
    requireOwner(owner);
    if (!token) {
      throw new Error("请先登录 / Sign in required");
    }
    return token;
  }

  async function loadProfile(options = {}) {
    const owner = syncIdentity();
    const request = ++state.loadRequest;
    const mutation = state.mutation;
    const token = await getToken(owner);
    const response = await fetch(`${config.API_BASE}/api/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const payload = await response.json().catch(() => null);
    requireOwner(owner);
    if (request !== state.loadRequest || mutation !== state.mutation || state.saving) throw staleRequest();
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || "加载失败 / Failed to load");
    }

    state.profile = payload.profile || null;
    if (!options.silent) {
      emitProfileChange();
    }
    return state.profile;
  }

  async function saveProfile(displayName) {
    const validation = validateDisplayName(displayName);
    if (!validation.valid) throw new Error(validation.error);
    const owner = syncIdentity();
    const mutation = ++state.mutation;
    const operation = { ...owner, mutation };
    state.saving = operation;
    try {
      const token = await getToken(owner);
      if (mutation !== state.mutation) throw staleRequest();
      const response = await fetch(`${config.API_BASE}/api/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({ displayName: validation.value }),
      });
      const payload = await response.json().catch(() => null);
      requireOwner(owner);
      if (mutation !== state.mutation) throw staleRequest();
      if (!response.ok || !payload?.success) throw new Error(payload?.error || "保存失败 / Failed to save");
      state.mutation++; // Invalidate GETs begun while this write was pending.
      state.profile = payload.profile;
      emitProfileChange();
      return state.profile;
    } finally {
      if (state.saving === operation) state.saving = null;
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    if (state.modalSaving) return;
    const owner = syncIdentity();
    const generation = state.modalGeneration;
    const callback = state.successCallback;
    const current = () => ownsIdentity(owner) && generation === state.modalGeneration;
    const { input, submit } = getElements();
    state.modalSaving = true;
    try {
      if (submit) submit.disabled = true;
      const profile = await saveProfile(input?.value || "");
      if (!current()) return;
      setStatus("已保存 Saved", "success");
      window.setTimeout(() => {
        if (!current()) return;
        closeProfileModal();
        callback?.(profile);
      }, 250);
    } catch (error) {
      if (current() && error?.code !== "STALE_PROFILE") setStatus(error?.message || "名称无效 / Invalid name", "error");
    } finally {
      if (current()) {
        state.modalSaving = false;
        if (submit) submit.disabled = false;
      }
    }
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (event.target.closest("[data-profile-close]")) {
        closeProfileModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      const { modal } = getElements();
      if (event.key === "Escape" && modal && !modal.hidden) {
        closeProfileModal();
      }
    });

    getElements().form?.addEventListener("submit", handleProfileSubmit);
  }

  function onProfileChange(callback) {
    if (typeof callback !== "function") {
      return () => {};
    }

    state.listeners.add(callback);
    callback(state.profile);
    return () => state.listeners.delete(callback);
  }

  function init() {
    if (!config?.API_BASE) {
      console.warn("Profile config is missing.");
      return;
    }

    ensureModal();
    bindEvents();
    window.MPWAuth?.onAuthStateChange?.(() => syncIdentity());
  }

  window.MPWProfile = {
    validateDisplayName,
    loadProfile,
    saveProfile,
    openProfileModal,
    closeProfileModal,
    onProfileChange,
    getCachedProfile: () => { syncIdentity(); return state.profile; },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

(function () {
  const state = {
    currentUserId: null,
    savedDisplayName: "",
    profileDraft: "",
    isProfileDirty: false,
    isProfileEditing: false,
    isComposing: false,
    isSavingProfile: false,
    isLoadingProfile: false,
  };

  function debugAccount(message, detail) {
    const isDebug =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      new URLSearchParams(window.location.search).has("debugAccount");

    if (isDebug) {
      console.log(`[account] ${message}`, detail || "");
    }
  }

  function getElements() {
    return {
      loadingView: document.getElementById("accountLoadingView"),
      signedOutView: document.getElementById("signedOutView"),
      signedInView: document.getElementById("signedInView"),
      signIn: document.getElementById("accountSignIn"),
      signUp: document.getElementById("accountSignUp"),
      signOut: document.getElementById("accountSignOut"),
      avatar: document.getElementById("accountAvatar"),
      email: document.getElementById("accountEmail"),
      profileForm: document.getElementById("accountProfileForm"),
      displayName: document.getElementById("accountDisplayName"),
      saveProfile: document.getElementById("accountProfileSave"),
      profileReset: document.getElementById("accountProfileReset"),
      profileHelp: document.getElementById("accountProfileHelp"),
      profileStatus: document.getElementById("accountProfileStatus"),
    };
  }

  function getEmailPrefix(email) {
    return (email || "").split("@")[0] || "Account";
  }

  function normalizeDraft(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function hasActiveDraft() {
    const { displayName } = getElements();
    return state.isProfileEditing || state.isProfileDirty || state.isComposing || document.activeElement === displayName;
  }

  function setProfileStatus(message, tone) {
    const { profileStatus } = getElements();
    if (!profileStatus) {
      return;
    }

    profileStatus.textContent = message || "";
    profileStatus.dataset.tone = tone || "neutral";
  }

  function setDisplayNameInput(value, reason, options = {}) {
    const { displayName } = getElements();
    if (!displayName) {
      return false;
    }

    if (!options.force && hasActiveDraft()) {
      return false;
    }

    displayName.value = value || "";
    state.profileDraft = displayName.value;
    return true;
  }

  function updateProfileControls() {
    const { profileReset } = getElements();
    if (profileReset) {
      profileReset.hidden = !state.isProfileDirty;
    }
  }

  function applyProfile(profile, options = {}) {
    const elements = getElements();
    const displayName = profile?.displayName || "";

    state.savedDisplayName = displayName;
    setDisplayNameInput(displayName, options.reason || "profile-refresh", { force: Boolean(options.forceInput) });
    updateProfileControls();

    if (elements.profileHelp) {
      elements.profileHelp.innerHTML = "评论区将显示此名称 <span>Shown with your comments</span>";
    }

    if (elements.avatar && displayName) {
      elements.avatar.textContent = displayName.slice(0, 1).toUpperCase();
    }
  }

  function resetProfileEditor(profileName) {
    state.savedDisplayName = profileName || "";
    state.profileDraft = state.savedDisplayName;
    state.isProfileDirty = false;
    state.isProfileEditing = false;
    state.isComposing = false;
    setDisplayNameInput(state.savedDisplayName, "reset-editor", { force: true });
    updateProfileControls();
  }

  async function loadProfileForAccount(options = {}) {
    if (state.isLoadingProfile) {
      debugAccount("load-profile:skip", "already loading");
      return;
    }

    try {
      state.isLoadingProfile = true;
      debugAccount("load-profile:start", options.reason || "load-profile");
      const profile = await window.MPWProfile?.loadProfile?.();
      applyProfile(profile, {
        forceInput: Boolean(options.forceInput),
        reason: options.reason || "load-profile",
      });
      setProfileStatus("", "neutral");
      debugAccount("load-profile:success", profile?.displayName || "");
    } catch (error) {
      debugAccount("load-profile:error", error?.message || error);
      setProfileStatus(error?.message || "加载失败 Failed to load", "error");
    } finally {
      state.isLoadingProfile = false;
    }
  }

  function renderAccount(session) {
    debugAccount("render", session?.user?.id || "signed-out");
    const elements = getElements();
    const user = session?.user || null;
    const isSignedIn = Boolean(user);

    if (elements.loadingView) {
      elements.loadingView.hidden = true;
    }

    if (elements.signedOutView) {
      elements.signedOutView.hidden = isSignedIn;
    }

    if (elements.signedInView) {
      elements.signedInView.hidden = !isSignedIn;
    }

    if (!user) {
      state.currentUserId = null;
      resetProfileEditor("");
      setProfileStatus("", "neutral");
      return;
    }

    const isNewUser = state.currentUserId !== user.id;
    if (isNewUser) {
      state.currentUserId = user.id;
      resetProfileEditor("");
    }

    const email = user.email || "";
    const fallbackName = getEmailPrefix(email);

    if (elements.avatar && !state.savedDisplayName) {
      elements.avatar.textContent = fallbackName.slice(0, 1).toUpperCase();
    }

    if (elements.email) {
      elements.email.textContent = email || "-";
    }

    loadProfileForAccount({
      forceInput: isNewUser,
      reason: isNewUser ? "user-change" : "session-refresh",
    });
  }

  function bindProfileInput() {
    const { displayName, profileReset } = getElements();

    displayName?.addEventListener("focus", () => {
      state.isProfileEditing = true;
    });

    displayName?.addEventListener("beforeinput", () => {
      state.isProfileEditing = true;
    });

    displayName?.addEventListener("compositionstart", () => {
      state.isComposing = true;
      state.isProfileEditing = true;
    });

    displayName?.addEventListener("compositionend", () => {
      state.isComposing = false;
      state.profileDraft = displayName.value;
      state.isProfileDirty = normalizeDraft(state.profileDraft) !== state.savedDisplayName;
      updateProfileControls();
    });

    displayName?.addEventListener("input", () => {
      state.profileDraft = displayName.value;
      state.isProfileEditing = true;
      state.isProfileDirty = normalizeDraft(state.profileDraft) !== state.savedDisplayName;
      updateProfileControls();
      setProfileStatus("", "neutral");
    });

    displayName?.addEventListener("blur", () => {
      state.isProfileEditing = false;
      state.profileDraft = displayName.value;
      state.isProfileDirty = normalizeDraft(state.profileDraft) !== state.savedDisplayName;
      updateProfileControls();
    });

    profileReset?.addEventListener("click", () => {
      resetProfileEditor(state.savedDisplayName);
      setProfileStatus("已重置 Reset", "neutral");
    });
  }

  function bindEvents() {
    const { signIn, signUp, signOut, profileForm, displayName, saveProfile } = getElements();

    signIn?.addEventListener("click", () => {
      window.MPWAuth?.openAuthModal?.({
        mode: "signin",
        message: "登录后继续 / Sign in to continue",
      });
    });

    signUp?.addEventListener("click", () => {
      window.MPWAuth?.openAuthModal?.({
        mode: "signup",
        message: "请检查邮箱 / Check your email",
      });
    });

    signOut?.addEventListener("click", async () => {
      await window.MPWAuth?.signOut?.();
      renderAccount(null);
    });

    profileForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (state.isSavingProfile) {
        return;
      }

      try {
        state.isSavingProfile = true;
        if (saveProfile) {
          saveProfile.disabled = true;
          saveProfile.textContent = "保存中 Saving...";
        }
        debugAccount("save-profile:start", displayName?.value || "");
        const profile = await window.MPWProfile?.saveProfile?.(displayName?.value || "");
        resetProfileEditor(profile?.displayName || "");
        applyProfile(profile, { forceInput: true, reason: "save-success" });
        setProfileStatus("已保存 Saved", "success");
        debugAccount("save-profile:success", profile?.displayName || "");
      } catch (error) {
        debugAccount("save-profile:error", error?.message || error);
        state.profileDraft = displayName?.value || state.profileDraft;
        state.isProfileDirty = normalizeDraft(state.profileDraft) !== state.savedDisplayName;
        updateProfileControls();
        setProfileStatus(error?.message || "保存失败 Failed to save", "error");
      } finally {
        state.isSavingProfile = false;
        if (saveProfile) {
          saveProfile.disabled = false;
          saveProfile.textContent = "保存 Save";
        }
      }
    });

    bindProfileInput();
  }

  async function initAccount() {
    debugAccount("init");
    bindEvents();

    window.MPWProfile?.onProfileChange?.((profile) => {
      applyProfile(profile, { reason: "profile-change-event" });
    });

    window.MPWAuth?.onAuthStateChange?.((session) => {
      debugAccount("auth-state-change", session?.user?.id || "signed-out");
      renderAccount(session);
    });

    const session = await window.MPWAuth?.getCurrentSession?.();
    renderAccount(session);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAccount);
  } else {
    initAccount();
  }
})();

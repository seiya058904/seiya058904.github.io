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
      signedOutView: document.getElementById("signedOutView"),
      signedInView: document.getElementById("signedInView"),
      signIn: document.getElementById("accountSignIn"),
      signUp: document.getElementById("accountSignUp"),
      signOut: document.getElementById("accountSignOut"),
      avatar: document.getElementById("accountAvatar"),
      name: document.getElementById("accountName"),
      email: document.getElementById("accountEmail"),
      userId: document.getElementById("accountUserId"),
      verified: document.getElementById("accountVerified"),
      profileForm: document.getElementById("accountProfileForm"),
      displayName: document.getElementById("accountDisplayName"),
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
      elements.profileHelp.textContent = displayName
        ? "This name is shown next to your comments. Your email is not public in the comments area."
        : "A default display name will be created for your account. You can change it here anytime.";
    }

    if (elements.name) {
      elements.name.textContent = displayName || "Account";
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
      setProfileStatus(profile ? "" : "A default display name will be created automatically.", "neutral");
      debugAccount("load-profile:success", profile?.displayName || "");
    } catch (error) {
      debugAccount("load-profile:error", error?.message || error);
      setProfileStatus(error?.message || "Unable to load display name.", "error");
    } finally {
      state.isLoadingProfile = false;
    }
  }

  function renderAccount(session) {
    debugAccount("render", session?.user?.id || "signed-out");
    const elements = getElements();
    const user = session?.user || null;
    const isSignedIn = Boolean(user);

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

    if (elements.name && !state.savedDisplayName) {
      elements.name.textContent = "Account";
    }

    if (elements.email) {
      elements.email.textContent = email || "-";
    }

    if (elements.userId) {
      elements.userId.textContent = user.id ? user.id.slice(0, 8) : "-";
    }

    if (elements.verified) {
      elements.verified.textContent = user.email_confirmed_at ? "Yes" : "No";
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
      setProfileStatus("Reset to saved display name.", "neutral");
    });
  }

  function bindEvents() {
    const { signIn, signUp, signOut, profileForm, displayName } = getElements();

    signIn?.addEventListener("click", () => {
      window.MPWAuth?.openAuthModal?.({
        mode: "signin",
        message: "Sign in to comment and manage your account.",
      });
    });

    signUp?.addEventListener("click", () => {
      window.MPWAuth?.openAuthModal?.({
        mode: "signup",
        message: "Create an account. If email verification is required, finish that first.",
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
        debugAccount("save-profile:start", displayName?.value || "");
        const profile = await window.MPWProfile?.saveProfile?.(displayName?.value || "");
        resetProfileEditor(profile?.displayName || "");
        applyProfile(profile, { forceInput: true, reason: "save-success" });
        setProfileStatus("Saved.", "success");
        debugAccount("save-profile:success", profile?.displayName || "");
      } catch (error) {
        debugAccount("save-profile:error", error?.message || error);
        state.profileDraft = displayName?.value || state.profileDraft;
        state.isProfileDirty = normalizeDraft(state.profileDraft) !== state.savedDisplayName;
        updateProfileControls();
        setProfileStatus(error?.message || "Unable to save display name.", "error");
      } finally {
        state.isSavingProfile = false;
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

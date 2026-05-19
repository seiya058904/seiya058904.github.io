(function () {
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
      profileHelp: document.getElementById("accountProfileHelp"),
      profileStatus: document.getElementById("accountProfileStatus"),
    };
  }

  function getEmailPrefix(email) {
    return (email || "").split("@")[0] || "Account";
  }

  function setProfileStatus(message, tone) {
    const { profileStatus } = getElements();
    if (!profileStatus) {
      return;
    }

    profileStatus.textContent = message || "";
    profileStatus.dataset.tone = tone || "neutral";
  }

  function applyProfile(profile) {
    const elements = getElements();
    const displayName = profile?.displayName || "";

    if (elements.displayName) {
      elements.displayName.value = displayName;
    }

    if (elements.profileHelp) {
      elements.profileHelp.textContent = displayName
        ? "This name is shown next to your comments. Your email is not public in the comments area."
        : "A default display name will be created for your account. You can change it here anytime.";
    }

    if (elements.name && displayName) {
      elements.name.textContent = displayName;
    }

    if (elements.avatar && displayName) {
      elements.avatar.textContent = displayName.slice(0, 1).toUpperCase();
    }
  }

  async function loadProfileForAccount() {
    try {
      const profile = await window.MPWProfile?.loadProfile?.();
      applyProfile(profile);
      setProfileStatus(profile ? "" : "A default display name will be created automatically.", profile ? "neutral" : "neutral");
    } catch (error) {
      setProfileStatus(error?.message || "Unable to load display name.", "error");
    }
  }

  function renderAccount(session) {
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
      setProfileStatus("", "neutral");
      return;
    }

    const email = user.email || "";
    const fallbackName = getEmailPrefix(email);

    if (elements.avatar) {
      elements.avatar.textContent = fallbackName.slice(0, 1).toUpperCase();
    }

    if (elements.name) {
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

    loadProfileForAccount();
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
      try {
        const profile = await window.MPWProfile?.saveProfile?.(displayName?.value || "");
        applyProfile(profile);
        setProfileStatus("Saved.", "success");
      } catch (error) {
        setProfileStatus(error?.message || "Unable to save display name.", "error");
      }
    });
  }

  async function initAccount() {
    bindEvents();
    window.MPWProfile?.onProfileChange?.((profile) => applyProfile(profile));
    window.MPWAuth?.onAuthStateChange?.((session) => renderAccount(session));
    const session = await window.MPWAuth?.getCurrentSession?.();
    renderAccount(session);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAccount);
  } else {
    initAccount();
  }
})();

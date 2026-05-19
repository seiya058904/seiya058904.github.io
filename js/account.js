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
    };
  }

  function getEmailPrefix(email) {
    return (email || "").split("@")[0] || "Account";
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
      return;
    }

    const email = user.email || "";
    const name = getEmailPrefix(email);

    if (elements.avatar) {
      elements.avatar.textContent = name.slice(0, 1).toUpperCase();
    }

    if (elements.name) {
      elements.name.textContent = name;
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
  }

  function bindEvents() {
    const { signIn, signUp, signOut } = getElements();

    signIn?.addEventListener("click", () => {
      window.MPWAuth?.openAuthModal?.({
        mode: "signin",
        message: "登录后可以发表评论、查看账户状态。",
      });
    });

    signUp?.addEventListener("click", () => {
      window.MPWAuth?.openAuthModal?.({
        mode: "signup",
        message: "创建账户后，如果需要邮箱验证，请先完成验证。",
      });
    });

    signOut?.addEventListener("click", async () => {
      await window.MPWAuth?.signOut?.();
      renderAccount(null);
    });
  }

  async function initAccount() {
    bindEvents();
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

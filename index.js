here"use strict";

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const state = {
  loginMode: "phone",
  registerMode: "phone",
  isLoading: false,
  support: {
    whatsapp: "",
    telegram: "",
    facebook: "",
    whatsappChannel: "",
    phone: ""
  }
};

const selectors = {
  body: document.body,
  menuToggle: $("#menuToggle"),
  mobileMenu: $("#mobileMenu"),
  overlay: $("#pageOverlay"),
  loginModal: $("#loginModal"),
  registerModal: $("#registerModal"),
  forgotModal: $("#forgotModal"),
  supportModal: $("#supportModal"),
  loginForm: $("#loginForm"),
  registerForm: $("#registerForm"),
  forgotForm: $("#forgotForm"),
  closeButtons: $$("[data-close-modal]"),
  loginButtons: $$("[data-open-login]"),
  registerButtons: $$("[data-open-register]"),
  supportButtons: $$("[data-open-support]"),
  logoutButtons: $$("[data-logout]"),
  loginPhone: $("#loginPhone"),
  loginEmail: $("#loginEmail"),
  loginPassword: $("#loginPassword"),
  registerName: $("#registerName"),
  registerPhone: $("#registerPhone"),
  registerEmail: $("#registerEmail"),
  registerPassword: $("#registerPassword"),
  registerGrade: $("#registerGrade"),
  forgotEmail: $("#forgotEmail"),
  forgotPhone: $("#forgotPhone"),
  toast: $("#toast"),
  toastMessage: $("#toastMessage"),
  loadingScreen: $("#loadingScreen"),
  passwordToggles: $$("[data-password-toggle]"),
  authSwitches: $$("[data-auth-switch]"),
  faqItems: $$("[data-faq]")
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  setupNavigation();
  setupModals();
  setupForms();
  setupPasswordToggles();
  setupAuthSwitches();
  setupFaq();
  setupSupport();
  setupGlobalClicks();
  loadSupportSettings();
  restoreSession();
}

function setupNavigation() {
  if (selectors.menuToggle) {
    selectors.menuToggle.addEventListener("click", () => {
      const opened = selectors.mobileMenu?.classList.toggle("active");

      selectors.menuToggle.classList.toggle("active", opened);

      if (selectors.overlay) {
        selectors.overlay.classList.toggle("active", opened);
      }

      document.body.classList.toggle("menu-open", opened);
    });
  }

  if (selectors.overlay) {
    selectors.overlay.addEventListener("click", closeMobileMenu);
  }

  $$(".mobileMenu a, .mobile-menu a, [data-menu-link]").forEach(link => {
    link.addEventListener("click", closeMobileMenu);
  });

  $$('a[href^="#"]').forEach(link => {
    link.addEventListener("click", event => {
      const targetId = link.getAttribute("href");

      if (!targetId || targetId === "#") {
        return;
      }

      const target = document.querySelector(targetId);

      if (!target) {
        return;
      }

      event.preventDefault();

      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

      closeMobileMenu();
    });
  });
}

function closeMobileMenu() {
  selectors.mobileMenu?.classList.remove("active");
  selectors.menuToggle?.classList.remove("active");
  selectors.overlay?.classList.remove("active");
  document.body.classList.remove("menu-open");
}

function setupModals() {
  selectors.loginButtons.forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      closeMobileMenu();
      openModal(selectors.loginModal);
    });
  });

  selectors.registerButtons.forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      closeMobileMenu();
      openModal(selectors.registerModal);
    });
  });

  selectors.supportButtons.forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      closeMobileMenu();
      openModal(selectors.supportModal);
    });
  });

  $$("[data-open-forgot]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      closeModal(selectors.loginModal);
      openModal(selectors.forgotModal);
    });
  });

  selectors.closeButtons.forEach(button => {
    button.addEventListener("click", () => {
      const modal = button.closest(".modal, .modal-wrapper, [role='dialog']");

      if (modal) {
        closeModal(modal);
      }
    });
  });

  $$(".modal, .modal-wrapper, [role='dialog']").forEach(modal => {
    modal.addEventListener("click", event => {
      if (event.target === modal) {
        closeModal(modal);
      }
    });
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") {
      return;
    }

    $$(".modal.active, .modal.open, .modal.show").forEach(closeModal);
    closeMobileMenu();
  });
}

function openModal(modal) {
  if (!modal) {
    return;
  }

  modal.classList.add("active");
  modal.classList.add("open");
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");

  document.body.classList.add("modal-open");

  const firstInput = modal.querySelector(
    "input:not([type='hidden']), select, textarea, button"
  );

  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }
}

function closeModal(modal) {
  if (!modal) {
    return;
  }

  modal.classList.remove("active");
  modal.classList.remove("open");
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");

  if (!$$(".modal.active, .modal.open, .modal.show").length) {
    document.body.classList.remove("modal-open");
  }
}

function closeAllModals() {
  $$(".modal.active, .modal.open, .modal.show").forEach(closeModal);
}

function setupForms() {
  if (selectors.loginForm) {
    selectors.loginForm.addEventListener("submit", handleLogin);
  }

  if (selectors.registerForm) {
    selectors.registerForm.addEventListener("submit", handleRegister);
  }

  if (selectors.forgotForm) {
    selectors.forgotForm.addEventListener("submit", handleForgotPassword);
  }
}

async function handleLogin(event) {
  event.preventDefault();

  if (state.isLoading) {
    return;
  }

  const identifier =
    getValue(selectors.loginPhone) ||
    getValue(selectors.loginEmail) ||
    getValue($("#loginIdentifier"));

  const password = getValue(selectors.loginPassword);

  if (!identifier) {
    showToast("Enter your phone number or email.", "error");
    return;
  }

  if (!password) {
    showToast("Enter your password.", "error");
    return;
  }

  if (password.length < 4) {
    showToast("Password is too short.", "error");
    return;
  }

  setLoading(true);

  try {
    const firebaseApi = getFirebaseApi();

    if (!firebaseApi) {
      showToast("Authentication service is not ready yet.", "error");
      return;
    }

    let result = null;

    if (typeof firebaseApi.login === "function") {
      result = await firebaseApi.login({
        identifier,
        password,
        mode: detectIdentifierType(identifier)
      });
    } else if (typeof firebaseApi.loginUser === "function") {
      result = await firebaseApi.loginUser(identifier, password);
    } else if (typeof firebaseApi.signIn === "function") {
      result = await firebaseApi.signIn(identifier, password);
    } else {
      showToast("Authentication service is not configured.", "error");
      return;
    }

    if (!result) {
      showToast("Login failed.", "error");
      return;
    }

    if (result.success === false) {
      showToast(result.message || "Invalid login information.", "error");
      return;
    }

    const user = result.user || result;

    if (user && typeof user === "object") {
      saveSession(user);
    }

    showToast("Login successful.", "success");

    setTimeout(() => {
      closeAllModals();
      redirectAfterLogin(user);
    }, 500);
  } catch (error) {
    console.error("Login error:", error);
    showToast(getFriendlyAuthError(error), "error");
  } finally {
    setLoading(false);
  }
}

async function handleRegister(event) {
  event.preventDefault();

  if (state.isLoading) {
    return;
  }

  const name = getValue(selectors.registerName);
  const phone = getValue(selectors.registerPhone);
  const email = getValue(selectors.registerEmail);
  const password = getValue(selectors.registerPassword);
  const grade = getValue(selectors.registerGrade);

  if (!name) {
    showToast("Enter your full name.", "error");
    return;
  }

  if (!phone && !email) {
    showToast("Enter a phone number or email.", "error");
    return;
  }

  if (phone && !isValidPhone(phone)) {
    showToast("Enter a valid phone number.", "error");
    return;
  }

  if (email && !isValidEmail(email)) {
    showToast("Enter a valid email address.", "error");
    return;
  }

  if (!password) {
    showToast("Create a password.", "error");
    return;
  }

  if (password.length < 6) {
    showToast("Password must be at least 6 characters.", "error");
    return;
  }

  setLoading(true);

  try {
    const firebaseApi = getFirebaseApi();

    if (!firebaseApi) {
      showToast("Authentication service is not ready yet.", "error");
      return;
    }

    const payload = {
      name,
      phone,
      email,
      password,
      grade
    };

    let result = null;

    if (typeof firebaseApi.register === "function") {
      result = await firebaseApi.register(payload);
    } else if (typeof firebaseApi.registerUser === "function") {
      result = await firebaseApi.registerUser(payload);
    } else if (typeof firebaseApi.createAccount === "function") {
      result = await firebaseApi.createAccount(payload);
    } else {
      showToast("Registration service is not configured.", "error");
      return;
    }

    if (!result) {
      showToast("Registration failed.", "error");
      return;
    }

    if (result.success === false) {
      showToast(result.message || "Registration failed.", "error");
      return;
    }

    const user = result.user || result;

    if (user && user.uid) {
      saveSession(user);
    }

    showToast(
      result.message || "Registration completed successfully.",
      "success"
    );

    setTimeout(() => {
      closeAllModals();

      if (user && user.uid) {
        redirectAfterLogin(user);
      }
    }, 800);
  } catch (error) {
    console.error("Registration error:", error);
    showToast(getFriendlyAuthError(error), "error");
  } finally {
    setLoading(false);
  }
}

async function handleForgotPassword(event) {
  event.preventDefault();

  if (state.isLoading) {
    return;
  }

  const identifier =
    getValue(selectors.forgotEmail) ||
    getValue(selectors.forgotPhone) ||
    getValue($("#forgotIdentifier"));

  if (!identifier) {
    showToast("Enter your email or phone number.", "error");
    return;
  }

  setLoading(true);

  try {
    const firebaseApi = getFirebaseApi();

    if (!firebaseApi) {
      showToast("Authentication service is not ready yet.", "error");
      return;
    }

    let result = null;

    if (typeof firebaseApi.resetPassword === "function") {
      result = await firebaseApi.resetPassword(identifier);
    } else if (typeof firebaseApi.forgotPassword === "function") {
      result = await firebaseApi.forgotPassword(identifier);
    } else if (typeof firebaseApi.sendPasswordReset === "function") {
      result = await firebaseApi.sendPasswordReset(identifier);
    } else {
      showToast("Password recovery is not configured.", "error");
      return;
    }

    if (result?.success === false) {
      showToast(result.message || "Password recovery failed.", "error");
      return;
    }

    showToast(
      result?.message || "If the account exists, recovery instructions were sent.",
      "success"
    );

    setTimeout(() => {
      closeModal(selectors.forgotModal);
    }, 1000);
  } catch (error) {
    console.error("Password recovery error:", error);
    showToast(getFriendlyAuthError(error), "error");
  } finally {
    setLoading(false);
  }
}

function setupAuthSwitches() {
  selectors.authSwitches.forEach(button => {
    button.addEventListener("click", () => {
      const mode = button.dataset.authSwitch;

      if (!mode) {
        return;
      }

      const target = button.closest(".auth-modal, .modal, form") || document;

      $$("[data-auth-switch]", target).forEach(item => {
        item.classList.toggle(
          "active",
          item.dataset.authSwitch === mode
        );
      });

      if (mode === "phone") {
        state.loginMode = "phone";
        state.registerMode = "phone";
      }

      if (mode === "email") {
        state.loginMode = "email";
        state.registerMode = "email";
      }

      updateAuthFields(target, mode);
    });
  });
}

function updateAuthFields(parent, mode) {
  const phoneFields = $$("[data-auth-phone]", parent);
  const emailFields = $$("[data-auth-email]", parent);

  phoneFields.forEach(field => {
    const visible = mode === "phone";

    field.classList.toggle("active", visible);
    field.hidden = !visible;

    const input = field.querySelector("input");

    if (input) {
      input.disabled = !visible;
    }
  });

  emailFields.forEach(field => {
    const visible = mode === "email";

    field.classList.toggle("active", visible);
    field.hidden = !visible;

    const input = field.querySelector("input");

    if (input) {
      input.disabled = !visible;
    }
  });
}

function setupPasswordToggles() {
  selectors.passwordToggles.forEach(toggle => {
    toggle.addEventListener("click", () => {
      const targetSelector =
        toggle.dataset.passwordToggle ||
        toggle.getAttribute("aria-controls");

      if (!targetSelector) {
        return;
      }

      let input = document.getElementById(targetSelector);

      if (!input && targetSelector.startsWith("#")) {
        input = $(targetSelector);
      }

      if (!input) {
        return;
      }

      const showPassword = input.type === "password";

      input.type = showPassword ? "text" : "password";

      toggle.classList.toggle("active", showPassword);
      toggle.setAttribute(
        "aria-label",
        showPassword ? "Hide password" : "Show password"
      );
    });
  });
}

function setupFaq() {
  selectors.faqItems.forEach(item => {
    const question =
      item.querySelector("[data-faq-question]") ||
      item.querySelector(".faq-question") ||
      item.querySelector("button");

    if (!question) {
      return;
    }

    question.addEventListener("click", () => {
      const currentlyOpen = item.classList.contains("active");

      selectors.faqItems.forEach(other => {
        other.classList.remove("active");
      });

      if (!currentlyOpen) {
        item.classList.add("active");
      }
    });
  });
}

function setupSupport() {
  $$("[data-support-action]").forEach(button => {
    button.addEventListener("click", () => {
      const action = button.dataset.supportAction;

      if (!action) {
        return;
      }

      handleSupportAction(action);
    });
  });
}

function handleSupportAction(action) {
  const links = {
    whatsapp: state.support.whatsapp,
    telegram: state.support.telegram,
    facebook: state.support.facebook,
    whatsappChannel: state.support.whatsappChannel,
    phone: state.support.phone
  };

  const value = links[action];

  if (!value) {
    showToast("This support option is not available right now.", "error");
    return;
  }

  if (action === "phone") {
    window.location.href = `tel:${normalizePhone(value)}`;
    return;
  }

  window.open(value, "_blank", "noopener,noreferrer");
}

async function loadSupportSettings() {
  try {
    const firebaseApi = getFirebaseApi();

    if (!firebaseApi) {
      return;
    }

    let settings = null;

    if (typeof firebaseApi.getPublicSettings === "function") {
      settings = await firebaseApi.getPublicSettings();
    } else if (typeof firebaseApi.getSettings === "function") {
      settings = await firebaseApi.getSettings();
    }

    if (!settings || typeof settings !== "object") {
      return;
    }

    const support = settings.support || settings;

    state.support.whatsapp = support.whatsapp || support.whatsappUrl || "";
    state.support.telegram = support.telegram || support.telegramUrl || "";
    state.support.facebook = support.facebook || support.facebookUrl || "";
    state.support.whatsappChannel =
      support.whatsappChannel ||
      support.whatsappChannelUrl ||
      "";

    state.support.phone =
      support.phone ||
      support.phoneNumber ||
      "";

    applySupportSettings();
  } catch (error) {
    console.error("Support settings error:", error);
  }
}

function applySupportSettings() {
  $$("[data-support-link]").forEach(element => {
    const key = element.dataset.supportLink;

    if (!key) {
      return;
    }

    const value = state.support[key];

    if (!value) {
      element.hidden = true;
      return;
    }

    element.hidden = false;

    if (element.tagName === "A") {
      element.href = value;

      if (!value.startsWith("tel:")) {
        element.target = "_blank";
        element.rel = "noopener noreferrer";
      }
    }
  });

  $$("[data-support-text]").forEach(element => {
    const key = element.dataset.supportText;

    if (key && state.support[key]) {
      element.textContent = state.support[key];
    }
  });
}

function setupGlobalClicks() {
  document.addEventListener("click", event => {
    const logoutButton = event.target.closest("[data-logout]");

    if (logoutButton) {
      event.preventDefault();
      logout();
      return;
    }

    const loginButton = event.target.closest("[data-open-login]");

    if (loginButton) {
      event.preventDefault();
      openModal(selectors.loginModal);
      return;
    }

    const registerButton = event.target.closest("[data-open-register]");

    if (registerButton) {
      event.preventDefault();
      openModal(selectors.registerModal);
      return;
    }

    const supportButton = event.target.closest("[data-open-support]");

    if (supportButton) {
      event.preventDefault();
      openModal(selectors.supportModal);
    }
  });
}

async function logout() {
  try {
    const firebaseApi = getFirebaseApi();

    if (firebaseApi) {
      if (typeof firebaseApi.logout === "function") {
        await firebaseApi.logout();
      } else if (typeof firebaseApi.logoutUser === "function") {
        await firebaseApi.logoutUser();
      } else if (typeof firebaseApi.signOutUser === "function") {
        await firebaseApi.signOutUser();
      }
    }
  } catch (error) {
    console.error("Logout error:", error);
  }

  clearSession();

  window.location.href = "index.html";
}

async function restoreSession() {
  try {
    const firebaseApi = getFirebaseApi();

    if (!firebaseApi) {
      return;
    }

    let user = null;

    if (typeof firebaseApi.getCurrentUser === "function") {
      user = firebaseApi.getCurrentUser();
    } else if (firebaseApi.auth?.currentUser) {
      user = firebaseApi.auth.currentUser;
    }

    if (!user && typeof firebaseApi.waitForAuth === "function") {
      user = await firebaseApi.waitForAuth();
    }

    if (user) {
      saveSession(user);
      updateLoggedInUI(user);
      return;
    }

    const saved = getSavedSession();

    if (saved) {
      updateLoggedInUI(saved);
    }
  } catch (error) {
    console.error("Session restore error:", error);
  }
}

function updateLoggedInUI(user) {
  if (!user) {
    return;
  }

  const displayName =
    user.displayName ||
    user.name ||
    user.studentName ||
    "Student";

  $$("[data-user-name]").forEach(element => {
    element.textContent = displayName;
  });

  $$("[data-user-email]").forEach(element => {
    element.textContent = user.email || "";
  });

  $$("[data-user-phone]").forEach(element => {
    element.textContent = user.phone || "";
  });

  $$("[data-authenticated]").forEach(element => {
    element.hidden = false;
  });

  $$("[data-guest-only]").forEach(element => {
    element.hidden = true;
  });
}

function redirectAfterLogin(user) {
  const destination =
    user?.redirect ||
    sessionStorage.getItem("afterLogin") ||
    "courses.html";

  sessionStorage.removeItem("afterLogin");

  window.location.href = destination;
}

function saveSession(user) {
  if (!user || typeof user !== "object") {
    return;
  }

  try {
    const safeUser = {
      uid: user.uid || "",
      name: user.name || user.displayName || "",
      displayName: user.displayName || user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      grade: user.grade || "",
      status: user.status || "",
      role: user.role || "student"
    };

    localStorage.setItem(
      "coach_session",
      JSON.stringify(safeUser)
    );
  } catch (error) {
    console.error("Session save error:", error);
  }
}

function getSavedSession() {
  try {
    const raw = localStorage.getItem("coach_session");

    if (!raw) {
      return null;
    }

    return JSON.parse(raw);
  } catch (error) {
    console.error("Session read error:", error);
    return null;
  }
}

function clearSession() {
  localStorage.removeItem("coach_session");
  localStorage.removeItem("currentUser");
}

function getFirebaseApi() {
  return (
    window.CoachFirebase ||
    window.AbdelnaseerFirebase ||
    window.PlatformFirebase ||
    null
  );
}

function detectIdentifierType(value) {
  return isValidEmail(value) ? "email" : "phone";
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function isValidPhone(value) {
  const normalized = normalizePhone(value);

  return /^\+?\d{10,15}$/.test(normalized);
}

function normalizePhone(value) {
  return String(value || "")
    .trim()
    .replace(/[^\d+]/g, "");
}

function getValue(element) {
  return element ? String(element.value || "").trim() : "";
}

function setLoading(loading) {
  state.isLoading = loading;

  document.body.classList.toggle("is-loading", loading);

  if (selectors.loadingScreen) {
    selectors.loadingScreen.classList.toggle("active", loading);
    selectors.loadingScreen.setAttribute(
      "aria-hidden",
      String(!loading)
    );
  }

  $$(
    "#loginForm button[type='submit'], #registerForm button[type='submit'], #forgotForm button[type='submit'], [data-auth-submit]"
  ).forEach(button => {
    button.disabled = loading;

    if (loading) {
      button.dataset.originalText ||= button.textContent;
      button.textContent = "Please wait...";
    } else if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
    }
  });
}

function showToast(message, type = "info") {
  if (!selectors.toast) {
    return;
  }

  if (selectors.toastMessage) {
    selectors.toastMessage.textContent = message;
  } else {
    selectors.toast.textContent = message;
  }

  selectors.toast.classList.remove(
    "success",
    "error",
    "warning",
    "info",
    "active",
    "show"
  );

  selectors.toast.classList.add(type);
  selectors.toast.classList.add("active");
  selectors.toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    selectors.toast?.classList.remove("active", "show");
  }, 3500);
}

function getFriendlyAuthError(error) {
  const code = error?.code || "";

  const messages = {
    "auth/invalid-email": "Enter a valid email address.",
    "auth/user-not-found": "No account was found with these details.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Incorrect login information.",
    "auth/email-already-in-use": "This email is already registered.",
    "auth/weak-password": "Password is too weak.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/user-disabled": "This account has been disabled."
  };

  return (
    messages[code] ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

window.CoachIndex = {
  state,
  openModal,
  closeModal,
  closeAllModals,
  showToast,
  getSavedSession,
  saveSession,
  clearSession,
  logout,
  loadSupportSettings,
  applySupportSettings
};

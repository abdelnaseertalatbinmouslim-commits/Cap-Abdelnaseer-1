hereconst App = (() => {
  "use strict";

  const state = {
    loginMethod: "phone",
    activeModal: null,
    menuOpen: false,
    revealObserver: null,
    support: {
      whatsapp: "#",
      telegram: "#",
      facebook: "#"
    }
  };

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

  const storage = {
    get(key, fallback = null) {
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
      } catch {
        return fallback;
      }
    },

    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    },

    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
  };


  function init() {
    setupYear();
    setupHeader();
    setupNavigation();
    setupMobileMenu();
    setupModals();
    setupLoginForm();
    setupRegisterForm();
    setupForgotForm();
    setupReportForm();
    setupPasswordToggles();
    setupCharacterCounter();
    setupRevealAnimations();
    setupHeroVideo();
    setupSupportLinks();
    setupStatistics();
    setupEscapeKey();
    restoreRememberedLogin();
  }


  /* =========================================================
     BASIC
  ========================================================== */

  function setupYear() {
    const year = $("#currentYear");

    if (year) {
      year.textContent = new Date().getFullYear();
    }
  }


  /* =========================================================
     HEADER
  ========================================================== */

  function setupHeader() {
    const header = $("#mainHeader");

    if (!header) {
      return;
    }

    const updateHeader = () => {
      header.classList.toggle(
        "scrolled",
        window.scrollY > 35
      );
    };

    updateHeader();

    window.addEventListener(
      "scroll",
      updateHeader,
      { passive: true }
    );
  }


  /* =========================================================
     NAVIGATION
  ========================================================== */

  function setupNavigation() {
    const sectionLinks = $$(
      "[data-section-link]"
    );

    const scrollTargets = $$(
      "[data-scroll-target]"
    );

    sectionLinks.forEach((link) => {
      link.addEventListener("click", () => {
        closeMobileMenu();
      });
    });

    scrollTargets.forEach((button) => {
      button.addEventListener("click", () => {
        const targetId =
          button.dataset.scrollTarget;

        scrollToSection(targetId);
      });
    });

    const sections = $$(
      "[data-section]"
    );

    if (
      "IntersectionObserver" in window &&
      sections.length
    ) {
      const observer =
        new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) {
                return;
              }

              const id =
                entry.target.dataset.section;

              sectionLinks.forEach((link) => {
                link.classList.toggle(
                  "active",
                  link.dataset.sectionLink === id
                );
              });
            });
          },
          {
            rootMargin: "-30% 0px -60% 0px"
          }
        );

      sections.forEach((section) =>
        observer.observe(section)
      );
    }
  }


  function scrollToSection(id) {
    const element = document.getElementById(id);

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }


  /* =========================================================
     MOBILE MENU
  ========================================================== */

  function setupMobileMenu() {
    const button = $("#menuButton");
    const menu = $("#mobileNavigation");

    if (!button || !menu) {
      return;
    }

    button.addEventListener("click", () => {
      state.menuOpen = !state.menuOpen;

      button.classList.toggle(
        "active",
        state.menuOpen
      );

      button.setAttribute(
        "aria-expanded",
        String(state.menuOpen)
      );

      menu.classList.toggle(
        "active",
        state.menuOpen
      );

      menu.setAttribute(
        "aria-hidden",
        String(!state.menuOpen)
      );

      document.body.classList.toggle(
        "menu-open",
        state.menuOpen
      );
    });

    $$(
      "[data-mobile-nav-link]",
      menu
    ).forEach((link) => {
      link.addEventListener(
        "click",
        closeMobileMenu
      );
    });
  }


  function closeMobileMenu() {
    const button = $("#menuButton");
    const menu = $("#mobileNavigation");

    state.menuOpen = false;

    button?.classList.remove("active");

    button?.setAttribute(
      "aria-expanded",
      "false"
    );

    menu?.classList.remove("active");

    menu?.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.classList.remove(
      "menu-open"
    );
  }


  /* =========================================================
     MODALS
  ========================================================== */

  function setupModals() {
    $$("[data-open-login]").forEach((button) => {
      button.addEventListener("click", () => {
        closeMobileMenu();
        openModal("loginModal");
      });
    });

    $$("[data-open-report]").forEach((button) => {
      button.addEventListener("click", () => {
        closeMobileMenu();
        openModal("reportModal");
      });
    });

    $$("[data-close-modal]").forEach((button) => {
      button.addEventListener("click", () => {
        closeActiveModal();
      });
    });

    $("#openRegisterButton")
      ?.addEventListener(
        "click",
        () => {
          closeModal("loginModal");
          openModal("registerModal");
        }
      );

    $("#openLoginFromRegister")
      ?.addEventListener(
        "click",
        () => {
          closeModal("registerModal");
          openModal("loginModal");
        }
      );

    $("#forgotPasswordButton")
      ?.addEventListener(
        "click",
        () => {
          closeModal("loginModal");
          openModal("forgotModal");
        }
      );

    $("#closeLoginModal")
      ?.addEventListener(
        "click",
        () => closeModal("loginModal")
      );

    $("#closeRegisterModal")
      ?.addEventListener(
        "click",
        () => closeModal("registerModal")
      );

    $("#closeForgotModal")
      ?.addEventListener(
        "click",
        () => closeModal("forgotModal")
      );

    $("#closeReportModal")
      ?.addEventListener(
        "click",
        () => closeModal("reportModal")
      );
  }


  function openModal(id) {
    const modal = document.getElementById(id);

    if (!modal) {
      return;
    }

    closeActiveModal();

    state.activeModal = id;

    modal.classList.add("active");

    modal.setAttribute(
      "aria-hidden",
      "false"
    );

    document.body.classList.add(
      "modal-open"
    );

    const firstInput = $(
      "input, select, textarea, button",
      modal
    );

    setTimeout(() => {
      firstInput?.focus();
    }, 120);
  }


  function closeModal(id) {
    const modal = document.getElementById(id);

    if (!modal) {
      return;
    }

    modal.classList.remove("active");

    modal.setAttribute(
      "aria-hidden",
      "true"
    );

    if (state.activeModal === id) {
      state.activeModal = null;
    }

    if (!state.activeModal) {
      document.body.classList.remove(
        "modal-open"
      );
    }
  }


  function closeActiveModal() {
    if (!state.activeModal) {
      return;
    }

    closeModal(state.activeModal);
  }


  function setupEscapeKey() {
    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Escape"
        ) {
          closeActiveModal();
          closeMobileMenu();
        }
      }
    );
  }


  /* =========================================================
     LOGIN METHOD
  ========================================================== */

  function setupLoginForm() {
    const methods =
      $$("[data-login-method]");

    methods.forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          setLoginMethod(
            button.dataset.loginMethod
          );
        }
      );
    });

    const form = $("#loginForm");

    form?.addEventListener(
      "submit",
      handleLoginSubmit
    );
  }


  function setLoginMethod(method) {
    state.loginMethod =
      method === "email"
        ? "email"
        : "phone";

    $$("[data-login-method]")
      .forEach((button) => {
        button.classList.toggle(
          "active",
          button.dataset.loginMethod ===
            state.loginMethod
        );
      });

    const phoneGroup =
      $("#loginPhoneGroup");

    const emailGroup =
      $("#loginEmailGroup");

    const phoneInput =
      $("#loginPhone");

    const emailInput =
      $("#loginEmail");

    const isEmail =
      state.loginMethod === "email";

    phoneGroup?.classList.toggle(
      "hidden",
      isEmail
    );

    emailGroup?.classList.toggle(
      "hidden",
      !isEmail
    );

    if (isEmail) {
      emailInput?.focus();
    } else {
      phoneInput?.focus();
    }

    clearFieldError(
      $("#loginPhoneError")
    );

    clearFieldError(
      $("#loginEmailError")
    );
  }


  async function handleLoginSubmit(event) {
    event.preventDefault();

    const phone =
      $("#loginPhone")?.value.trim() || "";

    const email =
      $("#loginEmail")?.value.trim() || "";

    const password =
      $("#loginPassword")?.value || "";

    const remember =
      $("#rememberLogin")?.checked ?? true;

    clearFormErrors(
      "#loginForm"
    );

    let valid = true;

    if (state.loginMethod === "phone") {
      if (!isValidPhone(phone)) {
        showFieldError(
          "#loginPhoneError",
          "اكتب رقم هاتف صحيح."
        );

        valid = false;
      }
    }

    if (state.loginMethod === "email") {
      if (!isValidEmail(email)) {
        showFieldError(
          "#loginEmailError",
          "اكتب بريد إلكتروني صحيح."
        );

        valid = false;
      }
    }

    if (!password) {
      showFieldError(
        "#loginPasswordError",
        "اكتب كلمة المرور."
      );

      valid = false;
    }

    if (!valid) {
      return;
    }

    const submit =
      $("#loginSubmit");

    setButtonLoading(
      submit,
      true
    );

    clearMessage(
      $("#loginMessage")
    );

    try {
      /*
       * Firebase authentication will be connected here later.
       * The current UI layer only validates and prepares the data.
       */

      const credentials = {
        method: state.loginMethod,
        phone:
          state.loginMethod === "phone"
            ? phone
            : null,
        email:
          state.loginMethod === "email"
            ? email
            : null,
        password,
        remember
      };

      storage.set(
        "pendingLogin",
        {
          method: credentials.method,
          phone: credentials.phone,
          email: credentials.email,
          remember: credentials.remember
        }
      );

      await wait(450);

      showMessage(
        $("#loginMessage"),
        "واجهة تسجيل الدخول جاهزة للربط بالنظام.",
        "info"
      );

      showToast(
        "تم تجهيز بيانات تسجيل الدخول.",
        "success"
      );
    } catch (error) {
      console.error(error);

      showMessage(
        $("#loginMessage"),
        "حصلت مشكلة أثناء تجهيز تسجيل الدخول.",
        "error"
      );
    } finally {
      setButtonLoading(
        submit,
        false
      );
    }
  }


  /* =========================================================
     REGISTER
  ========================================================== */

  function setupRegisterForm() {
    const form =
      $("#registerForm");

    form?.addEventListener(
      "submit",
      handleRegisterSubmit
    );
  }


  async function handleRegisterSubmit(event) {
    event.preventDefault();

    const name =
      $("#registerName")?.value.trim() || "";

    const grade =
      $("#registerGrade")?.value || "";

    const phone =
      $("#registerPhone")?.value.trim() || "";

    const email =
      $("#registerEmail")?.value.trim() || "";

    const password =
      $("#registerPassword")?.value || "";

    const confirmPassword =
      $("#registerPasswordConfirm")?.value || "";

    const terms =
      $("#registerTerms")?.checked || false;

    clearFormErrors(
      "#registerForm"
    );

    let valid = true;

    if (name.length < 3) {
      showFieldError(
        "#registerNameError",
        "اكتب الاسم بالكامل."
      );

      valid = false;
    }

    if (!grade) {
      showFieldError(
        "#registerGradeError",
        "اختار الفرقة."
      );

      valid = false;
    }

    if (!isValidPhone(phone)) {
      showFieldError(
        "#registerPhoneError",
        "اكتب رقم هاتف صحيح."
      );

      valid = false;
    }

    if (
      email &&
      !isValidEmail(email)
    ) {
      showFieldError(
        "#registerEmailError",
        "اكتب بريد إلكتروني صحيح."
      );

      valid = false;
    }

    if (password.length < 6) {
      showFieldError(
        "#registerPasswordError",
        "كلمة المرور يجب ألا تقل عن 6 أحرف."
      );

      valid = false;
    }

    if (
      password !==
      confirmPassword
    ) {
      showFieldError(
        "#registerPasswordConfirmError",
        "كلمتا المرور غير متطابقتين."
      );

      valid = false;
    }

    if (!terms) {
      showFieldError(
        "#registerTermsError",
        "يجب الموافقة على الشروط."
      );

      valid = false;
    }

    if (!valid) {
      return;
    }

    const submit =
      $("#registerSubmit");

    setButtonLoading(
      submit,
      true
    );

    clearMessage(
      $("#registerMessage")
    );

    try {
      const registrationData = {
        name,
        grade,
        phone,
        email: email || null
      };

      storage.set(
        "pendingRegistration",
        registrationData
      );

      await wait(500);

      showMessage(
        $("#registerMessage"),
        "واجهة التسجيل جاهزة للربط بالنظام.",
        "info"
      );

      showToast(
        "تم تجهيز بيانات التسجيل.",
        "success"
      );
    } catch (error) {
      console.error(error);

      showMessage(
        $("#registerMessage"),
        "حصلت مشكلة أثناء تجهيز التسجيل.",
        "error"
      );
    } finally {
      setButtonLoading(
        submit,
        false
      );
    }
  }


  /* =========================================================
     FORGOT PASSWORD
  ========================================================== */

  function setupForgotForm() {
    const form =
      $("#forgotForm");

    form?.addEventListener(
      "submit",
      handleForgotSubmit
    );
  }


  async function handleForgotSubmit(event) {
    event.preventDefault();

    const email =
      $("#forgotEmail")?.value.trim() || "";

    clearFormErrors(
      "#forgotForm"
    );

    if (!isValidEmail(email)) {
      showFieldError(
        "#forgotEmailError",
        "اكتب بريد إلكتروني صحيح."
      );

      return;
    }

    const submit =
      $("#forgotSubmit");

    setButtonLoading(
      submit,
      true
    );

    clearMessage(
      $("#forgotMessage")
    );

    try {
      await wait(450);

      showMessage(
        $("#forgotMessage"),
        "واجهة استعادة كلمة المرور جاهزة للربط بـ Firebase.",
        "info"
      );
    } catch (error) {
      console.error(error);

      showMessage(
        $("#forgotMessage"),
        "حصلت مشكلة.",
        "error"
      );
    } finally {
      setButtonLoading(
        submit,
        false
      );
    }
  }


  /* =========================================================
     REPORT
  ========================================================== */

  function setupReportForm() {
    const form =
      $("#reportForm");

    form?.addEventListener(
      "submit",
      handleReportSubmit
    );
  }


  async function handleReportSubmit(event) {
    event.preventDefault();

    const name =
      $("#reportName")?.value.trim() || "";

    const contact =
      $("#reportContact")?.value.trim() || "";

    const type =
      $("#reportType")?.value || "";

    const description =
      $("#reportDescription")?.value.trim() || "";

    if (!description) {
      showMessage(
        $("#reportMessage"),
        "اكتب وصف المشكلة.",
        "error"
      );

      return;
    }

    const submit =
      $("#reportSubmit");

    setButtonLoading(
      submit,
      true
    );

    clearMessage(
      $("#reportMessage")
    );

    try {
      const report = {
        name,
        contact,
        type,
        description,
        createdAt:
          new Date().toISOString()
      };

      storage.set(
        "pendingReport",
        report
      );

      await wait(500);

      showMessage(
        $("#reportMessage"),
        "تم تجهيز البلاغ وسيتم ربط الإرسال بالنظام لاحقًا.",
        "info"
      );

      showToast(
        "تم تجهيز البلاغ.",
        "success"
      );

      $("#reportDescription").value = "";

      updateCharacterCount();

    } catch (error) {
      console.error(error);

      showMessage(
        $("#reportMessage"),
        "حصلت مشكلة أثناء تجهيز البلاغ.",
        "error"
      );
    } finally {
      setButtonLoading(
        submit,
        false
      );
    }
  }


  /* =========================================================
     PASSWORD TOGGLES
  ========================================================== */

  function setupPasswordToggles() {
    setupPasswordToggle(
      "#toggleLoginPassword",
      "#loginPassword"
    );

    setupPasswordToggle(
      "#toggleRegisterPassword",
      "#registerPassword"
    );

    setupPasswordToggle(
      "#toggleRegisterConfirm",
      "#registerPasswordConfirm"
    );
  }


  function setupPasswordToggle(
    buttonSelector,
    inputSelector
  ) {
    const button =
      $(buttonSelector);

    const input =
      $(inputSelector);

    if (!button || !input) {
      return;
    }

    button.addEventListener(
      "click",
      () => {
        const show =
          input.type === "password";

        input.type =
          show ? "text" : "password";

        button.setAttribute(
          "aria-pressed",
          String(show)
        );

        button.setAttribute(
          "aria-label",
          show
            ? "إخفاء كلمة المرور"
            : "إظهار كلمة المرور"
        );
      }
    );
  }


  /* =========================================================
     CHARACTER COUNTER
  ========================================================== */

  function setupCharacterCounter() {
    const textarea =
      $("#reportDescription");

    if (!textarea) {
      return;
    }

    textarea.addEventListener(
      "input",
      updateCharacterCount
    );

    updateCharacterCount();
  }


  function updateCharacterCount() {
    const textarea =
      $("#reportDescription");

    const counter =
      $("#reportCharacterCount");

    if (!textarea || !counter) {
      return;
    }

    counter.textContent =
      textarea.value.length;
  }


  /* =========================================================
     REVEAL ANIMATIONS
  ========================================================== */

  function setupRevealAnimations() {
    const elements =
      $$(".reveal");

    if (!elements.length) {
      return;
    }

    if (
      !("IntersectionObserver" in window)
    ) {
      elements.forEach((element) =>
        element.classList.add("visible")
      );

      return;
    }

    state.revealObserver =
      new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            entry.target.classList.add(
              "visible"
            );

            observer.unobserve(
              entry.target
            );
          });
        },
        {
          threshold: 0.12
        }
      );

    elements.forEach((element) => {
      state.revealObserver.observe(
        element
      );
    });
  }


  /* =========================================================
     VIDEO
  ========================================================== */

  function setupHeroVideo() {
    const video =
      $("#heroVideo");

    if (!video) {
      return;
    }

    video.muted = true;

    const playVideo = () => {
      const result =
        video.play();

      if (
        result &&
        typeof result.catch ===
          "function"
      ) {
        result.catch(() => {});
      }
    };

    playVideo();

    document.addEventListener(
      "visibilitychange",
      () => {
        if (
          document.hidden
        ) {
          video.pause();
        } else {
          playVideo();
        }
      }
    );

    video.addEventListener(
      "error",
      () => {
        video.style.display =
          "none";
      }
    );
  }


  /* =========================================================
     SUPPORT
  ========================================================== */

  function setupSupportLinks() {
    const saved =
      storage.get(
        "platformSupport",
        null
      );

    if (
      saved &&
      typeof saved === "object"
    ) {
      state.support = {
        ...state.support,
        ...saved
      };
    }

    applySupportLinks();
  }


  function applySupportLinks() {
    const mappings = [
      [
        "[data-support-link='whatsapp']",
        state.support.whatsapp
      ],
      [
        "[data-support-link='telegram']",
        state.support.telegram
      ],
      [
        "[data-support-link='facebook']",
        state.support.facebook
      ]
    ];

    mappings.forEach(
      ([selector, url]) => {
        $$(selector).forEach(
          (element) => {
            element.href =
              url || "#";

            if (
              !url ||
              url === "#"
            ) {
              element.addEventListener(
                "click",
                handleUnavailableSupport,
                {
                  once: true
                }
              );
            }
          }
        );
      }
    );
  }


  function handleUnavailableSupport(event) {
    event.preventDefault();

    showToast(
      "بيانات الدعم سيتم التحكم فيها من الإدارة.",
      "info"
    );
  }


  /* =========================================================
     STATISTICS
  ========================================================== */

  function setupStatistics() {
    /*
     * These values are temporary UI placeholders.
     * Real Firebase values will be loaded later.
     */

    animateStatistic(
      "[data-stat='students']",
      0
    );

    animateStatistic(
      "[data-stat='content']",
      0
    );

    animateStatistic(
      "[data-stat='exams']",
      0
    );
  }


  function animateStatistic(
    selector,
    target
  ) {
    const element =
      $(selector);

    if (!element) {
      return;
    }

    element.textContent =
      formatNumber(target);
  }


  function formatNumber(number) {
    return new Intl.NumberFormat(
      "ar-EG"
    ).format(number);
  }


  /* =========================================================
     REMEMBER LOGIN
  ========================================================== */

  function restoreRememberedLogin() {
    const saved =
      storage.get(
        "pendingLogin",
        null
      );

    if (!saved) {
      return;
    }

    if (
      saved.method === "email" &&
      saved.email
    ) {
      setLoginMethod("email");

      const email =
        $("#loginEmail");

      if (email) {
        email.value =
          saved.email;
      }
    }

    if (
      saved.method === "phone" &&
      saved.phone
    ) {
      setLoginMethod("phone");

      const phone =
        $("#loginPhone");

      if (phone) {
        phone.value =
          saved.phone;
      }
    }

    const remember =
      $("#rememberLogin");

    if (remember) {
      remember.checked =
        saved.remember !== false;
    }
  }


  /* =========================================================
     VALIDATION
  ========================================================== */

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(email);
  }


  function isValidPhone(phone) {
    const normalized =
      normalizePhone(phone);

    return /^01[0125][0-9]{8}$/
      .test(normalized);
  }


  function normalizePhone(phone) {
    return String(phone || "")
      .replace(/\s+/g, "")
      .replace(/[-()]/g, "")
      .replace(/^(\+20|0020)/, "0");
  }


  function clearFormErrors(
    formSelector
  ) {
    const form =
      $(formSelector);

    if (!form) {
      return;
    }

    $$(".field-error", form)
      .forEach((element) => {
        clearFieldError(element);
      });
  }


  function clearFieldError(element) {
    if (!element) {
      return;
    }

    element.textContent = "";
  }


  function showFieldError(
    selector,
    message
  ) {
    const element =
      typeof selector === "string"
        ? $(selector)
        : selector;

    if (!element) {
      return;
    }

    element.textContent =
      message;
  }


  /* =========================================================
     MESSAGES
  ========================================================== */

  function showMessage(
    element,
    message,
    type = "info"
  ) {
    if (!element) {
      return;
    }

    element.textContent =
      message;

    element.className =
      `form-message ${type}`;
  }


  function clearMessage(element) {
    if (!element) {
      return;
    }

    element.textContent = "";
    element.className =
      "form-message";
  }


  /* =========================================================
     TOAST
  ========================================================== */

  function showToast(
    message,
    type = "info",
    duration = 3500
  ) {
    const container =
      $("#toastContainer");

    if (!container) {
      return;
    }

    const toast =
      document.createElement("div");

    toast.className =
      `toast ${type}`;

    const icon =
      document.createElement("span");

    icon.className =
      "toast-icon";

    icon.textContent =
      type === "success"
        ? "✓"
        : type === "error"
        ? "!"
        : "i";

    const text =
      document.createElement("div");

    text.className =
      "toast-text";

    text.textContent =
      message;

    const close =
      document.createElement("button");

    close.className =
      "toast-close";

    close.type =
      "button";

    close.setAttribute(
      "aria-label",
      "إغلاق"
    );

    close.textContent =
      "×";

    toast.append(
      icon,
      text,
      close
    );

    container.appendChild(
      toast
    );

    const removeToast = () => {
      if (
        !toast.isConnected
      ) {
        return;
      }

      toast.classList.add(
        "removing"
      );

      setTimeout(() => {
        toast.remove();
      }, 250);
    };

    close.addEventListener(
      "click",
      removeToast
    );

    setTimeout(
      removeToast,
      duration
    );
  }


  /* =========================================================
     BUTTON LOADING
  ========================================================== */

  function setButtonLoading(
    button,
    loading
  ) {
    if (!button) {
      return;
    }

    button.disabled =
      loading;

    button.classList.toggle(
      "loading",
      loading
    );
  }


  /* =========================================================
     UTILITIES
  ========================================================== */

  function wait(ms) {
    return new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          ms
        )
    );
  }


  /* =========================================================
     PUBLIC API
  ========================================================== */

  return {
    init,
    openModal,
    closeModal,
    closeActiveModal,
    showToast,
    showMessage,
    setLoginMethod,
    applySupportLinks
  };
})();


/* =========================================================
   START
========================================================= */

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    App.init,
    { once: true }
  );
} else {
  App.init();
}


/* =========================================================
   OPTIONAL GLOBAL ACCESS
========================================================= */

window.CoachPlatform = App;

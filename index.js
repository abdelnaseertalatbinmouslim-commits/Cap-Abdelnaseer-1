/* =========================================================
   منصة الكوتش
   Main Interface Logic

   Compatible with:
   - index.html
   - index.css
   - firebase-config.js
   - firebase-auth.js
   - firebase-database.js
   - firebase-content.js
   - firebase-features.js
========================================================= */

"use strict";

/* =========================================================
   GLOBAL STATE
========================================================= */

let deferredInstallPrompt = null;
let lastFocusedElement = null;

const THEME_KEY = "coach_platform_theme";
const INTRO_KEY = "coach_platform_intro_seen";
const REMEMBERED_LOGIN_KEY = "coach_platform_remembered_login";


/* =========================================================
   DOM HELPERS
========================================================= */

const $ = (selector, parent = document) =>
    parent.querySelector(selector);

const $$ = (selector, parent = document) =>
    Array.from(parent.querySelectorAll(selector));


/* =========================================================
   SAFE STORAGE
========================================================= */

function storageGet(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        return null;
    }
}

function storageSet(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        // Storage may be unavailable in some browser modes.
    }
}

function storageRemove(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        // Ignore storage errors.
    }
}


/* =========================================================
   TOAST SYSTEM
========================================================= */

function showToast(message, type = "info", duration = 3500) {
    const container = $("#toastContainer");

    if (!container || !message) {
        return;
    }

    const toast = document.createElement("div");

    toast.className = `toast toast-${type}`;

    toast.setAttribute("role", "status");

    toast.innerHTML = `
        <span class="toast-message"></span>
    `;

    const messageElement = $(".toast-message", toast);

    if (messageElement) {
        messageElement.textContent = message;
    }

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    const removeToast = () => {
        toast.classList.remove("show");

        setTimeout(() => {
            toast.remove();
        }, 300);
    };

    setTimeout(removeToast, duration);
}


/* =========================================================
   THEME
========================================================= */

function getPreferredTheme() {
    const savedTheme = storageGet(THEME_KEY);

    if (savedTheme === "light" || savedTheme === "dark") {
        return savedTheme;
    }

    if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: light)").matches
    ) {
        return "light";
    }

    return "dark";
}

function applyTheme(theme, save = true) {
    const normalizedTheme =
        theme === "light" ? "light" : "dark";

    const root = document.documentElement;
    const body = document.body;
    const toggle = $("#themeToggle");

    root.setAttribute("data-theme", normalizedTheme);

    if (body) {
        body.classList.toggle(
            "light-theme",
            normalizedTheme === "light"
        );

        body.classList.toggle(
            "dark-theme",
            normalizedTheme === "dark"
        );
    }

    if (toggle) {
        const isLight = normalizedTheme === "light";

        toggle.setAttribute(
            "aria-pressed",
            String(isLight)
        );

        toggle.setAttribute(
            "aria-label",
            isLight
                ? "تفعيل الوضع الداكن"
                : "تفعيل الوضع الفاتح"
        );
    }

    if (save) {
        storageSet(THEME_KEY, normalizedTheme);
    }
}

function toggleTheme() {
    const currentTheme =
        document.documentElement.getAttribute("data-theme") ||
        getPreferredTheme();

    applyTheme(
        currentTheme === "dark" ? "light" : "dark"
    );
}

function initializeTheme() {
    applyTheme(getPreferredTheme(), false);

    const toggle = $("#themeToggle");

    if (toggle) {
        toggle.addEventListener("click", toggleTheme);
    }

    if (window.matchMedia) {
        const mediaQuery = window.matchMedia(
            "(prefers-color-scheme: light)"
        );

        const handleSystemThemeChange = (event) => {
            if (!storageGet(THEME_KEY)) {
                applyTheme(
                    event.matches ? "light" : "dark",
                    false
                );
            }
        };

        if (typeof mediaQuery.addEventListener === "function") {
            mediaQuery.addEventListener(
                "change",
                handleSystemThemeChange
            );
        } else if (
            typeof mediaQuery.addListener === "function"
        ) {
            mediaQuery.addListener(
                handleSystemThemeChange
            );
        }
    }
}


/* =========================================================
   MOBILE MENU
========================================================= */

function closeMobileMenu() {
    const menu = $("#mobileMenu");
    const button = $("[data-mobile-menu-button]");

    if (!menu) {
        return;
    }

    menu.classList.remove("open");
    menu.classList.remove("active");

    if (button) {
        button.classList.remove("active");

        button.setAttribute(
            "aria-expanded",
            "false"
        );
    }

    document.body.classList.remove("menu-open");
}

function openMobileMenu() {
    const menu = $("#mobileMenu");
    const button = $("[data-mobile-menu-button]");

    if (!menu) {
        return;
    }

    menu.classList.add("open");
    menu.classList.add("active");

    if (button) {
        button.classList.add("active");

        button.setAttribute(
            "aria-expanded",
            "true"
        );
    }

    document.body.classList.add("menu-open");
}

function toggleMobileMenu() {
    const menu = $("#mobileMenu");

    if (!menu) {
        return;
    }

    const isOpen =
        menu.classList.contains("open") ||
        menu.classList.contains("active");

    if (isOpen) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
}

function initializeMobileMenu() {
    const button = $("[data-mobile-menu-button]");

    if (button) {
        button.addEventListener(
            "click",
            toggleMobileMenu
        );
    }

    $$(
        "#mobileMenu a, .mobile-nav-link"
    ).forEach((link) => {
        link.addEventListener("click", () => {
            closeMobileMenu();
        });
    });

    document.addEventListener("click", (event) => {
        const menu = $("#mobileMenu");

        if (!menu) {
            return;
        }

        const button = $("[data-mobile-menu-button]");

        const clickedInsideMenu =
            menu.contains(event.target);

        const clickedButton =
            button && button.contains(event.target);

        if (
            !clickedInsideMenu &&
            !clickedButton
        ) {
            closeMobileMenu();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 900) {
            closeMobileMenu();
        }
    });
}


/* =========================================================
   NAVIGATION
========================================================= */

function getSectionFromHash(hash) {
    if (!hash) {
        return null;
    }

    const id = hash.replace("#", "");

    if (!id) {
        return null;
    }

    return document.getElementById(id);
}

function updateActiveNavigation() {
    const sections = $$(
        "main section[id]"
    );

    const scrollPosition =
        window.scrollY +
        Math.min(
            window.innerHeight * 0.28,
            220
        );

    let activeId = "home";

    sections.forEach((section) => {
        if (
            section.offsetTop <=
            scrollPosition
        ) {
            activeId = section.id;
        }
    });

    $$("[data-nav-link]").forEach((link) => {
        const href =
            link.getAttribute("href") || "";

        const target =
            href.startsWith("#")
                ? href.substring(1)
                : "";

        const isActive =
            target === activeId;

        link.classList.toggle(
            "active",
            isActive
        );

        if (isActive) {
            link.setAttribute(
                "aria-current",
                "page"
            );
        } else {
            link.removeAttribute(
                "aria-current"
            );
        }
    });
}

function initializeNavigation() {
    $$(
        'a[href^="#"]'
    ).forEach((link) => {
        link.addEventListener(
            "click",
            (event) => {
                const href =
                    link.getAttribute("href");

                if (
                    !href ||
                    href === "#" ||
                    href.length < 2
                ) {
                    return;
                }

                const target =
                    getSectionFromHash(href);

                if (!target) {
                    return;
                }

                event.preventDefault();

                closeMobileMenu();

                const header =
                    $("#siteHeader");

                const headerHeight =
                    header
                        ? header.offsetHeight
                        : 0;

                const targetTop =
                    target.getBoundingClientRect()
                        .top +
                    window.scrollY -
                    headerHeight -
                    10;

                window.scrollTo({
                    top: Math.max(
                        targetTop,
                        0
                    ),
                    behavior: "smooth"
                });

                history.replaceState(
                    null,
                    "",
                    href
                );
            }
        );
    });

    window.addEventListener(
        "scroll",
        updateActiveNavigation,
        { passive: true }
    );

    window.addEventListener(
        "hashchange",
        updateActiveNavigation
    );

    updateActiveNavigation();
}


/* =========================================================
   HEADER SCROLL STATE
========================================================= */

function updateHeaderOnScroll() {
    const header = $("#siteHeader");

    if (!header) {
        return;
    }

    header.classList.toggle(
        "scrolled",
        window.scrollY > 30
    );
}

function initializeHeader() {
    window.addEventListener(
        "scroll",
        updateHeaderOnScroll,
        { passive: true }
    );

    updateHeaderOnScroll();
}


/* =========================================================
   REVEAL ANIMATIONS
========================================================= */

function initializeRevealAnimations() {
    const elements = $$(".reveal");

    if (!elements.length) {
        return;
    }

    if (
        !("IntersectionObserver" in window)
    ) {
        elements.forEach((element) => {
            element.classList.add("visible");
            element.classList.add("revealed");
        });

        return;
    }

    const observer =
        new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    entry.target.classList.add(
                        "visible"
                    );

                    entry.target.classList.add(
                        "revealed"
                    );

                    observer.unobserve(
                        entry.target
                    );
                });
            },
            {
                threshold: 0.08,
                rootMargin: "0px 0px -40px 0px"
            }
        );

    elements.forEach((element) => {
        observer.observe(element);
    });
}


/* =========================================================
   PAGE LOADER
========================================================= */

function hidePageLoader() {
    const loader = $("#pageLoader");

    if (!loader) {
        return;
    }

    loader.classList.add("hidden");
    loader.classList.add("loaded");

    setTimeout(() => {
        loader.setAttribute(
            "aria-hidden",
            "true"
        );
    }, 700);
}

function initializePageLoader() {
    if (
        document.readyState === "complete"
    ) {
        setTimeout(hidePageLoader, 250);
        return;
    }

    window.addEventListener(
        "load",
        () => {
            setTimeout(
                hidePageLoader,
                250
            );
        },
        { once: true }
    );

    setTimeout(
        hidePageLoader,
        2500
    );
}


/* =========================================================
   REPORT MODAL
========================================================= */

function openReportModal() {
    const modal = $("#reportModal");

    if (!modal) {
        return;
    }

    lastFocusedElement =
        document.activeElement;

    modal.classList.add("open");
    modal.classList.add("active");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "modal-open"
    );

    const message =
        $("#reportFormMessage");

    if (message) {
        message.textContent = "";
        message.className =
            "form-message";
    }

    const form =
        $("#reportForm");

    if (form) {
        form.reset();
    }

    updateReportCharacterCount();

    setTimeout(() => {
        const firstInput =
            $("#reportName");

        if (firstInput) {
            firstInput.focus();
        }
    }, 100);
}

function closeReportModal() {
    const modal = $("#reportModal");

    if (!modal) {
        return;
    }

    modal.classList.remove("open");
    modal.classList.remove("active");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "modal-open"
    );

    if (
        lastFocusedElement &&
        typeof lastFocusedElement.focus ===
            "function"
    ) {
        lastFocusedElement.focus();
    }

    lastFocusedElement = null;
}

function initializeReportModal() {
    $$("[data-open-report]").forEach(
        (button) => {
            button.addEventListener(
                "click",
                openReportModal
            );
        }
    );

    $$("[data-close-modal]").forEach(
        (button) => {
            button.addEventListener(
                "click",
                closeReportModal
            );
        }
    );

    const overlay =
        $("#reportModal .modal-overlay");

    if (overlay) {
        overlay.addEventListener(
            "click",
            closeReportModal
        );
    }

    document.addEventListener(
        "keydown",
        (event) => {
            if (event.key !== "Escape") {
                return;
            }

            const modal =
                $("#reportModal");

            if (
                modal &&
                (
                    modal.classList.contains(
                        "open"
                    ) ||
                    modal.classList.contains(
                        "active"
                    )
                )
            ) {
                closeReportModal();
            }
        }
    );
}


/* =========================================================
   REPORT CHARACTER COUNT
========================================================= */

function updateReportCharacterCount() {
    const textarea =
        $("#reportMessage");

    const counter =
        $("#reportCharacterCount");

    if (!textarea || !counter) {
        return;
    }

    counter.textContent =
        String(textarea.value.length);
}

function initializeReportCharacterCount() {
    const textarea =
        $("#reportMessage");

    if (!textarea) {
        return;
    }

    textarea.addEventListener(
        "input",
        updateReportCharacterCount
    );

    updateReportCharacterCount();
}


/* =========================================================
   REPORT FORM
========================================================= */

function setReportMessage(
    message,
    type = "info"
) {
    const element =
        $("#reportFormMessage");

    if (!element) {
        return;
    }

    element.textContent =
        message || "";

    element.className =
        `form-message ${type}`;
}

function setReportLoading(isLoading) {
    const button =
        $("#reportSubmit");

    if (!button) {
        return;
    }

    if (isLoading) {
        button.disabled = true;

        button.dataset.originalText =
            button.textContent;

        button.textContent =
            "جاري إرسال البلاغ...";
    } else {
        button.disabled = false;

        button.textContent =
            button.dataset.originalText ||
            "إرسال البلاغ";
    }
}

function getReportFormData() {
    const name =
        $("#reportName")?.value.trim() || "";

    const contact =
        $("#reportContact")?.value.trim() || "";

    const subject =
        $("#reportSubject")?.value.trim() || "";

    const message =
        $("#reportMessage")?.value.trim() || "";

    return {
        name,
        contact,
        subject,
        message
    };
}

function validateReportData(data) {
    if (!data.name) {
        return "من فضلك اكتب اسمك.";
    }

    if (!data.contact) {
        return "من فضلك اكتب وسيلة التواصل.";
    }

    if (!data.subject) {
        return "من فضلك اكتب عنوان المشكلة.";
    }

    if (!data.message) {
        return "من فضلك اشرح المشكلة.";
    }

    if (data.message.length < 5) {
        return "تفاصيل المشكلة قصيرة جدًا.";
    }

    if (data.message.length > 1000) {
        return "تفاصيل المشكلة يجب ألا تتجاوز 1000 حرف.";
    }

    return null;
}

async function submitReport(event) {
    event.preventDefault();

    const data =
        getReportFormData();

    const validationError =
        validateReportData(data);

    if (validationError) {
        setReportMessage(
            validationError,
            "error"
        );

        return;
    }

    setReportMessage(
        "",
        "info"
    );

    setReportLoading(true);

    try {
        if (
            !window.FirebaseFeatures ||
            typeof window.FirebaseFeatures
                .createSupportTicket !==
                "function"
        ) {
            throw new Error(
                "Firebase support feature is not available."
            );
        }

        await window.FirebaseFeatures
            .createSupportTicket({
                type: "website_report",
                title: data.subject,
                message:
                    `${data.message}\n\n` +
                    `وسيلة التواصل: ${data.contact}`,
                name: data.name,
                contact: data.contact
            });

        setReportMessage(
            "تم إرسال البلاغ بنجاح. شكرًا ليك، هنراجع المشكلة.",
            "success"
        );

        showToast(
            "تم إرسال البلاغ بنجاح",
            "success"
        );

        const form =
            $("#reportForm");

        if (form) {
            form.reset();
        }

        updateReportCharacterCount();

        setTimeout(() => {
            closeReportModal();
        }, 1200);

    } catch (error) {
        console.error(
            "Report submission error:",
            error
        );

        let message =
            "حصلت مشكلة أثناء إرسال البلاغ. حاول مرة تانية.";

        if (
            window.FirebaseCore &&
            typeof window.FirebaseCore
                .getErrorMessage ===
                "function"
        ) {
            message =
                window.FirebaseCore
                    .getErrorMessage(error);
        }

        setReportMessage(
            message,
            "error"
        );

        showToast(
            message,
            "error"
        );

    } finally {
        setReportLoading(false);
    }
}

function initializeReportForm() {
    const form =
        $("#reportForm");

    if (!form) {
        return;
    }

    form.addEventListener(
        "submit",
        submitReport
    );
}


/* =========================================================
   SUPPORT LINKS
========================================================= */

function initializeSupportLinks() {
    $$("[data-support-link]").forEach(
        (link) => {
            link.addEventListener(
                "click",
                () => {
                    /*
                       الروابط الحالية محفوظة كما هي.
                       في الصفحات المستقبلية يمكن جعلها
                       ديناميكية من /settings/support.
                    */
                }
            );
        }
    );
}


/* =========================================================
   PWA INSTALL
========================================================= */

function handleBeforeInstallPrompt(event) {
    event.preventDefault();

    deferredInstallPrompt = event;

    const button =
        $("[data-install-app]");

    if (button) {
        button.hidden = false;
        button.disabled = false;
    }
}

async function installApplication() {
    if (!deferredInstallPrompt) {
        showToast(
            "تثبيت التطبيق غير متاح حاليًا من هذا المتصفح.",
            "info"
        );

        return;
    }

    const promptEvent =
        deferredInstallPrompt;

    deferredInstallPrompt = null;

    try {
        await promptEvent.prompt();

        const result =
            await promptEvent.userChoice;

        if (
            result &&
            result.outcome === "accepted"
        ) {
            showToast(
                "تم بدء تثبيت المنصة.",
                "success"
            );
        }

    } catch (error) {
        console.error(
            "Install prompt error:",
            error
        );

    } finally {
        const button =
            $("[data-install-app]");

        if (button) {
            button.disabled = false;
        }
    }
}

function initializeInstall() {
    const button =
        $("[data-install-app]");

    if (button) {
        button.addEventListener(
            "click",
            installApplication
        );
    }

    window.addEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
    );

    window.addEventListener(
        "appinstalled",
        () => {
            deferredInstallPrompt = null;

            showToast(
                "تم تثبيت منصة الكوتش بنجاح.",
                "success"
            );
        }
    );
}


/* =========================================================
   FOOTER YEAR
========================================================= */

function initializeCurrentYear() {
    const element =
        $("#currentYear");

    if (!element) {
        return;
    }

    element.textContent =
        String(new Date().getFullYear());
}


/* =========================================================
   AUTH STATE UI
========================================================= */

function updateLandingAuthState(user) {
    const loggedIn =
        Boolean(user);

    document.body.classList.toggle(
        "user-authenticated",
        loggedIn
    );

    document.body.classList.toggle(
        "user-guest",
        !loggedIn
    );

    /*
       لا نغير تصميم الأزرار هنا.
       صفحات تسجيل الدخول والتسجيل ستظل
       متاحة بشكل طبيعي.
    */
}

function initializeAuthState() {
    if (
        !window.FirebaseAuth ||
        typeof window.FirebaseAuth
            .onAuthStateChanged !==
            "function"
    ) {
        return;
    }

    window.FirebaseAuth.onAuthStateChanged(
        (user) => {
            updateLandingAuthState(user);
        }
    );
}


/* =========================================================
   AUTHENTICATED USER SHORTCUT
========================================================= */

function initializeAuthenticatedUserHint() {
    /*
       هذه الوظيفة لا تغير المحتوى الحالي.
       فقط تحفظ حالة المصادقة بشكل متوافق
       مع الطبقة المركزية.
    */

    if (
        !window.FirebaseAuth ||
        typeof window.FirebaseAuth
            .getCurrentUser !==
            "function"
    ) {
        return;
    }

    const user =
        window.FirebaseAuth
            .getCurrentUser();

    updateLandingAuthState(user);
}


/* =========================================================
   INTRO / FIRST VISIT
========================================================= */

function initializeIntroState() {
    const seen =
        storageGet(INTRO_KEY);

    if (!seen) {
        document.body.classList.add(
            "first-visit"
        );

        storageSet(
            INTRO_KEY,
            "true"
        );

        setTimeout(() => {
            document.body.classList.remove(
                "first-visit"
            );
        }, 3000);
    }
}


/* =========================================================
   REMEMBERED LOGIN COMPATIBILITY
========================================================= */

function initializeRememberedLoginCompatibility() {
    /*
       نحافظ على المفتاح القديم بدون
       تخزين كلمات مرور أو بيانات حساسة.
    */

    const remembered =
        storageGet(
            REMEMBERED_LOGIN_KEY
        );

    if (
        remembered === null ||
        remembered === ""
    ) {
        return;
    }

    /*
       Firebase Auth هو المسؤول عن جلسة
       تسجيل الدخول الفعلية.
    */
}


/* =========================================================
   GLOBAL ERROR HANDLING
========================================================= */

function initializeErrorHandling() {
    window.addEventListener(
        "error",
        (event) => {
            console.error(
                "Platform error:",
                event.error || event.message
            );
        }
    );

    window.addEventListener(
        "unhandledrejection",
        (event) => {
            console.error(
                "Unhandled promise rejection:",
                event.reason
            );
        }
    );
}


/* =========================================================
   FIREBASE READINESS
========================================================= */

async function waitForFirebaseFeatures() {
    try {
        if (
            window.FirebaseFeaturesReady &&
            typeof window.FirebaseFeaturesReady
                .then === "function"
        ) {
            await window.FirebaseFeaturesReady;
        }

        if (
            window.FirebaseContentReady &&
            typeof window.FirebaseContentReady
                .then === "function"
        ) {
            await window.FirebaseContentReady;
        }

        return true;

    } catch (error) {
        console.error(
            "Firebase initialization error:",
            error
        );

        return false;
    }
}


/* =========================================================
   INITIALIZATION
========================================================= */

async function initializePlatform() {
    initializeTheme();
    initializeMobileMenu();
    initializeNavigation();
    initializeHeader();
    initializeRevealAnimations();

    initializeReportModal();
    initializeReportCharacterCount();
    initializeReportForm();

    initializeSupportLinks();
    initializeInstall();

    initializeCurrentYear();

    initializeIntroState();
    initializeRememberedLoginCompatibility();

    initializeErrorHandling();

    /*
       Firebase readiness is intentionally awaited
       after the visual interface is initialized,
       so the landing page remains responsive.
    */
    await waitForFirebaseFeatures();

    initializeAuthenticatedUserHint();
    initializeAuthState();

    hidePageLoader();
}


/* =========================================================
   START
========================================================= */

if (
    document.readyState === "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        () => {
            initializePlatform();
        },
        { once: true }
    );
} else {
    initializePlatform();
}
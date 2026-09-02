(() => {
    "use strict";

    /*
     * Coach Platform - Landing Page Controller
     * Frontend layer only.
     */

    const CONFIG = {
        storage: {
            theme: "coach_platform_theme",
            rememberedLogin: "coach_platform_remembered_login",
            introSeen: "coach_platform_intro_seen"
        },

        support: {
            whatsapp: "https://wa.me/201098227150",
            telegram: "https://t.me/CapAbdo1",
            facebook: "https://www.facebook.com/cap.abdelnaseer.talat"
        },

        animation: {
            revealThreshold: 0.12,
            revealRootMargin: "0px 0px -45px 0px"
        }
    };

    const state = {
        theme: "dark",
        activeModal: null,
        loginMethod: "phone",
        mobileMenuOpen: false,
        deferredInstallPrompt: null,
        isOnline: navigator.onLine,
        initialized: false
    };

    const SELECTORS = {
        loader: "#pageLoader",
        header: "#siteHeader",
        mobileMenu: "#mobileMenu",
        mobileMenuButton: "[data-mobile-menu-button]",
        themeToggle: "[data-theme-toggle]",

        loginModal: "#loginModal",
        registerModal: "#registerModal",
        forgotModal: "#forgotModal",
        reportModal: "#reportModal",

        loginForm: "#loginForm",
        registerForm: "#registerForm",
        forgotForm: "#forgotForm",
        reportForm: "#reportForm",

        loginMessage: "#loginMessage",
        registerMessage: "#registerMessage",
        forgotMessage: "#forgotMessage",
        reportFormMessage: "#reportFormMessage",

        reportMessage: "#reportMessage",
        reportCharacterCount: "#reportCharacterCount",

        installButton: "[data-install-app]",
        year: "#currentYear"
    };

    const $ = (selector, root = document) => {
        return root.querySelector(selector);
    };

    const $$ = (selector, root = document) => {
        return Array.from(root.querySelectorAll(selector));
    };

    const byId = (id) => document.getElementById(id);

    function storageGet(key) {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    }

    function storageSet(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch {
            return;
        }
    }

    function storageRemove(key) {
        try {
            localStorage.removeItem(key);
        } catch {
            return;
        }
    }

    function normalizeText(value) {
        return String(value || "").trim();
    }

    function normalizeEmail(value) {
        return normalizeText(value).toLowerCase();
    }

    function normalizePhone(value) {
        return String(value || "")
            .trim()
            .replace(/[^\d+]/g, "");
    }

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function isValidPhone(value) {
        return /^\+?\d{8,15}$/.test(normalizePhone(value));
    }

    function isValidPassword(value) {
        return typeof value === "string" && value.length >= 6;
    }

    function setMessage(element, message, type = "info") {
        if (!element) {
            return;
        }

        element.textContent = message || "";

        element.classList.remove(
            "is-success",
            "is-error",
            "is-warning",
            "is-info"
        );

        if (message) {
            element.classList.add(`is-${type}`);
        }
    }

    function clearMessage(element) {
        if (!element) {
            return;
        }

        element.textContent = "";

        element.classList.remove(
            "is-success",
            "is-error",
            "is-warning",
            "is-info"
        );
    }

    function getModalByName(name) {
        const modalMap = {
            login: byId("loginModal"),
            register: byId("registerModal"),
            forgot: byId("forgotModal"),
            report: byId("reportModal")
        };

        return modalMap[name] || null;
    }

    function getModalNameFromElement(modal) {
        if (!modal) {
            return null;
        }

        switch (modal.id) {
            case "loginModal":
                return "login";

            case "registerModal":
                return "register";

            case "forgotModal":
                return "forgot";

            case "reportModal":
                return "report";

            default:
                return null;
        }
    }

    function openModal(name) {
        const modal = getModalByName(name);

        if (!modal) {
            return;
        }

        closeAllModals(false);

        modal.setAttribute("aria-hidden", "false");
        modal.classList.add("is-open");

        document.body.classList.add("modal-open");

        state.activeModal = name;

        const firstInputMap = {
            login: "loginPhone",
            register: "registerName",
            forgot: "forgotIdentifier",
            report: "reportName"
        };

        const firstInput = byId(firstInputMap[name]);

        window.setTimeout(() => {
            if (firstInput) {
                firstInput.focus();
            }
        }, 180);
    }

    function closeModal(name) {
        const modal = getModalByName(name);

        if (!modal) {
            return;
        }

        modal.setAttribute("aria-hidden", "true");
        modal.classList.remove("is-open");

        if (state.activeModal === name) {
            state.activeModal = null;
        }

        if ($$(".modal.is-open").length === 0) {
            document.body.classList.remove("modal-open");
        }
    }

    function closeAllModals(updateState = true) {
        $$(".modal").forEach((modal) => {
            modal.setAttribute("aria-hidden", "true");
            modal.classList.remove("is-open");
        });

        document.body.classList.remove("modal-open");

        if (updateState) {
            state.activeModal = null;
        }
    }

    function setupModalTriggers() {
        $$("[data-open-login]").forEach((element) => {
            element.addEventListener("click", (event) => {
                event.preventDefault();

                closeMobileMenu();
                openModal("login");
            });
        });

        $$("[data-open-register]").forEach((element) => {
            element.addEventListener("click", (event) => {
                event.preventDefault();

                closeMobileMenu();
                openModal("register");
            });
        });

        $$("[data-open-forgot]").forEach((element) => {
            element.addEventListener("click", (event) => {
                event.preventDefault();

                closeModal("login");
                openModal("forgot");
            });
        });

        $$("[data-open-report]").forEach((element) => {
            element.addEventListener("click", (event) => {
                event.preventDefault();

                openModal("report");
            });
        });

        $$("[data-close-modal]").forEach((element) => {
            element.addEventListener("click", () => {
                const modal = element.closest(".modal");

                if (!modal) {
                    return;
                }

                const name = getModalNameFromElement(modal);

                if (name) {
                    closeModal(name);
                }
            });
        });

        $$(".modal").forEach((modal) => {
            modal.addEventListener("click", (event) => {
                if (
                    event.target === modal ||
                    event.target.classList.contains("modal-overlay")
                ) {
                    const name = getModalNameFromElement(modal);

                    if (name) {
                        closeModal(name);
                    }
                }
            });
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeAllModals();
                closeMobileMenu();
            }
        });
    }

    function setupLoginMethods() {
        const buttons = $$("[data-login-method]");
        const phoneGroup = byId("loginPhoneGroup");
        const emailGroup = byId("loginEmailGroup");
        const phoneInput = byId("loginPhone");
        const emailInput = byId("loginEmail");

        if (!buttons.length) {
            return;
        }

        function updateLoginMethod(method) {
            state.loginMethod = method === "email"
                ? "email"
                : "phone";

            const isPhone = state.loginMethod === "phone";

            buttons.forEach((button) => {
                const active =
                    button.dataset.loginMethod === state.loginMethod;

                button.classList.toggle("active", active);
                button.classList.toggle("is-active", active);
                button.setAttribute("aria-selected", String(active));
            });

            if (phoneGroup) {
                phoneGroup.classList.toggle("hidden", !isPhone);
            }

            if (emailGroup) {
                emailGroup.classList.toggle("hidden", isPhone);
            }

            if (phoneInput) {
                phoneInput.required = isPhone;
            }

            if (emailInput) {
                emailInput.required = !isPhone;
            }
        }

        buttons.forEach((button) => {
            button.addEventListener("click", () => {
                updateLoginMethod(button.dataset.loginMethod);
            });
        });

        updateLoginMethod("phone");
    }

    function setupPasswordToggles() {
        $$("[data-password-toggle]").forEach((button) => {
            button.addEventListener("click", () => {
                const targetId = button.dataset.target;

                if (!targetId) {
                    return;
                }

                const input = byId(targetId);

                if (!input) {
                    return;
                }

                const shouldShow = input.type === "password";

                input.type = shouldShow ? "text" : "password";

                button.classList.toggle("is-visible", shouldShow);

                button.setAttribute(
                    "aria-label",
                    shouldShow
                        ? "Hide password"
                        : "Show password"
                );
            });
        });
    }

    function setupTheme() {
        const toggle = $(SELECTORS.themeToggle);

        if (!toggle) {
            return;
        }

        const savedTheme = storageGet(CONFIG.storage.theme);

        if (savedTheme === "light" || savedTheme === "dark") {
            applyTheme(savedTheme, false);
        } else {
            const prefersLight =
                window.matchMedia &&
                window.matchMedia("(prefers-color-scheme: light)").matches;

            applyTheme(prefersLight ? "light" : "dark", false);
        }

        toggle.addEventListener("click", () => {
            const nextTheme =
                state.theme === "dark"
                    ? "light"
                    : "dark";

            applyTheme(nextTheme, true);
        });

        if (window.matchMedia) {
            const mediaQuery =
                window.matchMedia("(prefers-color-scheme: light)");

            const handleSystemTheme = (event) => {
                if (storageGet(CONFIG.storage.theme)) {
                    return;
                }

                applyTheme(
                    event.matches ? "light" : "dark",
                    false
                );
            };

            if (typeof mediaQuery.addEventListener === "function") {
                mediaQuery.addEventListener(
                    "change",
                    handleSystemTheme
                );
            }
        }
    }

    function applyTheme(theme, persist = true) {
        const nextTheme =
            theme === "light"
                ? "light"
                : "dark";

        state.theme = nextTheme;

        document.documentElement.setAttribute(
            "data-theme",
            nextTheme
        );

        document.body.classList.toggle(
            "light-theme",
            nextTheme === "light"
        );

        document.body.classList.toggle(
            "dark-theme",
            nextTheme === "dark"
        );

        const toggle = $(SELECTORS.themeToggle);

        if (toggle) {
            toggle.setAttribute(
                "aria-pressed",
                String(nextTheme === "light")
            );

            toggle.setAttribute(
                "aria-label",
                nextTheme === "light"
                    ? "Switch to dark mode"
                    : "Switch to light mode"
            );
        }

        const themeColor = document.querySelector(
            'meta[name="theme-color"]'
        );

        if (themeColor) {
            themeColor.setAttribute(
                "content",
                nextTheme === "light"
                    ? "#f5f7fb"
                    : "#0b0d12"
            );
        }

        if (persist) {
            storageSet(
                CONFIG.storage.theme,
                nextTheme
            );
        }
    }

    function setupMobileMenu() {
        const button = $(SELECTORS.mobileMenuButton);
        const menu = $(SELECTORS.mobileMenu);

        if (!button || !menu) {
            return;
        }

        button.setAttribute("aria-expanded", "false");

        button.addEventListener("click", (event) => {
            event.preventDefault();

            if (state.mobileMenuOpen) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });

        document.addEventListener("click", (event) => {
            if (!state.mobileMenuOpen) {
                return;
            }

            if (
                !menu.contains(event.target) &&
                !button.contains(event.target)
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

    function openMobileMenu() {
        const button = $(SELECTORS.mobileMenuButton);
        const menu = $(SELECTORS.mobileMenu);

        if (!button || !menu) {
            return;
        }

        state.mobileMenuOpen = true;

        menu.classList.add("is-open");
        menu.classList.add("open");

        button.classList.add("is-active");
        button.classList.add("active");

        button.setAttribute(
            "aria-expanded",
            "true"
        );
    }

    function closeMobileMenu() {
        const button = $(SELECTORS.mobileMenuButton);
        const menu = $(SELECTORS.mobileMenu);

        if (!button || !menu) {
            return;
        }

        state.mobileMenuOpen = false;

        menu.classList.remove("is-open");
        menu.classList.remove("open");

        button.classList.remove("is-active");
        button.classList.remove("active");

        button.setAttribute(
            "aria-expanded",
            "false"
        );
    }

    function setupNavigation() {
        const links = $$("[data-nav-link]");

        links.forEach((link) => {
            link.addEventListener("click", (event) => {
                const href = link.getAttribute("href");

                if (!href || !href.startsWith("#")) {
                    return;
                }

                const target = $(href);

                if (!target) {
                    return;
                }

                event.preventDefault();

                const header = $(SELECTORS.header);

                const headerHeight =
                    header
                        ? header.offsetHeight
                        : 0;

                const targetPosition =
                    target.getBoundingClientRect().top +
                    window.scrollY -
                    headerHeight -
                    16;

                window.scrollTo({
                    top: Math.max(0, targetPosition),
                    behavior: "smooth"
                });

                closeMobileMenu();
            });
        });

        setupActiveNavigation();
    }

    function setupActiveNavigation() {
        const sections = $$("section[id]");
        const links = $$("[data-nav-link]");

        if (!sections.length || !links.length) {
            return;
        }

        if (!("IntersectionObserver" in window)) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    const currentId = entry.target.id;

                    links.forEach((link) => {
                        const isActive =
                            link.getAttribute("href") ===
                            `#${currentId}`;

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
                });
            },
            {
                rootMargin: "-35% 0px -55% 0px",
                threshold: 0
            }
        );

        sections.forEach((section) => {
            observer.observe(section);
        });
    }

    function setupHeaderScroll() {
        const header = $(SELECTORS.header);

        if (!header) {
            return;
        }

        const update = () => {
            header.classList.toggle(
                "is-scrolled",
                window.scrollY > 18
            );

            header.classList.toggle(
                "scrolled",
                window.scrollY > 18
            );
        };

        update();

        window.addEventListener(
            "scroll",
            update,
            { passive: true }
        );
    }

    function setupRevealAnimations() {
        const elements = $$(".reveal");

        if (!elements.length) {
            return;
        }

        if (!("IntersectionObserver" in window)) {
            elements.forEach((element) => {
                element.classList.add("is-visible");
                element.classList.add("visible");
            });

            return;
        }

        const observer = new IntersectionObserver(
            (entries, observerInstance) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    entry.target.classList.add(
                        "is-visible"
                    );

                    entry.target.classList.add(
                        "visible"
                    );

                    observerInstance.unobserve(
                        entry.target
                    );
                });
            },
            {
                threshold:
                    CONFIG.animation.revealThreshold,

                rootMargin:
                    CONFIG.animation.revealRootMargin
            }
        );

        elements.forEach((element) => {
            observer.observe(element);
        });
    }

    function setupHeroMotion() {
        const visual = $(".hero-visual");

        if (!visual) {
            return;
        }

        const isTouchDevice =
            window.matchMedia &&
            window.matchMedia("(pointer: coarse)").matches;

        if (isTouchDevice) {
            return;
        }

        let frame = null;

        visual.addEventListener("pointermove", (event) => {
            if (frame) {
                cancelAnimationFrame(frame);
            }

            frame = requestAnimationFrame(() => {
                const rect =
                    visual.getBoundingClientRect();

                if (!rect.width || !rect.height) {
                    return;
                }

                const x =
                    (event.clientX - rect.left) /
                    rect.width;

                const y =
                    (event.clientY - rect.top) /
                    rect.height;

                const rotateX =
                    (0.5 - y) * 5;

                const rotateY =
                    (x - 0.5) * 5;

                visual.style.setProperty(
                    "--pointer-rotate-x",
                    `${rotateX}deg`
                );

                visual.style.setProperty(
                    "--pointer-rotate-y",
                    `${rotateY}deg`
                );
            });
        });

        visual.addEventListener("pointerleave", () => {
            visual.style.setProperty(
                "--pointer-rotate-x",
                "0deg"
            );

            visual.style.setProperty(
                "--pointer-rotate-y",
                "0deg"
            );
        });
    }

    function setupProfileImage() {
        const images = $$(".profile-image");

        images.forEach((image) => {
            const markLoaded = () => {
                image.classList.add("is-loaded");
            };

            if (image.complete) {
                markLoaded();
            }

            image.addEventListener(
                "load",
                markLoaded,
                { once: true }
            );

            image.addEventListener(
                "error",
                () => {
                    image.classList.add("is-error");
                },
                { once: true }
            );
        });
    }

    function setupFloatingCards() {
        const cards =
            $$(".profile-floating-card");

        cards.forEach((card, index) => {
            card.style.setProperty(
                "--card-index",
                String(index)
            );

            card.addEventListener(
                "mouseenter",
                () => {
                    card.classList.add(
                        "is-hovered"
                    );
                }
            );

            card.addEventListener(
                "mouseleave",
                () => {
                    card.classList.remove(
                        "is-hovered"
                    );
                }
            );
        });
    }

    function setupSupportLinks() {
        Object.entries(
            CONFIG.support
        ).forEach(([type, url]) => {
            const elements = $$(
                `[data-support-link="${type}"]`
            );

            elements.forEach((element) => {
                element.setAttribute(
                    "href",
                    url
                );

                element.setAttribute(
                    "target",
                    "_blank"
                );

                element.setAttribute(
                    "rel",
                    "noopener noreferrer"
                );
            });
        });
    }

    function setupInstallFeature() {
        const button =
            $(SELECTORS.installButton);

        if (!button) {
            return;
        }

        button.classList.add("is-hidden");

        window.addEventListener(
            "beforeinstallprompt",
            (event) => {
                event.preventDefault();

                state.deferredInstallPrompt =
                    event;

                button.classList.remove(
                    "is-hidden"
                );

                button.classList.remove(
                    "hidden"
                );

                button.removeAttribute(
                    "aria-hidden"
                );
            }
        );

        button.addEventListener(
            "click",
            async () => {
                if (!state.deferredInstallPrompt) {
                    return;
                }

                const promptEvent =
                    state.deferredInstallPrompt;

                state.deferredInstallPrompt = null;

                button.classList.add(
                    "is-hidden"
                );

                try {
                    await promptEvent.prompt();

                    await promptEvent.userChoice;
                } catch {
                    return;
                }
            }
        );

        window.addEventListener(
            "appinstalled",
            () => {
                state.deferredInstallPrompt = null;

                button.classList.add(
                    "is-hidden"
                );
            }
        );
    }

    function setupLoginForm() {
        const form = $(SELECTORS.loginForm);

        if (!form) {
            return;
        }

        const message =
            $(SELECTORS.loginMessage);

        restoreRememberedLogin();

        form.addEventListener(
            "submit",
            (event) => {
                event.preventDefault();

                clearMessage(message);

                const password =
                    byId("loginPassword")
                        ?.value || "";

                if (!isValidPassword(password)) {
                    setMessage(
                        message,
                        "Password must contain at least 6 characters.",
                        "error"
                    );

                    return;
                }

                let identifier = "";

                if (state.loginMethod === "phone") {
                    identifier =
                        normalizePhone(
                            byId("loginPhone")
                                ?.value || ""
                        );

                    if (!isValidPhone(identifier)) {
                        setMessage(
                            message,
                            "Enter a valid phone number.",
                            "error"
                        );

                        return;
                    }
                } else {
                    identifier =
                        normalizeEmail(
                            byId("loginEmail")
                                ?.value || ""
                        );

                    if (!isValidEmail(identifier)) {
                        setMessage(
                            message,
                            "Enter a valid email address.",
                            "error"
                        );

                        return;
                    }
                }

                const remember =
                    byId("loginRemember");

                if (
                    remember &&
                    remember.checked
                ) {
                    storageSet(
                        CONFIG.storage.rememberedLogin,
                        JSON.stringify({
                            method:
                                state.loginMethod,

                            identifier
                        })
                    );
                } else {
                    storageRemove(
                        CONFIG.storage.rememberedLogin
                    );
                }

                /*
                 * Authentication will be connected
                 * to the secure Firebase/backend layer
                 * in the next project stage.
                 */

                setMessage(
                    message,
                    "Login is ready for secure backend integration.",
                    "info"
                );
            }
        );
    }

    function restoreRememberedLogin() {
        const saved =
            storageGet(
                CONFIG.storage.rememberedLogin
            );

        if (!saved) {
            return;
        }

        try {
            const data =
                JSON.parse(saved);

            const remember =
                byId("loginRemember");

            if (remember) {
                remember.checked = true;
            }

            if (
                data.method === "email"
            ) {
                const email =
                    byId("loginEmail");

                const emailButton =
                    $('[data-login-method="email"]');

                if (
                    email &&
                    data.identifier
                ) {
                    email.value =
                        data.identifier;
                }

                if (emailButton) {
                    emailButton.click();
                }
            } else {
                const phone =
                    byId("loginPhone");

                if (
                    phone &&
                    data.identifier
                ) {
                    phone.value =
                        data.identifier;
                }
            }
        } catch {
            storageRemove(
                CONFIG.storage.rememberedLogin
            );
        }
    }

    function setupRegisterForm() {
        const form =
            $(SELECTORS.registerForm);

        if (!form) {
            return;
        }

        const message =
            $(SELECTORS.registerMessage);

        form.addEventListener(
            "submit",
            (event) => {
                event.preventDefault();

                clearMessage(message);

                const name =
                    normalizeText(
                        byId("registerName")
                            ?.value
                    );

                const grade =
                    byId("registerGrade")
                        ?.value || "";

                const phone =
                    normalizePhone(
                        byId("registerPhone")
                            ?.value
                    );

                const email =
                    normalizeEmail(
                        byId("registerEmail")
                            ?.value
                    );

                const password =
                    byId("registerPassword")
                        ?.value || "";

                const confirmPassword =
                    byId(
                        "registerPasswordConfirm"
                    )?.value || "";

                const terms =
                    byId("registerTerms");

                if (name.length < 3) {
                    setMessage(
                        message,
                        "Enter your full name.",
                        "error"
                    );

                    return;
                }

                const validGrades = [
                    "first",
                    "second",
                    "third",
                    "fourth"
                ];

                if (
                    !validGrades.includes(
                        grade
                    )
                ) {
                    setMessage(
                        message,
                        "Select your grade.",
                        "error"
                    );

                    return;
                }

                if (!isValidPhone(phone)) {
                    setMessage(
                        message,
                        "Enter a valid phone number.",
                        "error"
                    );

                    return;
                }

                if (
                    email &&
                    !isValidEmail(email)
                ) {
                    setMessage(
                        message,
                        "Enter a valid email address.",
                        "error"
                    );

                    return;
                }

                if (
                    !isValidPassword(
                        password
                    )
                ) {
                    setMessage(
                        message,
                        "Password must contain at least 6 characters.",
                        "error"
                    );

                    return;
                }

                if (
                    password !==
                    confirmPassword
                ) {
                    setMessage(
                        message,
                        "Passwords do not match.",
                        "error"
                    );

                    return;
                }

                if (
                    terms &&
                    !terms.checked
                ) {
                    setMessage(
                        message,
                        "You must accept the terms to continue.",
                        "error"
                    );

                    return;
                }

                /*
                 * Registration will be connected
                 * to Firebase/backend without deleting
                 * existing users or data.
                 */

                setMessage(
                    message,
                    "Registration is ready for secure backend integration.",
                    "info"
                );
            }
        );
    }

    function setupForgotPassword() {
        const form =
            $(SELECTORS.forgotForm);

        if (!form) {
            return;
        }

        const message =
            $(SELECTORS.forgotMessage);

        form.addEventListener(
            "submit",
            (event) => {
                event.preventDefault();

                clearMessage(message);

                const email =
                    normalizeEmail(
                        byId("forgotIdentifier")
                            ?.value
                    );

                if (!email) {
                    setMessage(
                        message,
                        "Enter your email address.",
                        "error"
                    );

                    return;
                }

                if (!isValidEmail(email)) {
                    setMessage(
                        message,
                        "Enter a valid email address.",
                        "error"
                    );

                    return;
                }

                /*
                 * Firebase password reset will be
                 * connected in the authentication stage.
                 */

                setMessage(
                    message,
                    "Password recovery is ready for Firebase integration.",
                    "info"
                );
            }
        );
    }

    function setupReportForm() {
        const form =
            $(SELECTORS.reportForm);

        if (!form) {
            return;
        }

        const textarea =
            $(SELECTORS.reportMessage);

        const counter =
            $(SELECTORS.reportCharacterCount);

        const formMessage =
            $(SELECTORS.reportFormMessage);

        function updateCounter() {
            if (!textarea || !counter) {
                return;
            }

            const max =
                Number(
                    textarea.getAttribute(
                        "maxlength"
                    )
                ) || 1000;

            counter.textContent =
                `${textarea.value.length}/${max}`;
        }

        if (textarea) {
            textarea.addEventListener(
                "input",
                updateCounter
            );

            updateCounter();
        }

        form.addEventListener(
            "submit",
            (event) => {
                event.preventDefault();

                clearMessage(formMessage);

                const name =
                    normalizeText(
                        byId("reportName")
                            ?.value
                    );

                const contact =
                    normalizeText(
                        byId("reportContact")
                            ?.value
                    );

                const subject =
                    normalizeText(
                        byId("reportSubject")
                            ?.value
                    );

                const report =
                    normalizeText(
                        byId("reportMessage")
                            ?.value
                    );

                if (name.length < 2) {
                    setMessage(
                        formMessage,
                        "Enter your name.",
                        "error"
                    );

                    return;
                }

                if (!contact) {
                    setMessage(
                        formMessage,
                        "Enter a contact method.",
                        "error"
                    );

                    return;
                }

                if (subject.length < 2) {
                    setMessage(
                        formMessage,
                        "Enter a subject.",
                        "error"
                    );

                    return;
                }

                if (report.length < 5) {
                    setMessage(
                        formMessage,
                        "Describe the problem.",
                        "error"
                    );

                    return;
                }

                /*
                 * Reports will be stored through the
                 * secure backend in the next stage.
                 */

                setMessage(
                    formMessage,
                    "Your report is ready for backend submission.",
                    "info"
                );
            }
        );
    }

    function setupFooterYear() {
        const year =
            $(SELECTORS.year);

        if (year) {
            year.textContent =
                String(
                    new Date().getFullYear()
                );
        }
    }

    function setupOnlineState() {
        const update = () => {
            state.isOnline =
                navigator.onLine;

            document.body.classList.toggle(
                "is-offline",
                !state.isOnline
            );
        };

        window.addEventListener(
            "online",
            update
        );

        window.addEventListener(
            "offline",
            update
        );

        update();
    }

    function setupFormEnhancements() {
        const forms =
            $$(".auth-form");

        forms.forEach((form) => {
            const inputs =
                $$("input, select, textarea", form);

            inputs.forEach((input) => {
                input.addEventListener(
                    "focus",
                    () => {
                        input.parentElement?.classList.add(
                            "is-focused"
                        );
                    }
                );

                input.addEventListener(
                    "blur",
                    () => {
                        input.parentElement?.classList.remove(
                            "is-focused"
                        );
                    }
                );
            });
        });
    }

    function setupRequiredFieldFeedback() {
        $$("form").forEach((form) => {
            const fields =
                $$("[required]", form);

            fields.forEach((field) => {
                field.addEventListener(
                    "invalid",
                    () => {
                        field.classList.add(
                            "is-invalid"
                        );
                    }
                );

                field.addEventListener(
                    "input",
                    () => {
                        if (
                            field.checkValidity()
                        ) {
                            field.classList.remove(
                                "is-invalid"
                            );
                        }
                    }
                );
            });
        });
    }

    function setupAnimatedStats() {
        const stats =
            $$(".mini-stat");

        if (!stats.length) {
            return;
        }

        stats.forEach((stat, index) => {
            stat.style.setProperty(
                "--stat-index",
                String(index)
            );
        });
    }

    function setupAccessibility() {
        $$(".modal").forEach((modal) => {
            if (
                !modal.hasAttribute(
                    "aria-hidden"
                )
            ) {
                modal.setAttribute(
                    "aria-hidden",
                    "true"
                );
            }
        });

        $$(
            "[data-open-login]," +
            "[data-open-register]," +
            "[data-open-report]"
        ).forEach((button) => {
            if (
                !button.hasAttribute(
                    "type"
                )
            ) {
                button.setAttribute(
                    "type",
                    "button"
                );
            }
        });

        const menuButton =
            $(SELECTORS.mobileMenuButton);

        if (menuButton) {
            menuButton.setAttribute(
                "aria-expanded",
                "false"
            );
        }
    }

    function setupBrandInteraction() {
        const brand =
            $(".brand");

        if (!brand) {
            return;
        }

        brand.addEventListener(
            "click",
            (event) => {
                const href =
                    brand.getAttribute(
                        "href"
                    );

                if (
                    !href ||
                    href === "#"
                ) {
                    event.preventDefault();

                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });
                }
            }
        );
    }

    function setupScrollTopBehavior() {
        window.addEventListener(
            "scroll",
            () => {
                document.body.classList.toggle(
                    "has-scrolled",
                    window.scrollY > 300
                );
            },
            {
                passive: true
            }
        );
    }

    function setupVisibilityAnimations() {
        const animatedElements = [
            ...$$(".feature-card"),
            ...$$(".access-card"),
            ...$$(".about-point")
        ];

        animatedElements.forEach(
            (element, index) => {
                element.style.setProperty(
                    "--animation-index",
                    String(index)
                );
            }
        );
    }

    function hidePageLoader() {
        const loader =
            $(SELECTORS.loader);

        if (!loader) {
            return;
        }

        const hide = () => {
            loader.classList.add(
                "is-hidden"
            );

            loader.classList.add(
                "hidden"
            );

            window.setTimeout(() => {
                if (
                    loader &&
                    loader.parentNode
                ) {
                    loader.parentNode.removeChild(
                        loader
                    );
                }
            }, 800);
        };

        window.setTimeout(
            hide,
            500
        );
    }

    function setupImageFallback() {
        const images =
            $$("img");

        images.forEach((image) => {
            image.addEventListener(
                "error",
                () => {
                    image.classList.add(
                        "image-error"
                    );
                }
            );
        });
    }

    function setupPageTransitions() {
        document.addEventListener(
            "click",
            (event) => {
                const link =
                    event.target.closest(
                        "a"
                    );

                if (!link) {
                    return;
                }

                const href =
                    link.getAttribute(
                        "href"
                    );

                if (
                    !href ||
                    href.startsWith("#") ||
                    href.startsWith("mailto:") ||
                    href.startsWith("tel:") ||
                    link.target === "_blank"
                ) {
                    return;
                }

                if (
                    href.startsWith(
                        "javascript:"
                    )
                ) {
                    return;
                }

                const url =
                    new URL(
                        href,
                        window.location.href
                    );

                if (
                    url.origin !==
                    window.location.origin
                ) {
                    return;
                }

                event.preventDefault();

                document.body.classList.add(
                    "page-leaving"
                );

                window.setTimeout(
                    () => {
                        window.location.href =
                            url.href;
                    },
                    120
                );
            }
        );
    }

    function setupReducedMotion() {
        const media =
            window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            );

        const apply = () => {
            document.documentElement.classList.toggle(
                "reduce-motion",
                media.matches
            );
        };

        apply();

        if (
            typeof media.addEventListener ===
            "function"
        ) {
            media.addEventListener(
                "change",
                apply
            );
        }
    }

    function setupFocusTrap() {
        document.addEventListener(
            "keydown",
            (event) => {
                if (
                    event.key !== "Tab" ||
                    !state.activeModal
                ) {
                    return;
                }

                const modal =
                    getModalByName(
                        state.activeModal
                    );

                if (!modal) {
                    return;
                }

                const focusable =
                    $$(
                        'button:not([disabled]),' +
                        'a[href],' +
                        'input:not([disabled]),' +
                        'select:not([disabled]),' +
                        'textarea:not([disabled]),' +
                        '[tabindex]:not([tabindex="-1"])',
                        modal
                    ).filter(
                        (element) =>
                            element.offsetParent !== null
                    );

                if (!focusable.length) {
                    return;
                }

                const first =
                    focusable[0];

                const last =
                    focusable[
                        focusable.length - 1
                    ];

                if (
                    event.shiftKey &&
                    document.activeElement === first
                ) {
                    event.preventDefault();
                    last.focus();
                } else if (
                    !event.shiftKey &&
                    document.activeElement === last
                ) {
                    event.preventDefault();
                    first.focus();
                }
            }
        );
    }

    function setupExternalLinks() {
        $$(
            'a[href^="http://"],' +
            'a[href^="https://"]'
        ).forEach((link) => {
            const href =
                link.getAttribute(
                    "href"
                );

            if (!href) {
                return;
            }

            if (
                href.startsWith(
                    window.location.origin
                )
            ) {
                return;
            }

            link.setAttribute(
                "target",
                "_blank"
            );

            link.setAttribute(
                "rel",
                "noopener noreferrer"
            );
        });
    }

    function exposePublicAPI() {
        window.CoachPlatform = {
            version: "2.0.0",

            state,

            openModal,

            closeModal,

            closeAllModals,

            openMobileMenu,

            closeMobileMenu,

            applyTheme,

            getTheme: () =>
                state.theme,

            isOnline: () =>
                state.isOnline
        };
    }

    function init() {
        if (state.initialized) {
            return;
        }

        state.initialized = true;

        setupAccessibility();

        setupTheme();

        setupModalTriggers();

        setupLoginMethods();

        setupPasswordToggles();

        setupMobileMenu();

        setupNavigation();

        setupHeaderScroll();

        setupRevealAnimations();

        setupHeroMotion();

        setupProfileImage();

        setupFloatingCards();

        setupSupportLinks();

        setupInstallFeature();

        setupLoginForm();

        setupRegisterForm();

        setupForgotPassword();

        setupReportForm();

        setupFooterYear();

        setupOnlineState();

        setupFormEnhancements();

        setupRequiredFieldFeedback();

        setupAnimatedStats();

        setupBrandInteraction();

        setupScrollTopBehavior();

        setupVisibilityAnimations();

        setupImageFallback();

        setupPageTransitions();

        setupReducedMotion();

        setupFocusTrap();

        setupExternalLinks();

        exposePublicAPI();

        hidePageLoader();
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            init,
            { once: true }
        );
    } else {
        init();
    }
})();
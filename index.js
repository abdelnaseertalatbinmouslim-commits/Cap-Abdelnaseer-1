const CoachPlatform = (() => {
    "use strict";

    const state = {
        loginMethod: "phone",
        activeModal: null,
        menuOpen: false,
        lastFocusedElement: null,
        support: {
            whatsapp: "https://wa.me/201098227150",
            telegram: "https://t.me/CapAbdo1",
            facebook: "https://www.facebook.com/cap.abdelnaseer.talat"
        }
    };

    const $ = (selector, parent = document) => {
        return parent.querySelector(selector);
    };

    const $$ = (selector, parent = document) => {
        return [...parent.querySelectorAll(selector)];
    };

    const storage = {
        get(key, fallback = null) {
            try {
                const value = localStorage.getItem(key);

                if (value === null) {
                    return fallback;
                }

                return JSON.parse(value);
            } catch {
                return fallback;
            }
        },

        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch {
                return false;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch {
                return false;
            }
        }
    };

    const utils = {
        normalizeText(value) {
            return String(value ?? "").trim();
        },

        normalizePhone(value) {
            return String(value ?? "")
                .replace(/[^\d+]/g, "")
                .trim();
        },

        isPhone(value) {
            const phone = utils.normalizePhone(value);
            return /^\+?\d{8,15}$/.test(phone);
        },

        isEgyptianPhone(value) {
            const phone = utils.normalizePhone(value);

            return /^(01\d{9}|\+201\d{9}|00201\d{9})$/.test(phone);
        },

        isEmail(value) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                utils.normalizeText(value)
            );
        },

        isStrongPassword(value) {
            return typeof value === "string" && value.length >= 6;
        },

        escapeHtml(value) {
            return String(value ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        },

        delay(ms) {
            return new Promise(resolve => {
                window.setTimeout(resolve, ms);
            });
        }
    };

    function init() {
        setupYear();
        setupHeader();
        setupNavigation();
        setupMobileMenu();
        setupModals();
        setupAuthMethods();
        setupForms();
        setupPasswordToggles();
        setupCharacterCounter();
        setupRevealAnimations();
        setupSupportLinks();
        setupHeroImage();
        restoreRememberedLogin();
        setupGlobalAccessibility();

        window.setTimeout(() => {
            hidePageLoader();
        }, 450);
    }

    function setupYear() {
        const year = $("#currentYear");

        if (year) {
            year.textContent = String(new Date().getFullYear());
        }
    }

    function hidePageLoader() {
        const loader = $("#pageLoader");

        if (!loader) {
            return;
        }

        loader.classList.add("loaded");

        window.setTimeout(() => {
            loader.remove();
        }, 700);
    }

    function setupHeader() {
        const header = $("#siteHeader");

        if (!header) {
            return;
        }

        const updateHeader = () => {
            header.classList.toggle("scrolled", window.scrollY > 25);
        };

        updateHeader();

        window.addEventListener("scroll", updateHeader, {
            passive: true
        });
    }

    function setupNavigation() {
        const sections = $$("#home, #features, #about, #access, #support");
        const navLinks = $$("[data-nav-link], .nav-link");

        $$("[data-scroll-target]").forEach(button => {
            button.addEventListener("click", event => {
                event.preventDefault();

                const target = button.dataset.scrollTarget;

                if (target) {
                    scrollToTarget(target);
                }
            });
        });

        $$('a[href^="#"]').forEach(link => {
            link.addEventListener("click", event => {
                const href = link.getAttribute("href");

                if (!href || href === "#") {
                    return;
                }

                const target = $(href);

                if (!target) {
                    return;
                }

                event.preventDefault();

                scrollToTarget(href);
                closeMobileMenu();
            });
        });

        if (
            "IntersectionObserver" in window &&
            sections.length &&
            navLinks.length
        ) {
            const observer = new IntersectionObserver(
                entries => {
                    const visibleEntries = entries
                        .filter(entry => entry.isIntersecting)
                        .sort(
                            (first, second) =>
                                second.intersectionRatio -
                                first.intersectionRatio
                        );

                    if (!visibleEntries.length) {
                        return;
                    }

                    const currentId = visibleEntries[0].target.id;

                    navLinks.forEach(link => {
                        const href = link.getAttribute("href");

                        if (!href) {
                            return;
                        }

                        link.classList.toggle(
                            "active",
                            href === `#${currentId}`
                        );
                    });
                },
                {
                    rootMargin: "-35% 0px -55% 0px",
                    threshold: [0.05, 0.15, 0.3]
                }
            );

            sections.forEach(section => {
                observer.observe(section);
            });
        }
    }

    function scrollToTarget(selector) {
        const target = $(selector);

        if (!target) {
            return;
        }

        const header = $("#siteHeader");
        const headerHeight = header ? header.offsetHeight : 0;

        const top =
            target.getBoundingClientRect().top +
            window.scrollY -
            headerHeight -
            15;

        window.scrollTo({
            top: Math.max(0, top),
            behavior: "smooth"
        });
    }

    function setupMobileMenu() {
        const button = $("[data-mobile-menu-button]");
        const menu = $("[data-mobile-menu]");

        if (!button || !menu) {
            return;
        }

        button.addEventListener("click", event => {
            event.stopPropagation();

            state.menuOpen = !state.menuOpen;

            button.classList.toggle("active", state.menuOpen);
            menu.classList.toggle("active", state.menuOpen);

            button.setAttribute(
                "aria-expanded",
                String(state.menuOpen)
            );
        });

        document.addEventListener("click", event => {
            if (!state.menuOpen) {
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

    function closeMobileMenu() {
        const button = $("[data-mobile-menu-button]");
        const menu = $("[data-mobile-menu]");

        state.menuOpen = false;

        button?.classList.remove("active");
        menu?.classList.remove("active");

        button?.setAttribute("aria-expanded", "false");
    }

    function setupModals() {
        $$("[data-open-login]").forEach(button => {
            button.addEventListener("click", event => {
                event.preventDefault();
                switchModal("loginModal");
            });
        });

        $$("[data-open-register]").forEach(button => {
            button.addEventListener("click", event => {
                event.preventDefault();
                switchModal("registerModal");
            });
        });

        $$("[data-open-forgot]").forEach(button => {
            button.addEventListener("click", event => {
                event.preventDefault();
                switchModal("forgotModal");
            });
        });

        $$("[data-open-report]").forEach(button => {
            button.addEventListener("click", event => {
                event.preventDefault();
                switchModal("reportModal");
            });
        });

        $$("[data-close-modal]").forEach(button => {
            button.addEventListener("click", () => {
                closeActiveModal();
            });
        });

        $$(".modal").forEach(modal => {
            modal.addEventListener("click", event => {
                if (
                    event.target.classList.contains("modal") ||
                    event.target.hasAttribute("data-close-modal")
                ) {
                    closeActiveModal();
                }
            });
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && state.activeModal) {
                closeActiveModal();
            }
        });
    }

    function openModal(id) {
        const modal = document.getElementById(id);

        if (!modal) {
            return;
        }

        if (
            state.activeModal &&
            state.activeModal !== modal
        ) {
            closeModalElement(state.activeModal);
        }

        state.lastFocusedElement = document.activeElement;
        state.activeModal = modal;

        clearFormMessages(modal);

        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");

        document.body.classList.add("modal-open");

        closeMobileMenu();

        window.setTimeout(() => {
            const focusable = $(
                "input:not([type='hidden']), select, textarea, button",
                modal
            );

            focusable?.focus();
        }, 100);
    }

    function closeModalElement(modal) {
        if (!modal) {
            return;
        }

        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");
    }

    function closeActiveModal() {
        if (!state.activeModal) {
            return;
        }

        const modal = state.activeModal;

        closeModalElement(modal);

        state.activeModal = null;

        document.body.classList.remove("modal-open");

        if (
            state.lastFocusedElement &&
            document.contains(state.lastFocusedElement)
        ) {
            state.lastFocusedElement.focus();
        }

        state.lastFocusedElement = null;
    }

    function switchModal(targetId) {
        if (state.activeModal) {
            closeActiveModal();

            window.setTimeout(() => {
                openModal(targetId);
            }, 80);

            return;
        }

        openModal(targetId);
    }

    function setupAuthMethods() {
        const methods = $$("[data-login-method]");

        const phoneGroup = $("#loginPhoneGroup");
        const emailGroup = $("#loginEmailGroup");

        const phoneInput = $("#loginPhone");
        const emailInput = $("#loginEmail");

        if (!methods.length) {
            return;
        }

        methods.forEach(button => {
            button.addEventListener("click", () => {
                const method = button.dataset.loginMethod;

                if (!method) {
                    return;
                }

                state.loginMethod = method;

                methods.forEach(item => {
                    item.classList.toggle(
                        "active",
                        item.dataset.loginMethod === method
                    );
                });

                const phoneMode = method === "phone";

                phoneGroup?.classList.toggle(
                    "hidden",
                    !phoneMode
                );

                emailGroup?.classList.toggle(
                    "hidden",
                    phoneMode
                );

                if (phoneInput) {
                    phoneInput.required = phoneMode;

                    if (!phoneMode) {
                        phoneInput.value = "";
                    }
                }

                if (emailInput) {
                    emailInput.required = !phoneMode;

                    if (phoneMode) {
                        emailInput.value = "";
                    }
                }

                clearFormMessage($("#loginMessage"));
            });
        });
    }

    function setupForms() {
        const loginForm = $("#loginForm");
        const registerForm = $("#registerForm");
        const forgotForm = $("#forgotForm");
        const reportForm = $("#reportForm");

        loginForm?.addEventListener("submit", handleLoginSubmit);
        registerForm?.addEventListener(
            "submit",
            handleRegisterSubmit
        );
        forgotForm?.addEventListener(
            "submit",
            handleForgotSubmit
        );
        reportForm?.addEventListener(
            "submit",
            handleReportSubmit
        );
    }

    async function handleLoginSubmit(event) {
        event.preventDefault();

        const form = event.currentTarget;
        const message = $("#loginMessage");

        clearFormMessage(message);

        const password = utils.normalizeText(
            $("#loginPassword")?.value
        );

        if (!utils.isStrongPassword(password)) {
            showFormMessage(
                message,
                "كلمة المرور يجب أن تكون 6 أحرف أو أكثر.",
                "error"
            );

            $("#loginPassword")?.focus();
            return;
        }

        let identifier = "";

        if (state.loginMethod === "phone") {
            identifier = utils.normalizePhone(
                $("#loginPhone")?.value
            );

            if (!utils.isPhone(identifier)) {
                showFormMessage(
                    message,
                    "اكتب رقم هاتف صحيح.",
                    "error"
                );

                $("#loginPhone")?.focus();
                return;
            }
        } else {
            identifier = utils.normalizeText(
                $("#loginEmail")?.value
            ).toLowerCase();

            if (!utils.isEmail(identifier)) {
                showFormMessage(
                    message,
                    "اكتب بريدًا إلكترونيًا صحيحًا.",
                    "error"
                );

                $("#loginEmail")?.focus();
                return;
            }
        }

        const remember = Boolean(
            $("#loginRemember")?.checked
        );

        const loginData = {
            identifier,
            method: state.loginMethod,
            password,
            remember,
            createdAt: new Date().toISOString()
        };

        const submitButton = $(
            "button[type='submit']",
            form
        );

        setButtonLoading(
            submitButton,
            true,
            "جاري التحقق..."
        );

        await utils.delay(450);

        setButtonLoading(
            submitButton,
            false,
            "تسجيل الدخول"
        );

        if (remember) {
            storage.set(
                "coach_remembered_login",
                {
                    identifier,
                    method: state.loginMethod
                }
            );
        } else {
            storage.remove("coach_remembered_login");
        }

        storage.set(
            "coach_last_login_identifier",
            identifier
        );

        storage.set(
            "coach_pending_login",
            loginData
        );

        showFormMessage(
            message,
            "واجهة تسجيل الدخول جاهزة للربط بالحسابات.",
            "success"
        );

        showToast(
            "تم التحقق من البيانات بنجاح.",
            "success"
        );
    }

    async function handleRegisterSubmit(event) {
        event.preventDefault();

        const form = event.currentTarget;
        const message = $("#registerMessage");

        clearFormMessage(message);

        const name = utils.normalizeText(
            $("#registerName")?.value
        );

        const grade = utils.normalizeText(
            $("#registerGrade")?.value
        );

        const phone = utils.normalizePhone(
            $("#registerPhone")?.value
        );

        const email = utils.normalizeText(
            $("#registerEmail")?.value
        ).toLowerCase();

        const password = String(
            $("#registerPassword")?.value ?? ""
        );

        const passwordConfirm = String(
            $("#registerPasswordConfirm")?.value ?? ""
        );

        const terms = Boolean(
            $("#registerTerms")?.checked
        );

        if (name.length < 3) {
            showFormMessage(
                message,
                "اكتب الاسم بالكامل.",
                "error"
            );

            $("#registerName")?.focus();
            return;
        }

        if (!grade) {
            showFormMessage(
                message,
                "اختر الفرقة الدراسية.",
                "error"
            );

            $("#registerGrade")?.focus();
            return;
        }

        if (!utils.isEgyptianPhone(phone)) {
            showFormMessage(
                message,
                "اكتب رقم هاتف مصري صحيح.",
                "error"
            );

            $("#registerPhone")?.focus();
            return;
        }

        if (email && !utils.isEmail(email)) {
            showFormMessage(
                message,
                "اكتب بريدًا إلكترونيًا صحيحًا أو اتركه فارغًا.",
                "error"
            );

            $("#registerEmail")?.focus();
            return;
        }

        if (!utils.isStrongPassword(password)) {
            showFormMessage(
                message,
                "كلمة المرور يجب أن تكون 6 أحرف أو أكثر.",
                "error"
            );

            $("#registerPassword")?.focus();
            return;
        }

        if (password !== passwordConfirm) {
            showFormMessage(
                message,
                "تأكيد كلمة المرور غير متطابق.",
                "error"
            );

            $("#registerPasswordConfirm")?.focus();
            return;
        }

        if (!terms) {
            showFormMessage(
                message,
                "يجب الموافقة على شروط استخدام المنصة.",
                "error"
            );

            $("#registerTerms")?.focus();
            return;
        }

        const registrationData = {
            name,
            grade,
            phone,
            email,
            password,
            createdAt: new Date().toISOString()
        };

        const submitButton = $(
            "button[type='submit']",
            form
        );

        setButtonLoading(
            submitButton,
            true,
            "جاري تجهيز الحساب..."
        );

        await utils.delay(550);

        setButtonLoading(
            submitButton,
            false,
            "إنشاء الحساب"
        );

        storage.set(
            "coach_pending_registration",
            registrationData
        );

        showFormMessage(
            message,
            "تم تجهيز بيانات التسجيل. سيتم ربط إنشاء الحساب بقاعدة البيانات في مرحلة Firebase.",
            "success"
        );

        showToast(
            "بيانات التسجيل جاهزة.",
            "success"
        );
    }

    async function handleForgotSubmit(event) {
        event.preventDefault();

        const form = event.currentTarget;
        const message = $("#forgotMessage");

        clearFormMessage(message);

        const identifier = utils.normalizeText(
            $("#forgotIdentifier")?.value
        );

        if (!identifier) {
            showFormMessage(
                message,
                "اكتب رقم الهاتف أو البريد الإلكتروني.",
                "error"
            );

            $("#forgotIdentifier")?.focus();
            return;
        }

        const validPhone = utils.isPhone(identifier);
        const validEmail = utils.isEmail(identifier);

        if (!validPhone && !validEmail) {
            showFormMessage(
                message,
                "اكتب رقم هاتف أو بريدًا إلكترونيًا صحيحًا.",
                "error"
            );

            $("#forgotIdentifier")?.focus();
            return;
        }

        const submitButton = $(
            "button[type='submit']",
            form
        );

        setButtonLoading(
            submitButton,
            true,
            "جاري التحقق..."
        );

        await utils.delay(500);

        setButtonLoading(
            submitButton,
            false,
            "متابعة"
        );

        storage.set(
            "coach_pending_password_reset",
            {
                identifier,
                method: validEmail ? "email" : "phone",
                createdAt: new Date().toISOString()
            }
        );

        showFormMessage(
            message,
            "تم تسجيل طلب الاستعادة. سيتم تفعيل الاستعادة الفعلية مع Firebase.",
            "success"
        );
    }

    async function handleReportSubmit(event) {
        event.preventDefault();

        const form = event.currentTarget;
        const message = $("#reportFormMessage");

        clearFormMessage(message);

        const name = utils.normalizeText(
            $("#reportName")?.value
        );

        const contact = utils.normalizeText(
            $("#reportContact")?.value
        );

        const subject = utils.normalizeText(
            $("#reportSubject")?.value
        );

        const reportMessage = utils.normalizeText(
            $("#reportMessage")?.value
        );

        if (name.length < 2) {
            showFormMessage(
                message,
                "اكتب اسمك.",
                "error"
            );

            $("#reportName")?.focus();
            return;
        }

        if (!contact) {
            showFormMessage(
                message,
                "اكتب وسيلة تواصل مناسبة.",
                "error"
            );

            $("#reportContact")?.focus();
            return;
        }

        if (subject.length < 3) {
            showFormMessage(
                message,
                "اكتب عنوان المشكلة.",
                "error"
            );

            $("#reportSubject")?.focus();
            return;
        }

        if (reportMessage.length < 10) {
            showFormMessage(
                message,
                "اكتب تفاصيل أكثر عن المشكلة.",
                "error"
            );

            $("#reportMessage")?.focus();
            return;
        }

        const reportData = {
            name,
            contact,
            subject,
            message: reportMessage,
            createdAt: new Date().toISOString()
        };

        const submitButton = $(
            "button[type='submit']",
            form
        );

        setButtonLoading(
            submitButton,
            true,
            "جاري الإرسال..."
        );

        await utils.delay(450);

        setButtonLoading(
            submitButton,
            false,
            "إرسال البلاغ"
        );

        storage.set(
            "coach_pending_report",
            reportData
        );

        showFormMessage(
            message,
            "تم تجهيز البلاغ وسيتم ربط إرساله بلوحة الأدمن لاحقًا.",
            "success"
        );

        showToast(
            "تم تجهيز البلاغ.",
            "success"
        );

        form.reset();

        updateCharacterCount();

        window.setTimeout(() => {
            closeActiveModal();
        }, 1200);
    }

    function setupPasswordToggles() {
        $$("[data-password-toggle]").forEach(button => {
            button.addEventListener("click", () => {
                const targetId = button.dataset.target;
                const input = document.getElementById(targetId);

                if (!input) {
                    return;
                }

                const isPassword =
                    input.type === "password";

                input.type = isPassword
                    ? "text"
                    : "password";

                button.setAttribute(
                    "aria-label",
                    isPassword
                        ? "إخفاء كلمة المرور"
                        : "إظهار كلمة المرور"
                );

                button.classList.toggle(
                    "active",
                    isPassword
                );
            });
        });
    }

    function setupCharacterCounter() {
        const textarea = $("#reportMessage");
        const counter = $("#reportCharacterCount");

        if (!textarea || !counter) {
            return;
        }

        const update = () => {
            counter.textContent = String(
                textarea.value.length
            );
        };

        textarea.addEventListener("input", update);

        update();
    }

    function updateCharacterCount() {
        const textarea = $("#reportMessage");
        const counter = $("#reportCharacterCount");

        if (!textarea || !counter) {
            return;
        }

        counter.textContent = String(
            textarea.value.length
        );
    }

    function setupRevealAnimations() {
        const elements = $$(".reveal");

        if (!elements.length) {
            return;
        }

        if (
            !("IntersectionObserver" in window) ||
            window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches
        ) {
            elements.forEach(element => {
                element.classList.add("visible");
            });

            return;
        }

        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target);
                });
            },
            {
                threshold: 0.12,
                rootMargin: "0px 0px -50px 0px"
            }
        );

        elements.forEach(element => {
            observer.observe(element);
        });
    }

    function setupSupportLinks() {
        $$("[data-support-link]").forEach(link => {
            const type = link.dataset.supportLink;

            if (!type) {
                return;
            }

            const url = state.support[type];

            if (!url) {
                link.setAttribute("aria-disabled", "true");
                return;
            }

            link.href = url;

            link.addEventListener("click", event => {
                const currentUrl =
                    state.support[type];

                if (!currentUrl) {
                    event.preventDefault();
                    return;
                }

                link.href = currentUrl;
            });
        });
    }

    function setupHeroImage() {
        const image = $(".hero-image");

        if (!image) {
            return;
        }

        image.addEventListener("error", () => {
            image.classList.add("image-error");
        });

        image.addEventListener("load", () => {
            image.classList.add("image-loaded");
        });
    }

    function restoreRememberedLogin() {
        const remembered = storage.get(
            "coach_remembered_login"
        );

        if (!remembered) {
            return;
        }

        const rememberCheckbox =
            $("#loginRemember");

        if (rememberCheckbox) {
            rememberCheckbox.checked = true;
        }

        if (
            remembered.method === "email" &&
            remembered.identifier
        ) {
            state.loginMethod = "email";

            const emailButton = $(
                '[data-login-method="email"]'
            );

            emailButton?.click();

            const emailInput = $("#loginEmail");

            if (emailInput) {
                emailInput.value =
                    remembered.identifier;
            }

            return;
        }

        if (
            remembered.method === "phone" &&
            remembered.identifier
        ) {
            state.loginMethod = "phone";

            const phoneButton = $(
                '[data-login-method="phone"]'
            );

            phoneButton?.click();

            const phoneInput = $("#loginPhone");

            if (phoneInput) {
                phoneInput.value =
                    remembered.identifier;
            }
        }
    }

    function setupGlobalAccessibility() {
        document.addEventListener("keydown", event => {
            if (event.key !== "Tab") {
                return;
            }

            if (!state.activeModal) {
                return;
            }

            trapFocus(event, state.activeModal);
        });
    }

    function trapFocus(event, modal) {
        const focusableElements = $$(
            "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
            modal
        ).filter(element => {
            return (
                !element.hidden &&
                element.offsetParent !== null
            );
        });

        if (!focusableElements.length) {
            return;
        }

        const first = focusableElements[0];
        const last =
            focusableElements[
                focusableElements.length - 1
            ];

        if (
            event.shiftKey &&
            document.activeElement === first
        ) {
            event.preventDefault();
            last.focus();
            return;
        }

        if (
            !event.shiftKey &&
            document.activeElement === last
        ) {
            event.preventDefault();
            first.focus();
        }
    }

    function setButtonLoading(
        button,
        loading,
        loadingText = "جاري التنفيذ..."
    ) {
        if (!button) {
            return;
        }

        if (loading) {
            if (!button.dataset.originalHtml) {
                button.dataset.originalHtml =
                    button.innerHTML;
            }

            button.disabled = true;
            button.classList.add("loading");

            button.innerHTML = `
                <span class="button-loading-spinner" aria-hidden="true"></span>
                <span>${utils.escapeHtml(loadingText)}</span>
            `;

            return;
        }

        button.disabled = false;
        button.classList.remove("loading");

        if (button.dataset.originalHtml) {
            button.innerHTML =
                button.dataset.originalHtml;

            delete button.dataset.originalHtml;
        }
    }

    function showFormMessage(
        element,
        message,
        type = "info"
    ) {
        if (!element) {
            return;
        }

        element.textContent = message;

        element.classList.remove(
            "error",
            "success",
            "info",
            "warning"
        );

        element.classList.add(type);
        element.setAttribute("aria-live", "polite");
    }

    function clearFormMessage(element) {
        if (!element) {
            return;
        }

        element.textContent = "";

        element.classList.remove(
            "error",
            "success",
            "info",
            "warning"
        );
    }

    function clearFormMessages(parent = document) {
        $$(".form-message", parent).forEach(message => {
            clearFormMessage(message);
        });
    }

    function showToast(message, type = "info") {
        const container = $("#toastContainer");

        if (!container) {
            return;
        }

        const toast = document.createElement("div");

        toast.className = `toast toast-${type}`;

        toast.setAttribute("role", "status");

        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message"></span>
            </div>
            <button
                type="button"
                class="toast-close"
                aria-label="إغلاق"
            >
                ×
            </button>
        `;

        const messageElement =
            $(".toast-message", toast);

        if (messageElement) {
            messageElement.textContent = message;
        }

        const closeButton =
            $(".toast-close", toast);

        closeButton?.addEventListener("click", () => {
            removeToast(toast);
        });

        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add("show");
        });

        window.setTimeout(() => {
            removeToast(toast);
        }, 4000);
    }

    function removeToast(toast) {
        if (!toast || !toast.isConnected) {
            return;
        }

        toast.classList.remove("show");

        window.setTimeout(() => {
            toast.remove();
        }, 300);
    }

    function getSupportLink(type) {
        return state.support[type] || "";
    }

    function updateSupportLink(type, url) {
        if (!type) {
            return;
        }

        state.support[type] =
            utils.normalizeText(url);

        $$(
            `[data-support-link="${type}"]`
        ).forEach(link => {
            if (state.support[type]) {
                link.href =
                    state.support[type];

                link.removeAttribute(
                    "aria-disabled"
                );
            } else {
                link.removeAttribute("href");

                link.setAttribute(
                    "aria-disabled",
                    "true"
                );
            }
        });
    }

    function getState() {
        return {
            loginMethod: state.loginMethod,
            activeModal:
                state.activeModal?.id ?? null,
            menuOpen: state.menuOpen,
            support: {
                ...state.support
            }
        };
    }

    return {
        init,
        openModal,
        closeActiveModal,
        switchModal,
        showToast,
        getSupportLink,
        updateSupportLink,
        getState
    };
})();

window.CoachPlatform = CoachPlatform;

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        () => {
            CoachPlatform.init();
        },
        {
            once: true
        }
    );
} else {
    CoachPlatform.init();
}
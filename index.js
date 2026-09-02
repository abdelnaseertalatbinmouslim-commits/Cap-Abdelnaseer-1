hereconst CoachPlatform = (() => {
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

    const $ = (selector, parent = document) => parent.querySelector(selector);
    const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

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
                return true;
            } catch {
                return false;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
            } catch {
                return false;
            }
        }
    };

    const utils = {
        isEmail(value) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
        },

        normalizePhone(value) {
            return value.replace(/[^\d+]/g, "").trim();
        },

        isPhone(value) {
            const phone = utils.normalizePhone(value);
            return /^\+?\d{8,15}$/.test(phone);
        },

        isStrongPassword(value) {
            return typeof value === "string" && value.length >= 6;
        },

        escapeHtml(value) {
            return String(value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        },

        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
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

        window.setTimeout(() => {
            hidePageLoader();
        }, 450);
    }

    function setupYear() {
        const year = $("#currentYear");

        if (year) {
            year.textContent = new Date().getFullYear();
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
        }, 600);
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
        const links = $$(".nav-link");
        const sections = $$("#home, #features, #about, #support");

        $$("[data-scroll-target]").forEach(button => {
            button.addEventListener("click", () => {
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

        if ("IntersectionObserver" in window && sections.length) {
            const observer = new IntersectionObserver(
                entries => {
                    const visibleEntries = entries
                        .filter(entry => entry.isIntersecting)
                        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

                    if (!visibleEntries.length) {
                        return;
                    }

                    const id = visibleEntries[0].target.id;

                    links.forEach(link => {
                        link.classList.toggle(
                            "active",
                            link.getAttribute("href") === `#${id}`
                        );
                    });
                },
                {
                    rootMargin: "-35% 0px -55% 0px",
                    threshold: [0.05, 0.15, 0.3]
                }
            );

            sections.forEach(section => observer.observe(section));
        }
    }

    function scrollToTarget(selector) {
        const target = $(selector);

        if (!target) {
            return;
        }

        const header = $("#siteHeader");
        const offset = header ? header.offsetHeight + 15 : 20;

        const top =
            target.getBoundingClientRect().top +
            window.scrollY -
            offset;

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

        button.addEventListener("click", () => {
            state.menuOpen = !state.menuOpen;

            button.classList.toggle("active", state.menuOpen);
            menu.classList.toggle("active", state.menuOpen);
            button.setAttribute(
                "aria-expanded",
                String(state.menuOpen)
            );
        });

        document.addEventListener("click", event => {
            if (
                state.menuOpen &&
                !menu.contains(event.target) &&
                !button.contains(event.target)
            ) {
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
                openModal("loginModal");
            });
        });

        $$("[data-open-register]").forEach(button => {
            button.addEventListener("click", event => {
                event.preventDefault();
                openModal("registerModal");
            });
        });

        $$("[data-open-forgot]").forEach(button => {
            button.addEventListener("click", event => {
                event.preventDefault();
                openModal("forgotModal");
            });
        });

        $$("[data-open-report]").forEach(button => {
            button.addEventListener("click", event => {
                event.preventDefault();
                openModal("reportModal");
            });
        });

        $$("[data-close-modal]").forEach(button => {
            button.addEventListener("click", () => {
                closeActiveModal();
            });
        });

        $$(".modal").forEach(modal => {
            modal.addEventListener("click", event => {
                if (event.target === modal) {
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

        if (state.activeModal && state.activeModal !== modal) {
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
        }, 80);
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
        closeActiveModal();

        window.setTimeout(() => {
            openModal(targetId);
        }, 50);
    }

    function setupAuthMethods() {
        const methods = $$("[data-login-method]");
        const phoneGroup = $(".login-phone-group");
        const emailGroup = $(".login-email-group");
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

                phoneGroup?.classList.toggle("hidden", !phoneMode);
                emailGroup?.classList.toggle("hidden", phoneMode);

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

        loginForm?.addEventListener("submit", handleLogin);
        registerForm?.addEventListener("submit", handleRegister);
        forgotForm?.addEventListener("submit", handleForgotPassword);
        reportForm?.addEventListener("submit", handleReport);
    }

    async function handleLogin(event) {
        event.preventDefault();

        const form = event.currentTarget;
        const message = $("#loginMessage");
        const submit = $("#loginSubmit");

        clearFormMessage(message);

        const password = $("#loginPassword")?.value || "";

        if (!utils.isStrongPassword(password)) {
            showFormMessage(
                message,
                "كلمة المرور يجب أن تحتوي على 6 أحرف أو أكثر."
            );
            return;
        }

        let identifier = "";

        if (state.loginMethod === "phone") {
            identifier = $("#loginPhone")?.value.trim() || "";

            if (!utils.isPhone(identifier)) {
                showFormMessage(
                    message,
                    "اكتب رقم هاتف صحيح."
                );
                return;
            }

            identifier = utils.normalizePhone(identifier);
        } else {
            identifier = $("#loginEmail")?.value.trim().toLowerCase() || "";

            if (!utils.isEmail(identifier)) {
                showFormMessage(
                    message,
                    "اكتب بريدًا إلكترونيًا صحيحًا."
                );
                return;
            }
        }

        setButtonLoading(submit, true);

        storage.set("last_login_identifier", {
            method: state.loginMethod,
            identifier
        });

        await utils.delay(500);

        setButtonLoading(submit, false);

        showFormMessage(
            message,
            "واجهة تسجيل الدخول جاهزة. سيتم ربط المصادقة بـ Firebase في مرحلة الربط.",
            true
        );

        showToast(
            "واجهة الحساب جاهزة",
            "نظام المصادقة سيتم تفعيله بعد توصيل Firebase."
        );
    }

    async function handleRegister(event) {
        event.preventDefault();

        const message = $("#registerMessage");
        const submit = $("#registerSubmit");

        clearFormMessage(message);

        const name = $("#registerName")?.value.trim() || "";
        const grade = $("#registerGrade")?.value || "";
        const phone = $("#registerPhone")?.value.trim() || "";
        const email = $("#registerEmail")?.value.trim().toLowerCase() || "";
        const password = $("#registerPassword")?.value || "";
        const passwordConfirm =
            $("#registerPasswordConfirm")?.value || "";
        const terms = $("#registerTerms")?.checked || false;

        if (name.length < 3) {
            showFormMessage(
                message,
                "اكتب الاسم بالكامل."
            );
            return;
        }

        if (!grade) {
            showFormMessage(
                message,
                "اختر الفرقة."
            );
            return;
        }

        if (!utils.isPhone(phone)) {
            showFormMessage(
                message,
                "اكتب رقم هاتف صحيح."
            );
            return;
        }

        if (email && !utils.isEmail(email)) {
            showFormMessage(
                message,
                "البريد الإلكتروني غير صحيح."
            );
            return;
        }

        if (!utils.isStrongPassword(password)) {
            showFormMessage(
                message,
                "كلمة المرور يجب أن تحتوي على 6 أحرف أو أكثر."
            );
            return;
        }

        if (password !== passwordConfirm) {
            showFormMessage(
                message,
                "كلمتا المرور غير متطابقتين."
            );
            return;
        }

        if (!terms) {
            showFormMessage(
                message,
                "يجب الموافقة على شروط الاستخدام."
            );
            return;
        }

        setButtonLoading(submit, true);

        const registration = {
            name,
            grade,
            phone: utils.normalizePhone(phone),
            email: email || null,
            createdAt: new Date().toISOString()
        };

        storage.set("pending_registration", registration);

        await utils.delay(500);

        setButtonLoading(submit, false);

        showFormMessage(
            message,
            "بيانات التسجيل جاهزة. سيتم إنشاء الحساب فعليًا بعد توصيل Firebase.",
            true
        );

        showToast(
            "تم تجهيز طلب التسجيل",
            "سيتم تفعيل التسجيل عند ربط Firebase."
        );
    }

    async function handleForgotPassword(event) {
        event.preventDefault();

        const message = $("#forgotMessage");
        const submit = $("#forgotSubmit");
        const identifier =
            $("#forgotIdentifier")?.value.trim() || "";

        clearFormMessage(message);

        if (!identifier) {
            showFormMessage(
                message,
                "اكتب رقم الهاتف أو البريد الإلكتروني."
            );
            return;
        }

        const validPhone = utils.isPhone(identifier);
        const validEmail = utils.isEmail(identifier);

        if (!validPhone && !validEmail) {
            showFormMessage(
                message,
                "اكتب رقم هاتف أو بريدًا إلكترونيًا صحيحًا."
            );
            return;
        }

        setButtonLoading(submit, true);

        await utils.delay(450);

        setButtonLoading(submit, false);

        showFormMessage(
            message,
            "واجهة استعادة الحساب جاهزة. سيتم تفعيل الاستعادة بعد ربط Firebase.",
            true
        );
    }

    async function handleReport(event) {
        event.preventDefault();

        const form = event.currentTarget;
        const message = $("#reportFormMessage");
        const submit = $("#reportSubmit");

        clearFormMessage(message);

        const name = $("#reportName")?.value.trim() || "";
        const contact = $("#reportContact")?.value.trim() || "";
        const subject = $("#reportSubject")?.value || "";
        const reportMessage =
            $("#reportMessage")?.value.trim() || "";

        if (name.length < 2) {
            showFormMessage(
                message,
                "اكتب اسمك."
            );
            return;
        }

        if (!contact) {
            showFormMessage(
                message,
                "اكتب وسيلة للتواصل."
            );
            return;
        }

        if (!subject) {
            showFormMessage(
                message,
                "اختر نوع المشكلة."
            );
            return;
        }

        if (reportMessage.length < 5) {
            showFormMessage(
                message,
                "اكتب تفاصيل المشكلة."
            );
            return;
        }

        setButtonLoading(submit, true);

        const report = {
            name,
            contact,
            subject,
            message: reportMessage,
            createdAt: new Date().toISOString()
        };

        storage.set("last_support_report", report);

        await utils.delay(400);

        setButtonLoading(submit, false);

        showFormMessage(
            message,
            "تم تجهيز البلاغ. سيتم إرساله فعليًا إلى نظام الدعم بعد ربط Firebase.",
            true
        );

        showToast(
            "تم تجهيز البلاغ",
            "سيتم تفعيل الإرسال المباشر في مرحلة Firebase."
        );

        form.reset();

        updateCharacterCounter();
    }

    function setupPasswordToggles() {
        $$("[data-password-toggle]").forEach(button => {
            button.addEventListener("click", () => {
                const targetId = button.dataset.target;

                if (!targetId) {
                    return;
                }

                const input = document.getElementById(targetId);

                if (!input) {
                    return;
                }

                const showing = input.type === "text";

                input.type = showing ? "password" : "text";

                button.textContent = showing ? "عرض" : "إخفاء";
                button.setAttribute(
                    "aria-label",
                    showing
                        ? "إظهار كلمة المرور"
                        : "إخفاء كلمة المرور"
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
            counter.textContent =
                `${textarea.value.length} / ${textarea.maxLength}`;
        };

        textarea.addEventListener("input", update);
        update();
    }

    function updateCharacterCounter() {
        const textarea = $("#reportMessage");
        const counter = $("#reportCharacterCount");

        if (!textarea || !counter) {
            return;
        }

        counter.textContent =
            `${textarea.value.length} / ${textarea.maxLength}`;
    }

    function setupRevealAnimations() {
        const elements = $$(".reveal");

        if (!elements.length) {
            return;
        }

        if (
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
            elements.forEach(element => {
                element.classList.add("visible");
            });

            return;
        }

        if (!("IntersectionObserver" in window)) {
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
                rootMargin: "0px 0px -35px 0px"
            }
        );

        elements.forEach(element => observer.observe(element));
    }

    function setupSupportLinks() {
        const savedSettings =
            storage.get("support_settings", null);

        if (savedSettings && typeof savedSettings === "object") {
            state.support = {
                ...state.support,
                ...savedSettings
            };
        }

        $$("[data-support-link]").forEach(link => {
            const type = link.dataset.supportLink;

            if (!type) {
                return;
            }

            const url = state.support[type];

            if (!url || url === "#") {
                link.setAttribute("href", "#");

                link.addEventListener("click", event => {
                    event.preventDefault();

                    showToast(
                        "الدعم غير متاح حاليًا",
                        "سيتم ضبط روابط الدعم من لوحة الإدارة."
                    );
                });

                return;
            }

            link.setAttribute("href", url);
        });
    }

    function setupHeroImage() {
        const image = $(".hero-image");

        if (!image) {
            return;
        }

        image.addEventListener("error", () => {
            image.style.display = "none";

            const card = $(".hero-image-card");

            if (card) {
                card.style.background =
                    "linear-gradient(145deg, #141b27, #090c12)";
            }
        });
    }

    function restoreRememberedLogin() {
        const saved =
            storage.get("last_login_identifier", null);

        if (!saved || typeof saved !== "object") {
            return;
        }

        if (saved.method === "phone") {
            const input = $("#loginPhone");

            if (input && saved.identifier) {
                input.value = saved.identifier;
            }
        }

        if (saved.method === "email") {
            const methodButton =
                $('[data-login-method="email"]');

            methodButton?.click();

            const input = $("#loginEmail");

            if (input && saved.identifier) {
                input.value = saved.identifier;
            }
        }
    }

    function showFormMessage(element, text, success = false) {
        if (!element) {
            return;
        }

        element.textContent = text;
        element.classList.toggle("success", success);
    }

    function clearFormMessage(element) {
        if (!element) {
            return;
        }

        element.textContent = "";
        element.classList.remove("success");
    }

    function clearFormMessages(parent = document) {
        $$(".form-message", parent).forEach(clearFormMessage);
    }

    function setButtonLoading(button, loading) {
        if (!button) {
            return;
        }

        button.classList.toggle("is-loading", loading);
        button.disabled = loading;
        button.setAttribute("aria-busy", String(loading));
    }

    function showToast(title, message) {
        const container = $("#toastContainer");

        if (!container) {
            return;
        }

        const toast = document.createElement("div");

        toast.className = "toast";

        toast.innerHTML = `
            <div class="toast-icon">✓</div>
            <div class="toast-content">
                <strong>${utils.escapeHtml(title)}</strong>
                <span>${utils.escapeHtml(message)}</span>
            </div>
        `;

        container.appendChild(toast);

        window.setTimeout(() => {
            toast.classList.add("removing");

            window.setTimeout(() => {
                toast.remove();
            }, 260);
        }, 4200);
    }

    return {
        init,
        openModal,
        closeActiveModal,
        showToast,
        state
    };
})();

window.CoachPlatform = CoachPlatform;

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        () => CoachPlatform.init(),
        { once: true }
    );
} else {
    CoachPlatform.init();
          }

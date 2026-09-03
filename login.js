(() => {
    "use strict";

    const STORAGE_KEYS = {
        theme: "abdelnaseer_theme",
        rememberedLogin: "abdelnaseer_login_identifier"
    };

    const pageLoader = document.getElementById("pageLoader");
    const themeToggle = document.querySelector("[data-theme-toggle]");

    const loginForm = document.getElementById("loginForm");
    const loginPhoneGroup = document.getElementById("loginPhoneGroup");
    const loginEmailGroup = document.getElementById("loginEmailGroup");

    const loginPhone = document.getElementById("loginPhone");
    const loginEmail = document.getElementById("loginEmail");
    const loginPassword = document.getElementById("loginPassword");
    const loginRemember = document.getElementById("loginRemember");

    const loginFormMessage = document.getElementById("loginFormMessage");
    const loginSubmit = document.getElementById("loginSubmit");

    const methodButtons = document.querySelectorAll(
        "[data-login-method]"
    );

    const passwordToggles = document.querySelectorAll(
        "[data-password-toggle]"
    );

    let loginMethod = "phone";

    function getPreferredTheme() {
        const savedTheme = localStorage.getItem(
            STORAGE_KEYS.theme
        );

        if (savedTheme === "light" || savedTheme === "dark") {
            return savedTheme;
        }

        return window.matchMedia(
            "(prefers-color-scheme: light)"
        ).matches
            ? "light"
            : "dark";
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute(
            "data-theme",
            theme
        );

        if (!themeToggle) {
            return;
        }

        themeToggle.setAttribute(
            "aria-pressed",
            theme === "light" ? "true" : "false"
        );

        themeToggle.setAttribute(
            "aria-label",
            theme === "light"
                ? "Switch to dark mode"
                : "Switch to light mode"
        );
    }

    function toggleTheme() {
        const currentTheme =
            document.documentElement.getAttribute(
                "data-theme"
            ) || "dark";

        const nextTheme =
            currentTheme === "dark"
                ? "light"
                : "dark";

        localStorage.setItem(
            STORAGE_KEYS.theme,
            nextTheme
        );

        applyTheme(nextTheme);
    }

    function hideLoader() {
        if (!pageLoader) {
            return;
        }

        window.setTimeout(() => {
            pageLoader.classList.add("loaded");
        }, 350);
    }

    function setLoginMethod(method) {
        loginMethod =
            method === "email"
                ? "email"
                : "phone";

        methodButtons.forEach((button) => {
            const active =
                button.dataset.loginMethod === loginMethod;

            button.classList.toggle(
                "is-active",
                active
            );

            button.setAttribute(
                "aria-selected",
                String(active)
            );
        });

        if (loginPhoneGroup) {
            loginPhoneGroup.hidden =
                loginMethod !== "phone";
        }

        if (loginEmailGroup) {
            loginEmailGroup.hidden =
                loginMethod !== "email";
        }

        clearFormMessage();
    }

    function togglePassword(button) {
        const targetId = button.dataset.target;

        if (!targetId) {
            return;
        }

        const input =
            document.getElementById(targetId);

        if (!input) {
            return;
        }

        const shouldShow =
            input.type === "password";

        input.type =
            shouldShow
                ? "text"
                : "password";

        button.setAttribute(
            "aria-pressed",
            String(shouldShow)
        );

        button.setAttribute(
            "aria-label",
            shouldShow
                ? "Hide password"
                : "Show password"
        );
    }

    function showFormMessage(
        message,
        type = "error"
    ) {
        if (!loginFormMessage) {
            return;
        }

        loginFormMessage.textContent =
            message;

        loginFormMessage.className =
            `login-form-message is-visible ${type}`;
    }

    function clearFormMessage() {
        if (!loginFormMessage) {
            return;
        }

        loginFormMessage.textContent = "";

        loginFormMessage.className =
            "login-form-message";
    }

    function setLoading(isLoading) {
        if (!loginSubmit) {
            return;
        }

        loginSubmit.classList.toggle(
            "is-loading",
            isLoading
        );

        loginSubmit.disabled =
            isLoading;
    }

    function normalizePhone(value) {
        return value
            .trim()
            .replace(/\s+/g, "")
            .replace(/[()-]/g, "");
    }

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            value
        );
    }

    function validateForm() {
        const password =
            loginPassword?.value || "";

        if (!password) {
            return {
                valid: false,
                message:
                    "Please enter your password."
            };
        }

        if (password.length < 6) {
            return {
                valid: false,
                message:
                    "Password must contain at least 6 characters."
            };
        }

        if (loginMethod === "phone") {
            const phone =
                normalizePhone(
                    loginPhone?.value || ""
                );

            if (!phone) {
                return {
                    valid: false,
                    message:
                        "Please enter your phone number."
                };
            }

            if (!/^\+?[0-9]{8,15}$/.test(phone)) {
                return {
                    valid: false,
                    message:
                        "Please enter a valid phone number."
                };
            }

            return {
                valid: true,
                identifier: phone,
                identifierType: "phone",
                password
            };
        }

        const email =
            (loginEmail?.value || "")
                .trim()
                .toLowerCase();

        if (!email) {
            return {
                valid: false,
                message:
                    "Please enter your email address."
            };
        }

        if (!isValidEmail(email)) {
            return {
                valid: false,
                message:
                    "Please enter a valid email address."
            };
        }

        return {
            valid: true,
            identifier: email,
            identifierType: "email",
            password
        };
    }

    function saveRememberedIdentifier(
        identifier
    ) {
        if (!loginRemember) {
            return;
        }

        if (loginRemember.checked) {
            localStorage.setItem(
                STORAGE_KEYS.rememberedLogin,
                identifier
            );
        } else {
            localStorage.removeItem(
                STORAGE_KEYS.rememberedLogin
            );
        }
    }

    function loadRememberedIdentifier() {
        const remembered =
            localStorage.getItem(
                STORAGE_KEYS.rememberedLogin
            );

        if (!remembered) {
            return;
        }

        if (remembered.includes("@")) {
            setLoginMethod("email");

            if (loginEmail) {
                loginEmail.value =
                    remembered;
            }
        } else {
            setLoginMethod("phone");

            if (loginPhone) {
                loginPhone.value =
                    remembered;
            }
        }

        if (loginRemember) {
            loginRemember.checked = true;
        }
    }

    async function handleLogin(event) {
        event.preventDefault();

        clearFormMessage();

        const validation =
            validateForm();

        if (!validation.valid) {
            showFormMessage(
                validation.message,
                "error"
            );
            return;
        }

        setLoading(true);

        try {
            /*
             * Authentication will be connected
             * through the shared authentication
             * service later.
             *
             * Do not put Firebase credentials,
             * database rules, admin secrets,
             * or privileged operations here.
             */

            await new Promise((resolve) => {
                window.setTimeout(
                    resolve,
                    400
                );
            });

            saveRememberedIdentifier(
                validation.identifier
            );

            showFormMessage(
                "The authentication service is not connected yet.",
                "error"
            );
        } catch (error) {
            console.error(
                "Login initialization error:",
                error
            );

            showFormMessage(
                "Unable to complete the login request. Please try again.",
                "error"
            );
        } finally {
            setLoading(false);
        }
    }

    function setupPasswordToggles() {
        passwordToggles.forEach((button) => {
            button.addEventListener(
                "click",
                () => {
                    togglePassword(button);
                }
            );
        });
    }

    function setupMethodButtons() {
        methodButtons.forEach((button) => {
            button.addEventListener(
                "click",
                () => {
                    setLoginMethod(
                        button.dataset.loginMethod
                    );
                }
            );
        });
    }

    function setupFormEvents() {
        if (!loginForm) {
            return;
        }

        loginForm.addEventListener(
            "submit",
            handleLogin
        );

        [
            loginPhone,
            loginEmail,
            loginPassword
        ].forEach((input) => {
            if (!input) {
                return;
            }

            input.addEventListener(
                "input",
                clearFormMessage
            );
        });
    }

    function setupTheme() {
        applyTheme(
            getPreferredTheme()
        );

        if (themeToggle) {
            themeToggle.addEventListener(
                "click",
                toggleTheme
            );
        }
    }

    function setupPageLinks() {
        document
            .querySelectorAll(
                'a[href="login.html"]'
            )
            .forEach((link) => {
                link.addEventListener(
                    "click",
                    () => {
                        link.blur();
                    }
                );
            });
    }

    function initialize() {
        setupTheme();

        setLoginMethod("phone");

        loadRememberedIdentifier();

        setupMethodButtons();

        setupPasswordToggles();

        setupFormEvents();

        setupPageLinks();

        hideLoader();
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );
    } else {
        initialize();
    }
})();

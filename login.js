(() => {
    "use strict";

    const pageLoader = document.getElementById("pageLoader");
    const themeToggle = document.querySelector("[data-theme-toggle]");

    const loginForm = document.getElementById("loginForm");
    const loginPhoneGroup = document.getElementById("loginPhoneGroup");
    const loginEmailGroup = document.getElementById("loginEmailGroup");

    const loginPhone = document.getElementById("loginPhone");
    const loginEmail = document.getElementById("loginEmail");
    const loginPassword = document.getElementById("loginPassword");
    const loginRemember = document.getElementById("loginRemember");

    const formMessage = document.getElementById("loginFormMessage");
    const submitButton = document.getElementById("loginSubmit");

    const methodButtons = document.querySelectorAll("[data-login-method]");
    const passwordToggles = document.querySelectorAll("[data-password-toggle]");

    const THEME_KEY = "abdelnaseer_theme";
    const REMEMBER_KEY = "abdelnaseer_login_identifier";

    let loginMethod = "phone";

    function getStoredTheme() {
        const savedTheme = localStorage.getItem(THEME_KEY);

        if (savedTheme === "light" || savedTheme === "dark") {
            return savedTheme;
        }

        return window.matchMedia("(prefers-color-scheme: light)").matches
            ? "light"
            : "dark";
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);

        if (themeToggle) {
            themeToggle.setAttribute(
                "aria-label",
                theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
            );

            themeToggle.setAttribute(
                "aria-pressed",
                theme === "light" ? "true" : "false"
            );
        }
    }

    function toggleTheme() {
        const currentTheme =
            document.documentElement.getAttribute("data-theme") || "dark";

        const nextTheme = currentTheme === "dark" ? "light" : "dark";

        localStorage.setItem(THEME_KEY, nextTheme);
        applyTheme(nextTheme);
    }

    function hideLoader() {
        if (!pageLoader) {
            return;
        }

        window.setTimeout(() => {
            pageLoader.classList.add("is-hidden");
        }, 350);
    }

    function setLoginMethod(method) {
        loginMethod = method === "email" ? "email" : "phone";

        methodButtons.forEach((button) => {
            const isActive =
                button.dataset.loginMethod === loginMethod;

            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-selected", String(isActive));
        });

        if (loginPhoneGroup) {
            loginPhoneGroup.hidden = loginMethod !== "phone";
        }

        if (loginEmailGroup) {
            loginEmailGroup.hidden = loginMethod !== "email";
        }

        if (loginMethod === "phone" && loginPhone) {
            loginPhone.focus();
        }

        if (loginMethod === "email" && loginEmail) {
            loginEmail.focus();
        }

        clearFormMessage();
    }

    function togglePassword(button) {
        const targetId = button.dataset.target;

        if (!targetId) {
            return;
        }

        const input = document.getElementById(targetId);

        if (!input) {
            return;
        }

        const isPassword = input.type === "password";

        input.type = isPassword ? "text" : "password";

        button.setAttribute(
            "aria-label",
            isPassword
                ? "Hide password"
                : "Show password"
        );

        button.setAttribute(
            "aria-pressed",
            String(isPassword)
        );
    }

    function showFormMessage(message, type = "error") {
        if (!formMessage) {
            return;
        }

        formMessage.textContent = message;
        formMessage.className = `form-message is-visible ${type}`;
    }

    function clearFormMessage() {
        if (!formMessage) {
            return;
        }

        formMessage.textContent = "";
        formMessage.className = "form-message";
    }

    function setLoading(isLoading) {
        if (!submitButton) {
            return;
        }

        submitButton.classList.toggle("is-loading", isLoading);
        submitButton.disabled = isLoading;
    }

    function normalizePhone(value) {
        return value
            .trim()
            .replace(/\s+/g, "")
            .replace(/[()-]/g, "");
    }

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function validateLoginForm() {
        const password = loginPassword?.value || "";

        if (!password) {
            return {
                valid: false,
                message: "Please enter your password."
            };
        }

        if (password.length < 6) {
            return {
                valid: false,
                message: "Password must contain at least 6 characters."
            };
        }

        if (loginMethod === "phone") {
            const phone = normalizePhone(loginPhone?.value || "");

            if (!phone) {
                return {
                    valid: false,
                    message: "Please enter your phone number."
                };
            }

            if (!/^\+?[0-9]{8,15}$/.test(phone)) {
                return {
                    valid: false,
                    message: "Please enter a valid phone number."
                };
            }

            return {
                valid: true,
                identifier: phone,
                identifierType: "phone",
                password
            };
        }

        const email = (loginEmail?.value || "").trim().toLowerCase();

        if (!email) {
            return {
                valid: false,
                message: "Please enter your email address."
            };
        }

        if (!isValidEmail(email)) {
            return {
                valid: false,
                message: "Please enter a valid email address."
            };
        }

        return {
            valid: true,
            identifier: email,
            identifierType: "email",
            password
        };
    }

    function loadRememberedIdentifier() {
        const remembered = localStorage.getItem(REMEMBER_KEY);

        if (!remembered) {
            return;
        }

        if (remembered.includes("@")) {
            setLoginMethod("email");

            if (loginEmail) {
                loginEmail.value = remembered;
            }

            if (loginRemember) {
                loginRemember.checked = true;
            }

            return;
        }

        setLoginMethod("phone");

        if (loginPhone) {
            loginPhone.value = remembered;
        }

        if (loginRemember) {
            loginRemember.checked = true;
        }
    }

    function handleRememberIdentifier(identifier) {
        if (!loginRemember) {
            return;
        }

        if (loginRemember.checked) {
            localStorage.setItem(REMEMBER_KEY, identifier);
        } else {
            localStorage.removeItem(REMEMBER_KEY);
        }
    }

    async function handleLogin(event) {
        event.preventDefault();

        clearFormMessage();

        const validation = validateLoginForm();

        if (!validation.valid) {
            showFormMessage(validation.message, "error");
            return;
        }

        setLoading(true);

        try {
            /*
             * Firebase authentication will be connected here later.
             *
             * The final authentication flow must be handled through
             * the shared authentication layer instead of exposing
             * database permissions or sensitive validation logic
             * inside this page.
             */

            await new Promise((resolve) => {
                window.setTimeout(resolve, 500);
            });

            handleRememberIdentifier(validation.identifier);

            showFormMessage(
                "The login service is being connected. Please try again after the authentication system is enabled.",
                "error"
            );
        } catch (error) {
            console.error("Login error:", error);

            showFormMessage(
                "Unable to complete the login request. Please try again.",
                "error"
            );
        } finally {
            setLoading(false);
        }
    }

    function setupEvents() {
        if (themeToggle) {
            themeToggle.addEventListener("click", toggleTheme);
        }

        methodButtons.forEach((button) => {
            button.addEventListener("click", () => {
                setLoginMethod(button.dataset.loginMethod);
            });
        });

        passwordToggles.forEach((button) => {
            button.addEventListener("click", () => {
                togglePassword(button);
            });
        });

        if (loginForm) {
            loginForm.addEventListener("submit", handleLogin);
        }

        [loginPhone, loginEmail, loginPassword].forEach((input) => {
            if (!input) {
                return;
            }

            input.addEventListener("input", clearFormMessage);
        });
    }

    function initialize() {
        applyTheme(getStoredTheme());
        setLoginMethod("phone");
        loadRememberedIdentifier();
        setupEvents();
        hideLoader();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
/* =========================================================
   Firebase Auth Layer
   Project: Cap Abdelnaseer
   Version: Final - Legacy Compatible Student Auth
   ========================================================= */

(function () {
    "use strict";

    /* =========================================================
       DEPENDENCIES
       ========================================================= */

    const Core = window.FirebaseCore;

    if (!Core) {
        throw new Error(
            "FirebaseCore is required before firebase-auth.js"
        );
    }

    if (!window.firebase) {
        throw new Error(
            "Firebase SDK is required before firebase-auth.js"
        );
    }

    const auth = Core.auth || null;
    const database = Core.database;

    if (!database) {
        throw new Error(
            "Firebase Realtime Database is required before firebase-auth.js"
        );
    }


    /* =========================================================
       STORAGE KEYS
       ========================================================= */

    const STORAGE_KEYS = Object.freeze({
        currentUser: "currentUser",
        student: "student",
        currentStudent: "currentStudent",
        currentStudentKey: "currentStudentKey",
        rememberedLogin: "coach_platform_remembered_login",
        firebaseAuthUser: "coach_platform_firebase_user"
    });


    /* =========================================================
       BASIC HELPERS
       ========================================================= */

    function isObject(value) {
        return (
            value !== null &&
            typeof value === "object" &&
            !Array.isArray(value)
        );
    }


    function hasValue(value) {
        return (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        );
    }


    function safeString(value) {
        if (value === undefined || value === null) {
            return "";
        }

        return String(value).trim();
    }


    function normalizeEmail(email) {
        return safeString(email).toLowerCase();
    }


    function normalizePhone(phone) {
        let value = safeString(phone);

        if (!value) {
            return "";
        }

        value = value
            .replace(/[٠-٩]/g, function (digit) {
                return "٠١٢٣٤٥٦٧٨٩".indexOf(digit);
            })
            .replace(/[۰-۹]/g, function (digit) {
                return "۰۱۲۳۴۵۶۷۸۹".indexOf(digit);
            })
            .replace(/[\s\-().]/g, "");

        if (value.startsWith("00")) {
            value = "+" + value.substring(2);
        }

        if (value.startsWith("+20")) {
            return value;
        }

        if (value.startsWith("20") && value.length >= 12) {
            return "+" + value;
        }

        if (value.startsWith("01") && value.length === 11) {
            return "+20" + value.substring(1);
        }

        return value;
    }


    function phoneVariants(phone) {
        const original = safeString(phone);
        const normalized = normalizePhone(phone);

        const variants = [];

        function add(value) {
            if (!hasValue(value)) {
                return;
            }

            if (!variants.includes(value)) {
                variants.push(value);
            }
        }

        add(original);
        add(normalized);

        if (normalized.startsWith("+20")) {
            add("0" + normalized.substring(3));
            add("20" + normalized.substring(1));
        }

        if (original.startsWith("01")) {
            add("+20" + original.substring(1));
            add("20" + original.substring(1));
        }

        return variants;
    }


    function safeLocalStorageGet(key) {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            return null;
        }
    }


    function safeLocalStorageSet(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            return false;
        }
    }


    function safeLocalStorageRemove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            // Ignore storage errors.
        }
    }


    function parseStorageObject(key) {
        const value = safeLocalStorageGet(key);

        if (!value) {
            return null;
        }

        try {
            const parsed = JSON.parse(value);

            if (isObject(parsed)) {
                return parsed;
            }
        } catch (error) {
            // Ignore invalid JSON.
        }

        return null;
    }


    /* =========================================================
       PASSWORD / PIN HASHING
       ========================================================= */

    async function hashPin(pin) {
        const value = safeString(pin);

        if (!value) {
            return "";
        }

        /*
         * New registrations use SHA-256.
         * Existing legacy accounts containing plain "pin"
         * remain supported by verifyPin().
         */

        if (
            window.crypto &&
            window.crypto.subtle &&
            typeof TextEncoder !== "undefined"
        ) {
            const encoder = new TextEncoder();
            const data = encoder.encode(value);

            const hashBuffer = await window.crypto.subtle.digest(
                "SHA-256",
                data
            );

            const hashArray = Array.from(
                new Uint8Array(hashBuffer)
            );

            return hashArray
                .map(function (byte) {
                    return byte.toString(16).padStart(2, "0");
                })
                .join("");
        }

        /*
         * Very old browsers:
         * return empty so the caller can fail safely instead
         * of storing an unprotected PIN.
         */

        return "";
    }


    async function verifyPin(inputPin, student) {
        const input = safeString(inputPin);

        if (!input || !isObject(student)) {
            return false;
        }

        /*
         * 1. New secure field
         */
        if (hasValue(student.pinHash)) {
            const inputHash = await hashPin(input);

            if (
                inputHash &&
                inputHash === String(student.pinHash)
            ) {
                return true;
            }
        }

        /*
         * 2. Legacy field
         *
         * Old accounts may have:
         * pin: "1234"
         *
         * They remain compatible and are NOT modified automatically.
         */

        if (hasValue(student.pin)) {
            return String(student.pin) === input;
        }

        /*
         * 3. Some old versions may have password/passwordHash.
         */

        if (hasValue(student.passwordHash)) {
            const inputHash = await hashPin(input);

            if (
                inputHash &&
                inputHash === String(student.passwordHash)
            ) {
                return true;
            }
        }

        if (hasValue(student.password)) {
            return String(student.password) === input;
        }

        return false;
    }


    /* =========================================================
       STATUS HELPERS
       ========================================================= */

    function isApprovedStudent(student) {
        if (!isObject(student)) {
            return false;
        }

        const status = safeString(
            student.status ||
            student.accountStatus ||
            student.approvalStatus
        ).toLowerCase();

        return (
            status === "approved" ||
            status === "active" ||
            status === "مقبول" ||
            status === "نشط"
        );
    }


    function isPendingStudent(student) {
        if (!isObject(student)) {
            return false;
        }

        const status = safeString(
            student.status ||
            student.accountStatus ||
            student.approvalStatus
        ).toLowerCase();

        return (
            status === "pending" ||
            status === "waiting" ||
            status === "معلق" ||
            status === "قيد المراجعة"
        );
    }


    /* =========================================================
       ERROR HELPERS
       ========================================================= */

    function makeError(code, message) {
        const error = new Error(message);
        error.code = code;
        return error;
    }


    function getErrorMessage(error) {
        if (!error) {
            return "حدث خطأ غير معروف.";
        }

        const code = String(error.code || "");

        const messages = {
            "permission-denied":
                "ليس لديك صلاحية لتنفيذ هذه العملية.",

            "PERMISSION_DENIED":
                "ليس لديك صلاحية لتنفيذ هذه العملية.",

            "network-error":
                "تعذر الاتصال بقاعدة البيانات. تحقق من الإنترنت.",

            "NETWORK_ERROR":
                "تعذر الاتصال بقاعدة البيانات. تحقق من الإنترنت.",

            "student-not-found":
                "رقم الهاتف غير مسجل في النظام.",

            "invalid-pin":
                "كود المرور غير صحيح.",

            "account-not-approved":
                "الحساب لم يتم تفعيله بعد من الإدارة.",

            "account-pending":
                "الحساب ما زال قيد المراجعة من الإدارة.",

            "account-rejected":
                "تم رفض طلب الحساب. يرجى التواصل مع الإدارة.",

            "phone-required":
                "يرجى إدخال رقم الهاتف.",

            "pin-required":
                "يرجى إدخال كود المرور.",

            "name-required":
                "يرجى إدخال الاسم.",

            "grade-required":
                "يرجى اختيار الفرقة الدراسية.",

            "phone-already-exists":
                "رقم الهاتف مستخدم بالفعل.",

            "registration-failed":
                "تعذر إنشاء الحساب. حاول مرة أخرى.",

            "database-unavailable":
                "قاعدة البيانات غير متاحة حاليًا."
        };

        if (messages[code]) {
            return messages[code];
        }

        if (error.message) {
            return error.message;
        }

        return "حدث خطأ غير متوقع.";
    }


    /* =========================================================
       SAVE LOCAL STUDENT IDENTITY
       ========================================================= */

    function serializeStudent(student, key) {
        const result = {};

        if (isObject(student)) {
            Object.keys(student).forEach(function (field) {
                result[field] = student[field];
            });
        }

        if (key) {
            result.id = key;
            result.studentKey = key;
            result.key = key;
        }

        return result;
    }


    function saveStudentIdentity(student, key) {
        if (!isObject(student)) {
            return;
        }

        const serialized = serializeStudent(student, key);

        safeLocalStorageSet(
            STORAGE_KEYS.currentUser,
            JSON.stringify(serialized)
        );

        safeLocalStorageSet(
            STORAGE_KEYS.student,
            JSON.stringify(serialized)
        );

        safeLocalStorageSet(
            STORAGE_KEYS.currentStudent,
            JSON.stringify(serialized)
        );

        if (key) {
            safeLocalStorageSet(
                STORAGE_KEYS.currentStudentKey,
                String(key)
            );
        }
    }


    function saveRememberedLogin(phone) {
        if (!hasValue(phone)) {
            return;
        }

        safeLocalStorageSet(
            STORAGE_KEYS.rememberedLogin,
            JSON.stringify({
                phone: safeString(phone),
                savedAt: Date.now()
            })
        );
    }


    function clearRememberedLogin() {
        safeLocalStorageRemove(
            STORAGE_KEYS.rememberedLogin
        );
    }


    function getRememberedLogin() {
        return parseStorageObject(
            STORAGE_KEYS.rememberedLogin
        );
    }


    /* =========================================================
       FIND STUDENT BY PHONE
       ========================================================= */

    async function findStudentByPhone(phone) {
        const requestedPhone = safeString(phone);

        if (!requestedPhone) {
            throw makeError(
                "phone-required",
                "يرجى إدخال رقم الهاتف."
            );
        }

        let snapshot;

        try {
            snapshot = await database
                .ref("students")
                .once("value");
        } catch (error) {
            throw makeError(
                "database-unavailable",
                "تعذر الوصول إلى قاعدة بيانات الطلاب."
            );
        }

        const data = snapshot.val();

        if (!data) {
            throw makeError(
                "student-not-found",
                "رقم الهاتف غير مسجل في النظام."
            );
        }

        const variants = phoneVariants(requestedPhone);

        let found = null;

        Object.keys(data).forEach(function (key) {
            if (found) {
                return;
            }

            const student = data[key];

            if (!isObject(student)) {
                return;
            }

            const studentPhone = safeString(student.phone);

            if (!studentPhone) {
                return;
            }

            const studentVariants = phoneVariants(
                studentPhone
            );

            const matched = variants.some(function (value) {
                return studentVariants.includes(value);
            });

            if (matched) {
                found = {
                    key: key,
                    student: student
                };
            }
        });

        if (!found) {
            throw makeError(
                "student-not-found",
                "رقم الهاتف غير مسجل في النظام."
            );
        }

        return found;
    }


    /* =========================================================
       LOGIN WITH PHONE + PIN
       ========================================================= */

    async function loginWithPhonePassword(
        phone,
        pin,
        options
    ) {
        const requestedPhone = safeString(phone);
        const requestedPin = safeString(pin);

        options = isObject(options)
            ? options
            : {};

        if (!requestedPhone) {
            throw makeError(
                "phone-required",
                "يرجى إدخال رقم الهاتف."
            );
        }

        if (!requestedPin) {
            throw makeError(
                "pin-required",
                "يرجى إدخال كود المرور."
            );
        }

        const result = await findStudentByPhone(
            requestedPhone
        );

        const student = result.student;
        const key = result.key;

        /*
         * Check rejected first.
         */

        const status = safeString(
            student.status ||
            student.accountStatus ||
            student.approvalStatus
        ).toLowerCase();

        if (
            status === "rejected" ||
            status === "مرفوض"
        ) {
            throw makeError(
                "account-rejected",
                "تم رفض طلب الحساب. يرجى التواصل مع الإدارة."
            );
        }

        /*
         * PIN verification happens before approval message
         * so an invalid PIN is never accepted.
         */

        const validPin = await verifyPin(
            requestedPin,
            student
        );

        if (!validPin) {
            throw makeError(
                "invalid-pin",
                "رقم الهاتف أو كود المرور غير صحيح."
            );
        }

        /*
         * Account must be approved.
         */

        if (!isApprovedStudent(student)) {
            if (isPendingStudent(student)) {
                throw makeError(
                    "account-pending",
                    "الحساب ما زال قيد المراجعة من الإدارة."
                );
            }

            throw makeError(
                "account-not-approved",
                "الحساب لم يتم تفعيله بعد من الإدارة."
            );
        }

        /*
         * Save identity locally.
         */

        const currentStudent = serializeStudent(
            student,
            key
        );

        saveStudentIdentity(
            currentStudent,
            key
        );

        if (
            options.remember === true ||
            options.remember === "true"
        ) {
            saveRememberedLogin(requestedPhone);
        } else {
            clearRememberedLogin();
        }

        /*
         * Keep a small compatibility identity object.
         */

        const authIdentity = {
            uid: student.uid || "",
            userId: student.userId || "",
            studentId: student.studentId || key,
            phone: student.phone || requestedPhone,
            email: student.email || "",
            name:
                student.name ||
                student.studentName ||
                "",
            studentKey: key,
            authenticatedAt: Date.now(),
            provider: "legacy-student-auth"
        };

        safeLocalStorageSet(
            STORAGE_KEYS.firebaseAuthUser,
            JSON.stringify(authIdentity)
        );

        return {
            success: true,
            student: currentStudent,
            studentKey: key,
            user: authIdentity
        };
    }


    /*
     * Alias for older/newer pages.
     */

    const loginWithPhonePin =
        loginWithPhonePassword;


    /* =========================================================
       REGISTER STUDENT
       ========================================================= */

    async function registerStudent(data) {
        if (!isObject(data)) {
            throw makeError(
                "registration-failed",
                "بيانات التسجيل غير صحيحة."
            );
        }

        const name = safeString(
            data.name ||
            data.studentName
        );

        const grade = safeString(
            data.grade ||
            data.year ||
            data.level
        );

        const phone = safeString(
            data.phone
        );

        const email = normalizeEmail(
            data.email
        );

        const studentId = safeString(
            data.studentId
        );

        const pin = safeString(
            data.pin ||
            data.password
        );

        if (!name) {
            throw makeError(
                "name-required",
                "يرجى إدخال الاسم."
            );
        }

        if (!grade) {
            throw makeError(
                "grade-required",
                "يرجى اختيار الفرقة الدراسية."
            );
        }

        if (!phone) {
            throw makeError(
                "phone-required",
                "يرجى إدخال رقم الهاتف."
            );
        }

        if (!pin) {
            throw makeError(
                "pin-required",
                "يرجى إدخال كود المرور."
            );
        }

        /*
         * Check whether the phone already exists.
         */

        let existingStudent = null;

        try {
            existingStudent =
                await findStudentByPhone(phone);
        } catch (error) {
            if (
                error.code !== "student-not-found"
            ) {
                throw error;
            }
        }

        if (existingStudent) {
            throw makeError(
                "phone-already-exists",
                "رقم الهاتف مستخدم بالفعل."
            );
        }

        /*
         * Secure PIN hash for NEW accounts.
         *
         * Existing old accounts are untouched.
         */

        const pinHash = await hashPin(pin);

        if (!pinHash) {
            throw makeError(
                "registration-failed",
                "تعذر تأمين كود المرور على هذا الجهاز."
            );
        }

        const registrationTimestamp =
            firebase.database.ServerValue.TIMESTAMP;

        const studentData = {
            name: name,
            studentName: name,

            grade: grade,

            phone: phone,

            status: "pending",
            approvalStatus: "pending",
            accountStatus: "pending",

            pinHash: pinHash,

            createdAt: registrationTimestamp,
            updatedAt: registrationTimestamp,

            source: "student-registration",

            registeredFrom: "web"
        };

        if (email) {
            studentData.email = email;
        }

        if (studentId) {
            studentData.studentId = studentId;
        }

        /*
         * IMPORTANT:
         * We intentionally do NOT write:
         * uid
         * Firebase Auth credentials
         *
         * because this project uses phone + PIN legacy
         * authentication.
         */

        let newReference;

        try {
            newReference = await database
                .ref("students")
                .push(studentData);
        } catch (error) {
            throw makeError(
                "registration-failed",
                getErrorMessage(error)
            );
        }

        const newKey = newReference.key;

        return {
            success: true,
            studentKey: newKey,
            student: {
                id: newKey,
                studentKey: newKey,
                ...studentData
            }
        };
    }


    /* =========================================================
       GET CURRENT USER
       ========================================================= */

    function getCurrentUser() {
        const student =
            parseStorageObject(
                STORAGE_KEYS.currentUser
            );

        if (student) {
            return student;
        }

        const legacyStudent =
            parseStorageObject(
                STORAGE_KEYS.student
            );

        return legacyStudent || null;
    }


    function getCurrentStudent() {
        return (
            parseStorageObject(
                STORAGE_KEYS.currentStudent
            ) ||
            getCurrentUser()
        );
    }


    function getCurrentStudentKey() {
        return (
            safeLocalStorageGet(
                STORAGE_KEYS.currentStudentKey
            ) ||
            ""
        );
    }


    function getAuthIdentity() {
        return parseStorageObject(
            STORAGE_KEYS.firebaseAuthUser
        );
    }


    function isSignedIn() {
        return !!getCurrentUser();
    }


    function getUid() {
        const identity = getAuthIdentity();

        if (identity && identity.uid) {
            return identity.uid;
        }

        return "";
    }


    function getPhoneNumber() {
        const student = getCurrentStudent();

        if (student && student.phone) {
            return student.phone;
        }

        const identity = getAuthIdentity();

        if (identity && identity.phone) {
            return identity.phone;
        }

        return "";
    }


    function getEmail() {
        const student = getCurrentStudent();

        if (student && student.email) {
            return student.email;
        }

        const identity = getAuthIdentity();

        if (identity && identity.email) {
            return identity.email;
        }

        return "";
    }


    /* =========================================================
       SIGN OUT
       ========================================================= */

    async function signOut() {
        /*
         * This project does not require Firebase Auth signOut.
         * If an old Firebase Auth session exists, clear it too.
         */

        if (
            auth &&
            typeof auth.signOut === "function"
        ) {
            try {
                await auth.signOut();
            } catch (error) {
                // Do not block local logout.
            }
        }

        safeLocalStorageRemove(
            STORAGE_KEYS.currentUser
        );

        safeLocalStorageRemove(
            STORAGE_KEYS.student
        );

        safeLocalStorageRemove(
            STORAGE_KEYS.currentStudent
        );

        safeLocalStorageRemove(
            STORAGE_KEYS.currentStudentKey
        );

        safeLocalStorageRemove(
            STORAGE_KEYS.firebaseAuthUser
        );

        clearRememberedLogin();

        return {
            success: true
        };
    }


    /* =========================================================
       AUTH STATE COMPATIBILITY
       ========================================================= */

    function onAuthStateChanged(callback) {
        if (typeof callback !== "function") {
            return function () {};
        }

        /*
         * First emit our local student state.
         */

        setTimeout(function () {
            try {
                callback(
                    getCurrentUser()
                );
            } catch (error) {
                // Ignore callback errors.
            }
        }, 0);

        /*
         * Also listen to Firebase Auth if it exists,
         * purely for compatibility with older pages.
         */

        if (
            auth &&
            typeof auth.onAuthStateChanged === "function"
        ) {
            return auth.onAuthStateChanged(
                function (firebaseUser) {
                    /*
                     * Do not delete our local student identity
                     * when Firebase Auth is null.
                     */
                    if (firebaseUser) {
                        const identity = {
                            uid:
                                firebaseUser.uid || "",
                            email:
                                firebaseUser.email || "",
                            phone:
                                firebaseUser.phoneNumber || "",
                            displayName:
                                firebaseUser.displayName || "",
                            provider: "firebase"
                        };

                        safeLocalStorageSet(
                            STORAGE_KEYS.firebaseAuthUser,
                            JSON.stringify(identity)
                        );
                    }
                }
            );
        }

        return function () {};
    }


    function waitForAuth() {
        return Promise.resolve(
            getCurrentUser()
        );
    }


    function requireAuth(options) {
        options = isObject(options)
            ? options
            : {};

        const user = getCurrentUser();

        if (user) {
            return user;
        }

        if (
            options.redirect !== false
        ) {
            const target =
                options.redirectTo ||
                "login.html";

            window.location.href = target;
        }

        return null;
    }


    /* =========================================================
       COMPATIBILITY FUNCTIONS
       ========================================================= */

    async function sendPasswordResetEmail() {
        /*
         * The old system uses phone + PIN and therefore
         * does not have an email-password reset flow.
         *
         * This function remains available so older pages
         * do not crash.
         */

        throw makeError(
            "password-reset-unavailable",
            "استعادة كود المرور تتم من خلال إدارة المنصة."
        );
    }


    async function registerWithEmail() {
        throw makeError(
            "legacy-auth-mode",
            "التسجيل في المنصة يتم باستخدام رقم الهاتف وكود المرور."
        );
    }


    async function loginWithEmail() {
        throw makeError(
            "legacy-auth-mode",
            "الدخول في المنصة يتم باستخدام رقم الهاتف وكود المرور."
        );
    }


    function getRememberedLoginInfo() {
        return getRememberedLogin();
    }


    function isEmailVerified() {
        return false;
    }


    async function reloadUser() {
        return getCurrentUser();
    }


    async function getIdToken() {
        return null;
    }


    async function updateDisplayName() {
        return getCurrentUser();
    }


    async function changePassword() {
        throw makeError(
            "legacy-auth-mode",
            "تغيير كود المرور يتم من خلال نظام المنصة."
        );
    }


    function getProviderId() {
        return "legacy-student-auth";
    }


    /* =========================================================
       PUBLIC API
       ========================================================= */

    const FirebaseAuth = {

        /*
         * Main legacy-compatible authentication
         */

        loginWithPhonePassword:
            loginWithPhonePassword,

        loginWithPhonePin:
            loginWithPhonePin,

        registerStudent:
            registerStudent,

        findStudentByPhone:
            findStudentByPhone,

        verifyPin:
            verifyPin,

        hashPin:
            hashPin,

        /*
         * Current identity
         */

        getCurrentUser:
            getCurrentUser,

        getCurrentStudent:
            getCurrentStudent,

        getCurrentStudentKey:
            getCurrentStudentKey,

        getAuthIdentity:
            getAuthIdentity,

        getUid:
            getUid,

        getEmail:
            getEmail,

        getPhoneNumber:
            getPhoneNumber,

        isSignedIn:
            isSignedIn,

        isAuthenticated:
            isSignedIn,

        /*
         * Session
         */

        signOut:
            signOut,

        onAuthStateChanged:
            onAuthStateChanged,

        waitForAuth:
            waitForAuth,

        requireAuth:
            requireAuth,

        /*
         * Remembered login
         */

        getRememberedLogin:
            getRememberedLogin,

        getRememberedLoginInfo:
            getRememberedLoginInfo,

        /*
         * Compatibility
         */

        registerWithEmail:
            registerWithEmail,

        loginWithEmail:
            loginWithEmail,

        sendPasswordResetEmail:
            sendPasswordResetEmail,

        isEmailVerified:
            isEmailVerified,

        reloadUser:
            reloadUser,

        getIdToken:
            getIdToken,

        updateDisplayName:
            updateDisplayName,

        changePassword:
            changePassword,

        getProviderId:
            getProviderId,

        /*
         * Error helper
         */

        getErrorMessage:
            getErrorMessage
    };


    /* =========================================================
       GLOBAL EXPORT
       ========================================================= */

    window.FirebaseAuth =
        Object.freeze(FirebaseAuth);

    window.FirebaseAuthReady = true;

})();
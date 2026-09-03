/**
 * ============================================================
 * COACH PLATFORM
 * Firebase Authentication
 * ============================================================
 *
 * File:
 *   firebase-auth.js
 *
 * Depends on:
 *   firebase-config.js
 *
 * Firebase SDK:
 *   Firebase Compat 10.12.5
 *
 * Supported:
 *   - Email / Password registration
 *   - Email / Password login
 *   - Password reset
 *   - Sign out
 *   - Firebase Auth state listener
 *   - Phone OTP login
 *   - reCAPTCHA integration for phone authentication
 *   - Current user helpers
 *   - Legacy localStorage identity compatibility
 *
 * IMPORTANT:
 *   - No database data is deleted.
 *   - No existing student records are overwritten automatically.
 *   - No passwords are stored in Realtime Database.
 *   - Phone authentication uses Firebase's official OTP flow.
 *   - This file does NOT modify index.css.
 * ============================================================
 */

(function (window) {
  "use strict";


  /* ============================================================
     1. DEPENDENCY CHECK
     ============================================================ */

  if (!window.FirebaseCore) {
    throw new Error(
      "[FirebaseAuth] firebase-config.js must be loaded first."
    );
  }

  if (!window.firebase) {
    throw new Error(
      "[FirebaseAuth] Firebase SDK was not found."
    );
  }

  if (!window.FirebaseCore.auth) {
    throw new Error(
      "[FirebaseAuth] Firebase Authentication SDK is not loaded."
    );
  }


  /* ============================================================
     2. CORE REFERENCES
     ============================================================ */

  const core = window.FirebaseCore;

  const auth = core.auth;

  const database = core.database;


  /* ============================================================
     3. LOCAL STORAGE KEYS
     ============================================================ */

  const STORAGE_KEYS = Object.freeze({

    currentUser: "currentUser",

    student: "student",

    currentStudent: "currentStudent",

    currentStudentKey: "currentStudentKey",

    rememberedLogin: "coach_platform_remembered_login",

    firebaseAuthUser: "coach_platform_firebase_user"
  });


  /* ============================================================
     4. AUTH STATE
     ============================================================ */

  let currentAuthUser = auth.currentUser || null;

  let authInitialized = false;

  let authReadyPromise = null;


  /* ============================================================
     5. INTERNAL HELPERS
     ============================================================ */

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


  function normalizeEmail(email) {
    if (!hasValue(email)) {
      return "";
    }

    return String(email)
      .trim()
      .toLowerCase();
  }


  function normalizePhone(phone) {
    if (!hasValue(phone)) {
      return "";
    }

    return String(phone)
      .trim()
      .replace(/[^\d+]/g, "");
  }


  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }


  function saveLocal(key, value) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(value)
      );
    } catch (error) {
      /*
       * localStorage may be unavailable in some browser
       * configurations. Authentication itself must continue.
       */
    }
  }


  function getLocal(key, fallback) {
    try {
      const value = localStorage.getItem(key);

      if (!hasValue(value)) {
        return fallback;
      }

      return safeJsonParse(value, fallback);

    } catch (error) {
      return fallback;
    }
  }


  function removeLocal(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      /*
       * Ignore localStorage failures.
       */
    }
  }


  /* ============================================================
     6. AUTH ERROR NORMALIZATION
     ============================================================ */

  const AUTH_ERROR_MESSAGES = Object.freeze({

    "auth/invalid-email":
      "البريد الإلكتروني غير صحيح.",

    "auth/missing-email":
      "من فضلك أدخل البريد الإلكتروني.",

    "auth/missing-password":
      "من فضلك أدخل كلمة المرور.",

    "auth/invalid-credential":
      "البريد الإلكتروني أو كلمة المرور غير صحيحة.",

    "auth/wrong-password":
      "البريد الإلكتروني أو كلمة المرور غير صحيحة.",

    "auth/user-not-found":
      "لم يتم العثور على الحساب.",

    "auth/user-disabled":
      "هذا الحساب تم تعطيله.",

    "auth/email-already-in-use":
      "هذا البريد الإلكتروني مستخدم بالفعل.",

    "auth/weak-password":
      "كلمة المرور ضعيفة.",

    "auth/password-does-not-meet-requirements":
      "كلمة المرور لا تستوفي متطلبات الأمان.",

    "auth/operation-not-allowed":
      "طريقة تسجيل الدخول هذه غير مفعلة في Firebase.",

    "auth/too-many-requests":
      "تم إجراء محاولات كثيرة. حاول مرة أخرى لاحقًا.",

    "auth/network-request-failed":
      "حدثت مشكلة في الاتصال بالإنترنت.",

    "auth/user-token-expired":
      "انتهت جلسة تسجيل الدخول. سجل الدخول مرة أخرى.",

    "auth/requires-recent-login":
      "يجب تسجيل الدخول مرة أخرى لتنفيذ هذه العملية.",

    "auth/invalid-verification-code":
      "رمز التحقق غير صحيح.",

    "auth/invalid-verification-id":
      "جلسة التحقق غير صالحة.",

    "auth/code-expired":
      "انتهت صلاحية رمز التحقق.",

    "auth/missing-verification-code":
      "من فضلك أدخل رمز التحقق.",

    "auth/quota-exceeded":
      "تم تجاوز الحد المسموح لطلبات التحقق.",

    "auth/captcha-check-failed":
      "تعذر إتمام التحقق الأمني.",

    "auth/missing-phone-number":
      "من فضلك أدخل رقم الهاتف.",

    "auth/invalid-phone-number":
      "رقم الهاتف غير صحيح.",

    "auth/phone-number-already-exists":
      "رقم الهاتف مستخدم بالفعل.",

    "auth/provider-already-linked":
      "طريقة تسجيل الدخول مرتبطة بالحساب بالفعل.",

    "auth/credential-already-in-use":
      "بيانات تسجيل الدخول مستخدمة بالفعل.",

    "auth/account-exists-with-different-credential":
      "يوجد حساب بهذا البريد باستخدام طريقة تسجيل دخول أخرى.",

    "auth/session-expired":
      "انتهت جلسة التحقق.",

    "auth/unauthorized-domain":
      "هذا النطاق غير مضاف إلى Firebase Authentication.",

    "auth/popup-closed-by-user":
      "تم إغلاق نافذة تسجيل الدخول.",

    "auth/internal-error":
      "حدث خطأ داخلي في Firebase."
  });


  function getErrorCode(error) {
    if (!error) {
      return "";
    }

    return String(error.code || "");
  }


  function getErrorMessage(error) {
    if (!error) {
      return "حدث خطأ غير معروف.";
    }

    const code = getErrorCode(error);

    if (code && AUTH_ERROR_MESSAGES[code]) {
      return AUTH_ERROR_MESSAGES[code];
    }

    if (error.message) {
      return String(error.message);
    }

    return "حدث خطأ أثناء المصادقة.";
  }


  /* ============================================================
     7. USER SERIALIZATION
     ============================================================ */

  function serializeUser(user) {
    if (!user) {
      return null;
    }

    return {
      uid: user.uid || null,

      email: user.email || null,

      phoneNumber: user.phoneNumber || null,

      displayName: user.displayName || null,

      photoURL: user.photoURL || null,

      emailVerified:
        user.emailVerified === true,

      isAnonymous:
        user.isAnonymous === true,

      providerId:
        user.providerData &&
        user.providerData.length
          ? user.providerData[0].providerId || null
          : null,

      createdAt:
        user.metadata &&
        user.metadata.creationTime
          ? user.metadata.creationTime
          : null,

      lastSignInAt:
        user.metadata &&
        user.metadata.lastSignInTime
          ? user.metadata.lastSignInTime
          : null
    };
  }


  /* ============================================================
     8. SAVE AUTH IDENTITY LOCALLY
     ============================================================ */

  function saveAuthIdentity(user) {
    if (!user) {
      return;
    }

    const serialized = serializeUser(user);

    /*
     * Keep the existing localStorage identity keys used by
     * the old pages so the migration can happen gradually.
     */
    saveLocal(
      STORAGE_KEYS.currentUser,
      serialized
    );

    saveLocal(
      STORAGE_KEYS.firebaseAuthUser,
      serialized
    );

    /*
     * We intentionally do NOT overwrite:
     *
     *   student
     *   currentStudent
     *   currentStudentKey
     *
     * because these may contain existing Firebase student data.
     */
  }


  /* ============================================================
     9. CLEAR AUTH IDENTITY
     * ============================================================ */

  function clearAuthIdentity() {

    removeLocal(
      STORAGE_KEYS.currentUser
    );

    removeLocal(
      STORAGE_KEYS.firebaseAuthUser
    );

    /*
     * Do not remove student/currentStudent automatically.
     *
     * Those records are managed by the student/database layer.
     * This prevents accidental loss of locally cached legacy data.
     */
  }


  /* ============================================================
     10. AUTH STATE LISTENER
     * ============================================================ */

  const authStateListeners = [];


  function notifyAuthState(user) {

    authStateListeners.slice().forEach(
      function (listener) {

        try {
          listener(user);
        } catch (error) {

          if (
            window.console &&
            console.error
          ) {
            console.error(
              "[FirebaseAuth] Auth listener error:",
              error
            );
          }

        }
      }
    );
  }


  auth.onAuthStateChanged(function (user) {

    currentAuthUser = user || null;

    authInitialized = true;

    if (user) {
      saveAuthIdentity(user);
    } else {
      clearAuthIdentity();
    }

    notifyAuthState(currentAuthUser);
  });


  /* ============================================================
     11. AUTH READY PROMISE
     ============================================================ */

  authReadyPromise = new Promise(
    function (resolve) {

      if (authInitialized) {
        resolve(currentAuthUser);
        return;
      }

      const unsubscribe =
        auth.onAuthStateChanged(
          function (user) {

            unsubscribe();

            resolve(user || null);
          }
        );
    }
  );


  /* ============================================================
     12. WAIT FOR AUTH INITIALIZATION
     ============================================================ */

  function waitForAuth() {
    return authReadyPromise;
  }


  /* ============================================================
     13. GET CURRENT USER
     ============================================================ */

  function getCurrentUser() {
    return currentAuthUser ||
      auth.currentUser ||
      null;
  }


  /* ============================================================
     14. IS SIGNED IN
     ============================================================ */

  function isSignedIn() {
    return !!getCurrentUser();
  }


  /* ============================================================
     15. REGISTER WITH EMAIL/PASSWORD
     ============================================================ */

  async function registerWithEmail(
    email,
    password
  ) {

    email = normalizeEmail(email);

    if (!email) {
      throw new Error(
        "من فضلك أدخل البريد الإلكتروني."
      );
    }

    if (!hasValue(password)) {
      throw new Error(
        "من فضلك أدخل كلمة المرور."
      );
    }

    try {

      const credential =
        await auth.createUserWithEmailAndPassword(
          email,
          password
        );

      const user =
        credential.user || auth.currentUser;

      if (user) {
        saveAuthIdentity(user);
      }

      return user;

    } catch (error) {

      const normalized =
        new Error(
          getErrorMessage(error)
        );

      normalized.code =
        getErrorCode(error);

      normalized.originalError =
        error;

      throw normalized;
    }
  }


  /* ============================================================
     16. LOGIN WITH EMAIL/PASSWORD
     ============================================================ */

  async function loginWithEmail(
    email,
    password,
    options
  ) {

    email = normalizeEmail(email);

    if (!email) {
      throw new Error(
        "من فضلك أدخل البريد الإلكتروني."
      );
    }

    if (!hasValue(password)) {
      throw new Error(
        "من فضلك أدخل كلمة المرور."
      );
    }

    options = isObject(options)
      ? options
      : {};


    try {

      const credential =
        await auth.signInWithEmailAndPassword(
          email,
          password
        );

      const user =
        credential.user || auth.currentUser;

      if (user) {
        saveAuthIdentity(user);
      }

      /*
       * Remember-login preference is only a UI preference.
       * Firebase Auth manages the actual authentication session.
       */
      if (options.remember === true) {

        saveLocal(
          STORAGE_KEYS.rememberedLogin,
          {
            enabled: true,
            identifier: email
          }
        );

      } else if (options.remember === false) {

        removeLocal(
          STORAGE_KEYS.rememberedLogin
        );
      }

      return user;

    } catch (error) {

      const normalized =
        new Error(
          getErrorMessage(error)
        );

      normalized.code =
        getErrorCode(error);

      normalized.originalError =
        error;

      throw normalized;
    }
  }


  /* ============================================================
     17. PASSWORD RESET
     ============================================================ */

  async function sendPasswordResetEmail(email) {

    email = normalizeEmail(email);

    if (!email) {
      throw new Error(
        "من فضلك أدخل البريد الإلكتروني."
      );
    }

    try {

      await auth.sendPasswordResetEmail(
        email
      );

      return true;

    } catch (error) {

      const normalized =
        new Error(
          getErrorMessage(error)
        );

      normalized.code =
        getErrorCode(error);

      normalized.originalError =
        error;

      throw normalized;
    }
  }


  /* ============================================================
     18. SIGN OUT
     ============================================================ */

  async function signOut() {

    try {

      await auth.signOut();

      clearAuthIdentity();

      return true;

    } catch (error) {

      const normalized =
        new Error(
          getErrorMessage(error)
        );

      normalized.code =
        getErrorCode(error);

      normalized.originalError =
        error;

      throw normalized;
    }
  }


  /* ============================================================
     19. PHONE AUTH - reCAPTCHA
     ============================================================ */

  let recaptchaVerifier = null;

  let recaptchaContainerId =
    null;


  function createRecaptchaVerifier(
    containerOrId,
    options
  ) {

    if (
      typeof firebase.auth.RecaptchaVerifier !==
      "function"
    ) {
      throw new Error(
        "Firebase reCAPTCHA غير متاح. تأكد من تحميل Firebase Auth SDK."
      );
    }

    if (
      recaptchaVerifier
    ) {
      return recaptchaVerifier;
    }

    let container = containerOrId;

    if (typeof containerOrId === "string") {

      recaptchaContainerId =
        containerOrId;

      container =
        document.getElementById(
          containerOrId
        );
    }

    if (!container) {
      throw new Error(
        "لم يتم العثور على عنصر reCAPTCHA."
      );
    }

    options = isObject(options)
      ? options
      : {};


    recaptchaVerifier =
      new firebase.auth.RecaptchaVerifier(
        container,
        Object.assign(
          {
            size: "invisible"
          },
          options
        )
      );

    return recaptchaVerifier;
  }


  async function verifyRecaptcha() {

    if (!recaptchaVerifier) {
      throw new Error(
        "يجب إنشاء reCAPTCHA أولًا."
      );
    }

    try {
      return await recaptchaVerifier.verify();

    } catch (error) {

      const normalized =
        new Error(
          getErrorMessage(error)
        );

      normalized.code =
        getErrorCode(error);

      normalized.originalError =
        error;

      throw normalized;
    }
  }


  function clearRecaptcha() {

    if (recaptchaVerifier) {

      try {
        recaptchaVerifier.clear();
      } catch (error) {
        /*
         * Ignore cleanup errors.
         */
      }
    }

    recaptchaVerifier = null;

    recaptchaContainerId = null;
  }


  /* ============================================================
     20. SEND PHONE OTP
     ============================================================ */

  async function sendPhoneOTP(
    phoneNumber,
    verifier
  ) {

    phoneNumber =
      normalizePhone(phoneNumber);

    if (!phoneNumber) {
      throw new Error(
        "من فضلك أدخل رقم الهاتف."
      );
    }

    if (!verifier) {

      if (recaptchaVerifier) {
        verifier = recaptchaVerifier;
      } else {
        throw new Error(
          "يجب إعداد reCAPTCHA قبل إرسال رمز الهاتف."
        );
      }
    }


    try {

      const confirmationResult =
        await auth.signInWithPhoneNumber(
          phoneNumber,
          verifier
        );

      return confirmationResult;

    } catch (error) {

      const normalized =
        new Error(
          getErrorMessage(error)
        );

      normalized.code =
        getErrorCode(error);

      normalized.originalError =
        error;

      throw normalized;
    }
  }


  /* ============================================================
     21. CONFIRM PHONE OTP
     ============================================================ */

  async function confirmPhoneOTP(
    confirmationResult,
    verificationCode
  ) {

    if (!confirmationResult) {
      throw new Error(
        "لا توجد عملية تحقق هاتفية نشطة."
      );
    }

    if (!hasValue(verificationCode)) {
      throw new Error(
        "من فضلك أدخل رمز التحقق."
      );
    }

    verificationCode =
      String(verificationCode)
        .trim();


    try {

      const credential =
        await confirmationResult.confirm(
          verificationCode
        );

      const user =
        credential.user || auth.currentUser;

      if (user) {
        saveAuthIdentity(user);
      }

      return user;

    } catch (error) {

      const normalized =
        new Error(
          getErrorMessage(error)
        );

      normalized.code =
        getErrorCode(error);

      normalized.originalError =
        error;

      throw normalized;
    }
  }


  /* ============================================================
     22. PHONE OTP COMPLETE FLOW
     ============================================================ */

  async function loginWithPhone(
    phoneNumber,
    verificationCode,
    verifier
  ) {

    /*
     * This function is intentionally split into two steps.
     *
     * If no verificationCode is provided:
     *   -> sends OTP
     *   -> returns confirmationResult
     *
     * If verificationCode is provided:
     *   -> confirms the OTP
     *   -> returns Firebase user
     */

    if (!hasValue(verificationCode)) {

      return sendPhoneOTP(
        phoneNumber,
        verifier
      );
    }


    /*
     * A confirmationResult must be supplied through the
     * two-step flow for OTP confirmation.
     */
    throw new Error(
      "استخدم sendPhoneOTP() ثم confirmPhoneOTP() لإتمام تسجيل الدخول بالهاتف."
    );
  }


  /* ============================================================
     23. AUTH STATE SUBSCRIPTION
     ============================================================ */

  function onAuthStateChanged(
    callback
  ) {

    if (typeof callback !== "function") {
      throw new TypeError(
        "onAuthStateChanged requires a function."
      );
    }

    authStateListeners.push(
      callback
    );


    /*
     * Give the caller the current state immediately when
     * Firebase has already initialized.
     */
    if (authInitialized) {

      try {
        callback(
          currentAuthUser
        );
      } catch (error) {
        if (
          window.console &&
          console.error
        ) {
          console.error(
            "[FirebaseAuth] Listener error:",
            error
          );
        }
      }
    }


    /*
     * Return unsubscribe function.
     */
    return function unsubscribe() {

      const index =
        authStateListeners.indexOf(
          callback
        );

      if (index !== -1) {
        authStateListeners.splice(
          index,
          1
        );
      }
    };
  }


  /* ============================================================
     24. REQUIRE AUTHENTICATION
     ============================================================ */

  async function requireAuth() {

    const user =
      await waitForAuth();

    if (!user) {
      const error =
        new Error(
          "يجب تسجيل الدخول أولًا."
        );

      error.code =
        "auth/not-authenticated";

      throw error;
    }

    return user;
  }


  /* ============================================================
     25. GET AUTH IDENTITY
     ============================================================ */

  function getAuthIdentity() {

    const user =
      getCurrentUser();

    if (user) {
      return serializeUser(user);
    }


    /*
     * Legacy fallback is read-only.
     *
     * It is useful during migration but is NOT treated as
     * authenticated Firebase identity.
     */

    const legacyUser =
      getLocal(
        STORAGE_KEYS.currentUser,
        null
      );

    if (
      isObject(legacyUser)
    ) {
      return legacyUser;
    }

    return null;
  }


  /* ============================================================
     26. GET AUTH UID
     ============================================================ */

  function getUid() {

    const user =
      getCurrentUser();

    if (user && user.uid) {
      return user.uid;
    }

    return null;
  }


  /* ============================================================
     27. GET AUTH EMAIL
     ============================================================ */

  function getEmail() {

    const user =
      getCurrentUser();

    if (user && user.email) {
      return user.email;
    }

    return null;
  }


  /* ============================================================
     28. GET AUTH PHONE
     ============================================================ */

  function getPhoneNumber() {

    const user =
      getCurrentUser();

    if (user && user.phoneNumber) {
      return user.phoneNumber;
    }

    return null;
  }


  /* ============================================================
     29. EMAIL VERIFICATION
     ============================================================ */

  async function sendEmailVerification() {

    const user =
      await requireAuth();

    try {

      await user.sendEmailVerification();

      return true;

    } catch (error) {

      const normalized =
        new Error(
          getErrorMessage(error)
        );

      normalized.code =
        getErrorCode(error);

      normalized.originalError =
        error;

      throw normalized;
    }
  }


  /* ============================================================
     30. REFRESH CURRENT USER
     ============================================================ */

  async function reloadCurrentUser() {

    const user =
      await requireAuth();

    try {

      await user.reload();

      currentAuthUser =
        auth.currentUser;

      if (currentAuthUser) {
        saveAuthIdentity(
          currentAuthUser
        );
      }

      return currentAuthUser;

    } catch (error) {

      const normalized =
        new Error(
          getErrorMessage(error)
        );

      normalized.code =
        getErrorCode(error);

      normalized.originalError =
        error;

      throw normalized;
    }
  }


  /* ============================================================
     31. GET ID TOKEN
     ============================================================ */

  async function getIdToken(
    forceRefresh
  ) {

    const user =
      await requireAuth();

    try {

      return await user.getIdToken(
        forceRefresh === true
      );

    } catch (error) {

      const normalized =
        new Error(
          getErrorMessage(error)
        );

      normalized.code =
        getErrorCode(error);

      normalized.originalError =
        error;

      throw normalized;
    }
  }


  /* ============================================================
     32. UPDATE DISPLAY NAME
     ============================================================ */

  async function updateDisplayName(
    displayName
  ) {

    const user =
      await requireAuth();

    displayName =
      hasValue(displayName)
        ? String(displayName).trim()
        : "";

    try {

      await user.updateProfile({
        displayName:
          displayName || null
      });

      currentAuthUser =
        auth.currentUser;

      saveAuthIdentity(
        currentAuthUser
      );

      return currentAuthUser;

    } catch (error) {

      const normalized =
        new Error(
          getErrorMessage(error)
        );

      normalized.code =
        getErrorCode(error);

      normalized.originalError =
        error;

      throw normalized;
    }
  }


  /* ============================================================
     33. CHANGE PASSWORD
     ============================================================ */

  async function changePassword(
    newPassword
  ) {

    const user =
      await requireAuth();

    if (!hasValue(newPassword)) {
      throw new Error(
        "من فضلك أدخل كلمة المرور الجديدة."
      );
    }

    try {

      await user.updatePassword(
        newPassword
      );

      return true;

    } catch (error) {

      const normalized =
        new Error(
          getErrorMessage(error)
        );

      normalized.code =
        getErrorCode(error);

      normalized.originalError =
        error;

      throw normalized;
    }
  }


  /* ============================================================
     34. REMEMBERED LOGIN
     ============================================================ */

  function getRememberedLogin() {

    return getLocal(
      STORAGE_KEYS.rememberedLogin,
      null
    );
  }


  function clearRememberedLogin() {

    removeLocal(
      STORAGE_KEYS.rememberedLogin
    );
  }


  /* ============================================================
     35. AUTHENTICATION PROVIDER
     ============================================================ */

  function getProviderId() {

    const user =
      getCurrentUser();

    if (
      !user ||
      !Array.isArray(
        user.providerData
      )
    ) {
      return null;
    }

    const provider =
      user.providerData.find(
        function (item) {
          return (
            item &&
            item.providerId
          );
        }
      );

    return provider
      ? provider.providerId
      : null;
  }


  /* ============================================================
     36. FINAL PUBLIC API
     ============================================================ */

  const FirebaseAuth = {

    /*
     * Firebase Auth instance
     */
    auth: auth,


    /*
     * Firebase Database reference.
     *
     * Included for compatibility with the next database layer.
     */
    database: database,


    /*
     * Authentication state
     */
    waitForAuth: waitForAuth,

    onAuthStateChanged:
      onAuthStateChanged,

    getCurrentUser:
      getCurrentUser,

    getAuthIdentity:
      getAuthIdentity,

    getUid:
      getUid,

    getEmail:
      getEmail,

    getPhoneNumber:
      getPhoneNumber,

    getProviderId:
      getProviderId,

    isSignedIn:
      isSignedIn,

    requireAuth:
      requireAuth,


    /*
     * Email authentication
     */
    registerWithEmail:
      registerWithEmail,

    loginWithEmail:
      loginWithEmail,

    sendPasswordResetEmail:
      sendPasswordResetEmail,

    sendEmailVerification:
      sendEmailVerification,

    changePassword:
      changePassword,


    /*
     * Phone authentication
     */
    createRecaptchaVerifier:
      createRecaptchaVerifier,

    verifyRecaptcha:
      verifyRecaptcha,

    clearRecaptcha:
      clearRecaptcha,

    sendPhoneOTP:
      sendPhoneOTP,

    confirmPhoneOTP:
      confirmPhoneOTP,

    loginWithPhone:
      loginWithPhone,


    /*
     * Account management
     */
    signOut:
      signOut,

    reloadCurrentUser:
      reloadCurrentUser,

    updateDisplayName:
      updateDisplayName,

    getIdToken:
      getIdToken,


    /*
     * Remember-login compatibility
     */
    getRememberedLogin:
      getRememberedLogin,

    clearRememberedLogin:
      clearRememberedLogin,


    /*
     * Error helpers
     */
    getErrorCode:
      getErrorCode,

    getErrorMessage:
      getErrorMessage,


    /*
     * Storage keys exposed for the other modules.
     */
    storageKeys:
      STORAGE_KEYS
  };


  /* ============================================================
     37. FREEZE PUBLIC API
     ============================================================ */

  window.FirebaseAuth =
    Object.freeze(
      FirebaseAuth
    );


  /* ============================================================
     38. READY FLAG
     ============================================================ */

  window.FirebaseAuthReady = true;


  /* ============================================================
     39. DEVELOPMENT MESSAGE
     ============================================================ */

  if (
    window.console &&
    typeof window.console.info ===
      "function"
  ) {

    console.info(
      "[FirebaseAuth] Authentication module initialized."
    );
  }


})(window);
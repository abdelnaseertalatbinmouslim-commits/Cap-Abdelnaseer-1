/**
 * ============================================================
 * COACH PLATFORM
 * Firebase Core Configuration
 * ============================================================
 *
 * File:
 *   firebase-config.js
 *
 * Version:
 *   Final Architecture
 *
 * Purpose:
 *   Central Firebase initialization and shared services.
 *
 * Existing Firebase project:
 *   abodaa
 *
 * Database:
 *   Firebase Realtime Database
 *
 * SDK:
 *   Firebase Compat 10.12.5
 *
 * IMPORTANT:
 *   - This file does NOT delete Firebase data.
 *   - This file does NOT overwrite existing database paths.
 *   - This file does NOT modify index.css.
 *   - This file does NOT modify the website design.
 *   - This file contains no Firebase Admin credentials.
 *
 * ============================================================
 */

(function (window) {
  "use strict";

  /* ============================================================
     1. EXISTING FIREBASE CONFIGURATION
     ============================================================ */

  const FIREBASE_CONFIG = Object.freeze({
    apiKey: "AIzaSyD64zup-c8pXmIeoRCUZSLtiKJYRfvAYbc",
    authDomain: "abodaa.firebaseapp.com",
    databaseURL: "https://abodaa-default-rtdb.firebaseio.com",
    projectId: "abodaa",
    storageBucket: "abodaa.firebasestorage.app",
    messagingSenderId: "489477833785",
    appId: "1:489477833785:web:cf7451889d7e7a5efdf9e8",
    measurementId: "G-GQFLS5HEHZ"
  });


  /* ============================================================
     2. FIREBASE SDK VALIDATION
     ============================================================ */

  if (!window.firebase) {
    throw new Error(
      "[FirebaseCore] Firebase SDK was not found. " +
      "Load firebase-app-compat.js before firebase-config.js."
    );
  }

  if (
    typeof firebase.initializeApp !== "function" ||
    typeof firebase.app !== "function"
  ) {
    throw new Error(
      "[FirebaseCore] Firebase App SDK is unavailable."
    );
  }


  /* ============================================================
     3. INITIALIZE FIREBASE ONCE
     ============================================================ */

  let app;

  try {
    if (firebase.apps && firebase.apps.length > 0) {
      app = firebase.app();
    } else {
      app = firebase.initializeApp(FIREBASE_CONFIG);
    }
  } catch (error) {
    /*
     * In unusual cases where another script initialized Firebase
     * between the check and initializeApp(), try to reuse it.
     */
    try {
      app = firebase.app();
    } catch (fallbackError) {
      throw new Error(
        "[FirebaseCore] Firebase initialization failed: " +
        (error && error.message
          ? error.message
          : "Unknown Firebase error.")
      );
    }
  }


  /* ============================================================
     4. FIREBASE SERVICES
     ============================================================ */

  let auth = null;
  let database = null;

  /*
   * Authentication SDK is loaded separately.
   *
   * This allows firebase-config.js to remain compatible with
   * pages that only need the database.
   */
  if (typeof firebase.auth === "function") {
    auth = firebase.auth();
  }

  /*
   * Realtime Database SDK is required by the platform.
   */
  if (typeof firebase.database === "function") {
    database = firebase.database();
  } else {
    throw new Error(
      "[FirebaseCore] Firebase Realtime Database SDK was not loaded."
    );
  }


  /* ============================================================
     5. SERVER TIMESTAMP
     ============================================================ */

  function serverTimestamp() {
    return firebase.database.ServerValue.TIMESTAMP;
  }


  /* ============================================================
     6. DATABASE REFERENCE HELPER
     ============================================================ */

  function normalizePath(path) {
    if (path === undefined || path === null) {
      return "";
    }

    return String(path)
      .trim()
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");
  }


  function ref(path) {
    const normalizedPath = normalizePath(path);

    if (!normalizedPath) {
      return database.ref();
    }

    return database.ref(normalizedPath);
  }


  /* ============================================================
     7. CHILD REFERENCE HELPER
     ============================================================ */

  function child(parentPath, childPath) {
    const parent = normalizePath(parentPath);
    const childPart = normalizePath(childPath);

    if (!parent && !childPart) {
      return database.ref();
    }

    if (!parent) {
      return database.ref(childPart);
    }

    if (!childPart) {
      return database.ref(parent);
    }

    return database.ref(parent + "/" + childPart);
  }


  /* ============================================================
     8. CURRENT AUTH USER
     ============================================================ */

  function getCurrentUser() {
    if (!auth) {
      return null;
    }

    return auth.currentUser || null;
  }


  /* ============================================================
     9. AUTH STATE HELPER
     ============================================================ */

  function onAuthStateChanged(callback) {
    if (!auth) {
      throw new Error(
        "[FirebaseCore] Firebase Authentication SDK is not loaded."
      );
    }

    if (typeof callback !== "function") {
      throw new TypeError(
        "[FirebaseCore] onAuthStateChanged requires a function."
      );
    }

    return auth.onAuthStateChanged(callback);
  }


  /* ============================================================
     10. FIREBASE ERROR NORMALIZATION
     ============================================================ */

  const ERROR_MESSAGES = Object.freeze({

    "auth/invalid-email":
      "البريد الإلكتروني غير صحيح.",

    "auth/user-disabled":
      "هذا الحساب تم تعطيله.",

    "auth/user-not-found":
      "لم يتم العثور على هذا الحساب.",

    "auth/wrong-password":
      "بيانات تسجيل الدخول غير صحيحة.",

    "auth/invalid-credential":
      "بيانات تسجيل الدخول غير صحيحة.",

    "auth/email-already-in-use":
      "هذا البريد الإلكتروني مستخدم بالفعل.",

    "auth/weak-password":
      "كلمة المرور ضعيفة.",

    "auth/operation-not-allowed":
      "طريقة تسجيل الدخول غير مفعلة في Firebase.",

    "auth/too-many-requests":
      "تم إجراء محاولات كثيرة. حاول مرة أخرى لاحقًا.",

    "auth/network-request-failed":
      "حدثت مشكلة في الاتصال بالإنترنت.",

    "auth/requires-recent-login":
      "يجب تسجيل الدخول مرة أخرى لتنفيذ هذه العملية.",

    "auth/invalid-verification-code":
      "رمز التحقق غير صحيح.",

    "auth/invalid-verification-id":
      "جلسة التحقق غير صالحة.",

    "auth/code-expired":
      "انتهت صلاحية رمز التحقق.",

    "auth/missing-verification-code":
      "لم يتم إدخال رمز التحقق.",

    "auth/quota-exceeded":
      "تم تجاوز الحد المسموح لطلبات التحقق.",

    "auth/captcha-check-failed":
      "تعذر التحقق من reCAPTCHA.",

    "auth/credential-already-in-use":
      "بيانات الاعتماد مستخدمة بالفعل.",

    "auth/provider-already-linked":
      "طريقة تسجيل الدخول مرتبطة بالحساب بالفعل.",

    "auth/no-such-provider":
      "طريقة تسجيل الدخول غير مرتبطة بالحساب.",

    "PERMISSION_DENIED":
      "ليس لديك صلاحية للوصول إلى هذه البيانات.",

    "permission-denied":
      "ليس لديك صلاحية للوصول إلى هذه البيانات.",

    "NETWORK_ERROR":
      "حدثت مشكلة في الاتصال بالشبكة."
  });


  function getErrorCode(error) {
    if (!error) {
      return "";
    }

    return String(
      error.code ||
      error.name ||
      ""
    );
  }


  function getErrorMessage(error) {
    if (!error) {
      return "حدث خطأ غير معروف.";
    }

    if (typeof error === "string") {
      return error;
    }

    const code = getErrorCode(error);

    if (code && ERROR_MESSAGES[code]) {
      return ERROR_MESSAGES[code];
    }

    if (error.message) {
      return String(error.message);
    }

    return "حدث خطأ أثناء تنفيذ العملية.";
  }


  /* ============================================================
     11. SAFE VALUE HELPERS
     ============================================================ */

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }


  function isEmptyObject(value) {
    return (
      isObject(value) &&
      Object.keys(value).length === 0
    );
  }


  function hasValue(value) {
    return (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    );
  }


  function firstValue() {
    for (let i = 0; i < arguments.length; i++) {
      const value = arguments[i];

      if (hasValue(value)) {
        return value;
      }
    }

    return null;
  }


  /* ============================================================
     12. IDENTIFIER NORMALIZATION
     ============================================================ */

  function normalizeIdentifier(value) {
    if (!hasValue(value)) {
      return "";
    }

    return String(value)
      .trim()
      .toLowerCase();
  }


  function normalizePhone(value) {
    if (!hasValue(value)) {
      return "";
    }

    return String(value)
      .trim()
      .replace(/[^\d+]/g, "");
  }


  /* ============================================================
     13. DATA CONVERSION HELPERS
     ============================================================ */

  function toArray(value) {
    if (Array.isArray(value)) {
      return value;
    }

    if (!isObject(value)) {
      return [];
    }

    return Object.keys(value).map(function (key) {
      const item = value[key];

      if (isObject(item)) {
        return Object.assign(
          {
            key: key
          },
          item
        );
      }

      return {
        key: key,
        value: item
      };
    });
  }


  function cloneObject(value) {
    if (!isObject(value)) {
      return value;
    }

    return Object.assign({}, value);
  }


  /* ============================================================
     14. EXISTING PROJECT PATH REGISTRY
     ============================================================ */

  /*
   * These paths are based on the existing project behavior.
   *
   * IMPORTANT:
   * This registry does NOT create these paths.
   * It only gives the upcoming Firebase modules one central
   * place for path names.
   */

  const PATHS = Object.freeze({

    students: "students",

    files: "files",

    videos: "videos",

    notifications: "notifications",

    notificationReads: "notificationReads",

    quizzes: "quizzes",

    quizAttempts: "quizAttempts",

    results: "results",

    support: "settings/support",

    supportTickets: "supportTickets",

    settings: "settings"
  });


  /* ============================================================
     15. FUTURE EXTENSION REGISTRY
     ============================================================ */

  /*
   * Future sections/databases can be added here without
   * changing the Firebase initialization architecture.
   *
   * No real future database path is invented here.
   */

  const MODULE_REGISTRY = Object.freeze({
    core: "firebase-config.js",
    auth: "firebase-auth.js",
    database: "firebase-database.js",
    content: "firebase-content.js",
    features: "firebase-features.js"
  });


  /* ============================================================
     16. PLATFORM INFORMATION
     ============================================================ */

  const PLATFORM = Object.freeze({

    name: "Coach Platform",

    firebaseProjectId:
      FIREBASE_CONFIG.projectId,

    databaseType:
      "Realtime Database",

    firebaseSdk:
      "10.12.5-compat",

    architecture:
      "centralized-firebase-modules",

    version:
      "1.0.0"
  });


  /* ============================================================
     17. PUBLIC FIREBASE CORE API
     ============================================================ */

  const FirebaseCore = {

    /*
     * Firebase application
     */
    app: app,

    /*
     * Firebase Authentication instance.
     * May be null if auth SDK wasn't loaded on a page.
     */
    auth: auth,

    /*
     * Firebase Realtime Database instance.
     */
    database: database,

    /*
     * Existing Firebase configuration.
     */
    config: configSafeCopy(FIREBASE_CONFIG),

    /*
     * Existing database path registry.
     */
    paths: PATHS,

    /*
     * Firebase module registry.
     */
    modules: MODULE_REGISTRY,

    /*
     * Platform information.
     */
    platform: PLATFORM,

    /*
     * Return Firebase server timestamp.
     */
    serverTimestamp: serverTimestamp,

    /*
     * Database reference.
     *
     * Example:
     * FirebaseCore.ref("students")
     */
    ref: ref,

    /*
     * Child database reference.
     *
     * Example:
     * FirebaseCore.child("students", studentId)
     */
    child: child,

    /*
     * Current authenticated Firebase user.
     */
    getCurrentUser: getCurrentUser,

    /*
     * Firebase authentication state listener.
     */
    onAuthStateChanged: onAuthStateChanged,

    /*
     * Human-readable Firebase error.
     */
    getErrorMessage: getErrorMessage,

    /*
     * Firebase error code.
     */
    getErrorCode: getErrorCode,

    /*
     * Object check.
     */
    isObject: isObject,

    /*
     * Empty object check.
     */
    isEmptyObject: isEmptyObject,

    /*
     * Value check.
     */
    hasValue: hasValue,

    /*
     * Return first valid value.
     */
    firstValue: firstValue,

    /*
     * Normalize identifiers.
     */
    normalizeIdentifier: normalizeIdentifier,

    /*
     * Normalize phone numbers.
     */
    normalizePhone: normalizePhone,

    /*
     * Convert Firebase object/array to array.
     */
    toArray: toArray,

    /*
     * Clone simple objects.
     */
    cloneObject: cloneObject
  };


  /* ============================================================
     18. CONFIG COPY HELPER
     ============================================================ */

  /*
   * Defined separately so the public config object cannot
   * accidentally mutate the internal configuration.
   */

  function configSafeCopy(source) {
    return Object.freeze(
      Object.assign({}, source)
    );
  }


  /*
   * Reassign the public config after helper definition.
   */
  FirebaseCore.config = configSafeCopy(FIREBASE_CONFIG);


  /* ============================================================
     19. FREEZE CORE API
     ============================================================ */

  window.FirebaseCore = Object.freeze(FirebaseCore);


  /* ============================================================
     20. BACKWARD-COMPATIBLE GLOBAL REFERENCES
     ============================================================ */

  /*
   * These references make integration easier for the old
   * static HTML pages while the project is being migrated.
   *
   * They do NOT replace FirebaseCore.
   */

  window.FirebaseApp = app;

  window.FirebaseAuth = auth;

  window.FirebaseDatabase = database;


  /* ============================================================
     21. INITIALIZATION STATUS
     ============================================================ */

  window.FirebaseCoreReady = true;


  /* ============================================================
     22. OPTIONAL DEBUG INFORMATION
     ============================================================ */

  /*
   * No sensitive credential is printed.
   *
   * This only helps identify that the central Firebase layer
   * loaded successfully during development.
   */

  if (
    window.console &&
    typeof window.console.info === "function"
  ) {
    window.console.info(
      "[FirebaseCore] Initialized successfully:",
      PLATFORM.firebaseProjectId
    );
  }


})(window);
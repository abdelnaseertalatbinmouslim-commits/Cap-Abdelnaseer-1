// ============================================================
// Abdelnaseer Platform
// Firebase Configuration & Shared Services
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
    getAuth,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
    getDatabase,
    ref,
    get,
    set,
    update,
    push,
    remove,
    onValue,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// ============================================================
// Firebase Web App Configuration
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyD64Zup-c8pXmIeoRCUzSLtiyKJRfvAYbc",
    authDomain: "abodaa.firebaseapp.com",
    databaseURL: "https://abodaa-default-rtdb.firebaseio.com",
    projectId: "abodaa",
    storageBucket: "abodaa.firebasestorage.app",
    messagingSenderId: "489477833785",
    appId: "1:489477833785:web:cf7451889d7e7a5efdf9e8",
    measurementId: "G-GQFLS5HEHZ"
};

// ============================================================
// Initialize Firebase
// ============================================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const database = getDatabase(app);

// Keep the user signed in across page refreshes.
await setPersistence(auth, browserLocalPersistence);

// ============================================================
// Database Paths
// ============================================================

const DB_PATHS = Object.freeze({
    students: "students",
    courses: "courses",
    quizzes: "quizzes",
    quizResults: "quiz_results",
    contentViews: "content_views",
    notifications: "notifications",
    settings: "settings"
});

// ============================================================
// Authentication Helpers
// ============================================================

function getCurrentUser() {
    return auth.currentUser;
}

function isAuthenticated() {
    return auth.currentUser !== null;
}

function waitForAuth() {
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
        });
    });
}

// ============================================================
// Database Helpers
// ============================================================

function dbRef(path) {
    return ref(database, path);
}

async function dbGet(path) {
    const snapshot = await get(dbRef(path));
    return snapshot.exists() ? snapshot.val() : null;
}

async function dbSet(path, value) {
    return set(dbRef(path), value);
}

async function dbUpdate(path, value) {
    return update(dbRef(path), value);
}

async function dbPush(path, value) {
    return push(dbRef(path), value);
}

async function dbRemove(path) {
    return remove(dbRef(path));
}

function dbListen(path, callback) {
    return onValue(dbRef(path), (snapshot) => {
        callback(snapshot.exists() ? snapshot.val() : null);
    });
}

// ============================================================
// Server Timestamp
// ============================================================

function getServerTimestamp() {
    return serverTimestamp();
}

// ============================================================
// Safe Local Storage Helpers
// ============================================================

function storageGet(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.error("Storage read error:", error);
        return null;
    }
}

function storageSet(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.error("Storage write error:", error);
        return false;
    }
}

function storageRemove(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error("Storage remove error:", error);
    }
}

// ============================================================
// Application Constants
// ============================================================

const APP_CONFIG = Object.freeze({
    name: "Abdelnaseer Platform",
    version: "2.0.0",

    firebase: Object.freeze({
        projectId: firebaseConfig.projectId,
        databaseURL: firebaseConfig.databaseURL
    }),

    paths: DB_PATHS
});

// ============================================================
// Global Export
// ============================================================

window.AbdelnaseerFirebase = Object.freeze({
    app,
    auth,
    database,

    firebaseConfig,
    DB_PATHS,
    APP_CONFIG,

    getCurrentUser,
    isAuthenticated,
    waitForAuth,

    dbRef,
    dbGet,
    dbSet,
    dbUpdate,
    dbPush,
    dbRemove,
    dbListen,

    getServerTimestamp,

    storageGet,
    storageSet,
    storageRemove
});

// ============================================================
// Development Information
// ============================================================

if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
) {
    console.log("==========================================");
    console.log("Abdelnaseer Platform");
    console.log("Version:", APP_CONFIG.version);
    console.log("Firebase:", APP_CONFIG.firebase.projectId);
    console.log("Firebase initialized successfully.");
    console.log("==========================================");
                   }

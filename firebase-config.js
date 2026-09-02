// ============================================================
// منصة الكوتش - Firebase Configuration
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signOut
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

// ------------------------------------------------------------
// Firebase Configuration
// ------------------------------------------------------------

const firebaseConfig = {
  apiKey: "AIzaSyD64zup-c8pXmIeoRCUzSLtiKjYRfvAYbc",
  authDomain: "abodaa.firebaseapp.com",
  databaseURL: "https://abodaa-default-rtdb.firebaseio.com",
  projectId: "abodaa",
  storageBucket: "abodaa.firebasestorage.app",
  messagingSenderId: "489477833785",
  appId: "1:489477833785:web:cf7451889d7e7a5efdf9e8",
  measurementId: "G-GQFLS5HEHZ"
};

// ------------------------------------------------------------
// Initialize Firebase
// ------------------------------------------------------------

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// ------------------------------------------------------------
// Authentication Persistence
// ------------------------------------------------------------

try {
  await setPersistence(auth, browserLocalPersistence);
} catch (error) {
  console.error("Firebase persistence error:", error);
}

// ------------------------------------------------------------
// Database Paths
// ------------------------------------------------------------

const DB_PATHS = {
  students: "students",
  courses: "courses",
  quizzes: "quizzes",
  quizResults: "quiz_results",
  contentViews: "content_views",
  notifications: "notifications",
  settings: "settings",
  registrationRequests: "registration_requests",
  admins: "admins"
};

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function dbRef(path = "") {
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
  const newRef = push(dbRef(path));
  await set(newRef, value);

  return {
    key: newRef.key,
    ref: newRef
  };
}

async function dbRemove(path) {
  return remove(dbRef(path));
}

// ------------------------------------------------------------
// Authentication Helpers
// ------------------------------------------------------------

function getCurrentUser() {
  return auth.currentUser;
}

function waitForAuth() {
  return new Promise((resolve) => {
    let finished = false;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (finished) return;

      finished = true;
      unsubscribe();
      resolve(user);
    });
  });
}

async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
  }
}

// ------------------------------------------------------------
// Export
// ------------------------------------------------------------

window.AbdelnaseerFirebase = {
  app,
  auth,
  database,

  firebaseConfig,

  DB_PATHS,

  ref,
  get,
  set,
  update,
  push,
  remove,
  onValue,
  serverTimestamp,

  dbRef,
  dbGet,
  dbSet,
  dbUpdate,
  dbPush,
  dbRemove,

  getCurrentUser,
  waitForAuth,
  logoutUser
};

console.log("منصة الكوتش - Firebase جاهز");

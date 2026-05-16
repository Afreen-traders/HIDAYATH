/* ===== AFREEN TRADERS — Firebase Authentication Module ===== */
/* Loaded as ES module on pages that need Firebase auth */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    sendPasswordResetEmail,
    updateProfile,
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js';

/* ─── Firebase Config ─── */
const firebaseConfig = {
    apiKey: "AIzaSyD8ufd1LtcXrJzDgaevY0w9RjxNo_k2XCk",
    authDomain: "afreen-traders.firebaseapp.com",
    projectId: "afreen-traders",
    storageBucket: "afreen-traders.firebasestorage.app",
    messagingSenderId: "924903956350",
    appId: "1:924903956350:web:e7fa4b707be66ece269d2f",
    measurementId: "G-Z1HVPNMGC9"
};

/* ─── Initialize ─── */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

/* Set persistence to LOCAL (survives browser restart) */
setPersistence(auth, browserLocalPersistence).catch(() => {});

/* ═══════════════════════════════════════════
   HELPER: Map Firebase error codes → friendly messages
═══════════════════════════════════════════ */
function friendlyError(code) {
    const map = {
        'auth/email-already-in-use': 'This email is already registered. Try signing in.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
        'auth/network-request-failed': 'Network error. Check your connection.',
        'auth/popup-blocked': 'Popup blocked by browser. Allow popups and try again.',
        'auth/cancelled-popup-request': 'Sign-in cancelled.',
        'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.'
    };
    return map[code] || 'Something went wrong. Please try again.';
}

/* ═══════════════════════════════════════════
   SYNC: Firebase user → localStorage session
═══════════════════════════════════════════ */
function syncUserToLocal(firebaseUser) {
    if (!firebaseUser) {
        localStorage.removeItem('afreen_user');
        return null;
    }
    const session = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || '',
        email: firebaseUser.email || '',
        phone: firebaseUser.phoneNumber || '',
        photo: firebaseUser.photoURL || '',
        provider: firebaseUser.providerData?.[0]?.providerId || 'password',
        role: firebaseUser.email === 'admin@afreentraders.com' ? 'admin' : 'customer',
        loggedIn: true,
        createdAt: firebaseUser.metadata?.creationTime || new Date().toISOString()
    };
    localStorage.setItem('afreen_user', JSON.stringify(session));
    return session;
}

/* ═══════════════════════════════════════════
   PUBLIC AUTH API
═══════════════════════════════════════════ */

/** Email/Password Login */
async function loginWithEmail(email, password) {
    try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const session = syncUserToLocal(cred.user);
        return { ok: true, user: session };
    } catch (err) {
        return { ok: false, error: friendlyError(err.code) };
    }
}

/** Email/Password Signup + set display name */
async function signupWithEmail({ name, email, phone, password }) {
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        /* Set display name */
        await updateProfile(cred.user, { displayName: name });
        const session = syncUserToLocal(cred.user);
        /* Store phone in localStorage profile (Firebase Auth doesn't store arbitrary phone without phone auth) */
        if (phone) { session.phone = phone; localStorage.setItem('afreen_user', JSON.stringify(session)); }
        return { ok: true, user: session };
    } catch (err) {
        return { ok: false, error: friendlyError(err.code) };
    }
}

/** Google Sign-In */
async function loginWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const session = syncUserToLocal(result.user);
        return { ok: true, user: session };
    } catch (err) {
        return { ok: false, error: friendlyError(err.code) };
    }
}

/** Send Password Reset Email */
async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return { ok: true };
    } catch (err) {
        return { ok: false, error: friendlyError(err.code) };
    }
}

/** Logout */
async function logoutUser() {
    try {
        await signOut(auth);
        localStorage.removeItem('afreen_user');
        return { ok: true };
    } catch (err) {
        return { ok: false, error: 'Logout failed.' };
    }
}

/** Listen to auth state changes */
function onAuthChange(callback) {
    onAuthStateChanged(auth, (user) => {
        const session = syncUserToLocal(user);
        callback(session);
    });
}

/** Get current Firebase user (synchronous check from localStorage) */
function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('afreen_user')) || null; }
    catch { return null; }
}

/** Check if logged in */
function isLoggedIn() {
    const u = getCurrentUser();
    return u && u.loggedIn === true;
}

/* ─── Export ─── */
export {
    auth,
    loginWithEmail,
    signupWithEmail,
    loginWithGoogle,
    resetPassword,
    logoutUser,
    onAuthChange,
    getCurrentUser,
    isLoggedIn,
    syncUserToLocal
};

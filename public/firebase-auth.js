/* ===== AFREEN TRADERS — Firebase Authentication Module ===== */
/* Loaded as ES module on pages that need Firebase auth */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
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
googleProvider.addScope('email');
googleProvider.addScope('profile');

/* Set persistence to LOCAL (survives browser restart) */
setPersistence(auth, browserLocalPersistence).catch(() => {});

/* ─── Handle redirect result (for Google sign-in redirect flow) ─── */
getRedirectResult(auth).then((result) => {
    if (result && result.user) {
        syncUserToLocal(result.user);
    }
}).catch(() => {});

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
        'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
        'auth/unauthorized-domain': 'This domain is not authorized for sign-in. Please contact support.',
        'auth/operation-not-allowed': 'Google sign-in is not enabled. Please contact support.',
        'auth/internal-error': 'Authentication service error. Please try again.'
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

    /* Async Firestore init (non-blocking) */
    import('./firebase-db.js').then(({ initializeUserRecord, processReferralCode }) => {
        initializeUserRecord(session.id, session.name, session.email).then((refCode) => {
            if (refCode) localStorage.setItem('afreen_referral_code', refCode);
            
            /* Process referral if signing up for the first time with a code */
            const storedRefCode = sessionStorage.getItem('pending_referral_code');
            if (storedRefCode && firebaseUser.metadata.creationTime === firebaseUser.metadata.lastSignInTime) {
                processReferralCode(session.id, storedRefCode).then(() => {
                    sessionStorage.removeItem('pending_referral_code');
                });
            }
        });
    }).catch(e => console.warn('DB init error', e));

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
        console.warn('[Afreen Auth] Login error:', err.code, err.message);
        return { ok: false, error: friendlyError(err.code) };
    }
}

/** Email/Password Signup + set display name */
async function signupWithEmail({ name, email, phone, password }) {
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        const session = syncUserToLocal(cred.user);
        if (phone) { session.phone = phone; localStorage.setItem('afreen_user', JSON.stringify(session)); }
        return { ok: true, user: session };
    } catch (err) {
        console.warn('[Afreen Auth] Signup error:', err.code, err.message);
        return { ok: false, error: friendlyError(err.code) };
    }
}

/** Google Sign-In — tries popup first, falls back to redirect */
async function loginWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const session = syncUserToLocal(result.user);
        return { ok: true, user: session };
    } catch (err) {
        console.warn('[Afreen Auth] Google popup error:', err.code, err.message);

        /* User-initiated closures — just show friendly message */
        if (['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(err.code)) {
            return { ok: false, error: friendlyError(err.code) };
        }

        /* Popup blocked or unauthorized domain — try redirect */
        if (['auth/popup-blocked', 'auth/unauthorized-domain'].includes(err.code)) {
            try {
                await signInWithRedirect(auth, googleProvider);
                return { ok: true, user: null };
            } catch (redirectErr) {
                console.warn('[Afreen Auth] Redirect fallback error:', redirectErr.code);
                return { ok: false, error: friendlyError(err.code) };
            }
        }

        return { ok: false, error: friendlyError(err.code) };
    }
}

/** Send Password Reset Email */
async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return { ok: true };
    } catch (err) {
        console.warn('[Afreen Auth] Reset error:', err.code);
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

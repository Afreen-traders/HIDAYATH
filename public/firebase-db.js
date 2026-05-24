/* ===== AFREEN TRADERS — Firebase Database Module ===== */
/* Handles Firestore reads/writes for the Rewards Ecosystem */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, getDocs, orderBy } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js';

/* Use existing config */
const firebaseConfig = {
    apiKey: "AIzaSyD8ufd1LtcXrJzDgaevY0w9RjxNo_k2XCk",
    authDomain: "afreen-traders.firebaseapp.com",
    projectId: "afreen-traders",
    storageBucket: "afreen-traders.firebasestorage.app",
    messagingSenderId: "924903956350",
    appId: "1:924903956350:web:e7fa4b707be66ece269d2f",
    measurementId: "G-Z1HVPNMGC9"
};

const app = initializeApp(firebaseConfig, "db-app"); /* Prevent duplicate initialization error */
const db = getFirestore(app);

/* ═══════════════════════════════════════════
   USER INITIALIZATION (Called on signup)
═══════════════════════════════════════════ */
export async function initializeUserRecord(uid, name, email) {
    try {
        const userRef = doc(db, 'users', uid);
        const snap = await getDoc(userRef);
        
        if (!snap.exists()) {
            /* Generate referral code based on name or 'AFR' */
            const base = name ? name.replace(/\s+/g, '').substring(0, 4).toUpperCase() : 'AFR';
            const referralCode = base + Math.floor(1000 + Math.random() * 9000);
            
            await setDoc(userRef, {
                uid,
                name: name || '',
                email: email || '',
                coins: 0,
                referralCode,
                referredBy: null,
                createdAt: new Date().toISOString()
            });
            return referralCode;
        }
        return snap.data().referralCode;
    } catch (err) {
        console.error("DB Error: initializeUserRecord", err);
        return null;
    }
}

/* ═══════════════════════════════════════════
   REFERRAL SYSTEM
═══════════════════════════════════════════ */
export async function processReferralCode(newUid, refCode) {
    if (!refCode) return false;
    try {
        /* Find user with this referral code */
        const q = query(collection(db, 'users'), where('referralCode', '==', refCode));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) return false; /* Invalid code */
        
        const referrerDoc = querySnapshot.docs[0];
        const referrerUid = referrerDoc.id;
        
        /* Prevent self-referral */
        if (referrerUid === newUid) return false;

        /* Give 100 coins to referrer */
        const refCoins = (referrerDoc.data().coins || 0) + 100;
        await updateDoc(doc(db, 'users', referrerUid), { coins: refCoins });
        await logWalletTransaction(referrerUid, 100, 'earned', 'Referral bonus (friend signed up)');

        /* Give 100 coins to new user and set referredBy */
        const newUserRef = doc(db, 'users', newUid);
        await updateDoc(newUserRef, { 
            coins: 100,
            referredBy: referrerUid
        });
        await logWalletTransaction(newUid, 100, 'earned', 'Sign-up bonus via referral');

        return true;
    } catch (err) {
        console.error("DB Error: processReferralCode", err);
        return false;
    }
}

export async function getUserReferralStats(uid) {
    try {
        const q = query(collection(db, 'users'), where('referredBy', '==', uid));
        const snapshot = await getDocs(q);
        return { count: snapshot.size };
    } catch (err) {
        console.error("DB Error: getUserReferralStats", err);
        return { count: 0 };
    }
}

/* ═══════════════════════════════════════════
   WALLET SYSTEM
═══════════════════════════════════════════ */
export async function getUserWallet(uid) {
    try {
        const docSnap = await getDoc(doc(db, 'users', uid));
        if (docSnap.exists()) {
            return { coins: docSnap.data().coins || 0, referralCode: docSnap.data().referralCode };
        }
        return { coins: 0, referralCode: null };
    } catch (err) {
        console.error("DB Error: getUserWallet", err);
        return { coins: 0, referralCode: null };
    }
}

export async function updateWalletBalance(uid, amountDelta) {
    try {
        const userRef = doc(db, 'users', uid);
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) return false;
        
        const currentCoins = docSnap.data().coins || 0;
        const newCoins = currentCoins + amountDelta;
        
        if (newCoins < 0) return false; /* Insufficient funds */
        
        await updateDoc(userRef, { coins: newCoins });
        return true;
    } catch (err) {
        console.error("DB Error: updateWalletBalance", err);
        return false;
    }
}

export async function logWalletTransaction(uid, amount, type, reason) {
    try {
        await addDoc(collection(db, 'wallet_logs'), {
            uid,
            amount,
            type, /* 'earned' or 'redeemed' */
            reason,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error("DB Error: logWalletTransaction", err);
    }
}

export async function getWalletLogs(uid) {
    try {
        const q = query(collection(db, 'wallet_logs'), where('uid', '==', uid), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data());
    } catch (err) {
        console.error("DB Error: getWalletLogs", err);
        return [];
    }
}

/* ═══════════════════════════════════════════
   SPIN WHEEL SYSTEM
═══════════════════════════════════════════ */
export async function checkSpinEligibility(uid, orderId) {
    if (!uid || !orderId) return false;
    try {
        /* Check if a reward already exists for this order */
        const q = query(collection(db, 'spin_rewards'), where('orderId', '==', orderId));
        const snapshot = await getDocs(q);
        return snapshot.empty;
    } catch (err) {
        console.error("DB Error: checkSpinEligibility", err);
        return false;
    }
}

export async function saveSpinReward(uid, orderId, prizeLabel, coinReward = 0) {
    try {
        await addDoc(collection(db, 'spin_rewards'), {
            uid,
            orderId,
            prize: prizeLabel,
            timestamp: new Date().toISOString()
        });
        
        if (coinReward > 0) {
            await updateWalletBalance(uid, coinReward);
            await logWalletTransaction(uid, coinReward, 'earned', `Spin Wheel Reward (Order ${orderId})`);
        }
        return true;
    } catch (err) {
        console.error("DB Error: saveSpinReward", err);
        return false;
    }
}

export async function getUserSpinHistory(uid) {
    try {
        const q = query(collection(db, 'spin_rewards'), where('uid', '==', uid), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data());
    } catch (err) {
        console.error("DB Error: getUserSpinHistory", err);
        return [];
    }
}

/* ═══════════════════════════════════════════
   COUPON SYSTEM (AFREENEW)
═══════════════════════════════════════════ */
export async function checkCouponUsage(uid, couponCode) {
    if (!uid) return false;
    try {
        const q = query(collection(db, 'coupon_usage'), where('uid', '==', uid), where('code', '==', couponCode));
        const snapshot = await getDocs(q);
        return !snapshot.empty; /* True if used */
    } catch (err) {
        console.error("DB Error: checkCouponUsage", err);
        return false;
    }
}

export async function markCouponAsUsed(uid, couponCode, orderId) {
    try {
        await addDoc(collection(db, 'coupon_usage'), {
            uid,
            code: couponCode,
            orderId,
            timestamp: new Date().toISOString()
        });
        return true;
    } catch (err) {
        console.error("DB Error: markCouponAsUsed", err);
        return false;
    }
}

export async function getUserCoupons(uid) {
    try {
        const q = query(collection(db, 'coupon_usage'), where('uid', '==', uid), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data());
    } catch (err) {
        console.error("DB Error: getUserCoupons", err);
        return [];
    }
}

/* Export db reference for admin use */
export { db };

/* ═══════════════════════════════════════════
   SHIPPING & LOGISTICS (Shiprocket)
═══════════════════════════════════════════ */

export async function saveShipmentDetails(orderId, shipmentData) {
    try {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
            shipment: {
                shipmentId: shipmentData.shipment_id,
                awb: shipmentData.awb_code,
                courier: shipmentData.courier_name,
                status: 'Packed',
                createdAt: new Date().toISOString()
            },
            status: 'Shipped'
        });
        return true;
    } catch (err) {
        console.error("DB Error: saveShipmentDetails", err);
        return false;
    }
}

export async function getOrderShipmentDetails(orderId) {
    try {
        const orderRef = doc(db, 'orders', orderId);
        const snap = await getDoc(orderRef);
        if (snap.exists() && snap.data().shipment) {
            return snap.data().shipment;
        }
        return null;
    } catch (err) {
        console.error("DB Error: getOrderShipmentDetails", err);
        return null;
    }
}

/* ===== AFREEN TRADERS — Rewards System ===== */

import {
    getUserWallet,
    getWalletLogs,
    getUserReferralStats,
    checkSpinEligibility,
    saveSpinReward,
    getUserSpinHistory,
    checkCouponUsage,
    markCouponAsUsed,
    updateWalletBalance,
    logWalletTransaction
} from './firebase-db.js';

const authUser = () => {
    return JSON.parse(localStorage.getItem('afreen_user') || 'null');
};

/* ═══════════════════════════════════════════
   WALLET
═══════════════════════════════════════════ */

export const Wallet = {

    async getBalance() {

        const user = authUser();

        if (!user || !user.uid) return 0;

        const wallet = await getUserWallet(user.uid);

        return wallet.coins || 0;

    },

    async addCoins(amount, reason = 'Reward') {

        const user = authUser();

        if (!user || !user.uid) return false;

        await updateWalletBalance(user.uid, amount);

        await logWalletTransaction(
            user.uid,
            amount,
            'earned',
            reason
        );

        return true;

    },

    async redeemCoins(amount, reason = 'Redeemed') {

        const user = authUser();

        if (!user || !user.uid) return false;

        const ok = await updateWalletBalance(
            user.uid,
            -Math.abs(amount)
        );

        if (!ok) return false;

        await logWalletTransaction(
            user.uid,
            amount,
            'redeemed',
            reason
        );

        return true;

    },

    async getLog() {

        const user = authUser();

        if (!user || !user.uid) return [];

        return await getWalletLogs(user.uid);

    }

};

/* ═══════════════════════════════════════════
   REFERRALS
═══════════════════════════════════════════ */

export const Referral = {

    async getCode() {

        const user = authUser();

        if (!user || !user.uid) return 'AFR-LOADING';

        const wallet = await getUserWallet(user.uid);

        return wallet.referralCode || 'AFR-LOADING';

    },

    async getCount() {

        const user = authUser();

        if (!user || !user.uid) return 0;

        const stats = await getUserReferralStats(user.uid);

        return stats.count || 0;

    },

    async getShareLink() {

        const code = await this.getCode();

        return `${window.location.origin}/login.html?ref=${code}`;

    }

};

/* ═══════════════════════════════════════════
   SPIN WHEEL
═══════════════════════════════════════════ */

export const SpinWheel = {

    prizes: [
        {
            label: 'Wireless Earphones',
            coins: 0
        },
        {
            label: 'Neckband Earphones',
            coins: 0
        },
        {
            label: 'Tea Cup + 250g Tea',
            coins: 0
        },
        {
            label: 'Free 3 Bulbs Pack',
            coins: 0
        },
        {
            label: '100 Coins',
            coins: 100
        },
        {
            label: '50 Coins',
            coins: 50
        },
        {
            label: 'Premium Tea Sample',
            coins: 0
        }
    ],

    async canSpin(orderId) {

        const user = authUser();

        if (!user || !user.uid) return false;

        return await checkSpinEligibility(
            user.uid,
            orderId
        );

    },

    async spin(orderId) {

        const user = authUser();

        if (!user || !user.uid) return null;

        const eligible = await this.canSpin(orderId);

        if (!eligible) {
            return null;
        }

        const randomPrize =
            this.prizes[
                Math.floor(Math.random() * this.prizes.length)
            ];

        await saveSpinReward(
            user.uid,
            orderId,
            randomPrize.label,
            randomPrize.coins
        );

        return randomPrize;

    },

    async getHistory() {

        const user = authUser();

        if (!user || !user.uid) return [];

        return await getUserSpinHistory(user.uid);

    }

};

/* ═══════════════════════════════════════════
   COUPONS
═══════════════════════════════════════════ */

export const Coupons = {

    async validateCoupon(code, cartItems = []) {

        const user = authUser();

        if (!user || !user.uid) {

            return {
                valid: false,
                message: 'Please login first'
            };

        }

        const coupon = code.trim().toUpperCase();

        if (coupon !== 'AFREENEW') {

            return {
                valid: false,
                message: 'Invalid coupon code'
            };

        }

        const alreadyUsed = await checkCouponUsage(
            user.uid,
            coupon
        );

        if (alreadyUsed) {

            return {
                valid: false,
                message: 'Coupon already used'
            };

        }

        let eligibleTotal = 0;

        cartItems.forEach(item => {

            const size = String(item.size || '');

            if (
                size.includes('250') ||
                size.includes('500')
            ) {

                eligibleTotal += Number(item.price || 0);

            }

        });

        if (eligibleTotal <= 0) {

            return {
                valid: false,
                message: 'Coupon only valid for 250g & 500g products'
            };

        }

        const discount = eligibleTotal * 0.5;

        return {
            valid: true,
            code: coupon,
            discount,
            message: '50% OFF applied successfully'
        };

    },

    async markUsed(code, orderId) {

        const user = authUser();

        if (!user || !user.uid) return false;

        return await markCouponAsUsed(
            user.uid,
            code,
            orderId
        );

    }

};

/* ═══════════════════════════════════════════
   GLOBAL EXPORT
═══════════════════════════════════════════ */

window.AfreenRewards = {
    Wallet,
    Referral,
    SpinWheel,
    Coupons
};
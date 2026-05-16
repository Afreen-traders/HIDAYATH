/* ═══════════════════════════════════════════
   AFREEN TRADERS — Rewards Ecosystem
   Wallet · Referral · Spin Wheel · Coupons
   (Integrated with Firestore)
═══════════════════════════════════════════ */
(function() {
    'use strict';

    const { Auth, Cart, PRODUCTS } = AfreenStore;

    /* ─── LOCAL STORAGE KEYS (Fallbacks) ─── */
    const RK = {
        WALLET: 'afreen_wallet',
        WALLET_LOG: 'afreen_wallet_log',
        REFERRAL_CODE: 'afreen_referral_code',
        REFERRAL_COUNT: 'afreen_referral_count',
        COUPON_USED: 'afreen_coupon_used',
        SPIN_HISTORY: 'afreen_spin_history',
        SPIN_REWARDS: 'afreen_spin_rewards'
    };

    function getLS(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch { return d; } }
    function setLS(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

    /* Dynamically load Firebase DB module */
    let dbModule = null;
    import('./firebase-db.js').then(m => { dbModule = m; }).catch(e => console.warn('Rewards DB load error:', e));

    /* ═══════════════════════════════════════════
       1. COIN WALLET SYSTEM
    ═══════════════════════════════════════════ */
    const Wallet = {
        async getBalance() {
            const user = Auth.getUser();
            if (user && dbModule) {
                const data = await dbModule.getUserWallet(user.id);
                setLS(RK.WALLET, data.coins);
                return data.coins;
            }
            return getLS(RK.WALLET, 0);
        },
        async getLog() {
            const user = Auth.getUser();
            if (user && dbModule) {
                const logs = await dbModule.getWalletLogs(user.id);
                setLS(RK.WALLET_LOG, logs);
                return logs;
            }
            return getLS(RK.WALLET_LOG, []);
        },

        async addCoins(amount, reason) {
            const user = Auth.getUser();
            if (user && dbModule) {
                await dbModule.updateWalletBalance(user.id, amount);
                await dbModule.logWalletTransaction(user.id, amount, 'earned', reason);
            } else {
                /* Local fallback */
                const bal = getLS(RK.WALLET, 0) + amount;
                setLS(RK.WALLET, bal);
                const log = getLS(RK.WALLET_LOG, []);
                log.unshift({ type:'earned', amount, reason, timestamp: new Date().toISOString() });
                setLS(RK.WALLET_LOG, log);
            }
            if (window.AfreenRewards.syncNavWallet) window.AfreenRewards.syncNavWallet();
        },

        async redeemCoins(amount, reason) {
            const user = Auth.getUser();
            if (user && dbModule) {
                const ok = await dbModule.updateWalletBalance(user.id, -amount);
                if (ok) await dbModule.logWalletTransaction(user.id, amount, 'redeemed', reason);
                return ok;
            } else {
                /* Local fallback */
                const bal = getLS(RK.WALLET, 0);
                if (amount > bal) return false;
                setLS(RK.WALLET, bal - amount);
                const log = getLS(RK.WALLET_LOG, []);
                log.unshift({ type:'redeemed', amount, reason, timestamp: new Date().toISOString() });
                setLS(RK.WALLET_LOG, log);
                return true;
            }
        }
    };

    /* ═══════════════════════════════════════════
       2. REFERRAL SYSTEM
    ═══════════════════════════════════════════ */
    const Referral = {
        async getCode() {
            const user = Auth.getUser();
            if (user && dbModule) {
                const data = await dbModule.getUserWallet(user.id);
                if (data.referralCode) {
                    setLS(RK.REFERRAL_CODE, data.referralCode);
                    return data.referralCode;
                }
            }
            return getLS(RK.REFERRAL_CODE, 'LOGIN_TO_GET_CODE');
        },
        async getCount() {
            const user = Auth.getUser();
            if (user && dbModule) {
                const stats = await dbModule.getUserReferralStats(user.id);
                setLS(RK.REFERRAL_COUNT, stats.count);
                return stats.count;
            }
            return getLS(RK.REFERRAL_COUNT, 0);
        },
        async getShareLink() {
            const code = await this.getCode();
            const base = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
            return base + 'login.html?ref=' + code;
        }
    };

    /* ═══════════════════════════════════════════
       3. AFREENEW COUPON SYSTEM
    ═══════════════════════════════════════════ */
    const SpecialCoupon = {
        CODE: 'AFREENEW',
        DISCOUNT: 50, /* percent */

        async isUsed() {
            const user = Auth.getUser();
            if (user && dbModule) {
                const used = await dbModule.checkCouponUsage(user.id, this.CODE);
                setLS(RK.COUPON_USED, used);
                return used;
            }
            return getLS(RK.COUPON_USED, false);
        },
        
        async markUsed(orderId) {
            const user = Auth.getUser();
            if (user && dbModule) {
                await dbModule.markCouponAsUsed(user.id, this.CODE, orderId);
            }
            setLS(RK.COUPON_USED, true);
        },

        async validate(cartItems) {
            const used = await this.isUsed();
            if (used) return { ok:false, error:'This coupon has already been used on your first purchase.' };

            /* Filter eligible items (250g and 500g only) */
            const eligible = cartItems.filter(i => i.weight === '250g' || i.weight === '500g');
            if (eligible.length === 0) return { ok:false, error:'AFREENEW is valid only on 250g and 500g products.' };

            const eligibleTotal = eligible.reduce((s, i) => s + (i.price * i.qty), 0);
            const discount = Math.round(eligibleTotal * this.DISCOUNT / 100);

            return { ok:true, discount, message:`50% OFF applied on eligible items! You save ₹${discount}` };
        }
    };

    /* ═══════════════════════════════════════════
       4. SPIN WHEEL SYSTEM
    ═══════════════════════════════════════════ */
    const SPIN_PRIZES = [
        { label:'🎧 Wireless\nEarphones', color:'#1a4a3a', weight:3 },
        { label:'🎵 Neckband\nEarphones', color:'#0f2e23', weight:3 },
        { label:'☕ Tea Cup +\n250g Combo', color:'#1a4a3a', weight:10 },
        { label:'💡 3 Bulbs\nPack (9W)', color:'#0f2e23', weight:8 },
        { label:'🍵 Premium\nTea Samples', color:'#1a4a3a', weight:15 },
        { label:'🏷 20% OFF\nCoupon', color:'#0f2e23', weight:20 },
        { label:'🪙 200\nCoins', color:'#1a4a3a', weight:25 },
        { label:'🎁 Mystery\nGift', color:'#0f2e23', weight:16 }
    ];

    const SpinWheel = {
        canvas: null, ctx: null,
        rotation: 0, spinning: false,

        init(canvasEl) {
            if (!canvasEl) return;
            this.canvas = canvasEl;
            this.ctx = canvasEl.getContext('2d');
            const size = canvasEl.width = canvasEl.height = canvasEl.clientWidth * 2;
            this.draw(size);
        },

        draw(size) {
            const ctx = this.ctx;
            const cx = size / 2, cy = size / 2, r = size / 2 - 4;
            const sliceAngle = (2 * Math.PI) / SPIN_PRIZES.length;

            SPIN_PRIZES.forEach((prize, i) => {
                const start = i * sliceAngle;
                const end = start + sliceAngle;

                /* Slice */
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, r, start, end);
                ctx.closePath();
                ctx.fillStyle = prize.color;
                ctx.fill();
                ctx.strokeStyle = 'rgba(201,168,76,0.3)';
                ctx.lineWidth = 1;
                ctx.stroke();

                /* Text */
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(start + sliceAngle / 2);
                ctx.fillStyle = '#c9a84c';
                ctx.font = `${size * 0.028}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                const lines = prize.label.split('\n');
                lines.forEach((line, li) => {
                    ctx.fillText(line, r * 0.62, (li - (lines.length-1)/2) * (size * 0.032));
                });
                ctx.restore();
            });
        },

        getWinningIndex() {
            const totalWeight = SPIN_PRIZES.reduce((s, p) => s + p.weight, 0);
            let rand = Math.random() * totalWeight;
            for (let i = 0; i < SPIN_PRIZES.length; i++) {
                rand -= SPIN_PRIZES[i].weight;
                if (rand <= 0) return i;
            }
            return SPIN_PRIZES.length - 1;
        },

        spin(callback) {
            if (this.spinning) return;
            this.spinning = true;

            const winIdx = this.getWinningIndex();
            const sliceAngle = 360 / SPIN_PRIZES.length;
            const targetAngle = 360 - (winIdx * sliceAngle + sliceAngle / 2);
            const fullSpins = 360 * (5 + Math.floor(Math.random() * 3));
            const finalRotation = fullSpins + targetAngle;

            this.canvas.style.transform = `rotate(${finalRotation}deg)`;
            this.rotation = finalRotation;

            setTimeout(async () => {
                this.spinning = false;
                const prize = SPIN_PRIZES[winIdx];
                const user = Auth.getUser();
                const orderId = getLS('afreen_last_order', {}).id || 'N/A';
                
                /* Save reward */
                const prizeLabel = prize.label.replace('\n', ' ');
                if (user && dbModule) {
                    await dbModule.saveSpinReward(user.id, orderId, prizeLabel, winIdx === 6 ? 200 : 0);
                } else {
                    const history = getLS(RK.SPIN_REWARDS, []);
                    history.unshift({ prize: prizeLabel, timestamp: new Date().toISOString(), orderId });
                    setLS(RK.SPIN_REWARDS, history);
                    if (winIdx === 6) await Wallet.addCoins(200, 'Spin Wheel Reward');
                }
                
                if (window.AfreenRewards.syncNavWallet) window.AfreenRewards.syncNavWallet();
                callback(prize, winIdx);
            }, 5500);
        },

        async canSpin(orderId) {
            const user = Auth.getUser();
            if (user && dbModule) {
                return await dbModule.checkSpinEligibility(user.id, orderId);
            }
            const history = getLS(RK.SPIN_REWARDS, []);
            return !history.some(h => h.orderId === orderId);
        },

        async getHistory() {
            const user = Auth.getUser();
            if (user && dbModule) {
                const history = await dbModule.getUserSpinHistory(user.id);
                setLS(RK.SPIN_REWARDS, history);
                return history;
            }
            return getLS(RK.SPIN_REWARDS, []);
        }
    };

    /* ═══════════════════════════════════════════
       5. UI: ANNOUNCEMENT TICKER
    ═══════════════════════════════════════════ */
    function createTicker() {
        const messages = [
            'Use AFREENEW for 50% OFF on your first order',
            'Refer friends & earn reward coins',
            'Earn exciting rewards on premium purchases',
            'Luxury tea crafted for every moment',
            'Spin & Win gifts on orders above ₹2500',
            'Premium blends by AFREEN TRADERS'
        ];

        const ticker = document.createElement('div');
        ticker.className = 'announcement-ticker';
        const track = document.createElement('div');
        track.className = 'ticker-track';

        for (let r = 0; r < 2; r++) {
            messages.forEach(msg => {
                const item = document.createElement('span');
                item.className = 'ticker-item';
                item.innerHTML = `<span class="ticker-dot"></span> ${msg}`;
                track.appendChild(item);
            });
        }

        ticker.appendChild(track);
        document.body.appendChild(ticker);
    }

    /* ═══════════════════════════════════════════
       6. UI: SPIN WHEEL POPUP
    ═══════════════════════════════════════════ */
    function createSpinPopup() {
        const overlay = document.createElement('div');
        overlay.className = 'spin-overlay';
        overlay.id = 'spin-overlay';
        overlay.innerHTML = `
            <button class="spin-close" id="spin-close">&times;</button>
            <div class="spin-container">
                <h2 class="spin-title">Spin & <span class="gold-text">Win</span></h2>
                <p class="spin-subtitle">You've earned a chance to win exciting rewards!</p>
                <div class="wheel-wrapper">
                    <div class="wheel-outer"></div>
                    <div class="wheel-pointer"></div>
                    <canvas class="wheel-canvas" id="wheel-canvas"></canvas>
                    <div class="wheel-center" id="wheel-spin-btn">SPIN</div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('spin-close').addEventListener('click', () => {
            overlay.classList.remove('show');
        });
    }

    /* ═══════════════════════════════════════════
       7. UI: CONGRATULATIONS POPUP
    ═══════════════════════════════════════════ */
    function showCongrats(prize) {
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'confetti-container';
        const colors = ['#c9a84c', '#1a4a3a', '#e8d5a3', '#2d8b6a', '#f0e6cc', '#ffffff'];
        for (let i = 0; i < 50; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = Math.random() * 100 + '%';
            piece.style.background = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDelay = Math.random() * 2 + 's';
            piece.style.animationDuration = (2 + Math.random() * 2) + 's';
            piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            piece.style.width = (4 + Math.random() * 8) + 'px';
            piece.style.height = (4 + Math.random() * 8) + 'px';
            confettiContainer.appendChild(piece);
        }
        document.body.appendChild(confettiContainer);

        const overlay = document.createElement('div');
        overlay.className = 'congrats-overlay';
        overlay.innerHTML = `
            <div class="congrats-card">
                <div class="congrats-glow"></div>
                <div class="congrats-emoji">🎉</div>
                <h2 class="congrats-title">You Won!</h2>
                <p class="congrats-prize">${prize.label.replace('\n', ' ')}</p>
                <p class="congrats-desc">Your reward has been saved. Check your profile for details.</p>
                <button class="congrats-btn" id="congrats-close">CLAIM REWARD</button>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('show'));

        document.getElementById('congrats-close').addEventListener('click', () => {
            overlay.classList.remove('show');
            setTimeout(() => { overlay.remove(); confettiContainer.remove(); }, 500);
        });
    }

    /* ═══════════════════════════════════════════
       8. INITIALIZE
    ═══════════════════════════════════════════ */
    async function init() {
        createTicker();
        createSpinPopup();

        const user = Auth.getUser();

        /* Sync Wallet Badge */
        const navActions = document.querySelector('.nav-actions');
        if (navActions && user) {
            let walletEl = document.getElementById('nav-wallet-badge');
            if (!walletEl) {
                walletEl = document.createElement('a');
                walletEl.href = 'profile.html#wallet';
                walletEl.id = 'nav-wallet-badge';
                walletEl.className = 'wallet-badge';
                walletEl.innerHTML = `<span class="wallet-coin-icon">🪙</span><span class="wallet-count" id="nav-wallet-count">0</span>`;
                navActions.insertBefore(walletEl, navActions.firstChild);
            }
            
            window.AfreenRewards.syncNavWallet = async () => {
                const bal = await Wallet.getBalance();
                document.getElementById('nav-wallet-count').textContent = bal;
            };
            
            /* Wait a tiny bit for DB module to load before initial sync */
            setTimeout(() => window.AfreenRewards.syncNavWallet(), 500);
        }

        /* Check if spin is available on success page */
        const isSuccessPage = window.location.pathname.includes('success');
        if (isSuccessPage) {
            const lastOrder = getLS('afreen_last_order', null);
            if (lastOrder && lastOrder.total >= 2500) {
                const canSpin = await SpinWheel.canSpin(lastOrder.id);
                if (canSpin) {
                    setTimeout(() => {
                        const overlay = document.getElementById('spin-overlay');
                        if (overlay) {
                            overlay.classList.add('show');
                            SpinWheel.init(document.getElementById('wheel-canvas'));

                            document.getElementById('wheel-spin-btn').addEventListener('click', () => {
                                SpinWheel.spin((prize) => {
                                    setTimeout(() => {
                                        overlay.classList.remove('show');
                                        showCongrats(prize);
                                    }, 600);
                                });
                            });
                        }
                    }, 1500);
                }
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.AfreenRewards = { Wallet, Referral, SpecialCoupon, SpinWheel, showCongrats, SPIN_PRIZES, syncNavWallet: null };
})();

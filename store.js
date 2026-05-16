/* ===== AFREEN TRADERS — Global Store & Auth Module ===== */
/* Shared state management used across all pages */

const AfreenStore = (() => {
    'use strict';

    /* ─── PRODUCT CATALOG ─── */
    const PRODUCTS = [
        { id:1, name:'Hidayath Chai Dust', badge:'Bestseller', desc:'Full-bodied chai dust. Strong, bold, classic.', sku:'AFT-CD', images:{'250g':'images/chaidust_250g.png','500g':'images/chaidust_500g.png','1kg':'images/chaidust_1kg.png'}, prices:{'250g':349,'500g':649,'1kg':1199}, stock:{'250g':50,'500g':35,'1kg':20} },
        { id:2, name:'Hidayath Chai Leaves', badge:'Premium', desc:'Whole leaf tea with rich, complex flavors.', sku:'AFT-CL', images:{'250g':'images/chaileaves_250g.png','500g':'images/chaileaves_500g.png','1kg':'images/chaileaves_1kg.png'}, prices:{'250g':449,'500g':849,'1kg':1549}, stock:{'250g':40,'500g':25,'1kg':15} },
        { id:3, name:'Hidayath Chai Special', badge:'Exclusive', desc:'Premium spice blend. Tradition in every sip.', sku:'AFT-CS', images:{'250g':'images/chaispecial_250g.png','500g':'images/chaispecial_500g.png','1kg':'images/chaispecial_1kg.png'}, prices:{'250g':549,'500g':999,'1kg':1849}, stock:{'250g':30,'500g':20,'1kg':10} },
        { id:4, name:'Hidayath Home Chai', badge:'Classic', desc:'Everyday premium chai. Simple, pure, perfect.', sku:'AFT-HC', images:{'250g':'images/homechai_250g.png','500g':'images/homechai_500g.png','1kg':'images/homechai_1kg.png'}, prices:{'250g':229,'500g':429,'1kg':799}, stock:{'250g':60,'500g':45,'1kg':30} },
        { id:5, name:'Hidayath Golden Edition', badge:'Limited', desc:'Our finest reserve. Gold standard in chai.', sku:'AFT-GE', images:{'250g':'images/golden_250g.png','500g':'images/golden_500g.png','1kg':'images/golden_1kg.png'}, prices:{'250g':799,'500g':1449,'1kg':2699}, stock:{'250g':15,'500g':10,'1kg':5} },
        { id:6, name:'Royal Leaf', badge:'Premium', desc:'Handpicked Assam leaves. Bold and aromatic.', sku:'AFT-RL', images:{'250g':'images/chaileaves_250g.png','500g':'images/chaileaves_500g.png','1kg':'images/chaileaves_1kg.png'}, prices:{'250g':499,'500g':899,'1kg':1649}, stock:{'250g':35,'500g':22,'1kg':12} },
        { id:7, name:'Pure Green', badge:'Classic', desc:'Light, refreshing green tea. Clean and natural.', sku:'AFT-PG', images:{'250g':'images/chaispecial_250g.png','500g':'images/chaispecial_500g.png','1kg':'images/chaispecial_1kg.png'}, prices:{'250g':399,'500g':749,'1kg':1399}, stock:{'250g':45,'500g':30,'1kg':18} },
        { id:8, name:'Lemon Zest Tea', badge:'Limited', desc:'Zesty citrus infusion. Bright and invigorating.', sku:'AFT-LZ', images:{'250g':'images/golden_250g.png','500g':'images/golden_500g.png','1kg':'images/golden_1kg.png'}, prices:{'250g':599,'500g':1099,'1kg':1999}, stock:{'250g':20,'500g':14,'1kg':8} }
    ];

    const DELIVERY_CHARGE = 49;
    const FREE_DELIVERY_MIN = 500;
    const COUPONS = { 'AFREEN10':{type:'percent',value:10}, 'CHAI20':{type:'percent',value:20}, 'FIRST50':{type:'flat',value:50} };

    /* ─── LOCAL STORAGE KEYS ─── */
    const KEYS = {
        CART: 'afreen_cart',
        COUPON: 'afreen_coupon',
        USER: 'afreen_user',
        USERS_DB: 'afreen_users_db',
        ORDERS: 'afreen_orders',
        LAST_ORDER: 'afreen_last_order',
        DELIVERY: 'afreen_delivery',
        WISHLIST: 'afreen_wishlist'
    };

    /* ─── HELPER: localStorage ─── */
    function getLS(key, fallback) {
        try { return JSON.parse(localStorage.getItem(key)) || fallback; }
        catch { return fallback; }
    }
    function setLS(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
    function removeLS(key) { localStorage.removeItem(key); }

    /* ═══════════════════════════════════════════
       AUTH SYSTEM (reads Firebase-synced localStorage)
       Actual auth operations are in firebase-auth.js (ES module)
       This module provides synchronous read access for all pages
    ═══════════════════════════════════════════ */
    const Auth = {
        /** Get current user session or null */
        getUser() { return getLS(KEYS.USER, null); },

        /** Check if someone is logged in */
        isLoggedIn() { const u = this.getUser(); return u && u.loggedIn === true; },

        /** Check if current user is admin */
        isAdmin() { const u = this.getUser(); return u && u.role === 'admin'; },

        /** Save a Firebase user session to localStorage */
        setSession(session) { setLS(KEYS.USER, session); },

        /** Logout (clears local session — call firebase-auth.js logoutUser() for full logout) */
        logout() { removeLS(KEYS.USER); }
    };

    /* ═══════════════════════════════════════════
       CART
    ═══════════════════════════════════════════ */
    const Cart = {
        get()   { return getLS(KEYS.CART, []); },
        save(c) { setLS(KEYS.CART, c); },
        clear() { removeLS(KEYS.CART); removeLS(KEYS.COUPON); },

        add(productId, weight, qty = 1) {
            const product = PRODUCTS.find(p => p.id === productId);
            if (!product) return;
            const cart = this.get();
            const existing = cart.find(i => i.id === productId && i.weight === weight);
            if (existing) { existing.qty += qty; }
            else {
                cart.push({
                    id: product.id, name: product.name,
                    image: product.images[weight],
                    sku: product.sku + '-' + weight.toUpperCase(),
                    weight, price: product.prices[weight], qty
                });
            }
            this.save(cart);
        },
        remove(index) { const c = this.get(); c.splice(index, 1); this.save(c); },
        updateQty(index, delta) {
            const c = this.get();
            c[index].qty += delta;
            if (c[index].qty <= 0) c.splice(index, 1);
            this.save(c);
        },

        getSubtotal() { return this.get().reduce((s, i) => s + i.price * i.qty, 0); },
        getDelivery()  { const sub = this.getSubtotal(); return sub === 0 ? 0 : sub >= FREE_DELIVERY_MIN ? 0 : DELIVERY_CHARGE; },
        getCoupon()    { return getLS(KEYS.COUPON, null); },
        setCoupon(c)   { setLS(KEYS.COUPON, c); },
        getDiscount() {
            const c = this.getCoupon();
            if (!c) return 0;
            const sub = this.getSubtotal();
            return c.type === 'percent' ? Math.round(sub * c.value / 100) : c.value;
        },
        getTotal() { return this.getSubtotal() - this.getDiscount() + this.getDelivery(); },
        getCount() { return this.get().reduce((s, i) => s + i.qty, 0); }
    };

    /* ═══════════════════════════════════════════
       ORDERS
    ═══════════════════════════════════════════ */
    const Orders = {
        getAll()  { return getLS(KEYS.ORDERS, []); },
        getLast() { return getLS(KEYS.LAST_ORDER, null); },

        /** For logged-in user only */
        getForUser(userId) {
            return this.getAll().filter(o => o.userId === userId);
        },

        create({ cart, delivery, total, screenshot }) {
            const user = Auth.getUser();
            const orderId = 'ORD-AFT-' + Math.floor(1000 + Math.random() * 9000);
            const order = {
                id: orderId, items: cart, delivery, total, screenshot: screenshot || null,
                userId: user ? user.id : null,
                customerName: delivery.name, customerPhone: delivery.phone,
                status: 'Pending', createdAt: new Date().toISOString()
            };
            const all = this.getAll();
            all.push(order);
            setLS(KEYS.ORDERS, all);
            setLS(KEYS.LAST_ORDER, order);
            return order;
        },

        updateStatus(orderId, status) {
            const all = this.getAll();
            const order = all.find(o => o.id === orderId);
            if (order) { order.status = status; setLS(KEYS.ORDERS, all); }
        }
    };

    /* ═══════════════════════════════════════════
       WISHLIST
    ═══════════════════════════════════════════ */
    const Wishlist = {
        get() { return getLS(KEYS.WISHLIST, []); },
        save(w) { setLS(KEYS.WISHLIST, w); },
        has(productId) { return this.get().some(i => i.id === productId); },
        toggle(productId) {
            let wl = this.get();
            const idx = wl.findIndex(i => i.id === productId);
            if (idx >= 0) { wl.splice(idx, 1); }
            else {
                const p = PRODUCTS.find(pp => pp.id === productId);
                if (p) wl.push({ id: p.id, name: p.name, image: p.images['250g'], addedAt: new Date().toISOString() });
            }
            this.save(wl);
            return this.has(productId);
        },
        remove(productId) {
            let wl = this.get();
            this.save(wl.filter(i => i.id !== productId));
        }
    };

    /* ═══════════════════════════════════════════
       DELIVERY (saved address)
    ═══════════════════════════════════════════ */
    const Delivery = {
        get() { return getLS(KEYS.DELIVERY, null); },
        save(d) { setLS(KEYS.DELIVERY, d); }
    };

    /* ═══════════════════════════════════════════
       UI HELPERS
    ═══════════════════════════════════════════ */

    /** Generate order ID format: ORD-AFT-XXXX */
    function generateOrderId() {
        return 'ORD-AFT-' + Math.floor(1000 + Math.random() * 9000);
    }

    /** Render auth-aware navbar elements */
    function renderNavAuth() {
        const el = document.getElementById('nav-auth');
        if (!el) return;
        const user = Auth.getUser();
        if (user && user.loggedIn) {
            el.innerHTML = `<a href="profile.html" class="nav-user-btn" id="nav-user-btn" title="${user.name || user.email}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span class="nav-user-name">${(user.name || user.email).split(' ')[0]}</span>
            </a>`;
        } else {
            el.innerHTML = `<a href="login.html" class="nav-login-btn" title="Login">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            </a>`;
        }
    }

    /* ─── PUBLIC API ─── */
    return { PRODUCTS, DELIVERY_CHARGE, FREE_DELIVERY_MIN, COUPONS, KEYS, Auth, Cart, Orders, Wishlist, Delivery, renderNavAuth, generateOrderId };
})();

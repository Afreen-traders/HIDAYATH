/* ===== AFREEN TRADERS — Main Script ===== */
/* Depends on store.js (must be loaded first) */
document.addEventListener('DOMContentLoaded', () => {

    const { PRODUCTS, COUPONS, DELIVERY_CHARGE, FREE_DELIVERY_MIN, Auth, Cart, Wishlist } = AfreenStore;

    /* ----- STATE ----- */
    let selectedWeights = {};
    PRODUCTS.forEach(p => { selectedWeights[p.id] = '250g'; });

    /* ----- LOADING SCREEN ----- */
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        setTimeout(() => { loadingScreen.classList.add('hidden'); }, 1200);
    }

    /* ----- NAVBAR SCROLL ----- */
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    /* ----- NAV AUTH ----- */
    AfreenStore.renderNavAuth();

    /* ----- MOBILE MENU ----- */
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    /* ----- RENDER PRODUCTS ----- */
    const productCardsContainer = document.getElementById('product-cards');
    function renderProducts() {
        if (!productCardsContainer) return;
        productCardsContainer.innerHTML = PRODUCTS.map(p => {
            const w = selectedWeights[p.id];
            const price = p.prices[w];
            const inWishlist = Wishlist.has(p.id);
            const stockLeft = p.stock[w];
            return `
            <div class="product-card" data-product-id="${p.id}">
                <div class="product-img-wrap">
                    <a href="product.html?id=${p.id}" class="product-img-link">
                        <img src="${p.images[w]}" alt="${p.name}" loading="lazy" class="product-img">
                    </a>
                    <span class="product-badge">${p.badge}</span>
                    <button class="wishlist-btn ${inWishlist ? 'active' : ''}" data-product="${p.id}" title="Add to Wishlist">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="${inWishlist ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                    </button>
                </div>
                <div class="product-info">
                    <a href="product.html?id=${p.id}" class="product-name-link"><h3 class="product-name">${p.name}</h3></a>
                    <p class="product-desc">${p.desc}</p>
                    <div class="product-stock ${stockLeft <= 10 ? 'low' : ''}">
                        <span class="stock-dot"></span>
                        ${stockLeft <= 10 ? `Only ${stockLeft} left` : 'In Stock'}
                    </div>
                    <div class="product-weight-row">
                        ${Object.keys(p.prices).map(wt =>
                            `<button class="weight-btn ${wt === w ? 'active' : ''}" data-product="${p.id}" data-weight="${wt}">${wt}</button>`
                        ).join('')}
                    </div>
                    <div class="product-bottom">
                        <div class="product-price"><span class="currency">₹</span>${price}</div>
                        <button class="btn-add-cart" data-product="${p.id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                            + Cart
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');
        attachProductEvents();
    }

    function attachProductEvents() {
        /* Weight buttons */
        document.querySelectorAll('.weight-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const pid = parseInt(btn.dataset.product);
                const weight = btn.dataset.weight;
                selectedWeights[pid] = weight;
                const card = btn.closest('.product-card');
                card.querySelectorAll('.weight-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const product = PRODUCTS.find(p => p.id === pid);
                card.querySelector('.product-price').innerHTML = `<span class="currency">₹</span>${product.prices[weight]}`;
                /* Update image on weight change */
                const img = card.querySelector('.product-img');
                if (img) { img.style.opacity = '0'; setTimeout(() => { img.src = product.images[weight]; img.style.opacity = '1'; }, 200); }
                /* Update stock indicator */
                const stockEl = card.querySelector('.product-stock');
                const stockLeft = product.stock[weight];
                if (stockEl) {
                    stockEl.className = `product-stock ${stockLeft <= 10 ? 'low' : ''}`;
                    stockEl.innerHTML = `<span class="stock-dot"></span>${stockLeft <= 10 ? `Only ${stockLeft} left` : 'In Stock'}`;
                }
            });
        });

        /* Add to cart buttons */
        document.querySelectorAll('.btn-add-cart').forEach(btn => {
            btn.addEventListener('click', () => {
                const pid = parseInt(btn.dataset.product);
                const weight = selectedWeights[pid];
                Cart.add(pid, weight);
                syncCartFromStore();
                openCartDrawer();
                btn.classList.add('added');
                btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Added!`;
                setTimeout(() => {
                    btn.classList.remove('added');
                    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> + Cart`;
                }, 1500);
            });
        });

        /* Wishlist buttons */
        document.querySelectorAll('.wishlist-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const pid = parseInt(btn.dataset.product);
                const isNow = Wishlist.toggle(pid);
                btn.classList.toggle('active', isNow);
                btn.querySelector('svg').setAttribute('fill', isNow ? 'currentColor' : 'none');
            });
        });
    }

    renderProducts();

    /* ----- PRODUCT SEARCH & FILTER (products.html) ----- */
    const searchInput = document.getElementById('product-search');
    const filterTags = document.getElementById('filter-tags');
    let activeFilter = 'all';

    function filterProducts() {
        if (!productCardsContainer) return;
        const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
        document.querySelectorAll('.product-card').forEach(card => {
            const pid = parseInt(card.dataset.productId);
            const product = PRODUCTS.find(p => p.id === pid);
            if (!product) return;
            const matchesSearch = !query || product.name.toLowerCase().includes(query) || product.desc.toLowerCase().includes(query);
            const matchesFilter = activeFilter === 'all' || product.badge.toLowerCase() === activeFilter;
            card.style.display = (matchesSearch && matchesFilter) ? '' : 'none';
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterProducts);
    }
    if (filterTags) {
        filterTags.addEventListener('click', (e) => {
            const tag = e.target.closest('.filter-tag');
            if (!tag) return;
            filterTags.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            activeFilter = tag.dataset.filter;
            filterProducts();
        });
    }

    /* ----- CART DRAWER (reads from store) ----- */
    const cartDrawer = document.getElementById('cart-drawer');
    const cartOverlay = document.getElementById('cart-overlay');
    const cartBadge = document.getElementById('cart-badge');
    const cartToggle = document.getElementById('cart-toggle');
    const cartClose = document.getElementById('cart-close');
    const cartEmpty = document.getElementById('cart-empty');
    const cartItemsList = document.getElementById('cart-items-list');
    const cartFooter = document.getElementById('cart-drawer-footer');

    function openCartDrawer() {
        if (cartDrawer) cartDrawer.classList.add('open');
        if (cartOverlay) cartOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function closeCartDrawer() {
        if (cartDrawer) cartDrawer.classList.remove('open');
        if (cartOverlay) cartOverlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (cartToggle) cartToggle.addEventListener('click', openCartDrawer);
    if (cartClose) cartClose.addEventListener('click', closeCartDrawer);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCartDrawer);

    /** Sync local display from AfreenStore.Cart */
    function syncCartFromStore() {
        const cart = Cart.get();
        const totalItems = Cart.getCount();

        if (cartBadge) { cartBadge.textContent = totalItems; cartBadge.classList.toggle('show', totalItems > 0); }

        if (cart.length === 0) {
            if (cartEmpty) cartEmpty.style.display = 'block';
            if (cartItemsList) cartItemsList.innerHTML = '';
            if (cartFooter) cartFooter.style.display = 'none';
        } else {
            if (cartEmpty) cartEmpty.style.display = 'none';
            if (cartFooter) cartFooter.style.display = 'block';
            renderCartItems(cart);
        }
        updateCartSummary();
    }

    function renderCartItems(cart) {
        if (!cartItemsList) return;
        cartItemsList.innerHTML = cart.map((item, i) => `
            <div class="cart-item" data-index="${i}">
                <div class="cart-item-img"><img src="${item.image}" alt="${item.name}"></div>
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-weight">${item.weight}</div>
                    <div class="cart-item-bottom">
                        <div class="qty-controls">
                            <button class="qty-btn qty-minus" data-index="${i}">−</button>
                            <span class="qty-value">${item.qty}</span>
                            <button class="qty-btn qty-plus" data-index="${i}">+</button>
                        </div>
                        <span class="cart-item-price">₹${item.price * item.qty}</span>
                    </div>
                    <button class="cart-item-remove" data-index="${i}">Remove</button>
                </div>
            </div>
        `).join('');

        cartItemsList.querySelectorAll('.qty-minus').forEach(btn => {
            btn.addEventListener('click', () => { Cart.updateQty(parseInt(btn.dataset.index), -1); syncCartFromStore(); });
        });
        cartItemsList.querySelectorAll('.qty-plus').forEach(btn => {
            btn.addEventListener('click', () => { Cart.updateQty(parseInt(btn.dataset.index), 1); syncCartFromStore(); });
        });
        cartItemsList.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', () => { Cart.remove(parseInt(btn.dataset.index)); syncCartFromStore(); });
        });
    }

    function updateCartSummary() {
        const subtotalEl = document.getElementById('cart-subtotal');
        const deliveryEl = document.getElementById('cart-delivery');
        const discountEl = document.getElementById('cart-discount');
        const discountRow = document.getElementById('discount-row');
        const totalEl = document.getElementById('cart-total');

        if (subtotalEl) subtotalEl.textContent = `₹${Cart.getSubtotal()}`;
        if (deliveryEl) {
            const del = Cart.getDelivery();
            deliveryEl.textContent = del === 0 ? 'FREE' : `₹${del}`;
        }
        if (discountRow && discountEl) {
            const disc = Cart.getDiscount();
            if (disc > 0) { discountRow.style.display = 'flex'; discountEl.textContent = `-₹${disc}`; }
            else { discountRow.style.display = 'none'; }
        }
        if (totalEl) totalEl.textContent = `₹${Cart.getTotal()}`;
    }

    /* ----- COUPON ----- */
    const couponInput = document.getElementById('coupon-input');
    const couponApply = document.getElementById('coupon-apply');
    const couponMsg = document.getElementById('coupon-msg');
    if (couponApply) {
        couponApply.addEventListener('click', () => {
            const code = couponInput.value.trim().toUpperCase();
            if (COUPONS[code]) {
                const c = { ...COUPONS[code], code };
                Cart.setCoupon(c);
                couponMsg.textContent = `✓ Coupon "${code}" applied!`;
                couponMsg.className = 'coupon-msg success';
                couponInput.disabled = true;
                couponApply.textContent = 'Applied';
                couponApply.disabled = true;
            } else {
                couponMsg.textContent = '✗ Invalid coupon code';
                couponMsg.className = 'coupon-msg error';
            }
            syncCartFromStore();
        });
    }

    /* Restore coupon state */
    const savedCoupon = Cart.getCoupon();
    if (savedCoupon && couponInput && couponApply && couponMsg) {
        couponInput.value = savedCoupon.code;
        couponInput.disabled = true;
        couponApply.textContent = 'Applied';
        couponApply.disabled = true;
        couponMsg.textContent = `✓ Coupon "${savedCoupon.code}" applied!`;
        couponMsg.className = 'coupon-msg success';
    }

    /* ----- CONTACT FORM ----- */
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('contact-name').value;
            const msg = encodeURIComponent(`Hello Afreen Traders Team, my name is ${name}. ${document.getElementById('contact-message').value}`);
            window.open(`https://wa.me/919515643942?text=${msg}`, '_blank');
            contactForm.reset();
        });
    }

    /* ----- THEME TOGGLE (Dark/Light) ----- */
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const savedTheme = localStorage.getItem('afreen_theme') || 'dark';
    if (savedTheme === 'light') document.documentElement.setAttribute('data-theme', 'light');

    function updateThemeIcon() {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        if (themeIcon) {
            themeIcon.innerHTML = isLight
                ? '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>'
                : '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
        }
    }
    updateThemeIcon();

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            document.documentElement.setAttribute('data-theme', isLight ? '' : 'light');
            localStorage.setItem('afreen_theme', isLight ? 'dark' : 'light');
            updateThemeIcon();
        });
    }

    /* ----- SCROLL REVEAL (IntersectionObserver) ----- */
    const revealElements = document.querySelectorAll('.reveal');
    if (revealElements.length) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
        revealElements.forEach(el => revealObserver.observe(el));
    }

    /* ----- TEA MOOD SELECTOR ----- */
    const moodMap = {
        relax: [3, 5],    /* Chai Special, Golden Edition */
        energy: [1, 2],   /* Chai Dust, Chai Leaves */
        focus: [1, 4],     /* Chai Dust, Home Chai */
        refresh: [2, 5],  /* Chai Leaves, Golden Edition */
        sleep: [3, 4]     /* Chai Special, Home Chai */
    };

    const moodGrid = document.getElementById('mood-grid');
    if (moodGrid) {
        moodGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.mood-card');
            if (!card) return;
            const mood = card.dataset.mood;

            /* Toggle active mood */
            const wasActive = card.classList.contains('active');
            document.querySelectorAll('.mood-card').forEach(c => c.classList.remove('active'));

            if (wasActive) {
                /* Show all products */
                document.querySelectorAll('.product-card').forEach(c => { c.style.display = ''; });
                return;
            }

            card.classList.add('active');
            const ids = moodMap[mood] || [];

            /* Filter products */
            document.querySelectorAll('.product-card').forEach(c => {
                const pid = parseInt(c.dataset.productId);
                c.style.display = ids.includes(pid) ? '' : 'none';
            });

            /* Smooth scroll to products */
            const productsSection = document.getElementById('products');
            if (productsSection) {
                productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    /* ----- LIVE SALES POPUP ----- */
    const salesData = {
        names: ['Rahul', 'Priya', 'Arjun', 'Sneha', 'Vikram', 'Anjali', 'Karthik', 'Meera', 'Aisha', 'Ravi', 'Fatima', 'Suresh', 'Nisha', 'Imran', 'Deepa'],
        cities: ['Hyderabad', 'Mumbai', 'Bangalore', 'Chennai', 'Delhi', 'Pune', 'Kolkata', 'Jaipur', 'Ahmedabad', 'Lucknow', 'Vizag', 'Kochi'],
        products: ['Hidayath Chai Dust', 'Premium Chai Leaves', 'Chai Special Blend', 'Home Chai Classic', 'Golden Edition']
    };

    function showLiveSale() {
        const popup = document.getElementById('live-sale-popup');
        if (!popup) return;

        const name = salesData.names[Math.floor(Math.random() * salesData.names.length)];
        const city = salesData.cities[Math.floor(Math.random() * salesData.cities.length)];
        const product = salesData.products[Math.floor(Math.random() * salesData.products.length)];
        const mins = Math.floor(Math.random() * 12) + 1;

        document.getElementById('live-sale-avatar').textContent = name.charAt(0);
        document.getElementById('live-sale-name').textContent = name;
        document.getElementById('live-sale-city').textContent = city;
        document.getElementById('live-sale-product').textContent = product;
        document.getElementById('live-sale-time').textContent = `${mins} minute${mins > 1 ? 's' : ''} ago`;

        popup.classList.add('show');
        setTimeout(() => { popup.classList.remove('show'); }, 5000);
    }

    /* Show first popup after 8s, then every 25-45s */
    setTimeout(showLiveSale, 8000);
    setInterval(showLiveSale, (25 + Math.random() * 20) * 1000);

    const liveSaleClose = document.getElementById('live-sale-close');
    if (liveSaleClose) {
        liveSaleClose.addEventListener('click', () => {
            document.getElementById('live-sale-popup').classList.remove('show');
        });
    }

    /* Custom cursor removed as per request */

    /* ----- BOTTOM NAV: Cart Badge Sync ----- */
    const bottomCartBadge = document.getElementById('bottom-cart-badge');
    const bottomCartBtn = document.getElementById('bottom-cart-btn');
    if (bottomCartBtn) {
        bottomCartBtn.addEventListener('click', () => {
            document.getElementById('cart-overlay').classList.add('open');
            document.getElementById('cart-drawer').classList.add('open');
            document.body.style.overflow = 'hidden';
        });
    }

    function syncBottomBadge() {
        const count = Cart.get().reduce((s, i) => s + i.qty, 0);
        if (bottomCartBadge) {
            bottomCartBadge.textContent = count;
            bottomCartBadge.classList.toggle('show', count > 0);
        }
    }

    /* ----- INIT ----- */
    syncCartFromStore();
    syncBottomBadge();

    /* Override syncCartFromStore to also update bottom badge */
    const origSync = syncCartFromStore;
    syncCartFromStore = function() { origSync(); syncBottomBadge(); };
});
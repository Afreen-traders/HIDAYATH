/* ===== AFREEN TRADERS — Checkout Script ===== */
/* Depends on store.js */
document.addEventListener('DOMContentLoaded', () => {

    const { Auth, Cart, Orders, Delivery, PRODUCTS } = AfreenStore;

    /* ── Check for empty cart ── */
    if (Cart.get().length === 0) {
        window.location.href = 'index.html';
        return;
    }

    let screenshotData = null;

    /* ═══════════════════════════════════════════
       PROGRESS BAR & STEP NAVIGATION
    ═══════════════════════════════════════════ */
    const steps = document.querySelectorAll('.progress-step');
    const sections = document.querySelectorAll('.checkout-section');
    let currentStep = 1;

    function goToStep(n) {
        currentStep = n;
        sections.forEach(s => s.classList.remove('active'));
        const target = document.getElementById(`step-${n}`);
        if (target) target.classList.add('active');

        steps.forEach(s => {
            const sn = parseInt(s.dataset.step);
            s.classList.remove('active', 'completed');
            if (sn === n) s.classList.add('active');
            else if (sn < n) s.classList.add('completed');
        });

        /* Progress fills */
        const fill1 = document.getElementById('progress-fill-1');
        const fill2 = document.getElementById('progress-fill-2');
        if (fill1) fill1.classList.toggle('filled', n > 1);
        if (fill2) fill2.classList.toggle('filled', n > 2);

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* ═══════════════════════════════════════════
       STEP 1: CONTACT / AUTH
    ═══════════════════════════════════════════ */
    const authSection = document.getElementById('step-1');
    const authContent = document.getElementById('auth-check-content');

    function renderAuthStep() {
        if (!authContent) return;
        const user = Auth.getUser();
        if (user && user.loggedIn) {
            authContent.innerHTML = `
                <div class="auth-confirmed">
                    <div class="auth-confirmed-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green-light)" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    </div>
                    <div class="auth-confirmed-info">
                        <div class="auth-confirmed-name">${user.name || user.email}</div>
                        <div class="auth-confirmed-email">${user.email}</div>
                    </div>
                    <a href="login.html" class="auth-change-btn">Change</a>
                </div>`;
        } else {
            authContent.innerHTML = `
                <div class="auth-guest-box">
                    <p class="auth-guest-text">Sign in for a faster checkout experience and order tracking.</p>
                    <div class="auth-guest-actions">
                        <a href="login.html?redirect=checkout" class="btn btn-primary auth-login-btn"><span>Sign In</span></a>
                        <button class="btn btn-secondary" id="continue-guest-btn"><span>Continue as Guest</span></button>
                    </div>
                </div>`;
            const guestBtn = document.getElementById('continue-guest-btn');
            if (guestBtn) guestBtn.addEventListener('click', () => goToStep(2));
        }
    }
    renderAuthStep();

    const authNextBtn = document.getElementById('btn-auth-next');
    if (authNextBtn) {
        authNextBtn.addEventListener('click', () => {
            const user = Auth.getUser();
            if (user && user.loggedIn) { goToStep(2); }
            else { goToStep(2); /* guest flow */ }
        });
    }

    /* ═══════════════════════════════════════════
       STEP 2: SHIPPING ADDRESS
    ═══════════════════════════════════════════ */
    const deliveryForm = document.getElementById('delivery-form');
    if (deliveryForm) {
        deliveryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = {
                name: document.getElementById('full-name').value.trim(),
                phone: document.getElementById('phone').value.trim(),
                address: document.getElementById('address').value.trim(),
                city: document.getElementById('city').value.trim(),
                state: document.getElementById('state').value.trim(),
                pincode: document.getElementById('pincode').value.trim()
            };
            Delivery.save(formData);
            goToStep(3);
            updateUPIAmount();
        });
    }

    /* Pre-fill from saved delivery or user profile */
    const savedDel = Delivery.get();
    const user = Auth.getUser();
    if (savedDel) {
        ['full-name:name','phone:phone','address:address','city:city','state:state','pincode:pincode'].forEach(pair => {
            const [id, key] = pair.split(':');
            const el = document.getElementById(id);
            if (el && savedDel[key]) el.value = savedDel[key];
        });
    } else if (user && user.loggedIn) {
        const nameEl = document.getElementById('full-name');
        const phoneEl = document.getElementById('phone');
        if (nameEl && user.name) nameEl.value = user.name;
        if (phoneEl && user.phone) phoneEl.value = user.phone;
    }

    /* Back button */
    const backToAuth = document.getElementById('btn-back-auth');
    if (backToAuth) backToAuth.addEventListener('click', () => goToStep(1));

    /* ═══════════════════════════════════════════
       STEP 3: PAYMENT
    ═══════════════════════════════════════════ */
    function updateUPIAmount() {
        const el = document.getElementById('upi-amount');
        if (el) el.textContent = `₹${Cart.getTotal()}`;
    }
    updateUPIAmount();

    /* Copy UPI ID */
    const copyBtn = document.getElementById('copy-upi');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const id = document.getElementById('upi-id').textContent;
            navigator.clipboard.writeText(id).then(() => {
                copyBtn.classList.add('copied');
                setTimeout(() => copyBtn.classList.remove('copied'), 1500);
            });
        });
    }

    /* Screenshot Upload */
    const uploadArea = document.getElementById('upload-area');
    const screenshotInput = document.getElementById('screenshot-input');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const uploadPreview = document.getElementById('upload-preview');
    const previewImg = document.getElementById('preview-img');
    const removePreview = document.getElementById('remove-preview');
    const paidBtn = document.getElementById('btn-paid');

    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            screenshotData = e.target.result;
            previewImg.src = screenshotData;
            uploadPlaceholder.style.display = 'none';
            uploadPreview.style.display = 'block';
            paidBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    if (screenshotInput) screenshotInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
    if (uploadArea) {
        uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
        uploadArea.addEventListener('drop', (e) => { e.preventDefault(); uploadArea.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
    }
    if (removePreview) {
        removePreview.addEventListener('click', (e) => {
            e.stopPropagation();
            screenshotData = null;
            uploadPlaceholder.style.display = 'flex';
            uploadPreview.style.display = 'none';
            screenshotInput.value = '';
            paidBtn.disabled = true;
        });
    }

    /* Back to Shipping */
    const backToShipping = document.getElementById('btn-back-shipping');
    if (backToShipping) backToShipping.addEventListener('click', () => goToStep(2));

    /* ═══════════════════════════════════════════
       CONFIRM PAYMENT
    ═══════════════════════════════════════════ */
    if (paidBtn) {
        paidBtn.addEventListener('click', () => {
            paidBtn.disabled = true;
            paidBtn.innerHTML = '<span>Processing...</span>';

            /* Show processing overlay */
            const overlay = document.getElementById('processing-overlay');
            if (overlay) overlay.classList.add('show');

            const delivery = Delivery.get() || {};
            const cart = Cart.get();
            const total = Cart.getTotal();

            const order = Orders.create({ cart, delivery, total, screenshot: screenshotData });

            /* Clear cart */
            Cart.clear();

            /* WhatsApp notification */
            const whatsappMsg = encodeURIComponent(
                `Hello Afreen Traders Team, I completed payment for Order #${order.id}. Please verify my payment.\n\nName: ${delivery.name}\nPhone: ${delivery.phone}\nAmount: ₹${total}`
            );

            setTimeout(() => {
                window.open(`https://wa.me/919515643942?text=${whatsappMsg}`, '_blank');
                window.location.href = 'success.html';
            }, 2000);
        });
    }

    /* ═══════════════════════════════════════════
       ORDER SUMMARY PANEL
    ═══════════════════════════════════════════ */
    function renderSummary() {
        const items = document.getElementById('summary-items');
        const cart = Cart.get();
        if (items) {
            items.innerHTML = cart.map(item => `
                <div class="summary-item">
                    <div class="summary-item-img"><img src="${item.image}" alt="${item.name}"></div>
                    <div class="summary-item-details">
                        <div class="summary-item-name">${item.name}</div>
                        <div class="summary-item-meta">${item.weight} × ${item.qty}</div>
                    </div>
                    <div class="summary-item-price">₹${item.price * item.qty}</div>
                </div>
            `).join('');
        }

        const subEl = document.getElementById('sum-subtotal');
        const delEl = document.getElementById('sum-delivery');
        const discRow = document.getElementById('sum-discount-row');
        const discEl = document.getElementById('sum-discount');
        const totalEl = document.getElementById('sum-total');
        const stickyEl = document.getElementById('sticky-total');

        if (subEl) subEl.textContent = `₹${Cart.getSubtotal()}`;
        if (delEl) {
            const d = Cart.getDelivery();
            delEl.textContent = d === 0 ? 'FREE' : `₹${d}`;
        }
        if (discRow && discEl) {
            const disc = Cart.getDiscount();
            if (disc > 0) { discRow.style.display = 'flex'; discEl.textContent = `-₹${disc}`; }
            else { discRow.style.display = 'none'; }
        }
        const total = Cart.getTotal();
        if (totalEl) totalEl.textContent = `₹${total}`;
        if (stickyEl) stickyEl.textContent = `₹${total}`;
    }

    renderSummary();
});

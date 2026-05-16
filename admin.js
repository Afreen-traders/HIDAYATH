/* ===== AFREEN TRADERS — Admin Script ===== */
document.addEventListener('DOMContentLoaded', () => {
    const { Auth, Orders } = AfreenStore;

    const gate = document.getElementById('admin-gate');
    const dashboard = document.getElementById('admin-dashboard');
    const loginForm = document.getElementById('admin-login-form');
    const gateError = document.getElementById('gate-error');

    /* ── Auth Gate ── */
    function showDashboard() {
        gate.style.display = 'none';
        dashboard.style.display = 'block';
        renderDashboard();
    }

    /* Check if already admin */
    if (Auth.isAdmin()) { showDashboard(); }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('admin-email').value;
        const pass = document.getElementById('admin-password').value;
        
        gateError.style.display = 'none';
        const btn = loginForm.querySelector('button[type="submit"]');
        btn.querySelector('span').textContent = 'Signing in...';
        btn.disabled = true;

        try {
            const { loginWithEmail } = await import('./firebase-auth.js');
            const result = await loginWithEmail(email, pass);
            
            if (result.ok) {
                /* Check admin role from synced session */
                const session = AfreenStore.Auth.getUser();
                if (session && session.role === 'admin') {
                    showDashboard();
                    return;
                }
                /* Not admin — sign out */
                const { logoutUser } = await import('./firebase-auth.js');
                await logoutUser();
                gateError.style.display = 'block';
                gateError.textContent = 'Access denied. Admin credentials required.';
            } else {
                gateError.style.display = 'block';
                gateError.textContent = result.error;
            }
        } catch (err) {
            gateError.style.display = 'block';
            gateError.textContent = 'Authentication failed. Check your connection.';
        }
        
        btn.querySelector('span').textContent = 'Login';
        btn.disabled = false;
    });

    /* Logout (Firebase) */
    const logoutBtn = document.getElementById('admin-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const { logoutUser } = await import('./firebase-auth.js');
                await logoutUser();
            } catch(e) { Auth.logout(); }
            window.location.reload();
        });
    }

    /* ── Dashboard ── */
    let currentFilter = 'all';

    function renderDashboard() {
        const orders = Orders.getAll();
        
        /* Stats */
        document.getElementById('stat-orders').textContent = orders.length;
        document.getElementById('stat-revenue').textContent = '₹' + orders.reduce((s, o) => s + (o.total || 0), 0);
        document.getElementById('stat-pending').textContent = orders.filter(o => o.status === 'Pending').length;
        const uniqueCustomers = new Set(orders.map(o => o.customerPhone || o.userId).filter(Boolean));
        document.getElementById('stat-customers').textContent = uniqueCustomers.size;

        renderOrders(orders);
    }

    function renderOrders(orders) {
        const filtered = currentFilter === 'all' ? orders : orders.filter(o => o.status === currentFilter);
        const tbody = document.getElementById('orders-tbody');
        const empty = document.getElementById('empty-orders');

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            empty.style.display = 'block';
            return;
        }
        empty.style.display = 'none';

        tbody.innerHTML = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(order => `
            <tr data-order-id="${order.id}">
                <td><span class="order-id-cell">${order.id}</span></td>
                <td>
                    <div class="customer-name">${order.customerName || '—'}</div>
                    <div class="customer-phone">${order.customerPhone || ''}</div>
                </td>
                <td class="items-cell">${(order.items || []).length} item(s)</td>
                <td class="total-cell">₹${order.total || 0}</td>
                <td class="date-cell">${order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', {day:'numeric',month:'short'}) : '—'}</td>
                <td><span class="status-tag ${order.status.toLowerCase()}">${order.status}</span></td>
                <td class="actions-cell">
                    <button class="action-btn view-btn" data-id="${order.id}" title="View">👁</button>
                    <select class="status-select" data-id="${order.id}">
                        <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Approved" ${order.status === 'Approved' ? 'selected' : ''}>Approved</option>
                        <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="Rejected" ${order.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                </td>
            </tr>
        `).join('');

        /* Status change handlers */
        tbody.querySelectorAll('.status-select').forEach(sel => {
            sel.addEventListener('change', () => {
                Orders.updateStatus(sel.dataset.id, sel.value);
                renderDashboard();
            });
        });

        /* View handlers */
        tbody.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => openOrderModal(btn.dataset.id));
        });
    }

    /* ── Filters ── */
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderDashboard();
        });
    });

    /* ── Order Modal ── */
    function openOrderModal(orderId) {
        const order = Orders.getAll().find(o => o.id === orderId);
        if (!order) return;

        const modal = document.getElementById('order-modal');
        document.getElementById('modal-order-id').textContent = order.id;

        document.getElementById('modal-content').innerHTML = `
            <div class="modal-detail-row"><span class="modal-label">Customer</span><span>${order.customerName || '—'}</span></div>
            <div class="modal-detail-row"><span class="modal-label">Phone</span><span>${order.customerPhone || '—'}</span></div>
            <div class="modal-detail-row"><span class="modal-label">Address</span><span>${order.delivery ? `${order.delivery.address}, ${order.delivery.city}, ${order.delivery.state} - ${order.delivery.pincode}` : '—'}</span></div>
            <div class="modal-detail-row"><span class="modal-label">Status</span><span class="status-tag ${order.status.toLowerCase()}">${order.status}</span></div>
            <div class="modal-detail-row"><span class="modal-label">Total</span><span style="color:var(--gold);font-weight:600;">₹${order.total}</span></div>
            <div class="modal-detail-row"><span class="modal-label">Date</span><span>${new Date(order.createdAt).toLocaleString('en-IN')}</span></div>
            <h4 style="margin:1.5rem 0 0.8rem;font-size:0.8rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;">Items</h4>
            ${(order.items || []).map(i => `
                <div class="modal-item">
                    <img src="${i.image}" alt="${i.name}">
                    <div><div style="font-weight:500;">${i.name}</div><div style="font-size:0.8rem;color:var(--text-muted);">${i.weight} × ${i.qty}</div></div>
                    <span style="color:var(--gold);">₹${i.price * i.qty}</span>
                </div>
            `).join('')}
            ${order.screenshot ? `<h4 style="margin:1.5rem 0 0.8rem;font-size:0.8rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;">Payment Proof</h4>
            <img src="${order.screenshot}" alt="Payment screenshot" style="max-width:100%;border-radius:8px;border:1px solid var(--border);">` : ''}
        `;

        modal.style.display = 'flex';
    }

    document.getElementById('modal-close').addEventListener('click', () => {
        document.getElementById('order-modal').style.display = 'none';
    });
    document.getElementById('order-modal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
    });
});

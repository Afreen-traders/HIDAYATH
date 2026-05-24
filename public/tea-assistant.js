/* ===== AFREEN TRADERS — AI Tea Assistant ===== */
(function() {
    'use strict';

    const { PRODUCTS, Cart } = AfreenStore;

    /* ═══════════════════════════════════════════
       CONVERSATION FLOW (Decision Tree)
    ═══════════════════════════════════════════ */
    const FLOW = {
        start: {
            text: "Hello! ☕ Need help choosing the perfect tea?",
            choices: [
                { label: "Yes, help me!", next: 'strength' },
                { label: "Just browsing", next: 'browse' }
            ]
        },
        strength: {
            text: "Great! How do you like your tea?",
            choices: [
                { label: "🔥 Strong & Bold", next: 'milk_strong' },
                { label: "🌿 Mild & Smooth", next: 'milk_mild' }
            ]
        },
        milk_strong: {
            text: "Do you prefer milk tea or black tea?",
            choices: [
                { label: "🥛 With Milk", next: 'rec_strong_milk' },
                { label: "☕ Black", next: 'rec_strong_black' }
            ]
        },
        milk_mild: {
            text: "Do you prefer milk tea or black tea?",
            choices: [
                { label: "🥛 With Milk", next: 'rec_mild_milk' },
                { label: "☕ Black", next: 'rec_mild_black' }
            ]
        },
        rec_strong_milk: {
            text: "Perfect! I recommend our **Hidayath Chai Dust** — bold, full-bodied, and perfect with milk. Our bestseller! 🏆",
            recommend: 1, next: 'anything_else'
        },
        rec_strong_black: {
            text: "For a strong black tea, try our **Premium Chai Leaves** — rich aroma with deep flavor. Excellent without milk.",
            recommend: 2, next: 'anything_else'
        },
        rec_mild_milk: {
            text: "You'll love our **Home Chai Classic** — smooth, comforting, and perfect for everyday cups with milk. ☕",
            recommend: 4, next: 'anything_else'
        },
        rec_mild_black: {
            text: "Try our **Golden Edition** — delicate, aromatic, and wonderfully smooth on its own. A luxury experience. ✨",
            recommend: 5, next: 'anything_else'
        },
        anything_else: {
            text: "Can I help you with anything else?",
            choices: [
                { label: "Recommend another", next: 'strength' },
                { label: "Tell me about deals", next: 'deals' },
                { label: "I'm good, thanks!", next: 'bye' }
            ]
        },
        browse: {
            text: "No problem! Take your time. Here are a few popular picks:",
            recommend: 1, next: 'browse_more'
        },
        browse_more: {
            text: "Would you like to see more?",
            choices: [
                { label: "Help me choose", next: 'strength' },
                { label: "No thanks", next: 'bye' }
            ]
        },
        deals: {
            text: "🎉 Use coupon **AFREEN10** for 10% off your first order! Free delivery on orders above ₹999.",
            next: 'anything_else'
        },
        bye: {
            text: "Happy brewing! ☕ Feel free to chat anytime. Enjoy your Afreen Traders experience!"
        }
    };

    /* ═══════════════════════════════════════════
       CREATE CHAT UI
    ═══════════════════════════════════════════ */
    function createChatUI() {
        /* Chat Button */
        const btn = document.createElement('button');
        btn.className = 'tea-chat-btn';
        btn.id = 'tea-chat-btn';
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <div class="chat-pulse"></div>
        `;

        /* Chat Window */
        const win = document.createElement('div');
        win.className = 'tea-chat-window';
        win.id = 'tea-chat-window';
        win.innerHTML = `
            <div class="tea-chat-header">
                <div class="tea-chat-header-left">
                    <div class="tea-chat-avatar">☕</div>
                    <div>
                        <div class="tea-chat-name">Tea Guide</div>
                        <div class="tea-chat-status">Online</div>
                    </div>
                </div>
                <button class="tea-chat-close" id="tea-chat-close">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="tea-chat-body" id="tea-chat-body"></div>
        `;

        document.body.appendChild(btn);
        document.body.appendChild(win);

        return { btn, win };
    }

    /* ═══════════════════════════════════════════
       CHAT ENGINE
    ═══════════════════════════════════════════ */
    function initChat() {
        const { btn, win } = createChatUI();
        const body = document.getElementById('tea-chat-body');
        let isOpen = false;

        /* Toggle chat */
        btn.addEventListener('click', () => {
            isOpen = !isOpen;
            win.classList.toggle('open', isOpen);
            if (isOpen && body.children.length === 0) {
                processStep('start');
            }
        });

        document.getElementById('tea-chat-close').addEventListener('click', () => {
            isOpen = false;
            win.classList.remove('open');
        });

        /* Add bot message */
        function addBotMsg(text) {
            const div = document.createElement('div');
            div.className = 'chat-msg bot';
            /* Basic markdown bold */
            div.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--gold)">$1</strong>');
            body.appendChild(div);
            body.scrollTop = body.scrollHeight;
        }

        /* Add user message */
        function addUserMsg(text) {
            const div = document.createElement('div');
            div.className = 'chat-msg user';
            div.textContent = text;
            body.appendChild(div);
            body.scrollTop = body.scrollHeight;
        }

        /* Add choice buttons */
        function addChoices(choices) {
            const wrap = document.createElement('div');
            wrap.className = 'chat-choices';
            choices.forEach(choice => {
                const btn = document.createElement('button');
                btn.className = 'chat-choice-btn';
                btn.textContent = choice.label;
                btn.addEventListener('click', () => {
                    addUserMsg(choice.label);
                    wrap.remove();
                    setTimeout(() => processStep(choice.next), 400);
                });
                wrap.appendChild(btn);
            });
            body.appendChild(wrap);
            body.scrollTop = body.scrollHeight;
        }

        /* Add product recommendation card */
        function addProductCard(productId) {
            const product = PRODUCTS.find(p => p.id === productId);
            if (!product) return;

            const card = document.createElement('div');
            card.className = 'chat-product-card';
            card.innerHTML = `
                <div class="chat-product-img"><img src="${product.images['250g']}" alt="${product.name}"></div>
                <div class="chat-product-info">
                    <div class="chat-product-name">${product.name}</div>
                    <div class="chat-product-price">₹${product.prices['250g']}</div>
                </div>
                <button class="chat-add-btn" data-id="${product.id}">+ Cart</button>
            `;
            card.querySelector('.chat-add-btn').addEventListener('click', (e) => {
                Cart.add(product.id, '250g');
                e.target.textContent = 'Added ✓';
                e.target.style.background = 'var(--green-mid)';
                e.target.style.color = 'white';
                /* Sync cart UI */
                if (typeof window.syncCartFromStore === 'function') window.syncCartFromStore();
                setTimeout(() => { e.target.textContent = '+ Cart'; e.target.style.background = ''; e.target.style.color = ''; }, 2000);
            });
            body.appendChild(card);
            body.scrollTop = body.scrollHeight;
        }

        /* Typing indicator */
        function showTyping() {
            const typing = document.createElement('div');
            typing.className = 'chat-msg bot';
            typing.id = 'chat-typing';
            typing.innerHTML = '<div class="chat-typing"><span></span><span></span><span></span></div>';
            body.appendChild(typing);
            body.scrollTop = body.scrollHeight;
        }
        function hideTyping() {
            const t = document.getElementById('chat-typing');
            if (t) t.remove();
        }

        /* Process a conversation step */
        function processStep(stepId) {
            const step = FLOW[stepId];
            if (!step) return;

            showTyping();
            setTimeout(() => {
                hideTyping();
                addBotMsg(step.text);

                if (step.recommend) {
                    setTimeout(() => addProductCard(step.recommend), 300);
                }

                if (step.choices) {
                    setTimeout(() => addChoices(step.choices), step.recommend ? 600 : 300);
                } else if (step.next) {
                    setTimeout(() => processStep(step.next), 1200);
                }
            }, 800 + Math.random() * 400);
        }
    }

    /* Initialize when DOM ready */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChat);
    } else {
        initChat();
    }
})();

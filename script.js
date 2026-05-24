/* ===== AFREEN TRADERS — Main Script ===== */

document.addEventListener('DOMContentLoaded', () => {

    console.log('AFREEN TRADERS Loaded');

    /* REMOVE OVERLAY ISSUES */

    document.body.style.overflowX = 'hidden';
    document.body.style.overflowY = 'auto';

    /* SMOOTH SCROLL */

    document.querySelectorAll('a[href^=\"#\"]').forEach(anchor => {

        anchor.addEventListener('click', function (e) {

            const target = document.querySelector(
                this.getAttribute('href')
            );

            if (!target) return;

            e.preventDefault();

            target.scrollIntoView({
                behavior: 'smooth'
            });

        });

    });

    /* NAVBAR SCROLL EFFECT */

    const navbar = document.querySelector('.navbar');

    window.addEventListener('scroll', () => {

        if (!navbar) return;

        if (window.scrollY > 40) {

            navbar.classList.add('scrolled');

        } else {

            navbar.classList.remove('scrolled');

        }

    });

    /* PRODUCT HOVER */

    const cards = document.querySelectorAll('.product-card');

    cards.forEach(card => {

        card.addEventListener('mouseenter', () => {

            card.style.transform =
                'translateY(-8px)';

        });

        card.addEventListener('mouseleave', () => {

            card.style.transform =
                'translateY(0px)';

        });

    });

    /* BUTTON RIPPLE EFFECT */

    document.querySelectorAll('button').forEach(btn => {

        btn.addEventListener('click', function (e) {

            const ripple =
                document.createElement('span');

            ripple.className = 'ripple';

            const rect = this.getBoundingClientRect();

            ripple.style.left =
                `${e.clientX - rect.left}px`;

            ripple.style.top =
                `${e.clientY - rect.top}px`;

            this.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
            }, 600);

        });

    });

    /* ANNOUNCEMENT TICKER */

    const ticker = document.querySelector('.ticker-track');

    if (ticker) {

        ticker.innerHTML += ticker.innerHTML;

    }

});

/* GLOBAL HELPERS */

window.AfreenUI = {

    toast(message = 'Done') {

        const toast = document.createElement('div');

        toast.innerText = message;

        toast.style.position = 'fixed';
        toast.style.bottom = '40px';
        toast.style.right = '40px';
        toast.style.background = '#111';
        toast.style.color = '#d4af37';
        toast.style.padding = '14px 22px';
        toast.style.borderRadius = '14px';
        toast.style.zIndex = '9999';
        toast.style.boxShadow =
            '0 10px 30px rgba(0,0,0,0.3)';

        document.body.appendChild(toast);

        setTimeout(() => {

            toast.remove();

        }, 2500);

    }

};
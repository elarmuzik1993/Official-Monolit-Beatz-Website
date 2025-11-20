// ========== NAVIGATION ==========

const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-link');

const resetHamburgerSpans = (spans) => {
    spans[0].style.transform = 'none';
    spans[1].style.opacity = '1';
    spans[2].style.transform = 'none';
};

const animateHamburgerSpans = (spans) => {
    spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
    spans[1].style.opacity = '0';
    spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
};

const closeMenu = () => {
    navMenu.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
    resetHamburgerSpans(hamburger.querySelectorAll('span'));
};

const toggleMenu = () => {
    const isExpanded = navMenu.classList.contains('active');
    navMenu.classList.toggle('active');
    hamburger.setAttribute('aria-expanded', !isExpanded);

    const spans = hamburger.querySelectorAll('span');
    isExpanded ? resetHamburgerSpans(spans) : animateHamburgerSpans(spans);
};

hamburger.addEventListener('click', toggleMenu);
hamburger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleMenu();
    }
});

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();

        const targetId = link.getAttribute('href');
        const targetSection = document.querySelector(targetId);

        // Track navigation click
        if (window.Analytics) {
            Analytics.trackNavigation(targetId.replace('#', ''));
        }

        if (targetSection) {
            const navbar = document.getElementById('navbar');
            const targetPosition = targetSection.offsetTop - navbar.offsetHeight;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }

        closeMenu();
    });
});

// ========== INTERSECTION OBSERVER FOR FADE-IN ANIMATIONS ==========

const fadeInObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        entry.target.classList.toggle('fade-in-visible', entry.isIntersecting);
    });
}, {
    threshold: 0.15,
    rootMargin: '0px 0px -80px 0px'
});

const observeElements = (selector, ...classes) => {
    document.querySelectorAll(selector).forEach((el, index) => {
        const classList = typeof classes[0] === 'function'
            ? classes[0](index)
            : classes;
        el.classList.add('fade-in-element', ...classList);
        fadeInObserver.observe(el);
    });
};

// Observe all elements
observeElements('.section');
observeElements('.section-title', 'fade-in-delay-1');
observeElements('.review-card', (i) => [`fade-in-delay-${(i % 3) + 1}`]);
observeElements('.service-card', (i) => [`fade-in-delay-${(i % 3) + 1}`]);
observeElements('.contact-info, .contact-social', (i) => [`fade-in-delay-${i + 1}`]);
observeElements('.about-text', 'fade-in-from-left');
observeElements('.about-image', 'fade-in-from-right');
observeElements('.music-player-container', 'fade-in-scale');
observeElements('.social-bar', 'fade-in-delay-2');

// Add security attributes to external links
document.querySelectorAll('a[href^="http"]').forEach(link => {
    link.setAttribute('rel', 'noopener noreferrer');
});

// ========== ABOUT SECTION SLIDESHOW ==========

const slideshow = (() => {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');

    if (!slides.length) return null;

    let currentIndex = 0;
    let interval;

    const showSlide = (index) => {
        // Wrap around
        currentIndex = ((index % slides.length) + slides.length) % slides.length;

        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));

        slides[currentIndex].classList.add('active');
        dots[currentIndex].classList.add('active');
    };

    const start = () => {
        interval = setInterval(() => showSlide(currentIndex + 1), 5000);
    };

    const goToSlide = (index) => {
        showSlide(index - 1);
        clearInterval(interval);
        start();
    };

    // Initialize
    showSlide(0);
    start();

    return { goToSlide };
})();

// Expose for inline onclick handlers
window.currentSlide = slideshow?.goToSlide || (() => {});

// ========== ANALYTICS TRACKING ==========

const trackClick = (selector, callback) => {
    document.querySelectorAll(selector).forEach(el => {
        el.addEventListener('click', () => window.Analytics && callback(el));
    });
};

// Track social media clicks
trackClick('.social-bar .social-link', (link) => {
    window.Analytics.trackSocialClick(
        link.getAttribute('aria-label').toLowerCase(),
        link.getAttribute('href'),
        'hero'
    );
});

trackClick('.contact-social .social-btn', (link) => {
    window.Analytics.trackSocialClick(
        link.querySelector('span').textContent.trim().toLowerCase(),
        link.getAttribute('href'),
        'contact'
    );
});

trackClick('a[href^="mailto:"]', () => {
    window.Analytics.trackEmailClick();
});

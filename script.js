const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-link');

const toggleMenu = () => {
    const isExpanded = navMenu.classList.contains('active');
    navMenu.classList.toggle('active');
    hamburger.setAttribute('aria-expanded', !isExpanded);
    
    const spans = hamburger.querySelectorAll('span');
    if (!isExpanded) {
        spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
    } else {
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
    }
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
        
        if (targetSection) {
            const navbarHeight = document.getElementById('navbar').offsetHeight;
            const targetPosition = targetSection.offsetTop - navbarHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
        
        navMenu.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
        const spans = hamburger.querySelectorAll('span');
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
    });
});

// Navbar is now static at top (no scroll behavior needed)

// Enhanced Intersection Observer for multiple elements
const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -80px 0px'
};

const fadeInObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in-visible');
        } else {
            entry.target.classList.remove('fade-in-visible');
        }
    });
}, observerOptions);

// Observe sections
document.querySelectorAll('.section').forEach(section => {
    section.classList.add('fade-in-element');
    fadeInObserver.observe(section);
});

// Observe section titles
document.querySelectorAll('.section-title').forEach(title => {
    title.classList.add('fade-in-element', 'fade-in-delay-1');
    fadeInObserver.observe(title);
});

// Observe cards (reviews, services)
document.querySelectorAll('.review-card').forEach((card, index) => {
    card.classList.add('fade-in-element', `fade-in-delay-${(index % 3) + 1}`);
    fadeInObserver.observe(card);
});

document.querySelectorAll('.service-card').forEach((card, index) => {
    card.classList.add('fade-in-element', `fade-in-delay-${(index % 3) + 1}`);
    fadeInObserver.observe(card);
});

// Observe about content
const aboutText = document.querySelector('.about-text');
const aboutImage = document.querySelector('.about-image');
if (aboutText) {
    aboutText.classList.add('fade-in-element', 'fade-in-from-left');
    fadeInObserver.observe(aboutText);
}
if (aboutImage) {
    aboutImage.classList.add('fade-in-element', 'fade-in-from-right');
    fadeInObserver.observe(aboutImage);
}

// Observe contact sections
document.querySelectorAll('.contact-info, .contact-social').forEach((section, index) => {
    section.classList.add('fade-in-element', `fade-in-delay-${index + 1}`);
    fadeInObserver.observe(section);
});

// Observe music player
const musicPlayerContainer = document.querySelector('.music-player-container');
if (musicPlayerContainer) {
    musicPlayerContainer.classList.add('fade-in-element', 'fade-in-scale');
    fadeInObserver.observe(musicPlayerContainer);
}

// Observe social bar
const socialBar = document.querySelector('.social-bar');
if (socialBar) {
    socialBar.classList.add('fade-in-element', 'fade-in-delay-2');
    fadeInObserver.observe(socialBar);
}

document.querySelectorAll('a[href^="http"]').forEach(link => {
    link.setAttribute('rel', 'noopener noreferrer');
});

// ========== ABOUT SECTION SLIDESHOW ==========
let currentSlideIndex = 0;
let slideInterval;

function showSlide(index) {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');

    if (!slides.length) return;

    // Wrap around
    if (index >= slides.length) currentSlideIndex = 0;
    if (index < 0) currentSlideIndex = slides.length - 1;
    else currentSlideIndex = index;

    // Hide all slides
    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));

    // Show current slide
    slides[currentSlideIndex].classList.add('active');
    dots[currentSlideIndex].classList.add('active');
}

function currentSlide(index) {
    showSlide(index - 1);
    // Reset auto-advance timer
    clearInterval(slideInterval);
    startSlideshow();
}

function nextSlide() {
    showSlide(currentSlideIndex + 1);
}

function startSlideshow() {
    // Auto-advance every 5 seconds
    slideInterval = setInterval(nextSlide, 5000);
}

// Initialize slideshow when page loads
if (document.querySelector('.slideshow-container')) {
    showSlide(0);
    startSlideshow();
}

// Make currentSlide function globally accessible for onclick
window.currentSlide = currentSlide;

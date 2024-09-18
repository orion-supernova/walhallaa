// Matrix rain effect
const canvas = document.getElementById('matrix-rain');
const ctx = canvas.getContext('2d');

let width, height;

function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    drops = Array(Math.ceil(width / fontSize)).fill(1);
}

const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+{}[]|;:,.<>?';
const fontSize = 14;
let drops;

resizeCanvas();

function drawMatrixRain() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#00ff00';
    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < drops.length; i++) {
        const text = characters[Math.floor(Math.random() * characters.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > height && Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }

    requestAnimationFrame(drawMatrixRain);
}

window.addEventListener('resize', resizeCanvas);

// Enhanced typewriter effect with blinking cursor
function enhancedTypeWriter(element, text, speed = 50) {
    let i = 0;
    element.innerHTML = '<span class="cursor">|</span>';
    
    function type() {
        if (i < text.length) {
            if (element.childNodes[0].nodeType === Node.TEXT_NODE) {
                element.childNodes[0].textContent += text.charAt(i);
            } else {
                element.insertBefore(document.createTextNode(text.charAt(i)), element.childNodes[0]);
            }
            i++;
            setTimeout(type, speed + Math.random() * 50); // Add some randomness to the typing speed
        } else {
            // Start cyberpunk glitch effect after typing is complete
            setTimeout(() => {
                cyberpunkGlitch(element, text);
                
                // Wait 2 seconds before starting the matrix rain
                setTimeout(() => {
                    drawMatrixRain();
                }, 2000);
            }, 500); // Wait a bit before starting the glitch effect
        }
    }

    // Start typing effect
    setTimeout(type, 1000); // Delay before starting to type

    // Blinking cursor effect
    let cursorVisible = true;
    const cursorElement = element.querySelector('.cursor');
    
    function blinkCursor() {
        cursorVisible = !cursorVisible;
        cursorElement.style.opacity = cursorVisible ? 1 : 0;
    }

    const cursorInterval = setInterval(blinkCursor, 500);

    // Stop cursor blinking after typing is complete
    setTimeout(() => {
        clearInterval(cursorInterval);
        cursorElement.style.display = 'none';
    }, (text.length * speed) + 1500);
}

const typewriterText = document.getElementById('typewriter-text');
enhancedTypeWriter(typewriterText, "Welcome, Earthling", 100);

// Cyberpunk glitch effect for "Welcome, Earthling" text
function cyberpunkGlitch(element, text) {
    const glitchChars = '!<>-_\\/[]{}—=+*^?#________';
    let glitchInterval;
    let originalHTML = element.innerHTML;

    function applyGlitch() {
        let glitchedText = '';
        for (let i = 0; i < text.length; i++) {
            if (Math.random() < 0.1) {
                glitchedText += `<span style="color: #ff00ff;">${glitchChars[Math.floor(Math.random() * glitchChars.length)]}</span>`;
            } else if (Math.random() < 0.2) {
                glitchedText += `<span style="color: #00ffff;">${text[i]}</span>`;
            } else {
                glitchedText += text[i];
            }
        }
        element.innerHTML = glitchedText;
    }

    function startGlitch() {
        glitchInterval = setInterval(applyGlitch, 50);
    }

    function stopGlitch() {
        clearInterval(glitchInterval);
        element.innerHTML = originalHTML;
    }

    startGlitch();
    setInterval(() => {
        stopGlitch();
        setTimeout(startGlitch, 500);
    }, 3000);
}

// Glitch effect function
function glitchText(element, originalText) {
    const glitchChars = '!<>-_\\/[]{}—=+*^?#________';
    let glitchInterval;

    function applyGlitch() {
        let glitchedText = '';
        for (let i = 0; i < originalText.length; i++) {
            if (Math.random() < 0.1) {
                glitchedText += glitchChars[Math.floor(Math.random() * glitchChars.length)];
            } else {
                glitchedText += originalText[i];
            }
        }
        element.textContent = glitchedText;
    }

    element.addEventListener('mouseover', () => {
        glitchInterval = setInterval(applyGlitch, 50);
    });

    element.addEventListener('mouseout', () => {
        clearInterval(glitchInterval);
        element.textContent = originalText;
    });
}

// Scroll effect to reveal portfolio
const introScreen = document.getElementById('intro-screen');
const portfolioContent = document.getElementById('portfolio-content');
let isPortfolioRevealed = false;
let isInProjectsSection = false;
let lastScrollPosition = 0;

// Performance optimization: Debounce the scroll event
function debounce(func, wait = 20, immediate = true) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        const later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

// Optimize scroll event listener
const optimizedScroll = debounce(() => {
    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;

    // Check if we're in the projects section
    const projectsSection = document.getElementById('projects');
    const projectsRect = projectsSection.getBoundingClientRect();
    isInProjectsSection = projectsRect.top <= 0 && projectsRect.bottom > 0;

    // Update intro screen opacity based on scroll position
    const introOpacity = Math.max(0, 1 - (scrollPosition / (windowHeight * 0.5)));
    introScreen.style.opacity = introOpacity;

    // Reveal portfolio content
    if (scrollPosition > windowHeight * 0.5) {
        if (!isPortfolioRevealed) {
            portfolioContent.classList.add('show-portfolio');
            isPortfolioRevealed = true;
            introScreen.classList.add('hide-intro');
            document.body.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-color');
        }
    } else {
        if (isPortfolioRevealed) {
            portfolioContent.classList.remove('show-portfolio');
            isPortfolioRevealed = false;
            introScreen.classList.remove('hide-intro');
            document.body.style.backgroundColor = 'black';
        }
    }

    // Fade in content on scroll
    const contents = document.querySelectorAll('.content');
    contents.forEach((content) => {
        const contentPosition = content.getBoundingClientRect().top;
        if (contentPosition < windowHeight * 0.75) {
            content.classList.add('fade-in');
        }
    });

    // Store last scroll position if in projects section
    if (isInProjectsSection) {
        lastScrollPosition = scrollPosition;
    }
}, 20);

window.addEventListener('scroll', optimizedScroll);

// Accessibility: Add keyboard navigation for the portfolio sections
document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        const focusableElements = document.querySelectorAll('a[href], button, input, textarea, [tabindex]:not([tabindex="-1"])');
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    }
});

// Optimize mousemove event listener
const optimizedMouseMove = debounce((e) => {
    if (!isPortfolioRevealed) {
        return;
    }
    
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    const distanceX = (mouseX - canvas.width / 2) / (canvas.width / 2);
    const distanceY = (mouseY - canvas.height / 2) / (canvas.height / 2);
    
    targetZoomOriginX = canvas.width / 2 + distanceX * canvas.width * 0.2;
    targetZoomOriginY = canvas.height / 2 + distanceY * canvas.height * 0.2;
    
    const distanceFromCenter = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    targetZoomFactor = 1 + distanceFromCenter * 0.3;
}, 20);

window.addEventListener('mousemove', optimizedMouseMove);

// Add this new event listener for mouse leave
window.addEventListener('mouseleave', () => {
    if (!isPortfolioRevealed) {
        targetZoomOriginX = canvas.width / 2;
        targetZoomOriginY = canvas.height / 2;
        targetZoomFactor = 1;
    }
});

// Prevent auto-scrolling and force scroll to top
window.history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

// Ensure the page starts from the top on refresh
window.onbeforeunload = function () {
    window.scrollTo(0, 0);
};

// Add this function to get the current section
function getCurrentSection() {
    const sections = ['home', 'about', 'projects','contact'];
    for (const section of sections) {
        const element = document.getElementById(section);
        const rect = element.getBoundingClientRect();
        if (rect.top <= 50 && rect.bottom > 50) {
            return section;
        }
    }
    return null;
}

// New function to apply glitch effect to href elements
function applyGlitchEffectToElements() {
    const elements = document.querySelectorAll('h1, h2, h3, p, a:not(nav a)');
    const glitchChars = '!<>-_\\/[]{}—=+*^?#________';

    elements.forEach(element => {
        if (element.id === 'typewriter-text') return; // Skip the "Welcome, Earthling" text

        const originalText = element.textContent;
        let glitchInterval;

        function glitchText() {
            let glitchedText = '';
            for (let i = 0; i < originalText.length; i++) {
                if (Math.random() < 0.1) {
                    glitchedText += glitchChars[Math.floor(Math.random() * glitchChars.length)];
                } else {
                    glitchedText += originalText[i];
                }
            }
            return glitchedText;
        }

        element.addEventListener('mouseenter', () => {
            glitchInterval = setInterval(() => {
                element.textContent = glitchText();
            }, 50);

            if (element.tagName === 'A') {
                element.style.color = '#00ff00'; // Change color to green on hover for links
            }
        });

        element.addEventListener('mouseleave', () => {
            clearInterval(glitchInterval);
            element.textContent = originalText;
            if (element.tagName === 'A') {
                element.style.color = ''; // Reset to default color for links
            }
        });
    });
}

// Implement lazy loading for images
function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    }, options);

    images.forEach(img => imageObserver.observe(img));
}

function setupSmoothScroll() {
    const header = document.querySelector('header');
    const headerHeight = header.offsetHeight;

    document.querySelectorAll('nav li').forEach(listItem => {
        listItem.addEventListener('click', function (e) {
            e.preventDefault();
            const anchor = this.querySelector('a');
            const targetId = anchor.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Update active class
                document.querySelectorAll('nav li').forEach(item => item.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
}

// Call setupSmoothScroll immediately
setupSmoothScroll();

function handleTabNavigation() {
  const navLinks = document.querySelectorAll('nav a');
  const lastNavLink = navLinks[navLinks.length - 1];

  lastNavLink.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      navLinks[0].focus();
    }
  });

  navLinks[0].addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      lastNavLink.focus();
    }
  });
}

// Modify the load event listener
window.addEventListener('load', () => {
    introScreen.style.opacity = 1;
    portfolioContent.style.opacity = 0;
    portfolioContent.style.display = 'none';
    isPortfolioRevealed = false;
    window.scrollTo(0, 0);

    // Start matrix rain immediately
    drawMatrixRain();

    setTimeout(() => {
        portfolioContent.style.display = 'block';
        applyGlitchEffectToElements();
        lazyLoadImages();
        handleTabNavigation();
    }, 100);
});


// Modify the beforeunload event listener
window.addEventListener('beforeunload', function () {
    const currentSection = getCurrentSection();
    if (currentSection) {
        sessionStorage.setItem('currentSection', currentSection);
        sessionStorage.setItem('scrollPosition', window.scrollY);
    } else {
        sessionStorage.removeItem('currentSection');
        sessionStorage.removeItem('scrollPosition');
    }
});

// Optimize resize event listener
const optimizedResize = debounce(() => {
    resizeCanvas();
}, 100);

window.addEventListener('resize', optimizedResize);

// Custom cursor
const customCursor = document.getElementById('custom-cursor');
customCursor.textContent = '%?!';

function updateCursorPosition(e) {
    const x = e.clientX;
    const y = e.clientY;
    customCursor.style.left = `${x}px`;
    customCursor.style.top = `${y}px`;
}

document.addEventListener('mousemove', (e) => {
    updateCursorPosition(e);
    customCursor.style.display = 'block';
});

document.addEventListener('mouseenter', () => {
    customCursor.style.display = 'block';
}, true);

document.addEventListener('mouseleave', () => {
    customCursor.style.display = 'none';
}, true);

// Ensure cursor is visible when entering the window
document.documentElement.addEventListener('mouseenter', () => {
    customCursor.style.display = 'block';
});

// Hide cursor when leaving the window
document.documentElement.addEventListener('mouseleave', () => {
    customCursor.style.display = 'none';
});

// Make sure the cursor is visible on page load
window.addEventListener('load', () => {
    customCursor.style.display = 'block';
});
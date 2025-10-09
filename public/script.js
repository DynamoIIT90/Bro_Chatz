// ================= SMOOTH SCROLL REVEAL ANIMATIONS =================
document.addEventListener('DOMContentLoaded', function() {
    
    // Add fade-in animation to step cards
    const stepCards = document.querySelectorAll('.step-card');
    const observerOptions = {
        threshold: 0.2,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease-out forwards';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    stepCards.forEach(card => {
        card.style.opacity = '0';
        observer.observe(card);
    });

    // ================= COPY USERNAME FUNCTIONALITY =================
    const usernameBox = document.querySelector('.username-box');
    if (usernameBox) {
        usernameBox.style.cursor = 'pointer';
        usernameBox.title = 'Click to copy username';
        
        usernameBox.addEventListener('click', function() {
            const username = document.querySelector('.admin-username').textContent;
            
            // Copy to clipboard
            navigator.clipboard.writeText(username).then(() => {
                // Create success notification
                const notification = document.createElement('div');
                notification.textContent = '✓ Username copied!';
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(45deg, #00ff88, #00ffff);
                    color: #000;
                    padding: 15px 25px;
                    border-radius: 15px;
                    font-weight: 700;
                    font-family: 'Orbitron', monospace;
                    z-index: 10000;
                    animation: slideInRight 0.4s ease-out, fadeOut 0.4s ease-in 2s forwards;
                    box-shadow: 0 5px 20px rgba(0, 255, 136, 0.5);
                `;
                
                // Add animation keyframes
                if (!document.getElementById('copy-animations')) {
                    const style = document.createElement('style');
                    style.id = 'copy-animations';
                    style.textContent = `
                        @keyframes slideInRight {
                            from { transform: translateX(100%); opacity: 0; }
                            to { transform: translateX(0); opacity: 1; }
                        }
                        @keyframes fadeOut {
                            to { opacity: 0; transform: translateX(100%); }
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                document.body.appendChild(notification);
                
                // Add bounce effect to username box
                usernameBox.style.animation = 'none';
                setTimeout(() => {
                    usernameBox.style.animation = 'copyBounce 0.5s ease-out';
                }, 10);
                
                // Add bounce animation if not exists
                if (!document.getElementById('bounce-animation')) {
                    const bounceStyle = document.createElement('style');
                    bounceStyle.id = 'bounce-animation';
                    bounceStyle.textContent = `
                        @keyframes copyBounce {
                            0%, 100% { transform: scale(1); }
                            50% { transform: scale(1.1); }
                        }
                    `;
                    document.head.appendChild(bounceStyle);
                }
                
                // Remove notification after animation
                setTimeout(() => {
                    notification.remove();
                }, 2500);
            }).catch(err => {
                console.error('Failed to copy:', err);
            });
        });
    }

    // ================= PARALLAX EFFECT FOR ORBS =================
    document.addEventListener('mousemove', function(e) {
        const orbs = document.querySelectorAll('.orb');
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;
        
        orbs.forEach((orb, index) => {
            const speed = (index + 1) * 0.5;
            const x = (mouseX - 0.5) * speed * 50;
            const y = (mouseY - 0.5) * speed * 50;
            
            orb.style.transform = `translate(${x}px, ${y}px)`;
        });
    });

    // ================= ATTENTION PULSE ON HOVER =================
    const noticeContainer = document.querySelector('.notice-container');
    if (noticeContainer) {
        noticeContainer.addEventListener('mouseenter', function() {
            const attentionBorder = document.querySelector('.attention-border');
            if (attentionBorder) {
                attentionBorder.style.animationDuration = '1.5s';
            }
        });
        
        noticeContainer.addEventListener('mouseleave', function() {
            const attentionBorder = document.querySelector('.attention-border');
            if (attentionBorder) {
                attentionBorder.style.animationDuration = '3s';
            }
        });
    }

    // ================= EMOJI ANIMATIONS =================
    const waveEmoji = document.querySelector('.wave-emoji');
    if (waveEmoji) {
        setInterval(() => {
            waveEmoji.style.animation = 'none';
            setTimeout(() => {
                waveEmoji.style.animation = 'wave 1.5s ease-in-out';
            }, 100);
        }, 5000);
    }

    // ================= STEP CARD HOVER EFFECTS =================
    stepCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateX(0) scale(1)';
        });
    });

    // ================= DYNAMIC GRADIENT BACKGROUND =================
    const bgEffects = document.querySelector('.bg-effects');
    let hueValue = 0;
    
    setInterval(() => {
        hueValue += 1;
        if (hueValue >= 360) hueValue = 0;
        bgEffects.style.filter = `hue-rotate(${hueValue}deg) brightness(1)`;
    }, 100);

    // ================= ALERT ICON CLICK EFFECT =================
    const alertIcon = document.querySelector('.alert-icon');
    if (alertIcon) {
        alertIcon.addEventListener('click', function() {
            this.style.animation = 'none';
            setTimeout(() => {
                this.style.animation = 'alertBounce 0.5s ease-in-out';
            }, 10);
        });
    }

    // ================= SMOOTH SCROLL FOR LONG CONTENT =================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ================= ADD SPARKLE EFFECT ON IMPORTANT ELEMENTS =================
    function createSparkle(element) {
        const sparkle = document.createElement('div');
        sparkle.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            background: white;
            border-radius: 50%;
            pointer-events: none;
            animation: sparkleFloat 1s ease-out forwards;
        `;
        
        const rect = element.getBoundingClientRect();
        sparkle.style.left = Math.random() * rect.width + 'px';
        sparkle.style.top = Math.random() * rect.height + 'px';
        
        element.style.position = 'relative';
        element.appendChild(sparkle);
        
        // Add sparkle animation if not exists
        if (!document.getElementById('sparkle-animation')) {
            const sparkleStyle = document.createElement('style');
            sparkleStyle.id = 'sparkle-animation';
            sparkleStyle.textContent = `
                @keyframes sparkleFloat {
                    0% { opacity: 1; transform: translateY(0) scale(0); }
                    50% { opacity: 1; transform: translateY(-20px) scale(1); }
                    100% { opacity: 0; transform: translateY(-40px) scale(0); }
                }
            `;
            document.head.appendChild(sparkleStyle);
        }
        
        setTimeout(() => sparkle.remove(), 1000);
    }

    // Add sparkles to username box periodically
    setInterval(() => {
        if (usernameBox) {
            createSparkle(usernameBox);
        }
    }, 2000);

    // ================= CONSOLE MESSAGE =================
    console.log('%c🚨 Bro Chatz Has Moved! 🚨', 'font-size: 20px; font-weight: bold; color: #ff006e; text-shadow: 0 0 10px #ff006e;');
    console.log('%cJoin us on Discord: igotubabe', 'font-size: 14px; color: #5865F2;');

    // ================= PERFORMANCE OPTIMIZATION =================
    // Reduce animations on low-end devices
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.querySelectorAll('*').forEach(el => {
            el.style.animation = 'none';
            el.style.transition = 'none';
        });
    }

    // ================= ADD GLOW EFFECT ON SCROLL =================
    window.addEventListener('scroll', function() {
        const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
        const attentionBorder = document.querySelector('.attention-border');
        
        if (attentionBorder) {
            attentionBorder.style.opacity = 0.6 + (scrollPercent * 0.4);
        }
    });

    // ================= EASTER EGG: KONAMI CODE =================
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;

    document.addEventListener('keydown', function(e) {
        if (e.key === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                // Easter egg activated!
                document.body.style.animation = 'rainbow 2s linear infinite';
                
                const easterEggStyle = document.createElement('style');
                easterEggStyle.textContent = `
                    @keyframes rainbow {
                        0% { filter: hue-rotate(0deg); }
                        100% { filter: hue-rotate(360deg); }
                    }
                `;
                document.head.appendChild(easterEggStyle);
                
                konamiIndex = 0;
                
                // Show secret message
                const secret = document.createElement('div');
                secret.textContent = '🎉 You found the secret! Welcome back, OG Bro Chatz member! 🎉';
                secret.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: linear-gradient(45deg, #ff006e, #ffbe0b);
                    color: #000;
                    padding: 30px;
                    border-radius: 20px;
                    font-weight: 900;
                    font-size: 1.5rem;
                    z-index: 10000;
                    text-align: center;
                    animation: secretPop 0.5s ease-out;
                    box-shadow: 0 10px 50px rgba(255, 0, 110, 0.8);
                `;
                
                document.body.appendChild(secret);
                setTimeout(() => secret.remove(), 3000);
            }
        } else {
            konamiIndex = 0;
        }
    });

    // ================= FINAL MESSAGE =================
    console.log('%c✨ Built with love for the Bro Chatz community ✨', 'font-size: 12px; color: #00ff88;');
});

// ================= WINDOW LOAD ANIMATIONS =================
window.addEventListener('load', function() {
    // Trigger initial animations
    document.querySelector('.notice-container').style.animation = 'containerFadeIn 1s ease-out';
    
    // Add entrance animation to all elements
    const allElements = document.querySelectorAll('.notice-container > *');
    allElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.animation = `fadeInUp 0.6s ease-out ${index * 0.1}s forwards`;
    });
});
/* ===================================================
   TV PRO — App Logic (Siena.film Edition)
   ─────────────────────────────────────────────────
   1. Preloader Zebra + Frame Counter
   2. Hero Intro Sequence (orchestrated with expo easing)
   3. Ticket UI (IntersectionObserver, sync scroll)
   4. SplitText Char-Roll (Siena-style title animation)
   5. Scroll Reveal (IntersectionObserver)
   6. Magnetic Buttons
   7. Header scroll behavior
   8. Mobile Menu
   9. Smooth Counters
   =================================================== */

// ══════════════════════════════════════════════════════
// 1. PRELOADER ZEBRA + FRAME COUNTER
// ══════════════════════════════════════════════════════

function initIntroSequence() {
  const preloader = document.querySelector('.preloader');
  const preloaderBar = document.querySelector('.preloader__bar');
  const frameCounter = document.querySelector('#frame-counter');
  const hero = document.querySelector('.hero');
  const header = document.querySelector('.header');
  const heroMedia = document.querySelector('.hero__media');

  if (!preloader) {
    revealAllIntro();
    initScrollReveal();
    return;
  }

  // Arrancar barra de progreso
  if (preloaderBar) {
    preloaderBar.classList.add('is-loading');
  }

  // Frame counter: simula rollfilm (cine) —cloquea rápido
  let frame = 0;
  const counterInterval = setInterval(() => {
    frame = (frame + 7) % 999;
    if (frameCounter) {
      frameCounter.textContent = String(frame).padStart(3, '0');
    }
  }, 80);

  // Esperar fuentes + imagen hero (con fallsafe de 3s)
  const fontsReady = document.fonts.ready;
  const imageReady = new Promise((resolve) => {
    if (!heroMedia) return resolve();
    if (heroMedia.complete && heroMedia.naturalHeight !== 0) return resolve();
    heroMedia.addEventListener('load', resolve);
    heroMedia.addEventListener('error', resolve);
  });
  const failsafe = new Promise((resolve) => setTimeout(resolve, 3000));

  Promise.race([
    Promise.all([fontsReady, imageReady]),
    failsafe,
  ]).then(() => {
    clearInterval(counterInterval);
    if (frameCounter) frameCounter.textContent = '024'; // frame final

    setTimeout(() => {
      exitPreloader(preloader, hero, header);
    }, 500);
  });
}

function exitPreloader(preloader, hero, header) {
  preloader.classList.add('is-done');

  // Luego del wipe (0.9s), arrancar la secuencia del hero
  setTimeout(() => {
    document.body.classList.remove('is-loading');
    startHeroSequence(hero, header);
  }, 950);
}

function startHeroSequence(hero, header) {
  if (hero) hero.classList.add('is-visible');

  const badge = document.querySelector('.hero__badge');
  const title = document.querySelector('.hero__title');
  const subtitle = document.querySelector('.hero__subtitle');
  const actions = document.querySelector('.hero__actions');
  const scrollIndicator = document.querySelector('.hero__scroll-indicator');
  const ticket = document.querySelector('.ticket');

  // Stagger timeline con tiempos más agresivos (cinematic weight)
  const timeline = [
    { el: badge, delay: 150 },
    { el: title, delay: 500 },
    { el: subtitle, delay: 950 },
    { el: actions, delay: 1200 },
    { el: scrollIndicator, delay: 1600 },
    { el: header, delay: 1800 },
    { el: ticket, delay: 2400 }, // El ticket aparece después, como contexto secundario
  ];

  timeline.forEach(({ el, delay }) => {
    if (!el) return;
    setTimeout(() => {
      el.classList.add('intro-visible');
      // El ticket usa su propio sistema de clase
      if (el === ticket) el.classList.add('is-visible');
    }, delay);
  });

  // Activar scroll reveals después de que el intro completa
  setTimeout(() => {
    initScrollReveal();
    initCharRollObserver();
  }, 2200);
}

function revealAllIntro() {
  const introEls = document.querySelectorAll(
    '.intro-fadeup, .intro-clip, .intro-slidedown, .intro-fade'
  );
  introEls.forEach((el) => el.classList.add('intro-visible'));

  const hero = document.querySelector('.hero');
  if (hero) hero.classList.add('is-visible');

  const ticket = document.querySelector('.ticket');
  if (ticket) {
    ticket.classList.add('intro-visible');
    ticket.classList.add('is-visible');
  }
}

// ══════════════════════════════════════════════════════
// 2. TICKET UI — Sincroniza con secciones activas
// ══════════════════════════════════════════════════════

const SECTION_DATA = {
  hero: { name: 'En Vivo', type: 'Señal' },
  programs: { name: 'Programas', type: 'Contenido' },
  features: { name: 'Por qué TV PRO', type: 'Características' },
  about: { name: 'Nosotros', type: 'Compañía' },
  contact: { name: 'Contacto', type: 'Info' },
};

function updateTicket(name, type) {
  const ticketName = document.querySelector('#ticket-name');
  const ticketType = document.querySelector('#ticket-type');
  const ticket = document.querySelector('.ticket');
  if (!ticket) return;

  ticket.style.opacity = '0.5';
  ticket.style.transform = 'translateX(8px)';
  setTimeout(() => {
    if (ticketName) ticketName.textContent = name;
    if (ticketType) ticketType.textContent = type;
    ticket.style.opacity = '';
    ticket.style.transform = '';
  }, 180);
}

function initTicket() {
  const ticket = document.querySelector('.ticket');
  const ticketHeader = document.querySelector('#ticket-header');
  if (!ticket) return;

  if (ticketHeader) {
    ticketHeader.addEventListener('click', () => ticket.classList.toggle('is-expanded'));
  }

  // Sincronizar con secciones genéricas
  const sections = document.querySelectorAll('section[id]:not(.programs-reel), footer[id]');
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const data = SECTION_DATA[entry.target.id];
          if (data) updateTicket(data.name, data.type);
        }
      });
    },
    { threshold: 0.4 }
  );
  sections.forEach((s) => obs.observe(s));
}

// ══════════════════════════════════════════════════════
// PROGRAM REEL — Velocity blur + slide activation + ticket sync
// ══════════════════════════════════════════════════════

function initProgramReel() {
  const slides = document.querySelectorAll('.ps');
  if (!slides.length) return;

  // —— 1. Velocity-based roll blur (the Siena magic) ——
  let lastScrollY = window.scrollY;
  let blurTimer;

  window.addEventListener('scroll', () => {
    const currentY = window.scrollY;
    const velocity = Math.abs(currentY - lastScrollY);
    lastScrollY = currentY;

    // Only apply blur when the programs section is in view
    const reel = document.querySelector('.programs-reel');
    if (!reel) return;
    const reelRect = reel.getBoundingClientRect();
    if (reelRect.top > window.innerHeight || reelRect.bottom < 0) return;

    if (velocity > 4) {
      const blur = Math.min(velocity * 0.35, 22);
      const sat = Math.max(1 - velocity * 0.025, 0.25);
      const bright = 1 + Math.min(velocity * 0.012, 0.7);
      
      // Desplazamiento tipo rollo de película (vertical drag)
      const rollOffset = (currentY - lastScrollY) * 0.15;
      const jumpThreshold = 15; // Velocidad para activar el salto de frame

      slides.forEach((slide) => {
        const card = slide.querySelector('.ps__card');
        if (card) {
          card.style.filter = `blur(${blur}px) saturate(${sat}) brightness(${bright})`;
          card.style.transform = `translateY(${rollOffset}px)`;
          
          if (velocity > jumpThreshold) {
            card.classList.add('is-jumping');
          } else {
            card.classList.remove('is-jumping');
          }
        }
      });

      clearTimeout(blurTimer);
      blurTimer = setTimeout(() => {
        slides.forEach((slide) => {
          const card = slide.querySelector('.ps__card');
          if (card) {
            card.style.filter = '';
            card.style.transform = '';
            card.classList.remove('is-jumping');
          }
        });
      }, 150);
    }
  }, { passive: true });

  // —— 2. Activate slide in view (IS-ACTIVE class + ticket sync) ——
  const slideObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Desactivar todas, activar esta
          slides.forEach((s) => s.classList.remove('is-active'));
          entry.target.classList.add('is-active');

          // Sync ticket
          const name = entry.target.dataset.name || 'Programa';
          const type = entry.target.dataset.type || 'TV PRO';
          updateTicket(name, type);
        }
      });
    },
    { threshold: 0.55 }  // El slide debe estar mayormente visible
  );

  slides.forEach((slide) => slideObserver.observe(slide));

  // Activar el primero inmediatamente
  slides[0].classList.add('is-active');
}

// ══════════════════════════════════════════════════════
// 3. SPLITTEXT CHAR-ROLL (Siena-style)
// ══════════════════════════════════════════════════════

/**
 * Divide un elemento en caracteres individuales envueltos en
 * .char-wrap > .char-inner para el efecto de rodillo.
 * Preserva espacios como "&nbsp;".
 */
function splitTextIntoChars(element) {
  const text = element.textContent;
  element.textContent = '';
  element.setAttribute('aria-label', text); // Accesibilidad

  text.split('').forEach((char, i) => {
    const wrap = document.createElement('span');
    wrap.className = 'char-wrap';
    wrap.setAttribute('aria-hidden', 'true');

    const inner = document.createElement('span');
    inner.className = 'char-inner';
    inner.textContent = char === ' ' ? '\u00A0' : char;

    // Stagger por índice (inyectado como CSS variable)
    const staggerMs = i * 35; // 35ms por letra
    inner.style.transitionDelay = `${staggerMs}ms`;

    wrap.appendChild(inner);
    element.appendChild(wrap);
  });

  element.classList.add('char-roll');
}

function initCharRollObserver() {
  // El h3 de cada program card recibe el efecto de roll
  const rollTargets = document.querySelectorAll('.program-card__title');

  if (!rollTargets.length) return;

  rollTargets.forEach((el) => {
    splitTextIntoChars(el);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target); // Solo una vez
        }
      });
    },
    { threshold: 0.3 }
  );

  rollTargets.forEach((el) => observer.observe(el));
}

// ══════════════════════════════════════════════════════
// 4. SCROLL REVEAL via IntersectionObserver
// ══════════════════════════════════════════════════════

function initScrollReveal() {
  const elements = document.querySelectorAll('.reveal, .clip-reveal');
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  elements.forEach((el) => {
    if (el.closest('.hero')) return;
    observer.observe(el);
  });
}

// ══════════════════════════════════════════════════════
// 5. MAGNETIC HOVER
// ══════════════════════════════════════════════════════

function initMagneticButtons() {
  const wraps = document.querySelectorAll('.magnetic-wrap');
  if ('ontouchstart' in window) return;

  wraps.forEach((wrap) => {
    const btn = wrap.querySelector('.btn') || wrap;
    const maxShift = 14;

    wrap.addEventListener('mousemove', (e) => {
      const rect = wrap.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = (e.clientX - centerX) / (rect.width / 2);
      const deltaY = (e.clientY - centerY) / (rect.height / 2);
      btn.style.transform = `translate(${deltaX * maxShift}px, ${deltaY * maxShift}px) scale(1.02)`;
    });

    wrap.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0, 0) scale(1)';
    });
  });
}

// ══════════════════════════════════════════════════════
// 6. HEADER SCROLL BEHAVIOR
// ══════════════════════════════════════════════════════

function initHeaderScroll() {
  const header = document.querySelector('.header');
  if (!header) return;

  window.addEventListener(
    'scroll',
    () => {
      if (window.scrollY > 60) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    },
    { passive: true }
  );
}

// ══════════════════════════════════════════════════════
// 7. MOBILE MENU
// ══════════════════════════════════════════════════════

function initMobileMenu() {
  const burger = document.querySelector('.header__burger');
  const mobileNav = document.querySelector('.header__mobile-nav');
  if (!burger || !mobileNav) return;

  burger.addEventListener('click', () => {
    burger.classList.toggle('is-open');
    mobileNav.classList.toggle('is-open');
    document.body.style.overflow = mobileNav.classList.contains('is-open')
      ? 'hidden'
      : '';
  });

  mobileNav.querySelectorAll('.header__nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      burger.classList.remove('is-open');
      mobileNav.classList.remove('is-open');
      document.body.style.overflow = '';
    });
  });
}

// ══════════════════════════════════════════════════════
// 8. SMOOTH COUNTERS
// ══════════════════════════════════════════════════════

function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.count, 10);
          const suffix = el.dataset.suffix || '';
          let current = 0;
          const duration = 1500;
          const increment = target / (duration / 16.67);

          function update() {
            current += increment;
            if (current >= target) {
              el.textContent = target.toLocaleString() + suffix;
              return;
            }
            el.textContent = Math.floor(current).toLocaleString() + suffix;
            requestAnimationFrame(update);
          }

          update();
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((el) => observer.observe(el));
}

// ══════════════════════════════════════════════════════
// INIT ALL
// ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initIntroSequence();
  initTicket();
  initProgramReel();
  initMagneticButtons();
  initHeaderScroll();
  initMobileMenu();
  initCounters();
});

/* =================================================
   THE BAKING SODA PROTOCOL — Main Application
   ================================================= */

'use strict';

// ─────────────────────────────────────────────────
// PRODUCT CONFIGURATION
// ─────────────────────────────────────────────────
const CONFIG = {
  productName:      'The Baking Soda Protocol',
  price:            39,
  currency:         'USD',
  vslUrl:           '[INSERT_VTURB_URL]',          // e.g. "https://player.vturb.com.br/player/..."
  vslVideoId:       '[INSERT_VTURB_VIDEO_ID]',     // VTurb video ID
  pitchRevealTime:  2300,                           // 38 min 20 sec — seconds
  checkoutUrl:      '[INSERT_CHECKOUT_URL]',
  supportEmail:     '[INSERT_SUPPORT_EMAIL]',
  guaranteeDays:    '[INSERT_ACTUAL_GUARANTEE_DAYS]',
};

// ─────────────────────────────────────────────────
// QUIZ STATE
// ─────────────────────────────────────────────────
const quizState = {
  currentStep: 1,
  totalSteps:  5,
  answers:     {},
  completed:   false,
};

// ─────────────────────────────────────────────────
// PERSONALIZATION MAP
// ─────────────────────────────────────────────────
const PERSONALIZATION = {
  goalLabels: {
    routine:     'building a better daily routine',
    eating:      'developing healthier eating habits',
    hydration:   'improving daily hydration',
    consistency: 'creating lasting consistency',
    general:     'achieving general wellness goals',
  },
  focusLabels: {
    nutrition:     'nutrition',
    hydration:     'hydration',
    daily_routine: 'your daily routine',
    movement:      'movement',
    sleep:         'sleep quality',
    consistency:   'building consistency',
  },
  timeLabels: {
    '5min':  'quick 5-minute',
    '10min': 'focused 10-minute',
    '15min': 'dedicated 15-minute',
    '20plus':'comprehensive',
  },
};

// ─────────────────────────────────────────────────
// UTILITY HELPERS
// ─────────────────────────────────────────────────
function $(selector, context = document) {
  return context.querySelector(selector);
}

function $$(selector, context = document) {
  return [...context.querySelectorAll(selector)];
}

function smoothScrollTo(el, offset = 80) {
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: 'smooth' });
}

// ─────────────────────────────────────────────────
// CHECKOUT — wire all CTAs to the checkout URL
// ─────────────────────────────────────────────────
function wireCheckoutButtons() {
  $$('.cta-checkout').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const url = CONFIG.checkoutUrl;
      if (url && url !== '[INSERT_CHECKOUT_URL]') {
        window.location.href = url;
      } else {
        // Placeholder feedback during development
        console.warn('[BSP] Checkout URL not configured. Update CONFIG.checkoutUrl.');
        alert('Checkout URL not yet configured.');
      }
    });
  });
}

// ─────────────────────────────────────────────────
// PITCH REVEAL
// ─────────────────────────────────────────────────
let pitchRevealed = false;

function revealPitchSection() {
  if (pitchRevealed) return;
  pitchRevealed = true;

  const pitchEl = $('#pitch-reveal');
  if (!pitchEl) return;

  pitchEl.classList.remove('pitch-hidden');
  pitchEl.classList.add('pitch-revealed');
  pitchEl.removeAttribute('aria-hidden');

  // Give browser a frame to paint before scrolling
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      smoothScrollTo($('#quiz-section'), 80);
    });
  });
}

// ─────────────────────────────────────────────────
// VTURB PLAYER INTEGRATION
// ─────────────────────────────────────────────────
function initVTurbPlayer() {
  const container = $('#vturb-container');
  if (!container) return;

  const videoId  = CONFIG.vslVideoId;
  const videoUrl = CONFIG.vslUrl;

  // If no valid VSL URL is configured, show the placeholder
  if (!videoId || videoId === '[INSERT_VTURB_VIDEO_ID]') {
    showVideoPlaceholder(container);
    return;
  }

  // Remove the placeholder
  const placeholder = $('#video-placeholder');
  if (placeholder) placeholder.remove();

  // --- Attempt 1: VTurb Web Component embed ---
  // VTurb typically uses a custom element <vturb-player>
  // Load their SDK and create the player
  const script = document.createElement('script');
  script.src = 'https://player.vturb.com.br/player.js';
  script.async = true;
  script.onload = () => createVTurbPlayer(container, videoId);
  script.onerror = () => {
    console.warn('[BSP] VTurb script failed to load. Using iframe fallback.');
    createVTurbIframe(container, videoUrl);
  };
  document.head.appendChild(script);
}

function createVTurbPlayer(container, videoId) {
  // Create VTurb custom element
  const player = document.createElement('vturb-player');
  player.setAttribute('vid', videoId);
  player.style.cssText = 'display:block;width:100%;height:100%;';

  // Listen for time events
  player.addEventListener('timeupdate', handleVTurbTimeUpdate);
  player.addEventListener('vtimeupdate', handleVTurbTimeUpdate);
  player.addEventListener('progress', handleVTurbTimeUpdate);

  container.appendChild(player);

  // Store reference globally for external access
  window._vturbPlayer = player;
}

function createVTurbIframe(container, url) {
  if (!url || url === '[INSERT_VTURB_URL]') {
    showVideoPlaceholder(container);
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;';
  container.appendChild(iframe);

  // Fallback: use polling for iframe-based players
  startVslPolling();
}

function handleVTurbTimeUpdate(e) {
  const time = e.detail?.currentTime ?? e.currentTime ?? 0;
  if (time >= CONFIG.pitchRevealTime) {
    revealPitchSection();
  }
}

function showVideoPlaceholder(container) {
  // Keep the existing placeholder visible
  const p = $('#video-placeholder');
  if (p) {
    p.classList.add('placeholder-active');
  }

  // Dev convenience: pressing Space bar reveals pitch section
  console.info(
    '[BSP] VSL not configured. Press Space to simulate pitch reveal (dev mode).'
  );
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.ctrlKey) {
      e.preventDefault();
      revealPitchSection();
    }
  });
}

// ─────────────────────────────────────────────────
// VSL POLLING FALLBACK
// ─────────────────────────────────────────────────
// Used when the player doesn't emit standard events
let pollingInterval = null;

function startVslPolling() {
  pollingInterval = setInterval(() => {
    const player = window._vturbPlayer;
    if (!player) return;

    const time = player.currentTime || player.getCurrentTime?.() || 0;
    if (time >= CONFIG.pitchRevealTime) {
      revealPitchSection();
      clearInterval(pollingInterval);
    }
  }, 2000); // poll every 2 seconds
}

// ─────────────────────────────────────────────────
// QUIZ LOGIC
// ─────────────────────────────────────────────────
function initQuiz() {
  // Wire each step's radio inputs to enable the Next button
  for (let step = 1; step <= quizState.totalSteps; step++) {
    const stepEl    = $(`#quiz-step-${step}`);
    const nextBtn   = $(`#q${step}-next`);
    const radios    = stepEl ? $$('input[type="radio"]', stepEl) : [];

    radios.forEach(radio => {
      radio.addEventListener('change', () => {
        quizState.answers[`q${step}`] = radio.value;
        if (nextBtn) nextBtn.disabled = false;

        // Highlight selected card
        const allCards = $$('.option-card', stepEl);
        allCards.forEach(card => card.classList.remove('selected'));
        radio.closest('.option-card')?.classList.add('selected');
      });
    });

    if (nextBtn) {
      nextBtn.addEventListener('click', () => advanceQuiz(step));
    }
  }

  // "See My Protocol" button after quiz completes
  const seeBtn = $('#see-protocol-btn');
  if (seeBtn) {
    seeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showQuizResult();
    });
  }
}

function advanceQuiz(fromStep) {
  const currentStepEl = $(`#quiz-step-${fromStep}`);
  const nextStep      = fromStep + 1;

  if (currentStepEl) {
    currentStepEl.classList.remove('active');
    currentStepEl.classList.add('exiting');
    setTimeout(() => currentStepEl.classList.add('hidden'), 300);
  }

  if (nextStep <= quizState.totalSteps) {
    setTimeout(() => {
      const nextStepEl = $(`#quiz-step-${nextStep}`);
      if (nextStepEl) {
        nextStepEl.classList.remove('hidden');
        requestAnimationFrame(() => nextStepEl.classList.add('active'));
      }
      quizState.currentStep = nextStep;
      updateQuizProgress(nextStep);
      smoothScrollTo($('#quiz-section'), 100);
    }, 300);
  } else {
    // Last step completed
    setTimeout(() => {
      const completeEl = $('#quiz-complete');
      if (completeEl) {
        completeEl.style.display = 'flex';
        requestAnimationFrame(() => completeEl.classList.add('active'));
      }
      quizState.completed = true;
      updateQuizProgress(quizState.totalSteps, true);
      smoothScrollTo($('#quiz-section'), 100);
    }, 300);
  }
}

function updateQuizProgress(step, complete = false) {
  const fill  = $('#quiz-progress-fill');
  const label = $('#quiz-progress-label');
  const pct   = complete ? 100 : Math.round((step / quizState.totalSteps) * 100);

  if (fill)  fill.style.width = `${pct}%`;
  if (label) label.textContent = complete
    ? 'Complete!'
    : `Question ${step} of ${quizState.totalSteps}`;
}

// ─────────────────────────────────────────────────
// QUIZ RESULT PERSONALIZATION
// ─────────────────────────────────────────────────
function showQuizResult() {
  const resultSection = $('#quiz-result');
  if (!resultSection) return;

  // Build personalized copy
  const goalKey    = quizState.answers.q1 || 'general';
  const focusKey   = quizState.answers.q3 || 'nutrition';
  const timeKey    = quizState.answers.q4 || '10min';

  const goalText   = PERSONALIZATION.goalLabels[goalKey]  || 'your wellness goals';
  const focusText  = PERSONALIZATION.focusLabels[focusKey] || 'overall wellness';
  const timeText   = PERSONALIZATION.timeLabels[timeKey]   || 'daily';

  const headline = $('#result-headline');
  const desc     = $('#result-description');

  if (headline) headline.textContent = 'Your Personalized Wellness Plan';
  if (desc) {
    desc.textContent =
      `Based on your answers, we've organized a ${timeText} educational routine focused on ` +
      `${goalText}, with special attention to ${focusText}. Your protocol is ready below.`;
  }

  // Reveal result
  resultSection.classList.remove('result-hidden');
  resultSection.classList.add('result-visible');

  setTimeout(() => {
    smoothScrollTo(resultSection, 80);
  }, 150);
}

// ─────────────────────────────────────────────────
// FAQ ACCORDION
// ─────────────────────────────────────────────────
function initFAQ() {
  $$('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item      = btn.closest('.faq-item');
      const answer    = btn.nextElementSibling;
      const icon      = btn.querySelector('.faq-icon');
      const isOpen    = item.classList.contains('open');

      // Close all other items
      $$('.faq-item.open').forEach(openItem => {
        openItem.classList.remove('open');
        const openAnswer = openItem.querySelector('.faq-answer');
        const openIcon   = openItem.querySelector('.faq-icon');
        if (openAnswer) openAnswer.style.maxHeight = '0';
        if (openIcon)   openIcon.textContent = '+';
      });

      // Toggle current item
      if (!isOpen) {
        item.classList.add('open');
        if (answer) answer.style.maxHeight = answer.scrollHeight + 'px';
        if (icon)   icon.textContent = '−';
      }
    });
  });
}

// ─────────────────────────────────────────────────
// STICKY HEADER SCROLL EFFECT
// ─────────────────────────────────────────────────
function initStickyHeader() {
  const header = $('#main-header');
  if (!header) return;

  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const current = window.scrollY;
    if (current > 80) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    lastScroll = current;
  }, { passive: true });
}

// ─────────────────────────────────────────────────
// MOBILE STICKY CTA
// ─────────────────────────────────────────────────
function initMobileStickyCTA() {
  const offer = $('#offer-section');
  const stickyCTA = $('#mobile-sticky-cta');
  if (!offer || !stickyCTA) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) {
        stickyCTA.classList.add('visible');
      } else {
        stickyCTA.classList.remove('visible');
      }
    });
  }, { threshold: 0.1 });

  observer.observe(offer);
}

// ─────────────────────────────────────────────────
// SMOOTH ANCHOR NAV
// ─────────────────────────────────────────────────
function initAnchorNav() {
  $$('a[href^="#"]').forEach(link => {
    const href = link.getAttribute('href');
    if (href === '#') return; // skip pure # links (handled by checkout)

    link.addEventListener('click', (e) => {
      const target = document.getElementById(href.slice(1));
      if (!target) return;
      e.preventDefault();
      smoothScrollTo(target, 80);
    });
  });
}

// ─────────────────────────────────────────────────
// URL PARAM — dev shortcut to skip VSL timing
// e.g. ?preview=pitch reveals pitch immediately
// ─────────────────────────────────────────────────
function checkDevParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('preview') === 'pitch') {
    console.info('[BSP] Dev mode: revealing pitch section immediately.');
    setTimeout(revealPitchSection, 500);
  }
}

// ─────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Inject checkout URL into page elements
  if (CONFIG.supportEmail && CONFIG.supportEmail !== '[INSERT_SUPPORT_EMAIL]') {
    $$('[data-support-email]').forEach(el => {
      el.textContent = CONFIG.supportEmail;
      if (el.tagName === 'A') el.href = `mailto:${CONFIG.supportEmail}`;
    });
  }

  initVTurbPlayer();
  initStickyHeader();
  initQuiz();
  initFAQ();
  initAnchorNav();
  wireCheckoutButtons();
  initMobileStickyCTA();
  checkDevParams();

  // Expose API for VTurb callback integration
  window.BSP = {
    revealPitchSection,
    config: CONFIG,
  };
});

// ─────────────────────────────────────────────────
// VTURB EXTERNAL CALLBACK
// Some VTurb setups call a global function when
// the video reaches a certain timestamp. Wire it here.
// Configure in VTurb dashboard: callback at 2300s
// ─────────────────────────────────────────────────
window.vtubeCallback = window.vtubeCallback || {};
window.vtubeCallback.onTimestamp = function(time) {
  if (time >= CONFIG.pitchRevealTime) {
    revealPitchSection();
  }
};

// Also handle SmartPlayer / VTurb player events dispatched on window
window.addEventListener('message', (event) => {
  try {
    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    if (!data) return;

    // VTurb / SmartPlayer message format
    const time =
      data.currentTime ??
      data.playback_position ??
      data.time ??
      null;

    if (typeof time === 'number' && time >= CONFIG.pitchRevealTime) {
      revealPitchSection();
    }
  } catch (_) {
    // Non-JSON messages — ignore
  }
});

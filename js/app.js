/* =================================================
   THE BAKING SODA PROTOCOL — Main Application v2
   ================================================= */
'use strict';

// ─── PRODUCT CONFIG ───────────────────────────────
const CONFIG = {
  productName:      'The Baking Soda Protocol',
  price:            39,
  currency:         'USD',
  vslUrl:           '[INSERT_VTURB_URL]',
  vslVideoId:       '[INSERT_VTURB_VIDEO_ID]',
  pitchRevealTime:  2300,   // 38 min 20 sec
  checkoutUrl:      '[INSERT_CHECKOUT_URL]',
  supportEmail:     '[INSERT_SUPPORT_EMAIL]',
  guaranteeDays:    '[INSERT_ACTUAL_GUARANTEE_DAYS]',
};

// ─── QUIZ STATE ───────────────────────────────────
const quiz = {
  step:       1,
  totalSteps: 5,
  answers:    { q1: [], q2: null, q3: null, q4: null, q5: [] },
  stepTypes:  { 1: 'checkbox', 2: 'radio', 3: 'radio', 4: 'radio', 5: 'checkbox' },
};

// ─── UTILS ───────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function smoothScrollTo(el, offset = 60) {
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: 'smooth' });
}

// ─── CHECKOUT BUTTONS ────────────────────────────
function wireCheckout() {
  $$('.cta-checkout').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const url = CONFIG.checkoutUrl;
      if (url && url !== '[INSERT_CHECKOUT_URL]') {
        window.location.href = url;
      } else {
        alert('Checkout URL not yet configured. Update CONFIG.checkoutUrl in js/app.js');
      }
    });
  });
}

// ─── PITCH REVEAL ────────────────────────────────
let pitchRevealed = false;

function revealPitchSection() {
  if (pitchRevealed) return;
  pitchRevealed = true;

  const pitch = $('#pitch-reveal');
  if (!pitch) return;

  pitch.classList.remove('pitch-hidden');
  pitch.classList.add('pitch-revealed');
  pitch.removeAttribute('aria-hidden');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      smoothScrollTo($('#quiz-section'), 60);
    });
  });
}

// ─── VTURB INTEGRATION ───────────────────────────
function initVTurb() {
  const container = $('#vturb-container');
  if (!container) return;

  const videoId = CONFIG.vslVideoId;

  if (!videoId || videoId === '[INSERT_VTURB_VIDEO_ID]') {
    showDevPlaceholder();
    return;
  }

  // Remove placeholder
  const ph = $('#video-placeholder');
  if (ph) ph.remove();

  // Load VTurb SDK
  const script = document.createElement('script');
  script.src = 'https://player.vturb.com.br/player.js';
  script.async = true;
  script.onload  = () => buildVTurbPlayer(container, videoId);
  script.onerror = () => buildIframeFallback(container);
  document.head.appendChild(script);
}

function buildVTurbPlayer(container, videoId) {
  const player = document.createElement('vturb-player');
  player.setAttribute('vid', videoId);
  player.style.cssText = 'display:block;width:100%;height:100%;';
  player.addEventListener('timeupdate', onTimeUpdate);
  player.addEventListener('vtimeupdate', onTimeUpdate);
  container.appendChild(player);
  window._vturbPlayer = player;
  startPolling();
}

function buildIframeFallback(container) {
  const url = CONFIG.vslUrl;
  if (!url || url === '[INSERT_VTURB_URL]') { showDevPlaceholder(); return; }
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.allow = 'autoplay; fullscreen';
  iframe.allowFullscreen = true;
  iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;';
  container.appendChild(iframe);
}

function onTimeUpdate(e) {
  const t = e.detail?.currentTime ?? e.currentTime ?? 0;
  if (t >= CONFIG.pitchRevealTime) revealPitchSection();
}

let pollTimer = null;
function startPolling() {
  pollTimer = setInterval(() => {
    const p = window._vturbPlayer;
    if (!p) return;
    const t = p.currentTime ?? p.getCurrentTime?.() ?? 0;
    if (t >= CONFIG.pitchRevealTime) { revealPitchSection(); clearInterval(pollTimer); }
  }, 2000);
}

function showDevPlaceholder() {
  // placeholder visible by default — add keyboard shortcut
  console.info('[BSP] VSL not configured. Ctrl+Space = reveal pitch. URL ?preview=pitch also works.');
}

// PostMessage from VTurb iframe
window.addEventListener('message', e => {
  try {
    const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    if (!d) return;
    const t = d.currentTime ?? d.playback_position ?? d.time ?? null;
    if (typeof t === 'number' && t >= CONFIG.pitchRevealTime) revealPitchSection();
  } catch (_) {}
});

// VTurb global callback
window.vtubeCallback = { onTimestamp: t => { if (t >= CONFIG.pitchRevealTime) revealPitchSection(); } };

// ─── VIDEO PLACEHOLDER BUTTONS ───────────────────
function initVideoButtons() {
  const cont = $('#btn-continue-watching');
  const begin = $('#btn-start-beginning');
  if (cont)  cont.addEventListener('click',  () => console.log('[BSP] Continue watching clicked'));
  if (begin) begin.addEventListener('click', () => console.log('[BSP] Start from beginning clicked'));
}

// ─── QUIZ ENGINE ──────────────────────────────────
function initQuiz() {
  for (let s = 1; s <= quiz.totalSteps; s++) {
    const stepEl  = $(`#quiz-step-${s}`);
    if (!stepEl) continue;

    const isCheck = quiz.stepTypes[s] === 'checkbox';
    const inputs  = $$('input', stepEl);
    const nextBtn = $(`#q${s}-next`);
    const backBtn = $(`#q${s}-back`);

    // Enable next btn when selection is made
    inputs.forEach(input => {
      input.addEventListener('change', () => {
        const label = input.closest('.opt-label');
        if (isCheck) {
          label?.classList.toggle('selected', input.checked);
        } else {
          $$('.opt-label', stepEl).forEach(l => l.classList.remove('selected'));
          label?.classList.add('selected');
        }
        const hasSelection = isCheck
          ? $$('input:checked', stepEl).length > 0
          : $$('input:checked', stepEl).length > 0;
        if (nextBtn) nextBtn.disabled = !hasSelection;
      });
    });

    if (nextBtn) nextBtn.addEventListener('click', () => advanceStep(s));
    if (backBtn) backBtn.addEventListener('click', () => goBackStep(s));
  }
}

function advanceStep(from) {
  // Save answers
  const stepEl = $(`#quiz-step-${from}`);
  if (!stepEl) return;
  const isCheck = quiz.stepTypes[from] === 'checkbox';
  if (isCheck) {
    quiz.answers[`q${from}`] = $$('input:checked', stepEl).map(i => i.value);
  } else {
    const checked = $('input:checked', stepEl);
    quiz.answers[`q${from}`] = checked ? checked.value : null;
  }

  // Hide current step
  stepEl.classList.remove('active');
  stepEl.classList.add('hidden');

  const next = from + 1;

  if (next <= quiz.totalSteps) {
    // Show next step
    setTimeout(() => {
      const nextEl = $(`#quiz-step-${next}`);
      if (nextEl) {
        nextEl.classList.remove('hidden');
        nextEl.classList.add('active');
      }
      quiz.step = next;
      updateProgress(next);
      smoothScrollTo($('#quiz-section'), 60);
    }, 150);
  } else {
    // All steps complete — show loading animation
    showLoading();
  }
}

function goBackStep(from) {
  const stepEl = $(`#quiz-step-${from}`);
  if (!stepEl) return;
  stepEl.classList.remove('active');
  stepEl.classList.add('hidden');

  const prev = from - 1;
  if (prev >= 1) {
    setTimeout(() => {
      const prevEl = $(`#quiz-step-${prev}`);
      if (prevEl) {
        prevEl.classList.remove('hidden');
        prevEl.classList.add('active');
      }
      quiz.step = prev;
      updateProgress(prev);
      smoothScrollTo($('#quiz-section'), 60);
    }, 150);
  }
}

function updateProgress(step, complete = false) {
  const fill  = $('#quiz-progress-fill');
  const label = $('#quiz-progress-label');
  const pct   = complete ? 100 : Math.round((step / quiz.totalSteps) * 100);
  if (fill)  fill.style.width = pct + '%';
  if (label) label.textContent = complete ? 'Analyzing...' : `Question ${step} of ${quiz.totalSteps}`;
}

// ─── LOADING ANIMATION ────────────────────────────
function showLoading() {
  const loadingEl = $('#quiz-loading');
  const quizCard  = $('#quiz-card');
  if (!loadingEl || !quizCard) return;

  // Hide all steps
  $$('.quiz-step').forEach(s => { s.classList.remove('active'); s.classList.add('hidden'); });

  loadingEl.classList.add('visible');
  updateProgress(5, true);
  smoothScrollTo($('#quiz-section'), 60);

  // Animate loading bar
  const bar  = $('#loading-bar');
  const pct  = $('#loading-pct');
  let current = 0;

  const interval = setInterval(() => {
    current += Math.random() * 12 + 4;
    if (current >= 100) { current = 100; clearInterval(interval); }
    if (bar)  bar.style.width  = current + '%';
    if (pct)  pct.textContent  = Math.round(current) + '%';
    if (current >= 100) {
      setTimeout(() => showResult(), 600);
    }
  }, 250);
}

// ─── QUIZ RESULT ──────────────────────────────────
function showResult() {
  const loadingEl = $('#quiz-loading');
  const resultEl  = $('#quiz-result');
  if (loadingEl) loadingEl.classList.remove('visible');

  // Personalize result text
  const goals    = quiz.answers.q1 || [];
  const loseAmt  = quiz.answers.q4 || '1-10';
  const symptoms = quiz.answers.q5 || [];

  const goalMap = {
    lose_weight: 'weight management',
    energy:      'energy levels',
    nutrition:   'nutrition',
    hydration:   'hydration',
    sleep:       'sleep quality',
    wellness:    'overall wellness',
  };

  const primaryGoal = goals.length > 0
    ? goalMap[goals[0]] || 'wellness goals'
    : 'wellness goals';

  const titleEl = $('#result-title');
  const descEl  = $('#result-desc');

  if (titleEl) titleEl.textContent = 'Your Baking Soda Protocol Is Ready';
  if (descEl) {
    descEl.textContent =
      `Based on your answers, we've put together a personalized educational protocol focused on ` +
      `${primaryGoal} — organized around your specific situation and daily schedule.`;
  }

  if (resultEl) {
    resultEl.classList.add('visible');
    setTimeout(() => smoothScrollTo(resultEl, 60), 200);
  }
}

// ─── FAQ ACCORDION ────────────────────────────────
function initFAQ() {
  $$('.faq-item').forEach(item => {
    const btn    = item.querySelector('.faq-btn');
    const answer = item.querySelector('.faq-answer');
    const icon   = item.querySelector('.faq-icon');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close all
      $$('.faq-item.open').forEach(open => {
        open.classList.remove('open');
        const a = open.querySelector('.faq-answer');
        const i = open.querySelector('.faq-icon');
        if (a) a.style.maxHeight = '0';
        if (i) i.textContent = '+';
      });

      // Toggle current
      if (!isOpen) {
        item.classList.add('open');
        if (answer) answer.style.maxHeight = answer.scrollHeight + 'px';
        if (icon)   icon.textContent = '×';
      }
    });
  });
}

// ─── STICKY HEADER ───────────────────────────────
function initHeader() {
  const header = $('.site-header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.style.boxShadow = window.scrollY > 60 ? '0 2px 12px rgba(0,0,0,0.25)' : '';
  }, { passive: true });
}

// ─── MOBILE STICKY CTA ───────────────────────────
function initMobileSticky() {
  const offer  = $('#offer-section');
  const sticky = $('#mobile-sticky');
  if (!offer || !sticky) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      sticky.classList.toggle('visible', !e.isIntersecting && pitchRevealed);
    });
  }, { threshold: 0.1 });

  obs.observe(offer);
}

// ─── TESTIMONIAL HELPFUL BUTTONS ─────────────────
function initTestimonials() {
  $$('.test-helpful-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      $$('.test-helpful-btn', this.closest('.test-helpful')).forEach(b => b.style.fontWeight = '400');
      this.style.fontWeight = '700';
      this.style.color = 'var(--fb-blue)';
    });
  });
}

// ─── SMOOTH ANCHOR LINKS ──────────────────────────
function initAnchors() {
  $$('a[href^="#"]').forEach(a => {
    const href = a.getAttribute('href');
    if (href === '#') return;
    a.addEventListener('click', e => {
      const target = document.getElementById(href.slice(1));
      if (!target) return;
      e.preventDefault();
      smoothScrollTo(target, 60);
    });
  });
}

// ─── DEV SHORTCUTS ───────────────────────────────
function initDev() {
  // Ctrl+Space = reveal pitch
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.code === 'Space') { e.preventDefault(); revealPitchSection(); }
  });

  // ?preview=pitch in URL
  if (new URLSearchParams(window.location.search).get('preview') === 'pitch') {
    setTimeout(revealPitchSection, 400);
  }
}

// ─── INIT ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initVTurb();
  initVideoButtons();
  initHeader();
  initQuiz();
  initFAQ();
  initAnchors();
  wireCheckout();
  initMobileSticky();
  initTestimonials();
  initDev();

  // Expose global API for VTurb
  window.BSP = { revealPitchSection, config: CONFIG };
});

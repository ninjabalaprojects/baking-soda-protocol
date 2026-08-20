/* =================================================
   THE BAKING SODA PROTOCOL — app.js v3
   ================================================= */
'use strict';

// ── CONFIG ────────────────────────────────────────
const CONFIG = {
  productName:     'The Baking Soda Protocol',
  price:           39,
  currency:        'USD',
  vslUrl:          '[INSERT_VTURB_URL]',
  vslVideoId:      '[INSERT_VTURB_VIDEO_ID]',
  pitchRevealTime: 2300,   // 38 min 20 sec
  checkoutUrl:     '[INSERT_CHECKOUT_URL]',
  supportEmail:    '[INSERT_SUPPORT_EMAIL]',
};

// ── QUIZ STATE ────────────────────────────────────
const Q = {
  step: 1,
  total: 5,
  types: { 1:'cb', 2:'rd', 3:'rd', 4:'rd', 5:'cb' },
  answers: {}
};

// ── UTILS ─────────────────────────────────────────
const get  = id  => document.getElementById(id);
const qs   = sel => document.querySelector(sel);
const qsa  = sel => [...document.querySelectorAll(sel)];

function scrollTo(el, offset = 56) {
  if (!el) return;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
}

// ── CHECKOUT ──────────────────────────────────────
function wireCheckout() {
  qsa('.cta-checkout').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const url = CONFIG.checkoutUrl;
      if (url && url !== '[INSERT_CHECKOUT_URL]') {
        window.location.href = url;
      } else {
        alert('[BSP] Set CONFIG.checkoutUrl in js/app.js');
      }
    });
  });
}

// ── PITCH REVEAL ──────────────────────────────────
let revealed = false;

function revealPitch() {
  if (revealed) return;
  revealed = true;

  const comments = get('community-section');
  const pitch    = get('pitch-reveal');
  if (!comments || !pitch) return;

  // 1. Fade out comments
  comments.classList.add('hiding');

  setTimeout(() => {
    // 2. Hide comments completely
    comments.style.display = 'none';

    // 3. Show pitch section
    pitch.style.display = 'block';

    // Force reflow so transition fires
    void pitch.offsetHeight;
    pitch.classList.add('show');

    // 4. Scroll to top of pitch (quiz)
    setTimeout(() => {
      scrollTo(get('quiz-section'), 56);
    }, 150);

    // 5. Show mobile sticky CTA
    const sticky = get('sticky-cta');
    if (sticky) sticky.classList.add('show');

  }, 450);
}

// ── VTURB ─────────────────────────────────────────
function initVTurb() {
  const container = get('vturb-container');
  if (!container) return;

  const vid = CONFIG.vslVideoId;
  if (!vid || vid === '[INSERT_VTURB_VIDEO_ID]') {
    // Dev mode — placeholder stays visible
    return;
  }

  get('video-placeholder')?.remove();

  const script = document.createElement('script');
  script.src   = 'https://player.vturb.com.br/player.js';
  script.async = true;
  script.onload  = () => embedVTurb(container, vid);
  script.onerror = () => embedIframe(container);
  document.head.appendChild(script);
}

function embedVTurb(container, vid) {
  const el = document.createElement('vturb-player');
  el.setAttribute('vid', vid);
  el.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
  el.addEventListener('timeupdate',  onTime);
  el.addEventListener('vtimeupdate', onTime);
  container.appendChild(el);
  window._vp = el;
  startPoll();
}

function embedIframe(container) {
  const url = CONFIG.vslUrl;
  if (!url || url === '[INSERT_VTURB_URL]') return;
  const fr = document.createElement('iframe');
  fr.src = url;
  fr.allow = 'autoplay; fullscreen';
  fr.allowFullscreen = true;
  fr.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;';
  container.appendChild(fr);
}

function onTime(e) {
  const t = e.detail?.currentTime ?? e.currentTime ?? 0;
  if (t >= CONFIG.pitchRevealTime) revealPitch();
}

let poll = null;
function startPoll() {
  poll = setInterval(() => {
    const t = window._vp?.currentTime ?? window._vp?.getCurrentTime?.() ?? 0;
    if (t >= CONFIG.pitchRevealTime) { revealPitch(); clearInterval(poll); }
  }, 2000);
}

// PostMessage (iframe VTurb)
window.addEventListener('message', e => {
  try {
    const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    const t = d?.currentTime ?? d?.playback_position ?? d?.time ?? null;
    if (typeof t === 'number' && t >= CONFIG.pitchRevealTime) revealPitch();
  } catch (_) {}
});

// VTurb global hook
window.vtubeCallback = { onTimestamp: t => { if (t >= CONFIG.pitchRevealTime) revealPitch(); } };

// ── QUIZ ENGINE ───────────────────────────────────
function initQuiz() {
  for (let s = 1; s <= Q.total; s++) {
    const stepEl = get(`step-${s}`);
    const nextEl = get(`n${s}`);
    const backEl = get(`b${s}`);
    if (!stepEl) continue;

    const isCB = Q.types[s] === 'cb';

    qsa('input', stepEl).forEach(inp => {
      inp.addEventListener('change', () => {
        const lbl = inp.closest('.opt');
        if (isCB) {
          lbl?.classList.toggle('sel', inp.checked);
        } else {
          qsa('.opt', stepEl).forEach(o => o.classList.remove('sel'));
          lbl?.classList.add('sel');
        }
        if (nextEl) nextEl.disabled = qsa('input:checked', stepEl).length === 0;
      });
    });

    nextEl?.addEventListener('click', () => goNext(s));
    backEl?.addEventListener('click', () => goBack(s));
  }
}

function goNext(s) {
  const stepEl = get(`step-${s}`);
  if (!stepEl) return;

  // Save answer
  const isCB = Q.types[s] === 'cb';
  Q.answers[`q${s}`] = isCB
    ? qsa('input:checked', stepEl).map(i => i.value)
    : qs(`#step-${s} input:checked`)?.value ?? null;

  stepEl.classList.remove('active');

  const next = s + 1;
  if (next <= Q.total) {
    setTimeout(() => {
      const nextEl = get(`step-${next}`);
      if (nextEl) nextEl.classList.add('active');
      Q.step = next;
      updateProg(next);
      scrollTo(get('quiz-section'), 56);
    }, 150);
  } else {
    showLoading();
  }
}

function goBack(s) {
  const stepEl = get(`step-${s}`);
  if (!stepEl) return;
  stepEl.classList.remove('active');
  const prev = s - 1;
  if (prev >= 1) {
    setTimeout(() => {
      const prevEl = get(`step-${prev}`);
      if (prevEl) prevEl.classList.add('active');
      Q.step = prev;
      updateProg(prev);
      scrollTo(get('quiz-section'), 56);
    }, 150);
  }
}

function updateProg(step, done = false) {
  const fill  = get('quiz-fill');
  const label = get('quiz-prog-label');
  const pct   = done ? 100 : Math.round((step / Q.total) * 100);
  if (fill)  fill.style.width = pct + '%';
  if (label) label.textContent = done ? 'Analyzing...' : `Question ${step} of ${Q.total}`;
}

// ── LOADING ANIMATION ─────────────────────────────
function showLoading() {
  const loading = get('quiz-loading');
  const wrap    = get('quiz-wrap');
  if (!loading || !wrap) return;

  qsa('.quiz-step').forEach(s => s.classList.remove('active'));
  loading.classList.add('on');
  updateProg(Q.total, true);
  scrollTo(get('quiz-section'), 56);

  const bar = get('ql-bar');
  const pct = get('ql-pct');
  let cur = 0;

  const timer = setInterval(() => {
    cur += Math.random() * 10 + 5;
    if (cur >= 100) { cur = 100; clearInterval(timer); }
    if (bar) bar.style.width = cur + '%';
    if (pct) pct.textContent = Math.round(cur) + '%';
    if (cur >= 100) setTimeout(showOffer, 600);
  }, 220);
}

function showOffer() {
  const loading = get('quiz-loading');
  if (loading) loading.classList.remove('on');
  const offer = get('offer-section');
  if (offer) {
    scrollTo(offer, 56);
  }
}

// ── FAQ ────────────────────────────────────────────
function initFAQ() {
  qsa('.faq-item').forEach(item => {
    const btn = item.querySelector('.faq-btn');
    const ans = item.querySelector('.faq-ans');
    const ico = item.querySelector('.faq-ico');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const open = item.classList.contains('open');
      qsa('.faq-item.open').forEach(o => {
        o.classList.remove('open');
        const a = o.querySelector('.faq-ans');
        const i = o.querySelector('.faq-ico');
        if (a) a.style.maxHeight = '0';
        if (i) i.textContent = '+';
      });
      if (!open) {
        item.classList.add('open');
        if (ans) ans.style.maxHeight = ans.scrollHeight + 'px';
        if (ico) ico.textContent = '×';
      }
    });
  });
}

// ── HEADER SCROLL SHADOW ──────────────────────────
function initHeader() {
  const h = qs('.site-header');
  if (!h) return;
  window.addEventListener('scroll', () => {
    h.style.boxShadow = window.scrollY > 50 ? '0 2px 10px rgba(0,0,0,.3)' : '';
  }, { passive: true });
}

// ── TESTIMONIAL HELPFUL BUTTONS ───────────────────
function initTestHelp() {
  qsa('.tc-help-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      qsa('.tc-help-btn', this.closest('.tc-helpful')).forEach(b => {
        b.style.fontWeight = '';
        b.style.color = '';
      });
      this.style.fontWeight = '700';
      this.style.color = 'var(--fb-blue)';
    });
  });
}

// ── VIDEO PLACEHOLDER BUTTONS ─────────────────────
function initVideoBtns() {
  get('btn-continue')?.addEventListener('click', () => {
    console.log('[BSP] Continue watching');
  });
  get('btn-restart')?.addEventListener('click', () => {
    console.log('[BSP] Restart video');
  });
}

// ── DEV SHORTCUTS ─────────────────────────────────
function initDev() {
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.code === 'Space') { e.preventDefault(); revealPitch(); }
  });
  if (new URLSearchParams(window.location.search).get('preview') === 'pitch') {
    setTimeout(revealPitch, 400);
  }
}

// ── INIT ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initVTurb();
  initVideoBtns();
  initHeader();
  initQuiz();
  initFAQ();
  wireCheckout();
  initTestHelp();
  initDev();

  window.BSP = { revealPitch, config: CONFIG };
});

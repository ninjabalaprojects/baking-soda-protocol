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

// ── QUIZ LABELS ───────────────────────────────────
const LABELS = {
  q1: { fat_burn:'Faster fat burning', cravings:'Control appetite & cravings', bloating:'Reduce bloating', energy:'More daily energy', skin:'Younger-looking skin', mood:'Better focus & mood' },
  q2: { '18-24':'18–24 years old', '25-34':'25–34 years old', '35-44':'35–44 years old', '45-54':'45–54 years old', '55+':'55 years or older' },
  q3: { 'under140':'Under 140 lbs', '140-169':'140–169 lbs', '170-199':'170–199 lbs', '200-229':'200–229 lbs', '230+':'230 lbs or more' },
  q4: { '1-25':'1–25 lbs', '26-50':'26–50 lbs', '51-80':'51–80 lbs', '80+':'80+ lbs' },
  q5: { fatigue:'Fatigue & low energy', belly:'Belly bloating', sugar:'Sugar cravings', slow_met:'Slow metabolism', mood:'Mood swings', regain:'Weight keeps coming back', none:'None of the above' }
};

const RESULTS = {
  '1-25':  { lbs: '8–15 lbs',  period: 'in the first 30 days', desc: "That's just month one. Women with your profile and commitment to the full protocol have reached their goal in as little as 6–8 weeks — and kept it off for good." },
  '26-50': { lbs: '15–22 lbs', period: 'in the first 30 days', desc: "That's just month one. Women with your profile and commitment to the full treatment have lost 35+ lbs — and kept it off for good." },
  '51-80': { lbs: '18–29 lbs', period: 'in the first 30 days', desc: "That's just month one. Women with your profile and commitment to the full 6-month treatment have lost 65+ lbs — and kept it off for good." },
  '80+':   { lbs: '22–35 lbs', period: 'in the first 30 days', desc: "That's just month one. Women with your profile and commitment to the full 6-month treatment have lost 80+ lbs — and maintained their results long-term." }
};

// ── UTILS ─────────────────────────────────────────
const get  = id  => document.getElementById(id);
const qs   = sel => document.querySelector(sel);
const qsa  = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

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

function slideStep(fromEl, toEl, direction) {
  // Animate out current step
  fromEl.classList.add('exiting');

  setTimeout(() => {
    fromEl.classList.remove('active', 'exiting');
    if (toEl) {
      if (direction === 'back') toEl.classList.add('from-back');
      toEl.classList.add('active');
      // Remove helper class after animation
      setTimeout(() => toEl.classList.remove('from-back'), 350);
    }
  }, 250);
}

function goNext(s) {
  const stepEl = get(`step-${s}`);
  if (!stepEl) return;

  // Save answer
  const isCB = Q.types[s] === 'cb';
  Q.answers[`q${s}`] = isCB
    ? qsa('input:checked', stepEl).map(i => i.value)
    : qs(`#step-${s} input:checked`)?.value ?? null;

  const next = s + 1;
  if (next <= Q.total) {
    const nextEl = get(`step-${next}`);
    slideStep(stepEl, nextEl, 'forward');
    Q.step = next;
    updateProg(next);
  } else {
    stepEl.classList.add('exiting');
    setTimeout(() => {
      stepEl.classList.remove('active', 'exiting');
      showLoading();
    }, 250);
  }
}

function goBack(s) {
  const stepEl = get(`step-${s}`);
  if (!stepEl) return;
  const prev = s - 1;
  if (prev >= 1) {
    const prevEl = get(`step-${prev}`);
    slideStep(stepEl, prevEl, 'back');
    Q.step = prev;
    updateProg(prev);
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
  if (!loading) return;

  qsa('.quiz-step').forEach(function(s) { s.classList.remove('active'); });
  loading.style.cssText = 'display:block;';
  updateProg(Q.total, true);
  window.scrollTo(0, get('quiz-section') ? get('quiz-section').offsetTop - 56 : 0);

  var bar = document.getElementById('ql-bar');
  var pct = document.getElementById('ql-pct');
  var msg = document.getElementById('ql-msg');
  var cur = 0;
  var msgs = [
    [0,  'Analyzing your answers\u2026'],
    [30, 'Generating your personalized protocol\u2026'],
    [60, 'Calibrating your results\u2026'],
    [85, 'Almost ready\u2026'],
    [98, 'Your protocol is ready!'],
  ];

  var id = window.setInterval(function() {
    cur += Math.random() * 9 + 4;
    if (cur > 100) cur = 100;
    var rounded = Math.round(cur);
    if (bar) bar.style.width = rounded + '%';
    if (pct) pct.textContent = rounded + '%';
    if (msg) {
      for (var i = msgs.length - 1; i >= 0; i--) {
        if (cur >= msgs[i][0]) { msg.textContent = msgs[i][1]; break; }
      }
    }
    if (cur >= 100) {
      window.clearInterval(id);
      window.setTimeout(showOffer, 900);
    }
  }, 220);
}

function showOffer() {
  var loading = get('quiz-loading');
  if (loading) loading.style.display = 'none';

  const result = get('quiz-result');
  if (!result) return;

  const a = Q.answers;

  // Build profile rows
  const goals    = (a.q1 || []).map(v => LABELS.q1[v]).filter(Boolean).join(', ') || '—';
  const age      = LABELS.q2[a.q2] || '—';
  const weight   = LABELS.q3[a.q3] || '—';
  const lose     = LABELS.q4[a.q4] || '—';
  const symptoms = (a.q5 || []).map(v => LABELS.q5[v]).filter(Boolean).join(', ') || '—';

  const summary = get('result-summary');
  if (summary) {
    summary.innerHTML =
      '<div class="rp-row"><span class="rp-ico">&#127919;</span><span><strong>Goal:</strong> ' + goals + '</span></div>' +
      '<div class="rp-row"><span class="rp-ico">&#128100;</span><span><strong>Age:</strong> ' + age + '</span></div>' +
      '<div class="rp-row"><span class="rp-ico">&#9878;&#65039;</span><span><strong>Current weight:</strong> ' + weight + '</span></div>' +
      '<div class="rp-row"><span class="rp-ico">&#128200;</span><span><strong>Weight to lose:</strong> ' + lose + '</span></div>' +
      '<div class="rp-row"><span class="rp-ico">&#9888;&#65039;</span><span><strong>Symptoms:</strong> ' + symptoms + '</span></div>';
  }

  const res = RESULTS[a.q4] || RESULTS['26-50'];
  const lbsEl = get('result-lbs');
  const descEl = get('result-desc');
  if (lbsEl) lbsEl.textContent = res.lbs + ' ' + res.period;
  if (descEl) descEl.textContent = res.desc;

  result.style.display = 'block';
  void result.offsetHeight;
  result.classList.add('show');
  setTimeout(function() { scrollTo(result, 56); }, 100);
}

function initRedo() {
  get('btn-redo')?.addEventListener('click', () => {
    const result = get('quiz-result');
    if (result) { result.classList.remove('show'); result.style.display = 'none'; }
    Q.answers = {};
    Q.step = 1;
    qsa('input[type=checkbox], input[type=radio]').forEach(inp => { inp.checked = false; });
    qsa('.opt').forEach(o => o.classList.remove('sel'));
    qsa('.quiz-step').forEach(s => s.classList.remove('active', 'exiting', 'from-back'));
    const first = get('step-1');
    if (first) first.classList.add('active');
    const n1 = get('n1');
    if (n1) n1.disabled = true;
    updateProg(1);
    scrollTo(get('quiz-section'), 56);
  });
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
  initRedo();
  initDev();

  window.BSP = { revealPitch, config: CONFIG };
});

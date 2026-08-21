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
  checkoutUrl:     'https://go.centerpag.com/PPU38CQFGE7',
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

// ── FACEBOOK PIXEL HELPER ─────────────────────────
function fbTrack(event, params) {
  if (typeof fbq === 'function') {
    params ? fbq('track', event, params) : fbq('track', event);
  }
}

// ── CHECKOUT ──────────────────────────────────────
function wireCheckout() {
  const url = CONFIG.checkoutUrl;
  qsa('.cta-checkout').forEach(function(btn) {
    btn.setAttribute('href', url);
    btn.setAttribute('target', '_blank');
    btn.setAttribute('rel', 'noopener');
    btn.addEventListener('click', function() {
      fbTrack('InitiateCheckout', {
        content_name: CONFIG.productName,
        content_type: 'product',
        value: CONFIG.price,
        currency: CONFIG.currency,
        num_items: 1
      });
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

    // 5. Start sale notifications
    startSaleNotifs();

    // 6. Facebook Pixel — ViewContent (user sees the offer)
    fbTrack('ViewContent', {
      content_name: CONFIG.productName,
      content_type: 'product',
      value: CONFIG.price,
      currency: CONFIG.currency
    });

  }, 450);
}

// ── VTURB v4 SMARTPLAYER ──────────────────────────
const PLAYER_ID = 'vid-6a87a49342232a9713a5af52';

function onTime(t) {
  if (typeof t === 'number' && t >= CONFIG.pitchRevealTime) revealPitch();
}

function attachPlayerListeners(el) {
  // DOM events fired by the web component
  el.addEventListener('timeupdate',  function(e) { onTime(e.detail?.currentTime ?? e.currentTime ?? 0); });
  el.addEventListener('vtimeupdate', function(e) { onTime(e.detail?.currentTime ?? e.currentTime ?? 0); });
  el.addEventListener('vp:timeupdate', function(e) { onTime(e.detail?.currentTime ?? 0); });

  // Polling fallback every 2s
  var pollId = setInterval(function() {
    var t = el.currentTime ?? (typeof el.getCurrentTime === 'function' ? el.getCurrentTime() : 0);
    onTime(t);
    if (revealed) clearInterval(pollId);
  }, 2000);
}

function initVTurb() {
  // Try immediately (element may already exist in DOM)
  var el = document.getElementById(PLAYER_ID);
  if (el) { attachPlayerListeners(el); return; }

  // Retry after player script loads (2s and 5s)
  [2000, 5000, 10000].forEach(function(delay) {
    setTimeout(function() {
      if (revealed) return;
      var el2 = document.getElementById(PLAYER_ID);
      if (el2) attachPlayerListeners(el2);
    }, delay);
  });
}

// postMessage fallback (covers iframe and cross-origin players)
window.addEventListener('message', function(e) {
  try {
    var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    var t = d && (d.currentTime ?? d.playback_position ?? d.time ?? null);
    onTime(t);
  } catch (_) {}
});

// VTurb global timestamp callback
window.vtubeCallback = { onTimestamp: function(t) { onTime(t); } };

// SmartPlayer v4 global event hook
window.addEventListener('vturb:timeupdate', function(e) { onTime(e.detail?.currentTime ?? 0); });

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

  var s1 = document.getElementById('ql-s1');
  var s2 = document.getElementById('ql-s2');
  var s3 = document.getElementById('ql-s3');

  function step() {
    var inc = cur < 40 ? (Math.random() * 5 + 3)
            : cur < 75 ? (Math.random() * 3 + 1.5)
            : cur < 92 ? (Math.random() * 1.5 + 0.8)
            :            (Math.random() * 0.6 + 0.3);
    cur = Math.min(cur + inc, 100);
    var rounded = Math.round(cur);
    if (bar) bar.style.width = rounded + '%';
    if (pct) pct.textContent = rounded + '%';
    if (msg) {
      for (var i = msgs.length - 1; i >= 0; i--) {
        if (cur >= msgs[i][0]) { msg.textContent = msgs[i][1]; break; }
      }
    }
    if (s1 && cur >= 35)  s1.classList.add('on');
    if (s2 && cur >= 65)  s2.classList.add('on');
    if (s3 && cur >= 98)  s3.classList.add('on');
    if (cur >= 100) {
      window.setTimeout(showOffer, 1100);
    } else {
      var delay = cur < 40 ? 260 : cur < 75 ? 320 : cur < 92 ? 400 : 480;
      window.setTimeout(step, delay);
    }
  }
  window.setTimeout(step, 300);
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

  // Facebook Pixel — Lead (quiz completed, personalized result shown)
  fbTrack('Lead', {
    content_name: CONFIG.productName,
    value: CONFIG.price,
    currency: CONFIG.currency
  });
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

// ── SALE NOTIFICATIONS ────────────────────────────
const NOTIF_DATA = [
  { flag:'\uD83C\uDDFA\uD83C\uDDF8', name:'Ashley M.',    loc:'Dallas, TX',          ago:'2 min ago'  },
  { flag:'\uD83C\uDDFA\uD83C\uDDF8', name:'Jennifer K.',  loc:'Miami, FL',            ago:'Just now'   },
  { flag:'\uD83C\uDDFA\uD83C\uDDF8', name:'Sarah L.',     loc:'Chicago, IL',          ago:'4 min ago'  },
  { flag:'\uD83C\uDDFA\uD83C\uDDF8', name:'Amanda R.',    loc:'Phoenix, AZ',          ago:'7 min ago'  },
  { flag:'\uD83C\uDDFA\uD83C\uDDF8', name:'Brittany H.',  loc:'Houston, TX',          ago:'1 min ago'  },
  { flag:'\uD83C\uDDEC\uD83C\uDDE7', name:'Charlotte B.', loc:'London, UK',           ago:'3 min ago'  },
  { flag:'\uD83C\uDDEC\uD83C\uDDE7', name:'Emma W.',      loc:'Manchester, UK',       ago:'6 min ago'  },
  { flag:'\uD83C\uDDEC\uD83C\uDDE7', name:'Olivia T.',    loc:'Birmingham, UK',       ago:'Just now'   },
  { flag:'\uD83C\uDDFF\uD83C\uDDE6', name:'Nomvula D.',   loc:'Johannesburg, SA',     ago:'5 min ago'  },
  { flag:'\uD83C\uDDFF\uD83C\uDDE6', name:'Ayanda M.',    loc:'Cape Town, SA',        ago:'8 min ago'  },
  { flag:'\uD83C\uDDE6\uD83C\uDDFA', name:'Ella M.',      loc:'Sydney, Australia',    ago:'2 min ago'  },
  { flag:'\uD83C\uDDE6\uD83C\uDDFA', name:'Ava J.',       loc:'Melbourne, Australia', ago:'9 min ago'  },
  { flag:'\uD83C\uDDE8\uD83C\uDDE6', name:'Emma L.',      loc:'Toronto, Canada',      ago:'4 min ago'  },
  { flag:'\uD83C\uDDE8\uD83C\uDDE6', name:'Sophia M.',    loc:'Vancouver, Canada',    ago:'1 min ago'  },
  { flag:'\uD83C\uDDEE\uD83C\uDDF1', name:'Maya R.',      loc:'Tel Aviv, Israel',     ago:'6 min ago'  },
  { flag:'\uD83C\uDDEE\uD83C\uDDF1', name:'Noa S.',       loc:'Jerusalem, Israel',    ago:'Just now'   },
  { flag:'\uD83C\uDDF3\uD83C\uDDFF', name:'Isla M.',      loc:'Auckland, NZ',         ago:'3 min ago'  },
  { flag:'\uD83C\uDDF3\uD83C\uDDFF', name:'Charlotte R.', loc:'Wellington, NZ',       ago:'7 min ago'  },
  { flag:'\uD83C\uDDF2\uD83C\uDDFD', name:'Sofia G.',     loc:'Mexico City, MX',      ago:'2 min ago'  },
  { flag:'\uD83C\uDDF2\uD83C\uDDFD', name:'Valentina R.', loc:'Guadalajara, MX',      ago:'5 min ago'  },
  { flag:'\uD83C\uDDEE\uD83C\uDDEA', name:'Aoife M.',     loc:'Dublin, Ireland',      ago:'Just now'   },
  { flag:'\uD83C\uDDEE\uD83C\uDDEA', name:'Niamh K.',     loc:'Cork, Ireland',        ago:'10 min ago' },
  { flag:'\uD83C\uDDF5\uD83C\uDDF7', name:'Isabella R.',  loc:'San Juan, Puerto Rico',ago:'3 min ago'  },
  { flag:'\uD83C\uDDF5\uD83C\uDDF7', name:'Sofia M.',     loc:'Bayam\u00F3n, PR',     ago:'8 min ago'  },
  { flag:'\uD83C\uDDF8\uD83C\uDDEA', name:'Astrid L.',    loc:'Stockholm, Sweden',    ago:'1 min ago'  },
  { flag:'\uD83C\uDDF8\uD83C\uDDEA', name:'Maja E.',      loc:'Gothenburg, Sweden',   ago:'6 min ago'  },
  { flag:'\uD83C\uDDEA\uD83C\uDDF8', name:'Luc\u00EDa M.',loc:'Madrid, Spain',        ago:'4 min ago'  },
  { flag:'\uD83C\uDDEA\uD83C\uDDF8', name:'Sof\u00EDa R.',loc:'Barcelona, Spain',     ago:'Just now'   },
];

let notifActive = false;

function startSaleNotifs() {
  if (notifActive) return;
  notifActive = true;

  const container = document.getElementById('sale-notif');
  if (!container) return;

  // Shuffle for randomness
  const list = NOTIF_DATA.slice().sort(function() { return Math.random() - 0.5; });
  let idx = 0;

  function showNext() {
    const d = list[idx % list.length];
    idx++;

    const card = document.createElement('div');
    card.className = 'sn-card';
    card.innerHTML =
      '<img src="img/produto.png" alt="The Baking Soda Protocol" class="sn-product">' +
      '<div class="sn-text">' +
        '<p class="sn-name">' + d.flag + ' ' + d.name + '</p>' +
        '<p class="sn-action">just purchased <strong>The Baking Soda Protocol</strong></p>' +
        '<p class="sn-meta">' + d.loc + ' \u00B7 ' + d.ago + '</p>' +
      '</div>' +
      '<button class="sn-close" aria-label="Dismiss">&times;</button>';

    card.querySelector('.sn-close').addEventListener('click', function() {
      card.classList.remove('show');
      card.classList.add('hide');
      setTimeout(function() { if (card.parentNode) card.parentNode.removeChild(card); }, 350);
    });

    container.appendChild(card);

    // Animate in (double rAF ensures transition triggers)
    requestAnimationFrame(function() {
      requestAnimationFrame(function() { card.classList.add('show'); });
    });

    // Hide after 5.5s
    setTimeout(function() {
      card.classList.remove('show');
      card.classList.add('hide');
      setTimeout(function() { if (card.parentNode) card.parentNode.removeChild(card); }, 450);
    }, 5500);

    // Next: 12–20s natural gap
    var gap = 12000 + Math.random() * 8000;
    setTimeout(showNext, gap);
  }

  // First notification after 5s (page just revealed)
  setTimeout(showNext, 5000);
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

/* ============================================================
   app.js — Logique principale YourBrand
   ============================================================ */

/* ── STATE ── */
var selectedPackId = null;
var appliedCoupon = null;
var obChecked = false;
var currentModal = null;
var editId = null;
var exitShown = false;
var epTimer = null;
var epSeconds = 0;
var activeConvId = null;
var cdTotal = 2 * 3600 + 47 * 60 + 33;
var currentUser = null;      /* 🔌 Utilisateur Supabase connecté */
var currentProfile = null;   /* 🔌 Profil (rôle, statut) */

/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async function () {
  renderAll();
  initStatsObserver();
  initExitPopup();
  updateMsgBadges();
  tickBanner();
  setInterval(tickBanner, 1000);
  buildAdminTabs();

  // Charge tout le contenu Supabase avant de vérifier la session,
  // pour éviter que checkExistingSession() affiche l'admin avec des données obsolètes.
  await Promise.all([
    loadPacksFromSupabase(),
    loadFeaturesFromSupabase(),
    loadReviewsFromSupabase(),
    loadFaqsFromSupabase(),
    loadStatsFromSupabase(),
    loadCouponsFromSupabase(),
    loadAllSettingsFromSupabase()
  ]);
  await checkExistingSession();

  // Create account checkbox
  var cb = document.getElementById('c-create-account');
  if (cb) cb.addEventListener('change', function () {
    document.getElementById('c-password-row').style.display = this.checked ? 'block' : 'none';
  });

  // Init legal pages content
  renderMentions();
  renderCGV();
});

/* 🔌 Charge les packs depuis Supabase (fallback sur data.js si vide/erreur) */
async function loadPacksFromSupabase() {
  try {
    var { data, error } = await sbGetPacks();
    if (!error && data && data.length > 0) {
      packs = data.map(function (p) {
        return { id: p.id, name: p.name, price: p.price, badge: p.badge || '', desc: p.description || '', features: p.features || [], status: p.status };
      });
      renderPacks();
    }
  } catch (e) { console.log('Packs Supabase non chargés, fallback sur data.js', e); }
}

async function loadFeaturesFromSupabase() {
  try {
    var { data, error } = await sbGetFeatures();
    if (!error && data && data.length > 0) {
      feats = data.map(function (f) { return { id: f.id, icon: f.icon || '', title: f.title, text: f.description || '' }; });
      renderFeats();
    }
  } catch (e) { console.log('Features non chargées', e); }
}

async function loadReviewsFromSupabase() {
  try {
    var { data, error } = await sbGetReviews();
    if (!error && data && data.length > 0) {
      reviews = data.map(function (r) { return { id: r.id, name: r.name, handle: r.handle || '', initials: r.initials || '', color: r.color || 'v', text: r.content }; });
      renderRevs();
    }
  } catch (e) { console.log('Reviews non chargées', e); }
}

async function loadFaqsFromSupabase() {
  try {
    var { data, error } = await sbGetFaqs();
    if (!error && data && data.length > 0) {
      faqs = data.map(function (f) { return { id: f.id, q: f.question, a: f.answer }; });
      renderFaqList();
      renderChatFaq();
    }
  } catch (e) { console.log('FAQs non chargées', e); }
}

async function loadStatsFromSupabase() {
  try {
    var { data, error } = await sbGetStats();
    if (!error && data && data.length > 0) {
      statsData = data.map(function (s) { return { id: s.id, icon: s.icon || '', value: s.value, suffix: s.suffix || '', label: s.label }; });
      renderStats();
    }
  } catch (e) { console.log('Stats non chargées', e); }
}

async function loadCouponsFromSupabase() {
  try {
    var { data, error } = await sbGetAllCoupons();
    if (!error && data && data.length > 0) {
      coupons = data.map(function (c) { return { id: c.id, code: c.code, value: c.value, type: c.type, uses: c.uses, status: c.status }; });
    }
  } catch (e) { console.log('Coupons non chargés', e); }
}

/* 🔌 Si l'utilisateur a déjà une session active (refresh de page) */
async function checkExistingSession() {
  var user = await sbGetCurrentUser();
  if (user) {
    currentUser = user;
    var { data: profile } = await sbGetProfile(user.id);
    currentProfile = profile;
    if (profile && profile.status !== 'blocked') {
      if (profile.role === 'admin') {
        showView('admin');
        renderAll();
        loadAllOrdersAdmin();
        loadAllMembresAdmin();
        updateMsgBadges();
      } else {
        showView('membre');
        loadMyOrders();
        loadMyMessages();
        updateMsgBadges();
      }
    }
  }
}

/* ─────────────────────────────────────────
   COUNTDOWN BANDEAU
───────────────────────────────────────── */
function tickBanner() {
  if (cdTotal <= 0) return;
  cdTotal--;
  var h = Math.floor(cdTotal / 3600);
  var m = Math.floor((cdTotal % 3600) / 60);
  var s = cdTotal % 60;
  function p(n) { return String(n).padStart(2, '0'); }
  var eh = document.getElementById('cd-h'), em = document.getElementById('cd-m'), es = document.getElementById('cd-s');
  if (eh) eh.textContent = p(h);
  if (em) em.textContent = p(m);
  if (es) es.textContent = p(s);
  // sync pack cards
  document.querySelectorAll('.mini-cd').forEach(function (el) {
    el.textContent = p(h) + ':' + p(m) + ':' + p(s);
  });
  // sync exit popup
  if (document.getElementById('ep-m') && !epTimer) {
    document.getElementById('ep-m').textContent = String(EP.cdMin).padStart(2, '0');
    document.getElementById('ep-s').textContent = '00';
  }
}

/* ─────────────────────────────────────────
   🔌 CHARGEMENT DONNÉES RÉELLES SUPABASE
───────────────────────────────────────── */

async function loadMyOrders() {
  if (!currentUser) return;
  try {
    var { data } = await sbGetMyOrders(currentUser.id);
    var tbody = document.querySelector('#mtab-orders table tbody');
    if (!tbody) return;
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="color:var(--muted);text-align:center;padding:20px">Aucune commande pour le moment</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(function (o) {
      var packName = o.packs ? o.packs.name : '—';
      var dateStr = new Date(o.created_at).toLocaleDateString('fr-FR');
      var statusBadge = o.status === 'paid' ? '<span class="bs ba">✓ Livré</span>' : o.status === 'refunded' ? '<span class="bs br">Remboursé</span>' : '<span class="bs bd">En attente</span>';
      return '<tr><td class="order-num">#' + o.id.substring(0, 8) + '</td><td>' + packName + '</td><td class="fw7">' + o.amount + '€</td><td>' + statusBadge + '</td><td class="muted">' + dateStr + '</td></tr>';
    }).join('');
  } catch (e) { console.log('Erreur chargement commandes', e); }
}

async function loadAllOrdersAdmin() {
  try {
    var { data } = await sbGetAllOrders();
    var tbody = document.querySelector('#atab-orders table tbody');
    if (!tbody || !data) return;
    if (data.length === 0) return; // garde les données demo si vide
    tbody.innerHTML = data.map(function (o) {
      var packName = o.packs ? o.packs.name : '—';
      var clientName = o.profiles ? o.profiles.full_name : o.full_name;
      var statusBadge = o.status === 'paid' ? '<span class="bs ba">✓</span>' : o.status === 'refunded' ? '<span class="bs br">Remb.</span>' : '<span class="bs bd">Attente</span>';
      return '<tr><td class="order-num">#' + o.id.substring(0, 8) + '</td><td>' + clientName + '</td><td>' + packName + '</td><td class="muted">' + (o.order_bump ? 'Oui' : '—') + '</td><td class="fw7">' + o.amount + '€</td><td>' + statusBadge + '</td></tr>';
    }).join('');
  } catch (e) { console.log('Erreur chargement commandes admin', e); }
}

async function loadAllMembresAdmin() {
  try {
    var { data } = await sbGetAllProfiles();
    if (data && data.length > 0) {
      membres = data.map(function (p) {
        return { id: p.id, name: p.full_name || p.email, email: p.email, pack: '—', date: new Date(p.created_at).toLocaleDateString('fr-FR'), status: p.status };
      });
    }
  } catch (e) { console.log('Erreur chargement membres', e); }
}

async function loadMyMessages() {
  if (!currentUser) return;
  try {
    var { data } = await sbGetMyMessages(currentUser.id);
    if (data && data.length > 0) {
      var conv = conversations.find(function (c) { return c.userId === currentUser.id; });
      if (!conv) {
        conv = { id: currentUser.id, userId: currentUser.id, membre: currentProfile ? currentProfile.full_name : 'Toi', initials: 'M', pack: '—', read: true, messages: [] };
        conversations.push(conv);
      }
      conv.messages = data.map(function (m) { return { from: m.sender, text: m.content, time: new Date(m.created_at).toLocaleString('fr-FR') }; });
    }
  } catch (e) { console.log('Erreur chargement messages', e); }
}

/* ─────────────────────────────────────────
   VIEWS
───────────────────────────────────────── */
function showView(v) {
  ['landing', 'cart', 'success', 'membre', 'admin', 'mentions', 'cgv'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle('active', id === v);
  });
  window.scrollTo(0, 0);
  if (v === 'cart') renderCart();
  if (v === 'landing') { exitShown = false; }
  if (v === 'mentions') renderMentions();
  if (v === 'cgv') renderCGV();
}

function scrollToId(id) {
  var el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function toggleMobileMenu() {
  var nav = document.getElementById('mobile-nav');
  if (nav) nav.classList.toggle('open');
}

/* ─────────────────────────────────────────
   AUTH
───────────────────────────────────────── */
function openLogin() { document.getElementById('login-modal').classList.add('open'); }
function closeLogin() { document.getElementById('login-modal').classList.remove('open'); }

function switchLTab(t) {
  document.querySelectorAll('.ltab').forEach(function (el, i) {
    el.classList.toggle('active', i === (t === 'membre' ? 0 : 1));
  });
  document.getElementById('lf-membre').classList.toggle('active', t === 'membre');
  document.getElementById('lf-admin').classList.toggle('active', t === 'admin');
}

async function loginMembre() {
  var email = document.getElementById('m-email').value.trim();
  var pass = document.getElementById('m-pass').value;
  if (!email || !pass) { alert('Remplis email et mot de passe'); return; }
  var { data, error } = await sbSignIn(email, pass);
  if (error) { alert('Erreur : ' + error.message); return; }
  currentUser = data.user;
  var { data: profile } = await sbGetProfile(data.user.id);
  if (profile && profile.status === 'blocked') {
    alert('Ton compte a été suspendu. Contacte le support.');
    await sbSignOut();
    return;
  }
  currentProfile = profile;
  closeLogin();
  showView('membre');
  loadMyOrders();
  loadMyMessages();
  updateMsgBadges();
}

async function loginAdmin() {
  var email = document.getElementById('a-email').value.trim();
  var pass = document.getElementById('a-pass').value;
  if (!email || !pass) { alert('Remplis email et mot de passe'); return; }
  var { data, error } = await sbSignIn(email, pass);
  if (error) { alert('Erreur : ' + error.message); return; }
  var { data: profile } = await sbGetProfile(data.user.id);
  if (!profile || profile.role !== 'admin') {
    alert("Ce compte n'a pas les droits administrateur.");
    await sbSignOut();
    return;
  }
  currentUser = data.user;
  currentProfile = profile;
  closeLogin();
  showView('admin');
  renderAll();
  loadAllOrdersAdmin();
  loadAllMembresAdmin();
  updateMsgBadges();
}

async function logoutUser() {
  await sbSignOut();
  currentUser = null;
  currentProfile = null;
  showView('landing');
}

/* ─────────────────────────────────────────
   TABS
───────────────────────────────────────── */
function setATab(name, el) {
  document.querySelectorAll('#admin .admin-tab').forEach(function (t) { t.classList.remove('active'); });
  var tab = document.getElementById('atab-' + name);
  if (tab) tab.classList.add('active');
  document.querySelectorAll('#admin .sl').forEach(function (l) { l.classList.remove('active'); });
  if (el) el.classList.add('active');
  if (name === 'packs') renderPacksTable();
  if (name === 'features') renderFeatTable();
  if (name === 'reviews') renderRevTable();
  if (name === 'faq') renderFaqTable();
  if (name === 'trust') renderTrustFields();
  if (name === 'coupons') renderCouponsTable();
  if (name === 'stats-admin') renderStatsTable();
  if (name === 'membres-admin') renderMembresTable(membres);
  if (name === 'messagerie-admin') renderAdminThreads();
}

function setMTab(name, el) {
  document.querySelectorAll('#membre .ptab').forEach(function (t) { t.classList.remove('active'); });
  var tab = document.getElementById('mtab-' + name);
  if (tab) tab.classList.add('active');
  document.querySelectorAll('#membre .sl').forEach(function (l) { l.classList.remove('active'); });
  if (el) el.classList.add('active');
  if (name === 'messages') { updateMsgBadges(); renderMembreThreads(); }
}

/* ─────────────────────────────────────────
   RENDER LANDING
───────────────────────────────────────── */
function renderAll() {
  renderPacks();
  renderFeats();
  renderRevs();
  renderFaqList();
  renderChatFaq();
  renderStats();
}

function renderPacks() {
  var g = document.getElementById('packs-grid');
  if (!g) return;
  g.innerHTML = packs.filter(function (p) { return p.status === 'active'; }).map(function (p) {
    var f = p.badge === 'Best-seller';
    return '<div class="pack-card' + (f ? ' featured' : '') + '">' +
      (p.badge ? '<div class="pack-badge-label">' + p.badge + '</div>' : '') +
      '<div class="pack-countdown">⏰ Offre limitée — <span class="mini-cd">02:47:33</span></div>' +
      '<p class="pack-name">' + p.name + '</p>' +
      '<p class="pack-desc">' + p.desc + '</p>' +
      '<div class="pack-price-row"><span class="cur">€</span><span class="amt">' + p.price + '</span></div>' +
      '<ul class="pack-feats">' + p.features.map(function (x) { return '<li><span class="chk">✓</span>' + x + '</li>'; }).join('') + '</ul>' +
      '<button class="btn-pack ' + (f ? 'f' : 'o') + '" onclick="addToCart(\'' + p.id + '\')">Commander ce pack →</button></div>';
  }).join('');
}

function renderFeats() {
  var g = document.getElementById('feat-grid');
  if (!g) return;
  g.innerHTML = feats.map(function (f, i) {
    return '<div class="feat-card"><div class="ficon ' + (i % 2 ? 'r' : 'v') + '">' + f.icon + '</div><p class="feat-title">' + f.title + '</p><p class="feat-text">' + f.text + '</p></div>';
  }).join('');
}

function renderRevs() {
  var g = document.getElementById('rev-grid');
  if (!g) return;
  g.innerHTML = reviews.map(function (r) {
    return '<div class="rev-card">' +
      '<div class="rev-stars">★★★★★</div>' +
      '<p class="rev-text">"' + r.text + '"</p>' +
      '<div class="rev-author">' +
        '<div class="rev-av" style="background:rgba(' + (r.color === 'v' ? '124,58,237' : '236,72,153') + ',0.15);color:' + (r.color === 'v' ? '#9D6FF5' : '#EC4899') + '">' + r.initials + '</div>' +
        '<div><p style="font-weight:600;font-size:11px">' + r.name + '</p><p style="color:var(--muted);font-size:10px">' + r.handle + '</p></div>' +
      '</div></div>';
  }).join('');
}

function renderFaqList() {
  var g = document.getElementById('faq-list');
  if (!g) return;
  g.innerHTML = faqs.map(function (f) {
    return '<div class="faq-item-lp">' +
      '<div class="faq-q-lp" onclick="toggleFaq(this)">' + f.q +
        '<span class="faq-toggle">+</span>' +
      '</div>' +
      '<p class="faq-a-lp">' + f.a + '</p>' +
    '</div>';
  }).join('');
}

function toggleFaq(el) {
  var a = el.nextElementSibling;
  var t = el.querySelector('.faq-toggle');
  var open = a.style.display === 'block';
  a.style.display = open ? 'none' : 'block';
  t.style.transform = open ? '' : 'rotate(45deg)';
  t.style.color = open ? '' : '#9D6FF5';
}

function renderChatFaq() {
  var g = document.getElementById('chat-faq-list');
  if (!g) return;
  g.innerHTML = faqs.map(function (f) {
    return '<div class="cfi">' +
      '<div class="cfq" onclick="this.parentElement.classList.toggle(\'open\')">' + f.q + '<span>+</span></div>' +
      '<div class="cfa">' + f.a + '</div>' +
    '</div>';
  }).join('');
}

/* ─────────────────────────────────────────
   STATS ANIMÉES
───────────────────────────────────────── */
function renderStats() {
  var g = document.getElementById('stats-inner');
  if (!g) return;
  g.innerHTML = statsData.map(function (s) {
    return '<div class="stat-item">' +
      '<div class="stat-num" data-target="' + s.value + '" data-suffix="' + s.suffix + '" data-int="' + (Number.isInteger(s.value) ? 1 : 0) + '">' + s.icon + ' 0' + s.suffix + '</div>' +
      '<div class="stat-label">' + s.label + '</div>' +
    '</div>';
  }).join('');
}

function animateStats() {
  document.querySelectorAll('.stat-num[data-target]').forEach(function (el) {
    var target = parseFloat(el.dataset.target);
    var suffix = el.dataset.suffix;
    var isInt = el.dataset.int === '1';
    var cur = 0, steps = 60, inc = target / steps;
    var iv = setInterval(function () {
      cur = Math.min(cur + inc, target);
      el.textContent = isInt ? Math.round(cur) + suffix : cur.toFixed(1) + suffix;
      if (cur >= target) clearInterval(iv);
    }, 25);
  });
}

function initStatsObserver() {
  var s = document.getElementById('stats-section');
  if (!s) return;
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) animateStats(); });
  }, { threshold: 0.3 });
  obs.observe(s);
}

/* ─────────────────────────────────────────
   CART
───────────────────────────────────────── */
function addToCart(id) {
  selectedPackId = id;
  appliedCoupon = null;
  obChecked = false;
  var ci = document.getElementById('coupon-input');
  if (ci) ci.value = '';
  var co = document.getElementById('coupon-ok');
  if (co) co.style.display = 'none';
  showView('cart');
}

function renderCart() {
  var ob = document.getElementById('order-bump');
  if (ob) ob.style.display = OB.active ? 'block' : 'none';
  var activePacks = packs.filter(function (p) { return p.status === 'active'; });
  if (!selectedPackId && activePacks.length > 0) selectedPackId = activePacks[0].id;
  var g = document.getElementById('summary-packs');
  if (!g) return;
  g.innerHTML = activePacks.map(function (p) {
    var sel = p.id === selectedPackId;
    return '<div class="summary-pack' + (sel ? ' selected' : '') + '" onclick="selectPack(\'' + p.id + '\')">' +
      '<div class="sp-radio"></div>' +
      '<div class="sp-icon">📦</div>' +
      '<div><p class="sp-name">' + p.name + '</p><p class="sp-desc">' + p.desc + '</p></div>' +
      '<span class="sp-price">' + p.price + '€</span>' +
    '</div>';
  }).join('');
  updateCartTotals();
}

function selectPack(id) { selectedPackId = id; renderCart(); }

function toggleOrderBump() {
  obChecked = !obChecked;
  var ob = document.getElementById('order-bump');
  if (ob) ob.classList.toggle('checked', obChecked);
  var obs = document.getElementById('ob-summary');
  if (obs) obs.style.display = obChecked ? 'block' : 'none';
  updateCartTotals();
}

function updateCartTotals() {
  var pack = packs.find(function (p) { return p.id === selectedPackId; });
  if (!pack) return;
  var subtotal = pack.price + (obChecked ? OB.amount : 0);
  var discount = 0;
  var dr = document.getElementById('discount-row');
  if (appliedCoupon) {
    var base = pack.price;
    discount = appliedCoupon.type === 'percent' ? Math.round(base * appliedCoupon.value) / 100 : Math.min(appliedCoupon.value, base);
    if (dr) dr.style.display = 'flex';
    var sd = document.getElementById('summary-discount');
    if (sd) sd.textContent = '-' + discount.toFixed(2) + '€';
  } else {
    if (dr) dr.style.display = 'none';
  }
  var total = (subtotal - discount).toFixed(2);
  var ss = document.getElementById('summary-subtotal');
  if (ss) ss.textContent = subtotal.toFixed(2) + '€';
  var st = document.getElementById('summary-total');
  if (st) st.textContent = total + '€';
}

async function applyCoupon() {
  var code = (document.getElementById('coupon-input').value || '').trim().toUpperCase();
  if (!code) return;

  // 🔌 Vérifie d'abord côté Supabase, sinon fallback sur les coupons locaux (data.js)
  var c = null;
  try {
    var { data } = await sbCheckCoupon(code);
    if (data) c = data;
  } catch (e) { /* fallback */ }
  if (!c) c = coupons.find(function (x) { return x.code === code && x.status === 'active'; });

  if (c) {
    appliedCoupon = c;
    var lbl = c.type === 'percent' ? '-' + c.value + '%' : '-' + c.value + '€';
    var dl = document.getElementById('coupon-discount-lbl');
    if (dl) dl.textContent = lbl;
    var co = document.getElementById('coupon-ok');
    if (co) co.style.display = 'block';
    updateCartTotals();
  } else {
    alert('Code invalide ou expiré');
  }
}

function selectPayMethod(el, type) {
  document.querySelectorAll('.pay-method').forEach(function (m) { m.classList.remove('active'); });
  el.classList.add('active');
  var cf = document.getElementById('card-fields');
  var op = document.getElementById('other-pay-msg');
  if (cf) cf.style.display = type === 'card' ? 'block' : 'none';
  if (op) op.style.display = type === 'card' ? 'none' : 'block';
}

function detectCard(input) {
  var v = input.value.replace(/\D/g, '');
  var icon = v.startsWith('4') ? '💙' : v.startsWith('5') || v.startsWith('2') ? '🔴' : v.startsWith('3') ? '🟡' : '💳';
  var bi = document.getElementById('card-brand-icon');
  if (bi) bi.textContent = icon;
  input.value = v.replace(/(.{4})/g, '$1 ').trim().substring(0, 19);
}

async function processCheckout() {
  /* 🔌 STRIPE : remplace ce bloc par stripe.confirmPayment() avant de créer la commande */
  var email = (document.getElementById('c-email').value || '').trim();
  var fname = (document.getElementById('c-fname').value || '').trim();
  if (!email || !fname) { alert('Remplis au moins ton prénom et ton email'); return; }
  var pack = packs.find(function (p) { return p.id === selectedPackId; });
  var subtotal = pack.price + (obChecked ? OB.amount : 0);
  var discount = appliedCoupon
    ? (appliedCoupon.type === 'percent' ? Math.round(pack.price * appliedCoupon.value) / 100 : Math.min(appliedCoupon.value, pack.price))
    : 0;
  var total = (subtotal - discount).toFixed(2);
  var orderNum = '#' + Math.floor(10000 + Math.random() * 90000);

  var userId = null;

  // Si l'utilisateur a coché "créer un compte"
  var createAccount = document.getElementById('c-create-account').checked;
  if (createAccount) {
    var pass = document.getElementById('c-pass').value;
    if (!pass || pass.length < 8) { alert('Le mot de passe doit faire au moins 8 caractères'); return; }
    var { data: signUpData, error: signUpError } = await sbSignUp(email, pass, fname);
    if (signUpError) { alert('Erreur de création de compte : ' + signUpError.message); return; }
    if (signUpData.user) userId = signUpData.user.id;
  }

  // 🔌 Enregistre la commande dans Supabase
  try {
    await sbCreateOrder({
      user_id: userId,
      pack_id: typeof pack.id === 'string' ? pack.id : null, // null si pack.id vient de data.js (pas un uuid)
      email: email,
      full_name: fname,
      amount: parseFloat(total),
      coupon_code: appliedCoupon ? appliedCoupon.code : null,
      order_bump: obChecked,
      status: 'pending' /* 🔌 passe à 'paid' une fois Stripe confirmé */
    });
  } catch (e) { console.log('Commande non enregistrée dans Supabase', e); }

  var details = document.getElementById('success-details');
  if (details) {
    details.innerHTML =
      '<div class="sd-row"><span class="sd-lbl">Commande</span><span style="font-weight:700;color:var(--vl)">' + orderNum + '</span></div>' +
      '<div class="sd-row"><span class="sd-lbl">Client</span><span style="font-weight:600">' + fname + '</span></div>' +
      '<div class="sd-row"><span class="sd-lbl">Email</span><span style="font-weight:600">' + email + '</span></div>' +
      '<div class="sd-row"><span class="sd-lbl">Pack</span><span style="font-weight:600">' + pack.name + '</span></div>' +
      (obChecked ? '<div class="sd-row"><span class="sd-lbl">Bonus</span><span style="font-weight:600;color:var(--rose)">' + OB.summaryName + '</span></div>' : '') +
      (appliedCoupon ? '<div class="sd-row"><span class="sd-lbl">Code promo</span><span style="font-weight:600;color:var(--green)">' + appliedCoupon.code + '</span></div>' : '') +
      '<div class="sd-row"><span class="sd-lbl">Total payé</span><span style="font-weight:800;font-size:14px">' + total + '€</span></div>';
  }
  showView('success');
}

/* ─────────────────────────────────────────
   EXIT POPUP
───────────────────────────────────────── */
function initExitPopup() {
  document.addEventListener('mouseleave', function (e) {
    if (e.clientY <= 0 && !exitShown && EP.active && document.getElementById('landing').classList.contains('active')) {
      exitShown = true;
      showExitPopup();
    }
  });
}

function showExitPopup() {
  document.getElementById('exit-popup').classList.add('open');
  epSeconds = EP.cdMin * 60;
  startEpTimer();
}

function closeExitPopup() {
  document.getElementById('exit-popup').classList.remove('open');
  if (epTimer) clearInterval(epTimer);
}

function exitPopupClaim() {
  closeExitPopup();
  var bestSeller = packs.find(function (p) { return p.badge === 'Best-seller'; });
  addToCart(bestSeller ? bestSeller.id : (packs[0] ? packs[0].id : null));
}

function startEpTimer() {
  if (epTimer) clearInterval(epTimer);
  epTimer = setInterval(function () {
    epSeconds--;
    if (epSeconds <= 0) { clearInterval(epTimer); return; }
    var m = Math.floor(epSeconds / 60), s = epSeconds % 60;
    function p(n) { return String(n).padStart(2, '0'); }
    var em = document.getElementById('ep-m'), es = document.getElementById('ep-s');
    if (em) em.textContent = p(m);
    if (es) es.textContent = p(s);
  }, 1000);
}

/* ─────────────────────────────────────────
   MESSAGERIE
───────────────────────────────────────── */
function updateMsgBadges() {
  var unread = conversations.filter(function (c) { return !c.read; }).length;
  var mb = document.getElementById('membre-msg-badge');
  var ab = document.getElementById('admin-msg-badge');
  var dc = document.getElementById('dash-msg-new');
  if (mb) { mb.style.display = unread > 0 ? 'inline' : 'none'; mb.textContent = unread; }
  if (ab) { ab.style.display = unread > 0 ? 'inline' : 'none'; ab.textContent = unread; }
  if (dc) dc.textContent = unread > 0 ? unread + ' non lu' + (unread > 1 ? 's' : '') : 'Tous lus';
}

function renderMembreThreads() {
  var g = document.getElementById('membre-threads');
  if (!g) return;
  g.innerHTML = conversations.map(function (c) {
    var last = c.messages[c.messages.length - 1];
    return '<div class="msg-thread' + (activeConvId === c.id ? ' active' : '') + '" onclick="openConvMembre(' + c.id + ')">' +
      '<div class="msg-thread-name"><span>Support</span><span class="msg-thread-time">' + last.time + '</span></div>' +
      '<div class="msg-thread-preview">' + last.text + '</div>' +
    '</div>';
  }).join('');
}

function renderAdminThreads() {
  var g = document.getElementById('admin-threads');
  if (!g) return;
  g.innerHTML = conversations.map(function (c) {
    var last = c.messages[c.messages.length - 1];
    return '<div class="msg-thread' + (activeConvId === c.id ? ' active' : '') + (!c.read ? ' style="background:rgba(236,72,153,0.05)"' : '') + '" onclick="openConvAdmin(' + c.id + ')">' +
      '<div class="msg-thread-name"><span style="display:flex;align-items:center;gap:5px">' + (!c.read ? '<span class="unread-dot"></span>' : '') + c.membre + '</span><span class="msg-thread-time">' + last.time + '</span></div>' +
      '<div class="msg-thread-preview">' + last.text + '</div>' +
      '<div style="margin-top:3px"><span class="bs bp">' + c.pack + '</span></div>' +
    '</div>';
  }).join('');
}

function renderMessages(conv) {
  return conv.messages.map(function (m) {
    var isAdmin = m.from === 'admin';
    return '<div style="display:flex;flex-direction:column;align-items:' + (isAdmin ? 'flex-end' : 'flex-start') + '">' +
      '<div class="msg-bubble ' + (isAdmin ? 'sent' : 'received') + '">' +
        '<div>' + m.text + '</div>' +
        '<div class="msg-bubble-time">' + m.time + '</div>' +
      '</div></div>';
  }).join('');
}

function openConvMembre(id) {
  activeConvId = id;
  renderMembreThreads();
  var conv = conversations.find(function (c) { return c.id === id; });
  var main = document.getElementById('membre-msg-main');
  if (!main) return;
  main.innerHTML =
    '<div class="msg-header"><div class="msg-avatar">S</div><div><p class="msg-name">Support YourBrand</p><p class="msg-pack">On répond en moins de 24h</p></div></div>' +
    '<div class="msg-body" id="conv-body-' + id + '">' + renderMessages(conv) + '</div>' +
    '<div class="msg-footer"><textarea class="msg-input" id="msg-input-' + id + '" placeholder="Écris ton message..."></textarea><button class="msg-send-btn" onclick="sendMsgMembre(' + id + ')">Envoyer →</button></div>';
  scrollMsgBottom('conv-body-' + id);
}

function openConvAdmin(id) {
  activeConvId = id;
  var conv = conversations.find(function (c) { return c.id === id; });
  conv.read = true;
  updateMsgBadges();
  renderAdminThreads();
  var main = document.getElementById('admin-msg-main');
  if (!main) return;
  main.innerHTML =
    '<div class="msg-header"><div class="msg-avatar" style="background:linear-gradient(135deg,rgba(124,58,237,0.4),rgba(236,72,153,0.3))">' + conv.initials + '</div><div><p class="msg-name">' + conv.membre + '</p><p class="msg-pack">Pack ' + conv.pack + '</p></div></div>' +
    '<div class="msg-body" id="admin-conv-body-' + id + '">' + renderMessages(conv) + '</div>' +
    '<div class="msg-footer"><textarea class="msg-input" id="admin-msg-input-' + id + '" placeholder="Ta réponse..."></textarea><button class="msg-send-btn" onclick="sendMsgAdmin(' + id + ')">Répondre →</button></div>';
  scrollMsgBottom('admin-conv-body-' + id);
}

function sendMsgMembre(id) {
  var input = document.getElementById('msg-input-' + id);
  if (!input || !input.value.trim()) return;
  var conv = conversations.find(function (c) { return c.id === id; });
  conv.messages.push({ from: 'membre', text: input.value.trim(), time: "À l'instant" });
  conv.read = false;
  input.value = '';
  var body = document.getElementById('conv-body-' + id);
  if (body) { body.innerHTML = renderMessages(conv); scrollMsgBottom('conv-body-' + id); }
  updateMsgBadges();
}

function sendMsgAdmin(id) {
  var input = document.getElementById('admin-msg-input-' + id);
  if (!input || !input.value.trim()) return;
  var conv = conversations.find(function (c) { return c.id === id; });
  conv.messages.push({ from: 'admin', text: input.value.trim(), time: "À l'instant" });
  conv.read = true;
  input.value = '';
  var body = document.getElementById('admin-conv-body-' + id);
  if (body) { body.innerHTML = renderMessages(conv); scrollMsgBottom('admin-conv-body-' + id); }
  updateMsgBadges();
  renderAdminThreads();
}

function scrollMsgBottom(id) {
  setTimeout(function () {
    var el = document.getElementById(id);
    if (el) el.scrollTop = el.scrollHeight;
  }, 50);
}

function showNewMsgForm() {
  activeConvId = null;
  renderMembreThreads();
  var main = document.getElementById('membre-msg-main');
  if (!main) return;
  main.innerHTML =
    '<div class="msg-header"><div class="msg-avatar">S</div><div><p class="msg-name">Nouveau message</p><p class="msg-pack">Le support te répondra dans les 24h</p></div></div>' +
    '<div class="new-msg-form">' +
      '<div><label class="fl">Sujet</label><input class="fi" id="new-msg-subject" placeholder="Ex: Question sur mon téléchargement" style="margin-bottom:10px"></div>' +
      '<textarea id="new-msg-body" placeholder="Décris ta demande..."></textarea>' +
      '<div style="text-align:right"><button class="msg-send-btn" onclick="submitNewMsg()">Envoyer le message →</button></div>' +
    '</div>';
}

function submitNewMsg() {
  var subj = (document.getElementById('new-msg-subject').value || '').trim();
  var body = (document.getElementById('new-msg-body').value || '').trim();
  if (!subj || !body) { alert('Remplis le sujet et le message'); return; }
  var newConv = { id: Date.now(), membre: "Karim B.", initials: "KB", pack: "Pro", read: false, messages: [{ from: 'membre', text: subj + ' — ' + body, time: "À l'instant" }] };
  conversations.unshift(newConv);
  updateMsgBadges();
  openConvMembre(newConv.id);
}

/* ─────────────────────────────────────────
   LÉGAL
───────────────────────────────────────── */
function renderMentions() {
  var c = document.getElementById('mentions-content');
  if (!c) return;
  var d = legalData, brand = S.brand;
  c.innerHTML =
    '<h1>Mentions légales</h1><p class="legal-updated">Dernière mise à jour : ' + new Date().toLocaleDateString('fr-FR') + '</p>' +
    '<h2>1. Éditeur du site</h2><p>Le site <strong>' + brand + '</strong> est édité par :<br>' + d.company + '<br>SIRET : ' + d.siret + '<br>Adresse : ' + d.address + '<br>Email : <a href="mailto:' + d.email + '">' + d.email + '</a><br>Directeur de la publication : ' + d.director + '</p>' +
    '<div class="legal-divider"></div><h2>2. Hébergement</h2><p>Ce site est hébergé par :<br>' + d.host + '</p>' +
    '<div class="legal-divider"></div><h2>3. Propriété intellectuelle</h2><p>L\'ensemble du contenu de ce site (textes, images, ebooks) est protégé par le droit d\'auteur. Toute reproduction, même partielle, est interdite sans autorisation écrite préalable.</p>' +
    '<div class="legal-divider"></div><h2>4. Données personnelles</h2><p>Les informations collectées (nom, email) sont utilisées uniquement pour l\'envoi de ta commande et les communications relatives à ton achat. Elles ne sont jamais vendues à des tiers.</p><p>Conformément au RGPD, tu peux demander l\'accès, la modification ou la suppression de tes données en écrivant à <a href="mailto:' + d.email + '">' + d.email + '</a>.</p>' +
    '<div class="legal-divider"></div><h2>5. Cookies</h2><p>Ce site utilise des cookies techniques nécessaires au bon fonctionnement. Aucun cookie publicitaire n\'est déposé sans ton consentement.</p>';
}

function renderCGV() {
  var c = document.getElementById('cgv-content');
  if (!c) return;
  var d = legalData, brand = S.brand;
  c.innerHTML =
    '<h1>Conditions Générales de Vente</h1><p class="legal-updated">Dernière mise à jour : ' + new Date().toLocaleDateString('fr-FR') + '</p>' +
    '<h2>1. Vendeur</h2><p>' + d.company + ' — ' + d.address + ' — ' + d.email + '<br>SIRET : ' + d.siret + '</p>' +
    '<div class="legal-divider"></div><h2>2. Produits</h2><p>' + brand + ' propose des produits numériques (ebooks, ressources digitales) téléchargeables. Ces produits sont des biens immatériels.</p>' +
    '<div class="legal-divider"></div><h2>3. Prix</h2><p>Les prix sont indiqués en euros TTC. ' + brand + ' se réserve le droit de modifier ses prix à tout moment, sans préavis. Le prix applicable est celui affiché au moment de la commande.</p>' +
    '<div class="legal-divider"></div><h2>4. Paiement</h2><p>Le paiement est sécurisé par ' + d.payment + '. La commande est validée dès confirmation du paiement.</p>' +
    '<div class="legal-divider"></div><h2>5. Livraison</h2><p>' + d.delivery + '</p>' +
    '<div class="legal-divider"></div><h2>6. Droit de rétractation</h2><p>Conformément à l\'article L.221-28 du Code de la consommation, le droit de rétractation de ' + d.retract + ' jours ne s\'applique pas aux contenus numériques dont l\'exécution a commencé avec l\'accord du consommateur.</p><p>Toutefois, ' + brand + ' propose une <strong>garantie satisfaction de ' + d.guarantee + ' jours</strong> : si tu n\'es pas satisfait(e), un remboursement complet est effectué sur simple demande par email, sans condition.</p>' +
    '<div class="legal-divider"></div><h2>7. Responsabilité</h2><p>' + d.liability + '</p>' +
    '<div class="legal-divider"></div><h2>8. Contact & réclamations</h2><p>Pour toute question ou réclamation : <a href="mailto:' + d.email + '">' + d.email + '</a><br>Toute réclamation sera traitée dans un délai de 48h ouvrées.</p>' +
    '<div class="legal-divider"></div><h2>9. Droit applicable</h2><p>Les présentes CGV sont soumises au droit français. En cas de litige, une solution amiable sera recherchée avant tout recours judiciaire.</p>';
}

/* ─────────────────────────────────────────
   ADMIN RENDERS
───────────────────────────────────────── */
function renderPacksTable() {
  var t = document.getElementById('packs-table');
  if (!t) return;
  t.innerHTML = packs.map(function (p) {
    return '<tr><td style="font-weight:600">' + p.name + '</td><td style="font-weight:700">' + p.price + '€</td><td>' + p.badge + '</td><td><span class="bs ' + (p.status === 'active' ? 'ba' : 'bd') + '">' + (p.status === 'active' ? '✓ Actif' : '⏸') + '</span></td><td><div class="abtns"><button class="bedit" onclick="openModal(\'pack\',\'' + p.id + '\')">Modif.</button><button class="bdel" onclick="delItem(\'pack\',\'' + p.id + '\')">Suppr.</button></div></td></tr>';
  }).join('');
}

function renderFeatTable() {
  var t = document.getElementById('feat-table');
  if (!t) return;
  t.innerHTML = feats.map(function (f) {
    return '<tr><td>' + f.icon + '</td><td style="font-weight:600">' + f.title + '</td><td style="color:var(--muted)">' + f.text + '</td><td><div class="abtns"><button class="bedit" onclick="openModal(\'feat\',\'' + f.id + '\')">Modif.</button><button class="bdel" onclick="delItem(\'feat\',\'' + f.id + '\')">Suppr.</button></div></td></tr>';
  }).join('');
}

function renderRevTable() {
  var t = document.getElementById('rev-table');
  if (!t) return;
  t.innerHTML = reviews.map(function (r) {
    return '<tr><td style="font-weight:600">' + r.name + '</td><td style="color:var(--muted)">' + r.handle + '</td><td style="color:var(--muted)">"' + r.text.substring(0, 40) + '..."</td><td><div class="abtns"><button class="bedit" onclick="openModal(\'review\',\'' + r.id + '\')">Modif.</button><button class="bdel" onclick="delItem(\'review\',\'' + r.id + '\')">Suppr.</button></div></td></tr>';
  }).join('');
}

function renderFaqTable() {
  var t = document.getElementById('faq-table');
  if (!t) return;
  t.innerHTML = faqs.map(function (f) {
    return '<tr><td style="font-weight:600;max-width:160px">' + f.q + '</td><td style="color:var(--muted)">' + f.a.substring(0, 40) + '...</td><td><div class="abtns"><button class="bedit" onclick="openModal(\'faq\',\'' + f.id + '\')">Modif.</button><button class="bdel" onclick="delItem(\'faq\',\'' + f.id + '\')">Suppr.</button></div></td></tr>';
  }).join('');
}

function renderCouponsTable() {
  var t = document.getElementById('coupons-table');
  if (!t) return;
  t.innerHTML = coupons.map(function (c) {
    return '<tr><td style="font-weight:700;color:var(--vl);font-family:monospace">' + c.code + '</td><td style="font-weight:700">' + c.value + (c.type === 'percent' ? '%' : '€') + '</td><td style="color:var(--muted)">' + (c.type === 'percent' ? 'Pourcentage' : 'Montant fixe') + '</td><td>' + c.uses + '</td><td><span class="bs ' + (c.status === 'active' ? 'ba' : 'bd') + '">' + (c.status === 'active' ? 'Actif' : 'Inactif') + '</span></td><td><div class="abtns"><button class="bedit" onclick="openModal(\'coupon\',\'' + c.id + '\')">Modif.</button><button class="bdel" onclick="delItem(\'coupon\',\'' + c.id + '\')">Suppr.</button></div></td></tr>';
  }).join('');
}

function renderStatsTable() {
  var t = document.getElementById('stats-table');
  if (!t) return;
  t.innerHTML = statsData.map(function (s) {
    return '<tr><td>' + s.icon + '</td><td style="font-weight:700">' + s.value + '</td><td>' + s.suffix + '</td><td style="color:var(--muted)">' + s.label + '</td><td><div class="abtns"><button class="bedit" onclick="openModal(\'stat\',\'' + s.id + '\')">Modif.</button><button class="bdel" onclick="delItem(\'stat\',\'' + s.id + '\')">Suppr.</button></div></td></tr>';
  }).join('');
}

function renderMembresTable(list) {
  var t = document.getElementById('membres-table');
  if (!t) return;
  t.innerHTML = list.map(function (m) {
    return '<tr><td style="font-weight:600">' + m.name + '</td><td style="color:var(--muted)">' + m.email + '</td><td><span class="bs bp">' + m.pack + '</span></td><td style="color:var(--muted)">' + m.date + '</td><td><span class="bs ' + (m.status === 'active' ? 'ba' : 'br') + '">' + (m.status === 'active' ? '✓ Actif' : '⛔ Bloqué') + '</span></td><td><div class="abtns"><button class="bblock" onclick="toggleBlock(' + m.id + ')">' + (m.status === 'active' ? 'Bloquer' : 'Débloquer') + '</button><button class="bdel" onclick="deleteMembre(' + m.id + ')">Suppr.</button></div></td></tr>';
  }).join('');
}

function filterMembres(q) {
  var f = membres.filter(function (m) {
    return m.name.toLowerCase().includes(q.toLowerCase()) || m.email.toLowerCase().includes(q.toLowerCase());
  });
  renderMembresTable(f);
}

function toggleBlock(id) {
  var m = membres.find(function (x) { return x.id === id; });
  if (!m) return;
  m.status = m.status === 'active' ? 'blocked' : 'active';
  renderMembresTable(membres);
}

function deleteMembre(id) {
  if (!confirm('Supprimer ce membre ?')) return;
  membres = membres.filter(function (x) { return x.id !== id; });
  renderMembresTable(membres);
}

function renderTrustFields() {
  var g = document.getElementById('trust-fields');
  if (!g) return;
  g.innerHTML = trustItems.map(function (t, i) {
    return '<div class="ef" style="display:flex;gap:9px;align-items:center"><span style="font-size:17px">' + trustIcons[i] + '</span><input class="fi" style="margin:0" data-ti="' + i + '" value="' + t + '"></div>';
  }).join('');
}

/* ─────────────────────────────────────────
   MODAL
───────────────────────────────────────── */
function openModal(type, id) {
  currentModal = type;
  editId = id || null;
  var titles = { pack: 'pack', feat: 'point fort', review: 'avis', faq: 'FAQ', coupon: 'code promo', stat: 'chiffre clé' };
  document.getElementById('modal-title').textContent = (id ? 'Modifier ' : 'Nouveau ') + titles[type];
  var body = '';
  if (type === 'pack') {
    var p = id ? packs.find(function (x) { return x.id === id; }) : {};
    body = '<div class="ef"><label class="fl">Nom</label><input class="fi" id="mf-name" value="' + (p.name || '') + '"></div>' +
      '<div class="fr2"><div class="ef"><label class="fl">Prix (€)</label><input class="fi" id="mf-price" type="number" value="' + (p.price || '') + '"></div><div class="ef"><label class="fl">Badge</label><input class="fi" id="mf-badge" value="' + (p.badge || '') + '" placeholder="Best-seller"></div></div>' +
      '<div class="ef"><label class="fl">Description</label><input class="fi" id="mf-desc" value="' + (p.desc || '') + '"></div>' +
      '<div class="ef"><label class="fl">Fonctionnalités (une par ligne)</label><textarea class="fi" id="mf-feats">' + (p.features ? p.features.join('\n') : '') + '</textarea></div>' +
      '<div class="ef"><label class="fl">Statut</label><select class="fi" id="mf-status"><option value="active"' + ((!p.status || p.status === 'active') ? ' selected' : '') + '>Actif</option><option value="draft"' + (p.status === 'draft' ? ' selected' : '') + '>Brouillon</option></select></div>';
  } else if (type === 'feat') {
    var f = id ? feats.find(function (x) { return x.id === id; }) : {};
    body = '<div class="fr2"><div class="ef"><label class="fl">Icône</label><input class="fi" id="mf-icon" value="' + (f.icon || '') + '" placeholder="📱"></div><div class="ef"><label class="fl">Titre</label><input class="fi" id="mf-title" value="' + (f.title || '') + '"></div></div><div class="ef"><label class="fl">Texte</label><textarea class="fi" id="mf-text">' + (f.text || '') + '</textarea></div>';
  } else if (type === 'review') {
    var r = id ? reviews.find(function (x) { return x.id === id; }) : {};
    body = '<div class="fr2"><div class="ef"><label class="fl">Nom</label><input class="fi" id="mf-rname" value="' + (r.name || '') + '"></div><div class="ef"><label class="fl">Handle</label><input class="fi" id="mf-handle" value="' + (r.handle || '') + '" placeholder="@pseudo"></div></div>' +
      '<div class="fr2"><div class="ef"><label class="fl">Initiales</label><input class="fi" id="mf-initials" value="' + (r.initials || '') + '" maxlength="2"></div><div class="ef"><label class="fl">Couleur</label><select class="fi" id="mf-color"><option value="v"' + (r.color === 'v' ? ' selected' : '') + '>Violet</option><option value="r"' + (r.color === 'r' ? ' selected' : '') + '>Rose</option></select></div></div>' +
      '<div class="ef"><label class="fl">Témoignage</label><textarea class="fi" id="mf-rtext">' + (r.text || '') + '</textarea></div>';
  } else if (type === 'faq') {
    var fq = id ? faqs.find(function (x) { return x.id === id; }) : {};
    body = '<div class="ef"><label class="fl">Question</label><input class="fi" id="mf-fq" value="' + (fq.q || '') + '"></div><div class="ef"><label class="fl">Réponse</label><textarea class="fi" id="mf-fa">' + (fq.a || '') + '</textarea></div>';
  } else if (type === 'coupon') {
    var c = id ? coupons.find(function (x) { return x.id === id; }) : {};
    body = '<div class="ef"><label class="fl">Code</label><input class="fi" id="mf-code" value="' + (c.code || '') + '" style="font-family:monospace;letter-spacing:.05em" placeholder="LANCEMENT50"></div>' +
      '<div class="fr2"><div class="ef"><label class="fl">Valeur</label><input class="fi" id="mf-cval" type="number" value="' + (c.value || '') + '"></div><div class="ef"><label class="fl">Type</label><select class="fi" id="mf-ctype"><option value="percent"' + ((!c.type || c.type === 'percent') ? ' selected' : '') + '>% Pourcentage</option><option value="fixed"' + (c.type === 'fixed' ? ' selected' : '') + '>€ Montant fixe</option></select></div></div>' +
      '<div class="ef"><label class="fl">Statut</label><select class="fi" id="mf-cstatus"><option value="active"' + ((!c.status || c.status === 'active') ? ' selected' : '') + '>Actif</option><option value="inactive"' + (c.status === 'inactive' ? ' selected' : '') + '>Inactif</option></select></div>';
  } else if (type === 'stat') {
    var s = id ? statsData.find(function (x) { return x.id === id; }) : {};
    body = '<div class="fr2"><div class="ef"><label class="fl">Icône</label><input class="fi" id="mf-sicon" value="' + (s.icon || '') + '" placeholder="📚"></div><div class="ef"><label class="fl">Valeur</label><input class="fi" id="mf-sval" type="number" value="' + (s.value || '') + '" step="0.1"></div></div>' +
      '<div class="fr2"><div class="ef"><label class="fl">Suffixe</label><input class="fi" id="mf-ssuffix" value="' + (s.suffix || '') + '" placeholder="+, %, /5..."></div><div class="ef"><label class="fl">Label</label><input class="fi" id="mf-slabel" value="' + (s.label || '') + '"></div></div>';
  }
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal').classList.add('open');
}

function closeModal() { document.getElementById('modal').classList.remove('open'); }

async function saveModal() {
  if (currentModal === 'pack') {
    var n = document.getElementById('mf-name').value.trim(), pr = parseInt(document.getElementById('mf-price').value) || 0;
    var b = document.getElementById('mf-badge').value.trim(), d = document.getElementById('mf-desc').value.trim();
    var f = document.getElementById('mf-feats').value.trim().split('\n').filter(Boolean), s = document.getElementById('mf-status').value;
    if (!n || !pr) return alert('Nom et prix requis');
    var packData = { name: n, price: pr, badge: b || null, description: d, features: f, status: s };
    try {
      if (editId) {
        var { error } = await sbUpdatePack(editId, packData);
        if (error) throw error;
        var i = packs.findIndex(function (x) { return x.id === editId; });
        packs[i] = { id: editId, name: n, price: pr, badge: b, desc: d, features: f, status: s };
      } else {
        var { data, error } = await sbCreatePack(packData);
        if (error) throw error;
        packs.push({ id: data.id, name: n, price: pr, badge: b, desc: d, features: f, status: s });
      }
    } catch (e) { alert('Erreur Supabase : ' + e.message); return; }
    renderPacks(); renderPacksTable();

  } else if (currentModal === 'feat') {
    var ic = document.getElementById('mf-icon').value.trim(), t = document.getElementById('mf-title').value.trim(), tx = document.getElementById('mf-text').value.trim();
    if (!t) return alert('Titre requis');
    var featData = { icon: ic, title: t, description: tx };
    try {
      if (editId) {
        var { error } = await sbUpdateFeature(editId, featData);
        if (error) throw error;
        var i = feats.findIndex(function (x) { return x.id === editId; });
        feats[i] = { id: editId, icon: ic, title: t, text: tx };
      } else {
        var { data, error } = await sbCreateFeature(featData);
        if (error) throw error;
        feats.push({ id: data.id, icon: ic, title: t, text: tx });
      }
    } catch (e) { alert('Erreur Supabase : ' + e.message); return; }
    renderFeats(); renderFeatTable();

  } else if (currentModal === 'review') {
    var nm = document.getElementById('mf-rname').value.trim(), h = document.getElementById('mf-handle').value.trim();
    var init = document.getElementById('mf-initials').value.trim(), co = document.getElementById('mf-color').value, tx = document.getElementById('mf-rtext').value.trim();
    if (!nm) return alert('Nom requis');
    var revData = { name: nm, handle: h, initials: init, color: co, content: tx };
    try {
      if (editId) {
        var { error } = await sbUpdateReview(editId, revData);
        if (error) throw error;
        var i = reviews.findIndex(function (x) { return x.id === editId; });
        reviews[i] = { id: editId, name: nm, handle: h, initials: init, color: co, text: tx };
      } else {
        var { data, error } = await sbCreateReview(revData);
        if (error) throw error;
        reviews.push({ id: data.id, name: nm, handle: h, initials: init, color: co, text: tx });
      }
    } catch (e) { alert('Erreur Supabase : ' + e.message); return; }
    renderRevs(); renderRevTable();

  } else if (currentModal === 'faq') {
    var q = document.getElementById('mf-fq').value.trim(), a = document.getElementById('mf-fa').value.trim();
    if (!q) return alert('Question requise');
    var faqData = { question: q, answer: a };
    try {
      if (editId) {
        var { error } = await sbUpdateFaq(editId, faqData);
        if (error) throw error;
        var i = faqs.findIndex(function (x) { return x.id === editId; });
        faqs[i] = { id: editId, q: q, a: a };
      } else {
        var { data, error } = await sbCreateFaq(faqData);
        if (error) throw error;
        faqs.push({ id: data.id, q: q, a: a });
      }
    } catch (e) { alert('Erreur Supabase : ' + e.message); return; }
    renderFaqList(); renderFaqTable(); renderChatFaq();

  } else if (currentModal === 'coupon') {
    var code = document.getElementById('mf-code').value.trim().toUpperCase(), val = parseFloat(document.getElementById('mf-cval').value) || 0;
    var ctype = document.getElementById('mf-ctype').value, cst = document.getElementById('mf-cstatus').value;
    if (!code || !val) return alert('Code et valeur requis');
    var couponData = { code: code, value: val, type: ctype, status: cst };
    try {
      if (editId) {
        var { error } = await sbUpdateCoupon(editId, couponData);
        if (error) throw error;
        var i = coupons.findIndex(function (x) { return x.id === editId; });
        coupons[i] = { id: editId, code: code, value: val, type: ctype, uses: coupons[i].uses, status: cst };
      } else {
        var { data, error } = await sbCreateCoupon(couponData);
        if (error) throw error;
        coupons.push({ id: data.id, code: code, value: val, type: ctype, uses: 0, status: cst });
      }
    } catch (e) { alert('Erreur Supabase : ' + e.message); return; }
    renderCouponsTable();

  } else if (currentModal === 'stat') {
    var sic = document.getElementById('mf-sicon').value.trim(), sv = parseFloat(document.getElementById('mf-sval').value) || 0;
    var ssfx = document.getElementById('mf-ssuffix').value.trim(), slbl = document.getElementById('mf-slabel').value.trim();
    if (!slbl) return alert('Label requis');
    var statData = { icon: sic, value: sv, suffix: ssfx, label: slbl };
    try {
      if (editId) {
        var { error } = await sbUpdateStat(editId, statData);
        if (error) throw error;
        var i = statsData.findIndex(function (x) { return x.id === editId; });
        statsData[i] = { id: editId, icon: sic, value: sv, suffix: ssfx, label: slbl };
      } else {
        var { data, error } = await sbCreateStat(statData);
        if (error) throw error;
        statsData.push({ id: data.id, icon: sic, value: sv, suffix: ssfx, label: slbl });
      }
    } catch (e) { alert('Erreur Supabase : ' + e.message); return; }
    renderStats(); renderStatsTable();
  }
  closeModal();
}

async function delItem(type, id) {
  if (!confirm('Supprimer ?')) return;
  try {
    if (type === 'pack') {
      var { error } = await sbDeletePack(id); if (error) throw error;
      packs = packs.filter(function (x) { return x.id !== id; }); renderPacks(); renderPacksTable();
    } else if (type === 'feat') {
      var { error } = await sbDeleteFeature(id); if (error) throw error;
      feats = feats.filter(function (x) { return x.id !== id; }); renderFeats(); renderFeatTable();
    } else if (type === 'review') {
      var { error } = await sbDeleteReview(id); if (error) throw error;
      reviews = reviews.filter(function (x) { return x.id !== id; }); renderRevs(); renderRevTable();
    } else if (type === 'faq') {
      var { error } = await sbDeleteFaq(id); if (error) throw error;
      faqs = faqs.filter(function (x) { return x.id !== id; }); renderFaqList(); renderFaqTable(); renderChatFaq();
    } else if (type === 'coupon') {
      var { error } = await sbDeleteCoupon(id); if (error) throw error;
      coupons = coupons.filter(function (x) { return x.id !== id; }); renderCouponsTable();
    } else if (type === 'stat') {
      var { error } = await sbDeleteStat(id); if (error) throw error;
      statsData = statsData.filter(function (x) { return x.id !== id; }); renderStats(); renderStatsTable();
    }
  } catch (e) { alert('Erreur Supabase : ' + e.message); }
}

/* ─────────────────────────────────────────
   ADMIN SAVE FUNCTIONS
───────────────────────────────────────── */
/* ─────────────────────────────────────────
   🔌 RÉGLAGES GLOBAUX (site_settings)
   Sauvegarde/charge EP, OB, S, trustItems, legalData, MAINT en un seul JSON
───────────────────────────────────────── */
async function saveAllSettingsToSupabase() {
  var payload = { EP: EP, OB: OB, S: S, trustItems: trustItems, legalData: legalData, MAINT: MAINT };
  try {
    var { error } = await sbSaveSettings(payload);
    if (error) console.log('Erreur sauvegarde réglages', error);
  } catch (e) { console.log('Erreur sauvegarde réglages', e); }
}

async function loadAllSettingsFromSupabase() {
  try {
    var { data } = await sbGetSettings();
    if (data && Object.keys(data).length > 0) {
      if (data.EP) Object.assign(EP, data.EP);
      if (data.OB) Object.assign(OB, data.OB);
      if (data.S) Object.assign(S, data.S);
      if (data.trustItems) trustItems = data.trustItems;
      if (data.legalData) Object.assign(legalData, data.legalData);
      if (data.MAINT) Object.assign(MAINT, data.MAINT);
      applyLoadedSettingsToDOM();
    }
  } catch (e) { console.log('Réglages non chargés depuis Supabase', e); }
}

/* Applique les réglages chargés sur les éléments visibles de la page */
function applyLoadedSettingsToDOM() {
  // Bandeau & hero
  st('banner-text', '');
  var bt = document.getElementById('banner-text'); if (bt && S.bannerText) bt.textContent = S.bannerText;
  st('hero-badge', S.heroBadge || document.getElementById('hero-badge').textContent);
  if (S.heroSub) st('hero-sub', S.heroSub);
  if (S.heroCta1) st('hero-cta1', S.heroCta1);
  if (S.heroCta2) st('hero-cta2', S.heroCta2);
  if (S.ctaTitle) st('cta-title', S.ctaTitle);
  if (S.ctaSub) st('cta-sub', S.ctaSub);

  // Réassurance
  ['trust1', 'trust2', 'trust3', 'trust4'].forEach(function (id, i) {
    if (trustItems[i]) st(id, trustItems[i]);
  });

  // Marque / footer
  document.getElementById('nav-brand').textContent = S.brand;
  document.getElementById('lm-brand').textContent = S.brand;
  document.querySelectorAll('.nb').forEach(function (el) { el.textContent = S.brand; });
  var cb2 = document.getElementById('cart-brand'); if (cb2) cb2.textContent = S.brand;
  st('footer-copy', S.footer);
  var fc = document.getElementById('footer-contact'); if (fc) fc.href = 'mailto:' + S.contactEmail;

  // Widget chat
  st('cw-title', S.cwTitle || document.getElementById('cw-title').textContent);
  st('cw-sub', S.cwSub || document.getElementById('cw-sub').textContent);
  var ccb = document.getElementById('chat-contact-btn');
  if (ccb && S.cwBtnTxt) { ccb.textContent = S.cwBtnTxt; ccb.href = 'mailto:' + S.contactEmail; }

  // Order bump (texte affiché sur le panier)
  st('ob-badge', OB.badge); st('ob-title', OB.title); st('ob-desc', OB.desc);
  st('ob-price', OB.price); st('ob-orig', OB.orig);
  st('ob-summary-name', OB.summaryName); st('ob-summary-price', OB.summaryPrice);
  var obEl = document.getElementById('order-bump');
  if (obEl) obEl.style.display = OB.active ? 'block' : 'none';

  // Pop-up de sortie (sera relu directement via EP.active à l'ouverture)

  // Mode maintenance
  document.getElementById('maintenance-view').classList.toggle('active', MAINT.active);
  st('maint-icon', MAINT.icon); st('maint-title', MAINT.title); st('maint-sub', MAINT.sub); st('maint-badge-txt', MAINT.badgeTxt);

  // Pages légales
  renderMentions();
  renderCGV();
}

function st(id, val) { var el = document.getElementById(id); if (el && val !== undefined && val !== '') el.textContent = val; }

async function saveTextes() {
  S.bannerText = document.getElementById('et-banner').value;
  st('banner-text', S.bannerText);
  S.heroBadge = document.getElementById('et-badge').value;
  st('hero-badge', S.heroBadge);
  S.heroSub = document.getElementById('et-hero-sub').value;
  st('hero-sub', S.heroSub);
  S.heroCta1 = document.getElementById('et-cta1').value;
  st('hero-cta1', S.heroCta1);
  S.heroCta2 = document.getElementById('et-cta2').value;
  st('hero-cta2', S.heroCta2);
  S.ctaTitle = document.getElementById('et-cta-title').value;
  st('cta-title', S.ctaTitle);
  S.ctaSub = document.getElementById('et-cta-sub').value;
  st('cta-sub', S.ctaSub);
  await saveAllSettingsToSupabase();
  alert('Textes landing mis à jour ✓');
}

async function saveCartTexts() {
  S.cartStep = document.getElementById('ct-step').value; st('cart-step-lbl', S.cartStep);
  S.cartTitle = document.getElementById('ct-title').value; st('cart-page-title', S.cartTitle);
  S.cartBtnTxt = document.getElementById('ct-btn-txt').value; st('cart-btn-txt', S.cartBtnTxt);
  S.cartGuarantee = document.getElementById('ct-guarantee').value; st('cart-guarantee-txt', S.cartGuarantee);
  S.successTitle = document.getElementById('ct-success-title').value; st('success-title', S.successTitle);
  await saveAllSettingsToSupabase();
  alert('Textes panier mis à jour ✓');
}

async function saveTrust() {
  document.querySelectorAll('[data-ti]').forEach(function (inp) { trustItems[parseInt(inp.dataset.ti)] = inp.value; });
  ['trust1', 'trust2', 'trust3', 'trust4'].forEach(function (id, i) { st(id, trustItems[i]); });
  await saveAllSettingsToSupabase();
  alert('Réassurance mise à jour ✓');
}

async function saveExitPopup() {
  EP.active = document.getElementById('ep-active').checked;
  EP.emoji = document.getElementById('ep-emoji-input').value;
  EP.title = document.getElementById('ep-title-input').value;
  EP.sub = document.getElementById('ep-sub-input').value;
  EP.price = document.getElementById('ep-price-input').value;
  EP.orig = document.getElementById('ep-orig-input').value;
  EP.offerDesc = document.getElementById('ep-offer-desc-input').value;
  EP.btnTxt = document.getElementById('ep-btn-input').value;
  EP.dismiss = document.getElementById('ep-dismiss-input').value;
  EP.cdMin = parseInt(document.getElementById('ep-cd-min').value) || 10;
  st('ep-emoji', EP.emoji); st('ep-title', EP.title); st('ep-sub', EP.sub);
  st('ep-price', EP.price); st('ep-orig', EP.orig); st('ep-offer-desc', EP.offerDesc);
  st('ep-btn-txt', EP.btnTxt); st('ep-dismiss', EP.dismiss); st('ep-badge', EP.badge);
  exitShown = false;
  await saveAllSettingsToSupabase();
  alert('Pop-up de sortie mis à jour ✓');
}

async function saveOrderBump() {
  OB.active = document.getElementById('ob-active').checked;
  OB.badge = document.getElementById('ob-badge-input').value;
  OB.title = document.getElementById('ob-title-input').value;
  OB.desc = document.getElementById('ob-desc-input').value;
  OB.price = document.getElementById('ob-price-input').value;
  OB.orig = document.getElementById('ob-orig-input').value;
  OB.amount = parseFloat(document.getElementById('ob-amount').value) || 0;
  OB.summaryName = document.getElementById('ob-summary-name-input').value;
  OB.summaryPrice = document.getElementById('ob-summary-price-input').value;
  st('ob-badge', OB.badge); st('ob-title', OB.title); st('ob-desc', OB.desc);
  st('ob-price', OB.price); st('ob-orig', OB.orig);
  st('ob-summary-name', OB.summaryName); st('ob-summary-price', OB.summaryPrice);
  var ob = document.getElementById('order-bump');
  if (ob) ob.style.display = OB.active ? 'block' : 'none';
  await saveAllSettingsToSupabase();
  alert('Order bump mis à jour ✓');
}

async function saveChatWidget() {
  S.cwTitle = document.getElementById('cw-title-input').value; st('cw-title', S.cwTitle);
  S.cwSub = document.getElementById('cw-sub-input').value; st('cw-sub', S.cwSub);
  S.contactEmail = document.getElementById('cw-email').value;
  S.cwBtnTxt = document.getElementById('cw-btn-txt').value;
  var btn = document.getElementById('chat-contact-btn');
  if (btn) { btn.textContent = S.cwBtnTxt; btn.href = 'mailto:' + S.contactEmail; }
  await saveAllSettingsToSupabase();
  alert('Widget chat mis à jour ✓');
}

function toggleMaintenance(cb) {
  MAINT.active = cb.checked;
  document.getElementById('maintenance-view').classList.toggle('active', MAINT.active);
}

async function saveMaintenance() {
  MAINT.icon = document.getElementById('maint-icon-input').value; st('maint-icon', MAINT.icon);
  MAINT.title = document.getElementById('maint-title-input').value; st('maint-title', MAINT.title);
  MAINT.sub = document.getElementById('maint-sub-input').value; st('maint-sub', MAINT.sub);
  MAINT.badgeTxt = document.getElementById('maint-badge-input').value; st('maint-badge-txt', MAINT.badgeTxt);
  await saveAllSettingsToSupabase();
  alert('Page maintenance mise à jour ✓');
}

async function saveLegal() {
  legalData.company = document.getElementById('legal-company').value;
  legalData.siret = document.getElementById('legal-siret').value;
  legalData.address = document.getElementById('legal-address').value;
  legalData.email = document.getElementById('legal-email').value;
  legalData.host = document.getElementById('legal-host').value;
  legalData.director = document.getElementById('legal-director').value;
  legalData.retract = parseInt(document.getElementById('legal-retract').value) || 14;
  legalData.guarantee = parseInt(document.getElementById('legal-guarantee').value) || 365;
  legalData.payment = document.getElementById('legal-payment').value;
  legalData.delivery = document.getElementById('legal-delivery').value;
  legalData.liability = document.getElementById('legal-liability').value;
  renderMentions();
  renderCGV();
  await saveAllSettingsToSupabase();
  alert('Pages légales générées et enregistrées ✓');
}

async function saveSettings() {
  S.brand = document.getElementById('s-brand').value;
  S.footer = document.getElementById('s-footer').value;
  S.contactEmail = document.getElementById('s-email').value;
  S.stripePublicKey = document.getElementById('s-stripe').value;
  // Update brand everywhere
  document.getElementById('nav-brand').textContent = S.brand;
  document.getElementById('lm-brand').textContent = S.brand;
  document.querySelectorAll('.nb').forEach(function (el) { el.textContent = S.brand; });
  var cb2 = document.getElementById('cart-brand'); if (cb2) cb2.textContent = S.brand;
  st('footer-copy', S.footer);
  var fc = document.getElementById('footer-contact'); if (fc) fc.href = 'mailto:' + S.contactEmail;
  await saveAllSettingsToSupabase();
  alert('Paramètres enregistrés ✓');
}

/* ─────────────────────────────────────────
   CHAT
───────────────────────────────────────── */
function toggleChat() { document.getElementById('chat-box').classList.toggle('open'); }

/* ─────────────────────────────────────────
   BUILD ADMIN TABS (injected dynamically)
───────────────────────────────────────── */
function buildAdminTabs() {
  var main = document.getElementById('admin-main');
  if (!main) return;
  main.innerHTML =
  /* DASHBOARD */
  '<div id="atab-dashboard" class="admin-tab active">' +
    '<p class="ptitle" style="margin-bottom:2px">Tableau de bord</p><p class="psub">Vue d\'ensemble</p>' +
    '<div class="stats-row">' +
      '<div class="stat-card"><p class="stat-lbl">Ventes</p><p class="stat-val grad">2 418</p><p class="stat-d">↑ +124</p></div>' +
      '<div class="stat-card"><p class="stat-lbl">Revenus</p><p class="stat-val grad">48 360€</p><p class="stat-d">↑ +3 240€</p></div>' +
      '<div class="stat-card"><p class="stat-lbl">Membres</p><p class="stat-val">312</p><p class="stat-d">↑ +18</p></div>' +
      '<div class="stat-card"><p class="stat-lbl">Messages</p><p class="stat-val" id="dash-msg-count">3</p><p class="stat-d" id="dash-msg-new" style="color:var(--rose)">1 non lu</p></div>' +
    '</div>' +
    '<div class="adsec"><div class="ash"><span class="ast">Dernières commandes</span></div>' +
    '<table><thead><tr><th>N°</th><th>Client</th><th>Pack</th><th>Montant</th><th>Statut</th></tr></thead><tbody>' +
      '<tr><td class="order-num">#00312</td><td>Léa M.</td><td>VIP</td><td class="fw7">97€</td><td><span class="bs ba">✓</span></td></tr>' +
      '<tr><td class="order-num">#00311</td><td>Karim B.</td><td>Pro</td><td class="fw7">47€</td><td><span class="bs ba">✓</span></td></tr>' +
    '</tbody></table></div>' +
  '</div>' +

  /* PACKS */
  '<div id="atab-packs" class="admin-tab">' +
    '<p class="ptitle" style="margin-bottom:2px">Offres & prix</p>' +
    '<div style="margin-bottom:10px;text-align:right"><button class="btn-add" onclick="openModal(\'pack\')">+ Nouveau pack</button></div>' +
    '<div class="adsec"><table><thead><tr><th>Nom</th><th>Prix</th><th>Badge</th><th>Statut</th><th>Actions</th></tr></thead><tbody id="packs-table"></tbody></table></div>' +
  '</div>' +

  /* TEXTES LANDING */
  '<div id="atab-textes" class="admin-tab">' +
    '<p class="ptitle" style="margin-bottom:2px">Textes landing</p>' +
    '<div class="adsec"><div class="edit-section">' +
      '<div class="ef"><label class="fl">Bandeau</label><input class="fi" id="et-banner" value="🔥 Offre de lancement — 50% de réduction"></div>' +
      '<div class="ef"><label class="fl">Badge pill hero</label><input class="fi" id="et-badge" value="Nouveau · Édition 2025"></div>' +
      '<div class="ef"><label class="fl">Sous-titre hero</label><textarea class="fi" id="et-hero-sub">Des stratégies concrètes, directement applicables.</textarea></div>' +
      '<div class="fr2"><div class="ef"><label class="fl">Bouton principal</label><input class="fi" id="et-cta1" value="Voir les offres →"></div><div class="ef"><label class="fl">Bouton secondaire</label><input class="fi" id="et-cta2" value="Découvrir le contenu"></div></div>' +
      '<div class="ef"><label class="fl">Titre CTA final</label><input class="fi" id="et-cta-title" value="Rejoins les 2 400+ lecteurs"></div>' +
      '<div class="ef"><label class="fl">Sous-titre CTA</label><input class="fi" id="et-cta-sub" value="Un achat unique. Des mises à jour à vie."></div>' +
      '<div class="factions"><button class="bsave" onclick="saveTextes()">Enregistrer</button></div>' +
    '</div></div>' +
  '</div>' +

  /* TEXTES PANIER */
  '<div id="atab-cart-texts" class="admin-tab">' +
    '<p class="ptitle" style="margin-bottom:2px">Textes panier</p>' +
    '<div class="adsec"><div class="edit-section">' +
      '<div class="fr2"><div class="ef"><label class="fl">Label étape</label><input class="fi" id="ct-step" value="Étape 1 sur 2"></div><div class="ef"><label class="fl">Titre page</label><input class="fi" id="ct-title" value="Finalise ta commande"></div></div>' +
      '<div class="ef"><label class="fl">Texte bouton paiement</label><input class="fi" id="ct-btn-txt" value="Payer maintenant →"></div>' +
      '<div class="ef"><label class="fl">Texte garantie</label><input class="fi" id="ct-guarantee" value="Satisfait ou remboursé 365 jours, sans conditions."></div>' +
      '<div class="ef"><label class="fl">Titre page succès</label><input class="fi" id="ct-success-title" value="Paiement confirmé !"></div>' +
      '<div class="factions"><button class="bsave" onclick="saveCartTexts()">Enregistrer</button></div>' +
    '</div></div>' +
  '</div>' +

  /* CHIFFRES CLÉS */
  '<div id="atab-stats-admin" class="admin-tab">' +
    '<p class="ptitle" style="margin-bottom:2px">Chiffres clés</p>' +
    '<div style="margin-bottom:10px;text-align:right"><button class="btn-add" onclick="openModal(\'stat\')">+ Ajouter</button></div>' +
    '<div class="adsec"><table><thead><tr><th>Icône</th><th>Valeur</th><th>Suffixe</th><th>Label</th><th>Actions</th></tr></thead><tbody id="stats-table"></tbody></table></div>' +
  '</div>' +

  /* EXIT POPUP */
  '<div id="atab-exit-admin" class="admin-tab">' +
    '<p class="ptitle" style="margin-bottom:2px">Pop-up de sortie</p>' +
    '<div class="adsec"><div class="edit-section">' +
      '<div class="toggle-row"><div><p class="toggle-lbl">Activer le pop-up</p></div><label class="toggle"><input type="checkbox" id="ep-active" checked><span class="toggle-slider"></span></label></div>' +
      '<div style="padding-top:12px">' +
        '<div class="fr2"><div class="ef"><label class="fl">Emoji</label><input class="fi" id="ep-emoji-input" value="🎁"></div><div class="ef"><label class="fl">Badge</label><input class="fi" id="ep-badge-input" value="Offre exclusive"></div></div>' +
        '<div class="ef"><label class="fl">Titre</label><input class="fi" id="ep-title-input" value="Attends ! Une offre rien que pour toi"></div>' +
        '<div class="ef"><label class="fl">Sous-titre</label><textarea class="fi" id="ep-sub-input">Voici une réduction exclusive, valable uniquement maintenant.</textarea></div>' +
        '<div class="fr2"><div class="ef"><label class="fl">Prix affiché</label><input class="fi" id="ep-price-input" value="23€"></div><div class="ef"><label class="fl">Prix barré</label><input class="fi" id="ep-orig-input" value="au lieu de 47€"></div></div>' +
        '<div class="ef"><label class="fl">Description offre</label><input class="fi" id="ep-offer-desc-input" value="Pack Pro à -50%"></div>' +
        '<div class="ef"><label class="fl">Texte bouton</label><input class="fi" id="ep-btn-input" value="Je veux mon offre →"></div>' +
        '<div class="ef"><label class="fl">Texte de refus</label><input class="fi" id="ep-dismiss-input" value="Non merci, je préfère payer plein tarif"></div>' +
        '<div class="ef"><label class="fl">Durée compte à rebours (min)</label><input class="fi" id="ep-cd-min" type="number" value="10" style="max-width:80px"></div>' +
        '<div class="factions"><button class="bsave" onclick="saveExitPopup()">Enregistrer</button></div>' +
      '</div>' +
    '</div></div>' +
  '</div>' +

  /* ORDER BUMP */
  '<div id="atab-orderbump-admin" class="admin-tab">' +
    '<p class="ptitle" style="margin-bottom:2px">Order bump</p>' +
    '<div class="adsec"><div class="edit-section">' +
      '<div class="toggle-row"><div><p class="toggle-lbl">Activer l\'order bump</p></div><label class="toggle"><input type="checkbox" id="ob-active" checked><span class="toggle-slider"></span></label></div>' +
      '<div style="padding-top:12px">' +
        '<div class="fr2"><div class="ef"><label class="fl">Badge</label><input class="fi" id="ob-badge-input" value="Offre spéciale"></div><div class="ef"><label class="fl">Titre</label><input class="fi" id="ob-title-input" value="Ajoute une session coaching"></div></div>' +
        '<div class="ef"><label class="fl">Description</label><textarea class="fi" id="ob-desc-input">1h en visio pour aller encore plus loin. Places limitées.</textarea></div>' +
        '<div class="fr2"><div class="ef"><label class="fl">Prix à ajouter</label><input class="fi" id="ob-price-input" value="+20€"></div><div class="ef"><label class="fl">Valeur originale</label><input class="fi" id="ob-orig-input" value="valeur 80€"></div></div>' +
        '<div class="ef"><label class="fl">Nom dans le récap</label><input class="fi" id="ob-summary-name-input" value="Session coaching"></div>' +
        '<div class="ef"><label class="fl">Prix récap</label><input class="fi" id="ob-summary-price-input" value="+20€"></div>' +
        '<div class="ef"><label class="fl">Montant à ajouter au total (€)</label><input class="fi" id="ob-amount" type="number" value="20" style="max-width:80px"></div>' +
        '<div class="factions"><button class="bsave" onclick="saveOrderBump()">Enregistrer</button></div>' +
      '</div>' +
    '</div></div>' +
  '</div>' +

  /* RÉASSURANCE */
  '<div id="atab-trust" class="admin-tab">' +
    '<p class="ptitle" style="margin-bottom:2px">Bande de réassurance</p>' +
    '<div class="adsec"><div class="edit-section"><div id="trust-fields"></div><div class="factions"><button class="bsave" onclick="saveTrust()">Enregistrer</button></div></div></div>' +
  '</div>' +

  /* POINTS FORTS */
  '<div id="atab-features" class="admin-tab">' +
    '<p class="ptitle" style="margin-bottom:2px">Points forts</p>' +
    '<div style="margin-bottom:10px;text-align:right"><button class="btn-add" onclick="openModal(\'feat\')">+ Ajouter</button></div>' +
    '<div class="adsec"><table><thead><tr><th>Icône</th><th>Titre</th><th>Texte</th><th>Actions</th></tr></thead><tbody id="feat-table"></tbody></table></div>' +
  '</div>' +

  /* AVIS */
  '<div id="atab-reviews" class="admin-tab">' +
    '<p class="ptitle" style="margin-bottom:2px">Avis clients</p>' +
    '<div style="margin-bottom:10px;text-align:right"><button class="btn-add" onclick="openModal(\'review\')">+ Ajouter</button></div>' +
    '<div class="adsec"><table><thead><tr><th>Nom</th><th>Handle</th><th>Texte</th><th>Actions</th></tr></thead><tbody id="rev-table"></tbody></table></div>' +
  '</div>' +

  /* FAQ */
  '<div id="atab-faq" class="admin-tab">' +
    '<p class="ptitle" style="margin-bottom:2px">FAQ</p>' +
    '<div style="margin-bottom:10px;text-align:right"><button class="btn-add" onclick="openModal(\'faq\')">+ Ajouter</button></div>' +
    '<div class="adsec"><table><thead><tr><th>Question</th><th>Réponse</th><th>Actions</th></tr></thead><tbody id="faq-table"></tbody></table></div>' +
  '</div>' +

  /* COUPONS */
  '<div id="atab-coupons" class="admin-tab">' +
    '<p class="ptitle" style="margin-bottom:2px">Codes promo</p>' +
    '<div style="margin-bottom:10px;text-align:right"><button class="btn-add" onclick="openModal(\'coupon\')">+ Nouveau</button></div>' +
    '<div class="adsec"><table><thead><tr><th>Code</th><th>Réduction</th><th>Type</th><th>Utilisations</th><th>Statut</th><th>Actions</th></tr></thead><tbody id="coupons-table"></tbody></table></div>' +
  '</div>' +

  /* MEMBRES */
  '<div id="atab-membres-admin" class="admin-tab">' +
    '<p class="ptitle" style="margin-bottom:2px">Membres</p><p class="psub">Recherche, visualise et gère l\'accès</p>' +
    '<input class="search-bar" placeholder="🔍 Rechercher par nom ou email..." oninput="filterMembres(this.value)">' +
    '<div class="adsec"><table><thead><tr><th>Nom</th><th>Email</th><th>Pack</th><th>Inscrit le</th><th>Statut</th><th>Actions</th></tr></thead><tbody id="membres-table"></tbody></table></div>' +
  '</div>' +

  /* MESSAGERIE ADMIN */
  '<div id="atab-messagerie-admin" class="admin-tab">' +
    '<p class="ptitle" style="margin-bottom:2px">Messagerie</p><p class="psub">Réponds aux messages de tes membres</p>' +
    '<div class="msg-layout">' +
      '<div class="msg-sidebar"><div class="msg-sidebar-header">Conversations</div><div id="admin-threads"></div></div>' +
      '<div class="msg-main" id="admin-msg-main">' +
        '<div class="msg-empty"><div class="msg-empty-icon">💬</div><p class="msg-empty-title">Sélectionne une conversation</p><p class="msg-empty-sub">Clique sur un membre pour voir ses messages</p></div>' +
      '</div>' +
    '</div>' +
  '</div>' +

  /* LÉGAL */
  '<div id="atab-legal-admin" class="admin-tab">' +
    '<p class="ptitle" style="margin-bottom:2px">Mentions légales & CGV</p><p class="psub">Modifie les informations légales affichées sur le site</p>' +
    '<div class="adsec"><div class="edit-section">' +
      '<p style="font-family:Raleway,sans-serif;font-weight:700;font-size:11px;color:var(--vl);margin-bottom:10px">🏢 Informations entreprise</p>' +
      '<div class="fr2"><div class="ef"><label class="fl">Nom de l\'entreprise</label><input class="fi" id="legal-company" value="YourBrand SARL"></div><div class="ef"><label class="fl">SIRET</label><input class="fi" id="legal-siret" value="123 456 789 00012"></div></div>' +
      '<div class="fr2"><div class="ef"><label class="fl">Adresse</label><input class="fi" id="legal-address" value="12 rue de la Paix, 75001 Paris"></div><div class="ef"><label class="fl">Email légal</label><input class="fi" id="legal-email" value="contact@yourbrand.fr"></div></div>' +
      '<div class="fr2"><div class="ef"><label class="fl">Hébergeur</label><input class="fi" id="legal-host" value="Vercel Inc., San Francisco, USA"></div><div class="ef"><label class="fl">Directeur de publication</label><input class="fi" id="legal-director" value="Prénom Nom"></div></div>' +
      '<p style="font-family:Raleway,sans-serif;font-weight:700;font-size:11px;color:var(--vl);margin:14px 0 10px">🛒 Conditions générales de vente</p>' +
      '<div class="fr2"><div class="ef"><label class="fl">Délai de rétractation (jours)</label><input class="fi" id="legal-retract" value="14" type="number" style="max-width:80px"></div><div class="ef"><label class="fl">Garantie satisfaction (jours)</label><input class="fi" id="legal-guarantee" value="365" type="number" style="max-width:80px"></div></div>' +
      '<div class="ef"><label class="fl">Processeur de paiement</label><input class="fi" id="legal-payment" value="Stripe (stripe.com) — données bancaires non stockées par YourBrand"></div>' +
      '<div class="ef"><label class="fl">Politique de livraison</label><textarea class="fi" id="legal-delivery">Les produits numériques sont livrés par email immédiatement après confirmation du paiement.</textarea></div>' +
      '<div class="ef"><label class="fl">Clause de responsabilité</label><textarea class="fi" id="legal-liability">YourBrand ne saurait être tenu responsable des résultats obtenus par l\'utilisation de ses produits.</textarea></div>' +
      '<div class="factions"><button class="bsave" onclick="saveLegal()">Générer & enregistrer les pages légales</button></div>' +
    '</div></div>' +
  '</div>' +

  /* CHAT */
  '<div id="atab-chat" class="admin-tab">' +
    '<p class="ptitle" style="margin-bottom:2px">Widget chat</p>' +
    '<div class="adsec"><div class="edit-section">' +
      '<div class="ef"><label class="fl">Titre</label><input class="fi" id="cw-title-input" value="Bonjour 👋"></div>' +
      '<div class="ef"><label class="fl">Sous-titre</label><input class="fi" id="cw-sub-input" value="Comment pouvons-nous vous aider ?"></div>' +
      '<div class="ef"><label class="fl">Email de contact</label><input class="fi" id="cw-email" value="contact@yourbrand.fr"></div>' +
      '<div class="ef"><label class="fl">Texte bouton</label><input class="fi" id="cw-btn-txt" value="✉️ Nous contacter"></div>' +
      '<div class="factions"><button class="bsave" onclick="saveChatWidget()">Enregistrer</button></div>' +
    '</div></div>' +
  '</div>' +

  /* COMMANDES */
  '<div id="atab-orders" class="admin-tab">' +
    '<p class="ptitle" style="margin-bottom:2px">Commandes</p>' +
    '<div class="adsec"><table><thead><tr><th>N°</th><th>Client</th><th>Pack</th><th>Bump</th><th>Montant</th><th>Statut</th></tr></thead>' +
    '<tbody>' +
      '<tr><td class="order-num">#00312</td><td>Léa M.</td><td>VIP</td><td class="muted">—</td><td class="fw7">97€</td><td><span class="bs ba">✓</span></td></tr>' +
      '<tr><td class="order-num">#00311</td><td>Karim B.</td><td>Pro</td><td style="color:var(--green);font-weight:600">+Coaching</td><td class="fw7">67€</td><td><span class="bs ba">✓</span></td></tr>' +
    '</tbody></table></div>' +
  '</div>' +

  /* MAINTENANCE */
  '<div id="atab-maintenance-admin" class="admin-tab">' +
    '<p class="ptitle" style="margin-bottom:2px">Mode maintenance</p>' +
    '<div class="adsec"><div class="edit-section">' +
      '<div class="toggle-row"><div><p class="toggle-lbl" style="color:var(--rose)">⚠️ Activer le mode maintenance</p><p class="toggle-sub">Les visiteurs verront la page maintenance.</p></div><label class="toggle"><input type="checkbox" id="maint-toggle" onchange="toggleMaintenance(this)"><span class="toggle-slider"></span></label></div>' +
      '<div style="padding-top:12px">' +
        '<div class="fr2"><div class="ef"><label class="fl">Icône</label><input class="fi" id="maint-icon-input" value="🔧"></div><div class="ef"><label class="fl">Badge</label><input class="fi" id="maint-badge-input" value="Maintenance en cours"></div></div>' +
        '<div class="ef"><label class="fl">Titre</label><input class="fi" id="maint-title-input" value="On revient très vite !"></div>' +
        '<div class="ef"><label class="fl">Message</label><textarea class="fi" id="maint-sub-input">Le site est en cours de maintenance. Reviens dans quelques minutes.</textarea></div>' +
      '</div>' +
      '<div class="factions"><button class="bsave" onclick="saveMaintenance()">Enregistrer</button></div>' +
    '</div></div>' +
  '</div>' +

  /* PARAMÈTRES */
  '<div id="atab-settings" class="admin-tab">' +
    '<p class="ptitle" style="margin-bottom:2px">Paramètres</p>' +
    '<div class="adsec"><div class="edit-section">' +
      '<div class="ef"><label class="fl">Nom de la marque</label><input class="fi" id="s-brand" value="YourBrand"></div>' +
      '<div class="ef"><label class="fl">Email de contact</label><input class="fi" id="s-email" value="contact@yourbrand.fr"></div>' +
      '<div class="ef"><label class="fl">Clé publique Stripe 🔌</label><input class="fi" id="s-stripe" placeholder="pk_live_..."></div>' +
      '<div class="ef"><label class="fl">Footer</label><input class="fi" id="s-footer" value="© 2025 YourBrand · Tous droits réservés"></div>' +
      '<p style="font-size:11px;color:var(--muted);margin-bottom:10px">🔒 La gestion des mots de passe se fait maintenant via Supabase Authentication (les comptes admin et membres sont de vrais comptes utilisateurs).</p>' +
      '<div class="factions"><button class="bsave" onclick="saveSettings()">Enregistrer</button></div>' +
    '</div></div>' +
  '</div>';
}

/* ============================================================
   supabase.js — Connexion à Supabase
   ============================================================ */

const SUPABASE_URL = 'https://akrprlhzjmngfmensrdu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrcnBybGh6am1uZ2ZtZW5zcmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MDk2OTcsImV4cCI6MjA5ODM4NTY5N30.vhB7Y9pzJ8MKN1BGOtAKCeyZXpU0Ug0YPn54HqHgXnU';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ─────────────────────────────────────────
   AUTH
───────────────────────────────────────── */

async function sbSignUp(email, password, fullName) {
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });
  return { data, error };
}

async function sbSignIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  return { data, error };
}

async function sbSignOut() {
  await sb.auth.signOut();
}

async function sbGetCurrentUser() {
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

async function sbGetProfile(userId) {
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
}

async function sbResetPassword(email) {
  const { data, error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname
  });
  return { data, error };
}

async function sbUpdateUserAccount(updates) {
  // updates = { email, password, data: { full_name } }
  const { data, error } = await sb.auth.updateUser(updates);
  return { data, error };
}

async function sbGetPacks() {
  const { data, error } = await sb
    .from('packs')
    .select('*')
    .eq('status', 'active')
    .order('price', { ascending: true });
  return { data: data || [], error };
}

/* ─────────────────────────────────────────
   ORDERS
───────────────────────────────────────── */

async function sbCreateOrder(order) {
  // order = { user_id, pack_id, email, full_name, amount, coupon_code, order_bump, status, stripe_payment_id }
  const { data, error } = await sb
    .from('orders')
    .insert([order])
    .select()
    .single();
  return { data, error };
}

async function sbGetMyOrders(userId) {
  const { data, error } = await sb
    .from('orders')
    .select('*, packs(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

async function sbGetAllOrders() {
  const { data, error } = await sb
    .from('orders')
    .select('*, packs(name), profiles(email, full_name)')
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

async function sbUpdateOrderStatus(orderId, status) {
  const { data, error } = await sb
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single();
  return { data, error };
}

/* ─────────────────────────────────────────
   COUPONS
───────────────────────────────────────── */

async function sbCheckCoupon(code) {
  const { data, error } = await sb
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('status', 'active')
    .single();
  return { data, error };
}

/* ─────────────────────────────────────────
   MESSAGES
───────────────────────────────────────── */

async function sbGetMyMessages(userId) {
  const { data, error } = await sb
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  return { data: data || [], error };
}

async function sbSendMessage(conversationId, userId, sender, content) {
  const { data, error } = await sb
    .from('messages')
    .insert([{ conversation_id: conversationId, user_id: userId, sender, content }])
    .select()
    .single();
  return { data, error };
}

async function sbGetAllConversations() {
  // Récupère tous les messages groupés par user_id (admin only)
  const { data, error } = await sb
    .from('messages')
    .select('*, profiles(email, full_name)')
    .order('created_at', { ascending: true });
  return { data: data || [], error };
}

async function sbMarkMessagesRead(userId) {
  const { error } = await sb
    .from('messages')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('sender', 'membre');
  return { error };
}

/* Supprime tous les messages d'une conversation (admin : n'importe laquelle ;
   membre : uniquement les siennes, géré par les policies RLS) */
async function sbDeleteConversation(conversationId) {
  const { error } = await sb
    .from('messages')
    .delete()
    .eq('conversation_id', conversationId);
  return { error };
}

/* ─────────────────────────────────────────
   REALTIME — écoute les nouveaux messages en direct
───────────────────────────────────────── */
let __messagesChannel = null;

function sbSubscribeToMessages(onInsert) {
  // Ferme une éventuelle souscription précédente avant d'en ouvrir une nouvelle
  if (__messagesChannel) {
    sb.removeChannel(__messagesChannel);
    __messagesChannel = null;
  }
  __messagesChannel = sb
    .channel('messages-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, function (payload) {
      onInsert(payload.new);
    })
    .subscribe();
  return __messagesChannel;
}

function sbUnsubscribeFromMessages() {
  if (__messagesChannel) {
    sb.removeChannel(__messagesChannel);
    __messagesChannel = null;
  }
}

/* ─────────────────────────────────────────
   SITE SETTINGS (textes admin)
───────────────────────────────────────── */

async function sbGetSettings() {
  const { data, error } = await sb
    .from('site_settings')
    .select('data')
    .eq('id', 'main')
    .single();
  return { data: data ? data.data : {}, error };
}

async function sbSaveSettings(newData) {
  const { data, error } = await sb
    .from('site_settings')
    .update({ data: newData, updated_at: new Date().toISOString() })
    .eq('id', 'main');
  return { data, error };
}

async function sbCreatePack(pack) {
  // pack = { name, price, badge, description, features, status }
  const { data, error } = await sb.from('packs').insert([pack]).select().single();
  return { data, error };
}

async function sbUpdatePack(id, pack) {
  const { data, error } = await sb.from('packs').update(pack).eq('id', id).select().single();
  return { data, error };
}

async function sbDeletePack(id) {
  const { error } = await sb.from('packs').delete().eq('id', id);
  return { error };
}

/* ─────────────────────────────────────────
   FEATURES (points forts)
───────────────────────────────────────── */
async function sbGetFeatures() {
  const { data, error } = await sb.from('features').select('*').order('sort_order', { ascending: true });
  return { data: data || [], error };
}
async function sbCreateFeature(f) {
  const { data, error } = await sb.from('features').insert([f]).select().single();
  return { data, error };
}
async function sbUpdateFeature(id, f) {
  const { data, error } = await sb.from('features').update(f).eq('id', id).select().single();
  return { data, error };
}
async function sbDeleteFeature(id) {
  const { error } = await sb.from('features').delete().eq('id', id);
  return { error };
}

/* ─────────────────────────────────────────
   REVIEWS (avis)
───────────────────────────────────────── */
async function sbGetReviews() {
  const { data, error } = await sb.from('reviews').select('*').order('sort_order', { ascending: true });
  return { data: data || [], error };
}
async function sbCreateReview(r) {
  const { data, error } = await sb.from('reviews').insert([r]).select().single();
  return { data, error };
}
async function sbUpdateReview(id, r) {
  const { data, error } = await sb.from('reviews').update(r).eq('id', id).select().single();
  return { data, error };
}
async function sbDeleteReview(id) {
  const { error } = await sb.from('reviews').delete().eq('id', id);
  return { error };
}

/* ─────────────────────────────────────────
   FAQS
───────────────────────────────────────── */
async function sbGetFaqs() {
  const { data, error } = await sb.from('faqs').select('*').order('sort_order', { ascending: true });
  return { data: data || [], error };
}
async function sbCreateFaq(f) {
  const { data, error } = await sb.from('faqs').insert([f]).select().single();
  return { data, error };
}
async function sbUpdateFaq(id, f) {
  const { data, error } = await sb.from('faqs').update(f).eq('id', id).select().single();
  return { data, error };
}
async function sbDeleteFaq(id) {
  const { error } = await sb.from('faqs').delete().eq('id', id);
  return { error };
}

/* ─────────────────────────────────────────
   STATS (chiffres clés)
───────────────────────────────────────── */
async function sbGetStats() {
  const { data, error } = await sb.from('stats').select('*').order('sort_order', { ascending: true });
  return { data: data || [], error };
}
async function sbCreateStat(s) {
  const { data, error } = await sb.from('stats').insert([s]).select().single();
  return { data, error };
}
async function sbUpdateStat(id, s) {
  const { data, error } = await sb.from('stats').update(s).eq('id', id).select().single();
  return { data, error };
}
async function sbDeleteStat(id) {
  const { error } = await sb.from('stats').delete().eq('id', id);
  return { error };
}

/* ─────────────────────────────────────────
   COUPONS — CRUD admin
───────────────────────────────────────── */
async function sbCreateCoupon(c) {
  const { data, error } = await sb.from('coupons').insert([c]).select().single();
  return { data, error };
}
async function sbUpdateCoupon(id, c) {
  const { data, error } = await sb.from('coupons').update(c).eq('id', id).select().single();
  return { data, error };
}
async function sbDeleteCoupon(id) {
  const { error } = await sb.from('coupons').delete().eq('id', id);
  return { error };
}
async function sbGetAllCoupons() {
  const { data, error } = await sb.from('coupons').select('*').order('created_at', { ascending: false });
  return { data: data || [], error };
}

/* ─────────────────────────────────────────
   ADMIN — MEMBRES
───────────────────────────────────────── */

async function sbGetAllProfiles() {
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

async function sbToggleMemberStatus(userId, newStatus) {
  const { data, error } = await sb
    .from('profiles')
    .update({ status: newStatus })
    .eq('id', userId);
  return { data, error };
}

/* ============================================================
   data.js — Toutes les données modifiables du site
   🔌 À connecter à Supabase pour persistance réelle
   ============================================================ */

var packs = [
  { id: 1, name: "Starter", price: 17, badge: "", desc: "L'essentiel pour commencer.", features: ["Ebook complet", "Format PDF mobile", "Mises à jour incluses", "Accès immédiat"], status: "active" },
  { id: 2, name: "Pro", price: 47, badge: "Best-seller", desc: "Le meilleur rapport qualité/prix.", features: ["Tout du Starter", "Ressources bonus (+20 pages)", "Templates exclusifs", "Accès Discord privé", "Support email 48h"], status: "active" },
  { id: 3, name: "VIP", price: 97, badge: "Premium", desc: "Pour aller encore plus loin.", features: ["Tout du Pro", "Session coaching 1h", "Contenu VIP exclusif", "Accès avant-première", "Support prioritaire 24h"], status: "active" }
];

var feats = [
  { id: 1, icon: "📱", title: "Format mobile-first", text: "Lisible en 15 min depuis ton téléphone." },
  { id: 2, icon: "🎯", title: "Exercices concrets", text: "Chaque chapitre se termine par une action immédiate." },
  { id: 3, icon: "🔄", title: "Mises à jour incluses", text: "Tu reçois toutes les nouvelles versions gratuitement." },
  { id: 4, icon: "💬", title: "Communauté privée", text: "Accès Discord réservé aux acheteurs Pro & VIP." },
  { id: 5, icon: "🧠", title: "Méthodes testées", text: "Uniquement ce qui a marché. Zéro théorie inutile." },
  { id: 6, icon: "🛡️", title: "Garantie 365 jours", text: "Pas convaincu ? Remboursement immédiat sans condition." }
];

var reviews = [
  { id: 1, name: "Sarah L.", handle: "@sarah.lifestyle", initials: "SL", color: "v", text: "Je m'attendais à rien de fou et finalement j'ai tout noté. Vraiment actionnable, c'est rare." },
  { id: 2, name: "Mathieu K.", handle: "@matk.create", initials: "MK", color: "r", text: "J'ai lu ça dans le métro en 20 minutes et j'ai appliqué le lendemain. Top." },
  { id: 3, name: "Amira M.", handle: "@amira.mindset", initials: "AM", color: "v", text: "Le pack VIP vaut vraiment son prix. Les templates bonus m'ont fait gagner un temps fou." }
];

var faqs = [
  { id: 1, q: "Comment je reçois l'ebook après paiement ?", a: "Tu reçois un email automatique avec ton lien de téléchargement immédiatement après confirmation du paiement." },
  { id: 2, q: "Sur quels appareils je peux le lire ?", a: "Sur tous : téléphone, tablette, ordinateur. Format PDF optimisé pour lecture mobile." },
  { id: 3, q: "La garantie 365 jours, ça marche vraiment ?", a: "Oui, sans conditions. Tu as un an pour demander un remboursement complet. Un email suffit, aucune justification requise." },
  { id: 4, q: "Le paiement est-il sécurisé ?", a: "Absolument. Le paiement est traité par Stripe. Tes données bancaires ne nous sont jamais transmises." }
];

var coupons = [
  { id: 1, code: "LANCEMENT50", value: 50, type: "percent", uses: 12, status: "active" },
  { id: 2, code: "BIENVENUE10", value: 10, type: "fixed", uses: 3, status: "active" }
];

var membres = [
  { id: 1, name: "Karim B.", email: "karim@b.fr", pack: "Pro", date: "26 jan", status: "active" },
  { id: 2, name: "Léa Martin", email: "lea@m.com", pack: "VIP", date: "26 jan", status: "active" },
  { id: 3, name: "Chloé D.", email: "chloe@d.fr", pack: "Starter", date: "25 jan", status: "active" },
  { id: 4, name: "Alex R.", email: "alex@r.com", pack: "VIP", date: "24 jan", status: "blocked" }
];

var statsData = [
  { id: 1, icon: "📚", value: 2400, suffix: "+", label: "Lecteurs satisfaits" },
  { id: 2, icon: "⭐", value: 4.9, suffix: "/5", label: "Note moyenne" },
  { id: 3, icon: "🔄", value: 98, suffix: "%", label: "Taux de satisfaction" },
  { id: 4, icon: "🏆", value: 365, suffix: "j.", label: "Garantie remboursement" }
];

var conversations = [
  { id: 1, membre: "Karim B.", initials: "KB", pack: "Pro", read: true, messages: [
    { from: "membre", text: "Bonjour, j'ai bien reçu l'ebook. Est-ce que les mises à jour futures seront incluses automatiquement ?", time: "Hier 14:22" },
    { from: "admin", text: "Bonjour Karim ! Oui, absolument. Toutes les mises à jour sont incluses à vie dans ton achat. Tu recevras un email à chaque nouvelle version. 🎉", time: "Hier 15:05" }
  ]},
  { id: 2, membre: "Léa Martin", initials: "LM", pack: "VIP", read: false, messages: [
    { from: "membre", text: "Salut ! J'ai une question sur la session coaching incluse dans mon pack VIP. Comment est-ce qu'on planifie ça ?", time: "Aujourd'hui 09:14" }
  ]},
  { id: 3, membre: "Chloé D.", initials: "CD", pack: "Starter", read: true, messages: [
    { from: "membre", text: "Merci pour l'ebook, c'est exactement ce qu'il me fallait !", time: "Il y a 3 jours" },
    { from: "admin", text: "Super, merci à toi Chloé ! N'hésite pas si tu as des questions. 🙏", time: "Il y a 3 jours" }
  ]}
];

var trustItems = ["Paiement 100% sécurisé", "Livraison instantanée", "+2 400 lecteurs satisfaits", "Satisfait ou remboursé 365 j."];
var trustIcons = ["🔒", "⚡", "⭐", "🏆"];

/* ── CONFIG GLOBALE ── */
var S = {
  brand: "YourBrand",
  adminPass: "admin123",       /* 🔌 À remplacer par Supabase Auth */
  membrePass: "membre123",     /* 🔌 À remplacer par Supabase Auth */
  contactEmail: "contact@yourbrand.fr",
  footer: "© 2025 YourBrand · Tous droits réservés",
  stripePublicKey: "pk_live_...",  /* 🔌 Ta clé publique Stripe ici */
  cartNoticeActive: true,
  cartNoticeIcon: "📩",
  cartNoticeText: "Pense à mettre ton compte Instagram en public le temps de la commande, pour qu'on puisse t'envoyer ton ebook en message privé !"
};

/* ── ORDER BUMP ── */
var OB = {
  active: true,
  badge: "Offre spéciale",
  title: "Ajoute une session coaching",
  desc: "1h en visio pour aller encore plus loin. Places limitées, disponible uniquement ici.",
  price: "+20€",
  orig: "valeur 80€",
  summaryName: "Session coaching",
  summaryPrice: "+20€",
  amount: 20
};

/* ── EXIT POPUP ── */
var EP = {
  active: true,
  emoji: "🎁",
  badge: "Offre exclusive",
  title: "Attends ! Une offre rien que pour toi",
  sub: "Tu t'en vas ? Voici une réduction exclusive, valable uniquement maintenant.",
  price: "23€",
  orig: "au lieu de 47€",
  offerDesc: "Pack Pro à -50% · Accès immédiat",
  btnTxt: "Je veux mon offre →",
  dismiss: "Non merci, je préfère payer plein tarif",
  cdMin: 10
};

/* ── MAINTENANCE ── */
var MAINT = {
  active: false,
  icon: "🔧",
  badgeTxt: "Maintenance en cours",
  title: "On revient très vite !",
  sub: "Le site est en cours de maintenance. Reviens dans quelques minutes, on prépare quelque chose de beau pour toi."
};

/* ── LÉGAL ── */
var legalData = {
  company: "YourBrand SARL",
  siret: "123 456 789 00012",
  address: "12 rue de la Paix, 75001 Paris",
  email: "contact@yourbrand.fr",
  host: "Vercel Inc., San Francisco, USA",
  director: "Prénom Nom",
  retract: 14,
  guarantee: 365,
  payment: "Stripe (stripe.com) — données bancaires non stockées par YourBrand",
  delivery: "Les produits numériques sont livrés par email immédiatement après confirmation du paiement. Aucun délai de livraison physique ne s'applique.",
  liability: "YourBrand ne saurait être tenu responsable des résultats obtenus par l'utilisation de ses produits. Les résultats varient selon les individus."
};

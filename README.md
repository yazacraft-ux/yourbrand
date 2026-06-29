# 🚀 YourBrand — Guide de déploiement

## Structure des fichiers

```
yourbrand/
├── index.html          ← Page principale (landing + cart + panels)
├── css/
│   └── style.css       ← Tous les styles
├── js/
│   ├── data.js         ← Données modifiables (packs, textes, config)
│   └── app.js          ← Logique complète de l'application
└── README.md           ← Ce fichier
```

---

## 🌐 Déploiement sur GitHub Pages (gratuit, 5 min)

### Étape 1 — Créer le repo GitHub
1. Va sur [github.com](https://github.com) et crée un nouveau repository
2. Nomme-le `yourbrand` (ou ton nom de marque)
3. Coche "Public" (requis pour GitHub Pages gratuit)

### Étape 2 — Upload les fichiers
Option A — Via l'interface GitHub :
1. Clique "uploading an existing file"
2. Glisse-dépose tous les fichiers du dossier `yourbrand/`
3. Clique "Commit changes"

Option B — Via Git (terminal) :
```bash
cd yourbrand
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TON-USERNAME/yourbrand.git
git push -u origin main
```

### Étape 3 — Activer GitHub Pages
1. Dans ton repo → Settings → Pages
2. Source : "Deploy from a branch"
3. Branch : `main` / `/(root)`
4. Clique Save
5. Ton site sera disponible sur : `https://ton-username.github.io/yourbrand/`

---

## 🔌 Intégrations à connecter

### Stripe (paiements)
1. Crée un compte sur [stripe.com](https://stripe.com)
2. Dans le panel admin → Paramètres → colle ta clé publique `pk_live_...`
3. Dans `js/app.js`, trouve `processCheckout()` et remplace par :
```javascript
// 🔌 Stripe Checkout
const stripe = Stripe('pk_live_VOTRE_CLE');
const { error } = await stripe.redirectToCheckout({
  lineItems: [{ price: 'price_VOTRE_PRICE_ID', quantity: 1 }],
  mode: 'payment',
  successUrl: window.location.origin + '?success=true',
  cancelUrl: window.location.origin + '?canceled=true',
});
```

### Supabase (authentification + base de données)
1. Crée un projet sur [supabase.com](https://supabase.com) (gratuit)
2. Tables à créer :
   - `profiles` : id, email, nom, pack, role (membre/admin)
   - `orders` : id, user_id, pack_id, montant, statut, created_at
   - `messages` : id, user_id, texte, from, created_at
3. Dans `index.html`, ajoute avant les scripts :
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  const supabase = window.supabase.createClient(
    'https://TON-PROJECT.supabase.co',
    'TON-ANON-KEY'
  );
</script>
```
4. Remplace les fonctions `loginMembre()` et `loginAdmin()` dans `app.js` :
```javascript
async function loginMembre() {
  const email = document.getElementById('m-email').value;
  const password = document.getElementById('m-pass').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { alert('Erreur : ' + error.message); return; }
  closeLogin();
  showView('membre');
}
```

### Brevo / Resend (emails automatiques)
Après confirmation de paiement Stripe, déclenche un email avec le lien de téléchargement via un webhook Stripe → ta fonction Supabase Edge Function → Resend API.

---

## 🔒 Accès panel admin (démo)
- Email : n'importe lequel
- Mot de passe : `admin123`

## 👤 Accès espace membre (démo)
- Email : n'importe lequel
- Mot de passe : `membre123`

> ⚠️ Ces mots de passe sont en clair dans `js/data.js`. À remplacer par Supabase Auth avant de mettre en production.

---

## ✏️ Personnalisation rapide

Pour changer le nom de ta marque et les textes :
1. Ouvre `js/data.js`
2. Modifie la variable `S.brand` et les autres données
3. Ou utilise directement le **panel admin** du site (connexion admin)

Pour changer les couleurs :
1. Ouvre `css/style.css`
2. Modifie les variables CSS au début :
```css
--violet: #7C3AED;   ← Couleur principale
--rose: #EC4899;     ← Couleur secondaire
```

---

## 📞 Prochaines étapes recommandées
1. ✅ Déployer sur GitHub Pages
2. 🔌 Connecter Stripe avec tes vrais produits
3. 🔌 Configurer Supabase pour l'auth réelle
4. 📧 Configurer Brevo/Resend pour les emails
5. 🌐 Ajouter un nom de domaine personnalisé (dans GitHub Pages Settings)
6. 📊 Ajouter Google Analytics (coller le script dans index.html)

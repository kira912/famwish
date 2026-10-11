# 🎁 FamWish - PWA de Partage de Listes de Souhaits en Famille

Une Progressive Web App (PWA) moderne, festive et ultra-fluide pour partager des listes de souhaits pour **Noël**, **anniversaires**, **naissances** et événements familiaux, développée avec **Nuxt 4**, **Vue 3**, **Tailwind CSS** et **PostgreSQL**.

---

## ✨ Fonctionnalités Clés du MVP

1. **🔗 Scraping & Ajout de cadeaux intelligent** : Renseignez n'importe quel lien produit (Amazon, Fnac, Zara, Lego, etc.), FamWish extrait automatiquement le titre, l'image, le prix et le marchand. Possibilité d'ajouter des idées libres sans lien.
2. **🤫 Réservation anonyme anti-spoiler** : Les proches peuvent réserver ou acheter un cadeau en un clic. La surprise reste 100% préservée pour le créateur de la liste.
3. **🎨 Personnalisation détaillée** : Quantités, variantes/coloris/tailles, et cadre de commentaire/note dédié dans chaque fiche cadeau.
4. **📱 Partage instantané** : Bouton WhatsApp 1-clic direct, QR Code téléchargeable et lien d'invitation rapide.
5. **🗄️ Base de données PostgreSQL (Vercel)** : Compatible Vercel Postgres, Neon et Supabase avec auto-création des tables et migration transparente.
6. **📲 PWA Installable** : Mode hors-ligne, Service Worker Workbox, navigation mobile fluide.

---

## 🚀 Déploiement sur Vercel avec Vercel Postgres

1. **Connectez votre dépôt Git à Vercel**.
2. Dans le tableau de bord Vercel de votre projet :
   * Allez dans l'onglet **Storage** -> Créez une base **Postgres** (Vercel Postgres / Neon).
   * Cliquez sur **Connect to Project** pour injecter automatiquement la variable `POSTGRES_URL`.
3. Déployez !
   * Les tables (`wishlists`, `wishlist_items`) sont créées automatiquement au premier appel API.
   * Vous pouvez également exécuter le script `server/db/schema.sql` dans le SQL Editor de Vercel si vous préférez.

---

## 🛠️ Développement Local & Base de Données

1. Copiez le fichier d'environnement :
```bash
cp .env.example .env
```

2. Configurez votre base PostgreSQL locale dans le `.env` (ex: `DATABASE_URL="postgres://postgres:password@localhost:5432/famwish"`).
*(Note : Si aucune base PostgreSQL n'est configurée en local, l'application fonctionne avec un store en mémoire sans données de démo).*

3. Installez et lancez l'application :
```bash
# Installation des dépendances
pnpm install

# Lancer le serveur de développement
pnpm dev

# Build de production
pnpm build
```

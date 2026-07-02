# NEXUS — Copilote PMP Résilient

Plateforme de gestion de projet (méthodologie PMP) augmentée par l'IA : tableau de bord EVM (CPI/SPI) calculé automatiquement depuis une vraie feuille de temps, Risk Predictor, Bouton Élan (gestion de crise), comptes Particulier/Entreprise avec invitations.

Stack : **Next.js 14** (App Router) + **PostgreSQL** + **API Anthropic (Claude)**. Aucun serveur à gérer vous-même si vous utilisez les hébergeurs gratuits recommandés ci-dessous.

---

## 1. Ce dont vous avez besoin (tout gratuit pour démarrer)

1. Un compte [GitHub](https://github.com) (pour héberger le code)
2. Un compte [Vercel](https://vercel.com) (pour déployer le site — gratuit)
3. Une base PostgreSQL gratuite chez [Neon](https://neon.tech) ou [Supabase](https://supabase.com)
4. Une clé API Anthropic sur [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)

## 2. Créer la base de données

1. Créez un compte sur [neon.tech](https://neon.tech), créez un projet.
2. Copiez la **chaîne de connexion** (Connection string) — elle ressemble à
   `postgresql://user:password@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`
3. Ouvrez l'éditeur SQL de Neon (onglet "SQL Editor") et collez tout le contenu du fichier
   `db/schema.sql` de ce projet, puis exécutez-le. Cela crée les 4 tables nécessaires
   (`users`, `projects`, `team_members`, `invites`).

## 3. Récupérer le code sur votre ordinateur

Téléchargez et décompressez ce dossier, puis dans un terminal :

```bash
cd nexus-platform
npm install
cp .env.example .env.local
```

Ouvrez `.env.local` et remplissez les 3 valeurs :

```
DATABASE_URL=      # la chaîne de connexion Neon copiée à l'étape 2
JWT_SECRET=         # une phrase secrète aléatoire, ex: générez avec `openssl rand -base64 48`
ANTHROPIC_API_KEY=  # votre clé depuis console.anthropic.com
```

## 4. Tester en local

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) — vous devriez voir l'écran de connexion. Créez un compte, créez un projet, testez le Risk Predictor et le Bouton Élan (ils appellent réellement Claude).

## 5. Mettre en ligne (déploiement réel, accessible sur internet)

1. Créez un nouveau dépôt sur GitHub et poussez ce code :
   ```bash
   git init
   git add .
   git commit -m "NEXUS platform"
   git branch -M main
   git remote add origin https://github.com/VOTRE-COMPTE/nexus-platform.git
   git push -u origin main
   ```
2. Allez sur [vercel.com/new](https://vercel.com/new), importez ce dépôt GitHub.
3. Dans les paramètres du projet Vercel, section **Environment Variables**, ajoutez les 3 mêmes
   variables que dans `.env.local` (`DATABASE_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY`).
4. Cliquez **Deploy**. Après 1-2 minutes, Vercel vous donne une URL publique
   (ex: `nexus-platform.vercel.app`) — votre plateforme est en ligne, avec de vrais comptes,
   une vraie base de données, accessible depuis n'importe quel navigateur.

## Structure du projet

```
app/
  login/, signup/          → pages d'authentification
  dashboard/                → application principale (projets, tableau de bord, risques, élan, équipe)
  api/
    auth/                   → inscription, connexion, déconnexion, session
    projects/                → CRUD projets, équipe, feuille de temps
    projects/[id]/risk/      → appel IA : Risk Predictor
    projects/[id]/elan/      → appel IA : Bouton Élan
    invites/                  → invitations (comptes Entreprise)
lib/
  db.js                     → connexion PostgreSQL
  auth.js                   → sessions (JWT en cookie httpOnly)
  claude.js                 → appel à l'API Anthropic côté serveur
db/schema.sql               → schéma SQL à exécuter une fois
```

## Sécurité — ce qui est déjà fait

- Mots de passe hashés avec bcrypt (jamais stockés en clair)
- Sessions via cookie **httpOnly** signé (JWT), inaccessible en JavaScript côté navigateur
- Clé API Anthropic gardée côté serveur uniquement, jamais exposée au client
- Chaque route API vérifie que le projet demandé appartient bien à l'utilisateur connecté

## Fonctionnalités (Niveaux 1, 2 et 3)

- **Niveau 1** — WBS/tâches avec dépendances, vues Kanban et Gantt, chemin critique (algorithme CPM du PMBOK)
- **Niveau 2** — Générateur de WBS par IA, TCPI/VAC, courbe en S historique, contrôle des changements formel, export PDF du registre des risques
- **Niveau 3** — Portfolio PMO agrégé (comptes Entreprise), import CSV de feuille de temps, mode Entraînement PMP (quiz généré par IA)

## Limites actuelles / prochaines étapes possibles

- Les invitations sont enregistrées en base mais n'envoient pas de vrai email — pour cela,
  brancher un service comme [Resend](https://resend.com) (quelques lignes de code dans
  `app/api/invites/route.js`).
- Pas encore de rôles/permissions par membre d'équipe (tout le monde invité aurait, dans une
  V2, accès aux projets de l'entreprise — actuellement chaque compte ne voit que ses propres
  projets).
- Pas de paiement/abonnement (Stripe) — peut être ajouté si le modèle économique du document
  d'origine (SaaS payant) doit être implémenté.
- Pas d'intégration OAuth avec des outils externes (Jira, calendrier) — l'import CSV couvre
  un besoin similaire sans la complexité d'enregistrer une application OAuth tierce.

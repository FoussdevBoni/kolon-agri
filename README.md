# Kolon Agri

Monorepo pnpm : `frontend/` (React, Vite), `backend/` (Express 5, MongoDB), `docs/` (spécifications de référence).

## Démarrage

```bash
pnpm install
cp backend/.env.example backend/.env   # renseigner MONGODB_URI (Atlas) et MONGODB_TEST_URI
cp frontend/.env.example frontend/.env
pnpm --filter @kolon-agri/backend db:check
pnpm dev
```

Frontend : http://localhost:5173 — API : http://localhost:4000/api/v1/health

Premier super-administrateur (une seule fois ; affiche un lien d'activation à usage unique) :

```bash
pnpm --filter @kolon-agri/backend admin:create-super -- --email prenom.nom@exemple.ml --name "Prénom Nom"
```

Contenu CMS initial (crée les pages et publie un contenu de départ sur les pages jamais modifiées ; n'écrase rien) :

```bash
pnpm --filter @kolon-agri/backend cms:seed
```

`docker-compose.yml` fournit en option un MongoDB local en replica set, si Atlas n'est pas utilisé.

## Qualité

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, ou `pnpm check` pour tout enchaîner.

Les tests d'intégration MongoDB utilisent exclusivement `MONGODB_TEST_URI` : base Atlas isolée dont le nom se termine par `_test` et diffère de celui de `MONGODB_URI`. Sans cette variable, ils sont ignorés en local ; en CI, le secret `MONGODB_TEST_URI` est obligatoire.

## Déploiement et exploitation

### Architecture cible

- **Frontend** : fichiers statiques de `frontend/dist` (`pnpm --filter @kolon-agri/frontend build`) sur un hébergement HTTPS avec CDN.
- **API** : Node.js 22, `pnpm --filter @kolon-agri/backend build` puis `node dist/server.js` (répertoire `backend/`), derrière un reverse proxy HTTPS. Un seul processus suffit ; il héberge aussi le worker d'emails.
- **Base** : MongoDB Atlas (replica set requis pour les transactions), base de production dédiée, jamais suffixée `_test` (refusé au démarrage).
- **Recommandé** : servir l'API sous la même origine que le site (`https://www.exemple.ml/api/…`) via le reverse proxy. Les cookies restent de premier niveau et `VITE_API_BASE_URL=/api/v1`. Variante : `api.exemple.ml` (même site), avec `VITE_API_BASE_URL=https://api.exemple.ml/api/v1` et `CORS_ORIGINS` limité au site.

### Variables d'environnement

API (`backend/.env` ou secrets de l'hébergeur ; jamais versionnées) :

| Variable                                                                                                 | Production                                                                                 |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `NODE_ENV`                                                                                               | `production`                                                                               |
| `MONGODB_URI`                                                                                            | URI Atlas de la base de production                                                         |
| `APP_PUBLIC_URL`                                                                                         | URL https du site (liens des emails, plan du site) ; refusée si non https                  |
| `CORS_ORIGINS`                                                                                           | origines https du site, séparées par des virgules ; refusées si non https                  |
| `COOKIE_SECURE`                                                                                          | `true` (par défaut en production, obligatoire) ; cookie `__Host-kolon_session` HttpOnly    |
| `SESSION_COOKIE_SAMESITE`                                                                                | `lax` (`none` seulement si le site et l'API sont sur des sites différents)                 |
| `TRUST_PROXY`                                                                                            | nombre de proxys devant l'API (ex. `1`) : indispensable pour les limites par IP et l'audit |
| `RESEND_API_KEY`, `RESEND_FROM`                                                                          | clé restreinte à l'envoi ; expéditeur sur un domaine vérifié chez Resend                   |
| `EMAIL_WORKER_INTERVAL_MS`                                                                               | intervalle de la file d'emails (défaut 15 000)                                             |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER`              | médiathèque                                                                                |
| `LOG_LEVEL`, `AUDIT_LOG_RETENTION_DAYS`, `MEDIA_MAX_BYTES`, `JSON_BODY_LIMIT`, `MONGODB_PING_TIMEOUT_MS` | valeurs par défaut adaptées                                                                |

Frontend (au build) : `VITE_API_BASE_URL` et `VITE_SITE_URL` (URL https publique : canonical, Open Graph, ligne `Sitemap` de `robots.txt`).

### Hébergement du frontend

- Servir `$uri`, puis `$uri/index.html` (en-têtes SEO pré-générés des pages fixes), puis `/index.html` (application monopage).
- Réécrire `/sitemap.xml` vers `<API>/api/v1/pages/sitemap.xml`. `robots.txt` est produit par le build.
- Cache : `/assets/*` immuable (1 an) ; `index.html` et les pages en `no-cache`. L'API autorise un cache CDN de 60 s sur les contenus publiés (`s-maxage`), jamais sur les vues d'administration ni les erreurs.
- En-têtes conseillés : HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, et une CSP du type `default-src 'self'; img-src 'self' data: https://res.cloudinary.com; connect-src 'self' <API>; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'`.

Exemple Nginx (API sur la même origine) :

```nginx
location /api/ { proxy_pass http://127.0.0.1:4000; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto https; }
location = /sitemap.xml { proxy_pass http://127.0.0.1:4000/api/v1/pages/sitemap.xml; }
location /assets/ { root /srv/kolon-agri/frontend/dist; add_header Cache-Control "public, max-age=31536000, immutable"; }
location / { root /srv/kolon-agri/frontend/dist; try_files $uri $uri/index.html /index.html; add_header Cache-Control "no-cache"; }
```

### Mise en service

1. `pnpm install --frozen-lockfile`, puis `pnpm check` (CI : secret `MONGODB_TEST_URI`, base de test distincte).
2. `pnpm --filter @kolon-agri/backend db:check` avec les variables de production (connexion et transactions).
3. Démarrer l'API ; vérifier `GET /api/v1/health` (200, ou 503 si la base est injoignable) et le journal « File d'emails active (Resend) ».
4. Première fois : `cms:seed` (n'écrase rien), puis `admin:create-super -- --email … --name "…"` (lien d'activation affiché une seule fois).
5. Vérifier `/robots.txt`, `/sitemap.xml`, la connexion, un envoi d'image et un email réel vers une adresse de l'équipe.

### Worker d'emails

Il démarre avec l'API si `RESEND_API_KEY` est renseignée, et refuse de démarrer en test ou sur une base `_test`. Les jobs (`emailJobs`) sont créés dans la transaction métier et réservés atomiquement. Ils sont réessayés jusqu'à 6 fois (1 min à 3 h), expirés après 48 h (1 h pour les liens de mot de passe), puis purgés après 30 jours. Un arrêt `SIGTERM` attend la fin du lot en cours ; après un arrêt brutal, un job bloqué est repris au bout de 2 min, avec la même clé d'idempotence chez Resend. Plusieurs instances restent sûres pour la file, mais les limites de débit sont en mémoire : gardez une seule instance tant qu'un stockage partagé n'est pas mis en place.

### Sauvegardes et retour arrière

- **Base** : activer les sauvegardes Atlas (snapshots et restauration à un instant donné, selon l'offre ; l'offre gratuite M0 n'en a pas, il faut alors un `mongodump` planifié et chiffré). Tester une restauration sur une base séparée avant la mise en production.
- **Médias** : les images vivent sur Cloudinary (identifiants dans la collection `media`) ; activer la sauvegarde Cloudinary si l'offre le permet.
- **Retour arrière** : conserver l'artefact précédent (frontend `dist`, backend `dist`) et le redéployer. Les évolutions de schéma sont additives (aucune migration destructive) : une version précédente lit les données existantes. Les jobs d'email en attente restent traités par la version restaurée.
- Secrets : renouveler les clés Resend, Cloudinary et Atlas en cas de fuite ; aucune n'est exposée au frontend.

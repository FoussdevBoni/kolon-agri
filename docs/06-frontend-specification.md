# Frontend React — spécification

## Routage
Public : `/`, `/a-propos`, `/services`, `/catalogue`, `/catalogue/:slug`, `/demande-de-devis`, `/accompagnement`, `/mise-en-relation`, `/contact`.
Authentification : `/connexion` (paramètres `redirect`, `raison=session-expiree|deconnexion`), `/mot-de-passe-oublie` (confirmation neutre), `/definir-mot-de-passe#token=…` (invitation ou réinitialisation).
Dashboard : `/dashboard`, `/dashboard/pages`, `/dashboard/products` (+ `/nouveau`, `/:id`), `/dashboard/categories`, `/dashboard/demandes` (liste unifiée filtrable ; `/dashboard/quotations`, `/dashboard/accompaniment`, `/dashboard/matching` y redirigent avec le filtre de type), `/dashboard/quotations/:id`, `/dashboard/accompaniment/:id`, `/dashboard/matching/:id`, `/dashboard/partners` (+ `/nouveau`, `/:id`), `/dashboard/services` (+ `/nouveau`, `/:id`), `/dashboard/media`, `/dashboard/pages/:id`, `/dashboard/notifications` (filtre toutes/non lues, ouverture de la fiche concernée), `/dashboard/messages` (+ `/:id`), `/dashboard/admins`, `/dashboard/admins/nouveau`, `/dashboard/admins/:id` (superAdmin). Toutes les routes `/dashboard/*` exigent une session ; session restaurée via `/auth/me` au chargement, jeton CSRF conservé en mémoire uniquement ; toute réponse `SESSION_EXPIRED` renvoie vers `/connexion`. Routes de liste correspondantes. Preview CMS `/dashboard/pages/:id/preview` authentifiée.

## Architecture
`src/app`, `core/api`, `core/auth`, `core/components`, `modules/<domain>/{components,hooks,services,types,schemas}`, `layouts`, `pages`, `styles`. Composants sans appels HTTP ; `Page → hook → service → apiClient`. Cookies inclus, CSRF mutating requests, erreurs centralisées. Lazy loading dashboard et écrans lourds.

## Pilotage
Accueil du dashboard : indicateurs (à traiter, nouvelles, en cours, mes demandes ouvertes) reliés aux listes filtrées, demandes prioritaires avec motif, évolution par période (histogramme SVG accessible doublé d'un tableau), répartition par type et statut, catalogue et contenus, activité récente. Compteur de notifications non lues sur l'onglet « Alertes » et dans la sidebar, rafraîchi toutes les 60 s (suspendu onglet masqué). « Messages » figure dans « Plus » sur mobile.

## Navigation
Desktop : sidebar repliable ; tablette : compacte ; mobile : bottom bar `Accueil`, `Demandes`, `Produits`, `Alertes`, `Plus` (icône ellipsis). Plus ouvre les modules secondaires ; règles RBAC de visibilité ; `safe-area-inset-bottom`. Une source de configuration des menus.

## Design
Thème clair uniquement dashboard ; site public moderne premium agricole. Palette `#174D38`, `#4F8061`, `#F8F7F2`, `#E8DDC8`, `#202923`. Titres Manrope, UI Inter. Responsive mobile-first, focus clavier, reduced-motion, images optimisées.

## Formulaires
React Hook Form + Zod. Sauvegarde manuelle ; `isDirty` bloque navigation interne et `beforeunload` avertit selon capacités navigateur. Erreur garde les saisies. 409 affiche conflit de version sans écrasement silencieux.

## Panier devis
`localStorage` 30 jours après dernière modification ; version 1, `{productId,variantId,quantity}` uniquement, sans données personnelles/prix fiables. Une ligne par paire produit/variante ; ajout incrémente quantité ; revalidation serveur des variantes et prix avant soumission ; vider après succès ; nouvelle tentative réseau conserve même clé d'idempotence (une clé par contenu de formulaire : toute modification en génère une nouvelle). Les lignes devenues invalides sont signalées et bloquent l'envoi jusqu'à leur retrait. La confirmation affiche la référence. Synchronisation entre onglets.

## SEO
Les pages publiques indexables nécessitent stratégie explicite de pré-rendu ou SSR compatible avec Vite ; pas de supposition que CSR suffit. Sitemap, robots, canonical, métadonnées par page.
Stratégie retenue (sans dépendance supplémentaire) : pré-génération au build de l'en-tête HTML des pages publiques fixes (`/`, `/a-propos`, `/services`, `/catalogue`, `/demande-de-devis`, `/accompagnement`, `/mise-en-relation`, `/contact` → `<route>/index.html` : titre, description, canonical, Open Graph) et de `robots.txt` (espaces privés exclus, `Sitemap` absolu si `VITE_SITE_URL`). À l'exécution, chaque page publique met à jour titre (sans doublon de marque), description, canonical sans paramètres, Open Graph et `robots: index, follow` ; fiche produit avec image de partage et données structurées `Product` (offre agrégée en XOF) ; dashboard et authentification en `noindex, nofollow`, sans canonical. Plan du site dynamique servi par l'API et exposé à la racine (`/sitemap.xml`, réécriture). Limite : le contenu des pages (sections CMS, fiches produit) reste rendu côté client ; un rendu serveur ou un pré-rendu complet est une évolution possible (dépendance ou architecture à valider). Favicon SVG, préconnexion au CDN Cloudinary, message `noscript`.

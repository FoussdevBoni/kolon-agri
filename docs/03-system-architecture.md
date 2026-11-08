# Architecture système

## Stack
Node.js 22, Express 5, TypeScript, Mongoose/MongoDB, Zod ; React, Vite, TSX, Tailwind CSS, React Router, TanStack Query, React Hook Form ; pnpm workspace ; Cloudinary ; email asynchrone.

## Dépôt
`frontend/`, `backend/`, `docs/` dans un Git unique. Déploiements séparés. Un frontend Vite, deux espaces `public` et `dashboard` ; un backend REST.

## Modules backend
`auth`, `admins`, `products`, `categories`, `quotations`, `accompanimentRequests`, `matchingRequests`, `partners`, `pages`, `services`, `media`, `notifications`, `dashboard`, `contactMessages` et services partagés d'audit, email, activités, affectations et idempotence.

## Règle fondamentale des routes
**Aucun préfixe `/admin` ou `/public` dans l'API.** Chaque ressource a son préfixe `/api/v1/<ressource>` ; l'autorisation dépend de la route et du middleware. `/api/v1/admins` est le module autonome de gestion administrative ; la collection des identités peut rester `users`.

## Organisation d'un module
`productRoutes.ts`, `productController.ts`, `productService.ts`, `productSchema.ts`, `productModel.ts`, `productRepository.ts` si utile. camelCase singulier. Services séparés des controllers et routes ; intégrations Cloudinary/email centralisées. `core` ne dépend d'aucun domaine.

## Déploiement
Frontend statique (CDN HTTPS) et API Node.js derrière reverse proxy HTTPS, idéalement sur la même origine (`/api`). Worker d'emails intégré au processus de l'API. Procédure, variables, sauvegardes et retour arrière : README, section « Déploiement et exploitation ».

## HTTP
Réussite `{success:true,data,meta?}` ; erreur `{success:false,error:{code,message,details?}}`. ObjectId transmis comme string, dates ISO UTC, montants FCFA entiers. Pagination/filtre/recherche côté serveur.

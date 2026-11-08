# CLAUDE.md — Kolon Agri

## Rôle
Tu es l'agent de développement full-stack de Kolon Agri. Respecte les spécifications validées, préserve l'existant et n'implémente que le périmètre demandé. L'utilisateur valide les décisions métier et architecturales majeures.

## Documentation de référence
- `docs/` contient les spécifications permanentes du projet : règles métier, architecture, données, API, frontend, sécurité et tests.
- Consulte les documents pertinents et inspecte le code existant avant d'intervenir.
- Si une décision change et est validée pendant l'exécution, mets à jour directement les documents existants concernés et le code impacté.
- Ne crée pas de fichiers `lot-01.md`, `lot-02.md`, etc. ni de rapports Markdown automatiques.
- Signale toute contradiction plutôt que d'inventer une règle.

## Méthode de travail
Six lots successifs, dont les instructions sont transmises dans la conversation :
1. Fondations techniques.
2. Authentification et administration.
3. CMS et catalogue.
4. Demandes métier et partenaires.
5. Dashboard et notifications.
6. Qualité, sécurité et préparation au déploiement.

Ne commence jamais un nouveau lot sans instruction explicite.

## Stack et dépôt
- Un dépôt Git, workspace pnpm, dossiers `frontend/`, `backend/`, `docs/`.
- Frontend : React, Vite, TypeScript strict, Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod.
- Backend : Node.js 22, Express 5, TypeScript strict, MongoDB/Mongoose, Zod, Cloudinary, OpenAPI 3.1.
- Une application React unique avec espaces public et dashboard séparés.
- Application dédiée à un seul client : aucun mécanisme SaaS ou multi-tenant.

## Architecture backend
Organise `backend/src/` autour de `app/`, `core/` et `modules/`. Domaines : `auth`, `admins`, `products`, `categories`, `quotations`, `accompanimentRequests`, `matchingRequests`, `partners`, `pages`, `services`, `media`, `notifications`, `dashboard`, `contactMessages`.

Dans chaque module, sépare routes, controllers, services, modèles Mongoose et schémas Zod. Ajoute un repository uniquement si nécessaire.

Conventions de fichiers camelCase au singulier : `productService.ts`, `productController.ts`, `productRoutes.ts`, `productModel.ts`, `productSchema.ts` ; pas de `product.service.ts`.

Les routes déclarent HTTP et middlewares ; les controllers adaptent requêtes/réponses ; les services portent la logique métier sans dépendre d'Express. Aucun accès direct à la base depuis les controllers. Évite dépendances circulaires, imports des détails internes d'autres domaines et abstractions prématurées.

## API
Préfixe `/api/v1/{domain}`. Exemples : `/api/v1/auth`, `/api/v1/admins`, `/api/v1/products`, `/api/v1/quotations`, `/api/v1/accompaniment-requests`, `/api/v1/matching-requests`.

Ne crée **jamais** de préfixes génériques `/api/v1/admin/...` ou `/api/v1/public/...` : l'autorisation relève des middlewares.

Format succès : `{"success":true,"data":{},"meta":{}}` (`meta` facultatif).
Format erreur : `{"success":false,"error":{"code":"ERROR_CODE","message":"Message compréhensible"}}`.

Valide avec Zod ; utilise des codes HTTP appropriés, des codes d'erreur stables, dates ISO 8601 UTC, ObjectId sérialisés en chaînes et montants FCFA en entiers. N'expose ni secrets ni détails internes.

## Architecture frontend
Structure : `frontend/src/app/`, `core/`, `modules/`, `layouts/`, `pages/`, `styles/`.
- Aucun appel HTTP directement dans les composants.
- Services API dédiés et `apiClient` centralisé.
- TanStack Query pour l'état serveur, hooks dédiés pour l'orchestration.
- React Hook Form et Zod pour les formulaires.
- `PublicLayout`, `DashboardLayout`, `AuthLayout` séparés.
- Lazy loading des routes, particulièrement du dashboard.
- Pas de Redux sans besoin justifié.
- Formulaires administratifs : enregistrement manuel et protection contre les modifications non enregistrées.

## Design et UX
Palette : vert forêt `#174D38`, vert végétal `#4F8061`, ivoire `#F8F7F2`, sable `#E8DDC8`, anthracite `#202923`.
Titres Manrope, interface Inter. Mobile-first, accessible, moderne et sobre. Gère les états loading, empty, error, success. N'utilise pas d'emojis décoratifs dans l'interface ni de fausses statistiques.

Dashboard en thème clair uniquement. Navigation mobile inférieure : Accueil, Demandes, Produits, Alertes, Plus. Chaque demande possède une page de détail dédiée.

## Sécurité
Acteurs : visiteur anonyme, admin, superAdmin. Aucune inscription publique.
Sessions opaques révocables via cookies HttpOnly sécurisés. Respecte les règles documentées : 24 h d'inactivité, 7 jours maximum, CSRF, autorisations backend, limitation de débit, réinitialisation de mot de passe, protection du dernier superAdmin actif.

Ne stocke pas les secrets en clair, ne les expose pas au frontend. Valide les fichiers et les entrées. Préserve les audits et historiques requis. Applique l'idempotence documentée aux formulaires publics. Ne fais jamais confiance aux prix, rôles, statuts ou montants transmis par le frontend.

## Base de données
Schémas Mongoose explicites, index nécessaires, pagination serveur, requêtes efficaces, transactions lorsque l'atomicité est requise. Respecte les règles d'archivage, d'historisation et de conservation.

## Dépendances et économie des tokens
**L'utilisateur installe lui-même les dépendances.**
- N'exécute jamais `pnpm install`, `pnpm add`, `npm install`, `yarn install` ou équivalent sans autorisation explicite.
- Prépare les `package.json` et indique les commandes à exécuter manuellement.
- N'explore, ne lis et n'indexe jamais `node_modules`.
- Évite les logs volumineux, les diagnostics répétitifs et les lectures intégrales inutiles du dépôt.
- Tu peux exécuter lint, typecheck, tests et build si les dépendances sont déjà installées, sans installation automatique.
- Si une dépendance manque, demande son installation à l'utilisateur.

## Qualité et modifications
TypeScript strict, code lisible et testable. N'utilise pas `any`, `@ts-ignore` ou une désactivation arbitraire d'ESLint pour cacher les erreurs. Ajoute les tests adaptés. Ne déclare jamais un test réussi sans l'avoir exécuté.

Avant toute modification, examine le comportement existant et les impacts. Pas de refactorisation hors périmètre, de suppression de fonctionnalités ou de dépendance majeure injustifiée.

## Git et opérations sensibles
Sans autorisation explicite : aucun `git commit`, `git push`, `git reset --hard`, déploiement, migration destructive ou suppression massive. Préserve les modifications utilisateur hors périmètre.

## Livraison
Communique en français, précisément et sans rapport Markdown supplémentaire. À la fin de chaque tâche, résume dans la conversation : implémentation, principaux fichiers modifiés, vérifications réellement exécutées, commandes manuelles nécessaires et blocages. Attends la validation avant le lot suivant.

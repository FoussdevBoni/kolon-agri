# Plan d'implémentation pour Codex

## Règles d'exécution
Lire docs 01–09 avant toute implémentation. Ne pas changer architecture, routes ou règles validées. Toute ambiguïté bloquante : consigner question précise, ne pas inventer un workflow. Développer verticalement par module, avec tests et OpenAPI. Fournir pour chaque lot : fichiers modifiés, tests exécutés, résultats, limites.

## Lot 1 — Fondations
pnpm workspace, frontend/backend TypeScript, base MongoDB Atlas de test isolée avec garde-fous, env examples, ESLint, test runner, CI, API client, réponses standard, erreurs, Zod, logs.

## Lot 2 — Identités
Users, sessions, script superAdmin, invitations, login/reset/logout, RBAC, CSRF, admins, audit ; tests de concurrence du dernier superAdmin.

## Lot 3 — Catalogue et CMS
Media Cloudinary, catégories, produits/variantes, services, pages structurées, snapshots publiés, preview et versions ; tests publication et références médias.

## Lot 4 — Demandes
Panier localStorage, devis, accompagnement, matching, partenaires, contact ; idempotence, snapshots, affectations, activités, emails asynchrones.
Réalisé : panier, devis, accompagnement, mise en relation, partenaires, liste unifiée `/dashboard/demandes`, idempotence, snapshots, affectations, notes et activités. Non inclus dans les instructions du lot 4 et à replanifier : formulaire de contact, emails asynchrones et mot de passe oublié.

## Lot 5 — Dashboard
Layouts, sidebar/bottom bar, tableaux filtrés/paginés, fiches dédiées, notifications, statistiques, édition manuelle, confirmations.
Réalisé : indicateurs et évolution, demandes à traiter, activité récente, notifications internes, emails transactionnels Resend par file asynchrone, formulaire de contact et `/dashboard/messages`, mot de passe oublié. Contact, emails et mot de passe oublié, reportés du lot 4, sont traités ici.

## Lot 6 — Livraison
Tests E2E, durcissement sécurité, SEO pré-rendu, accessibilité, optimisation, configuration déploiement et guide d'exploitation.
Réalisé : audit et corrections de sécurité (voir 07), isolation des emails et des environnements, recette navigateur complète sur une base de recette isolée (`kolon_agri_recette`, sans worker d'emails), vérification Atlas, Cloudinary et Resend (sans envoi), SEO (en-têtes pré-générés, métadonnées dynamiques, données structurées, robots.txt, plan du site), cache CDN des contenus publiés, procédure de déploiement et d'exploitation (README). Tests E2E automatisés (navigateur) : non outillés, faute de dépendance dédiée ; parcours couverts par tests d'intégration, tests de composants et recette manuelle.

## Définition de terminé par lot
Typecheck, lint, tests pertinents, build, revue permissions, documentation API à jour, démonstration du parcours. Aucun lot considéré fini si tests non exécutés sans justification explicite.

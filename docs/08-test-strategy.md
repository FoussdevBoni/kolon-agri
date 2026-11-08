# Stratégie de test et critères d'acceptation

## Tests unitaires
Zod, règles de statuts, calcul devis, panier, expiration, normalisation emails, permissions, contrôles de version.

## Intégration API
Base MongoDB Atlas de test strictement isolée, fournie par `MONGODB_TEST_URI` (secret CI, `backend/.env` en local) ; pas de base en mémoire. Garde-fous avant toute connexion : `NODE_ENV=test`, nom de base explicite suffixé `_test` et distinct de celui de `MONGODB_URI`, vérification de la base active avant chaque opération ; aucune opération destructive hors de la base de test. Tests MongoDB ignorés localement sans `MONGODB_TEST_URI`, obligatoires en CI.
- Visiteur voit seulement produits publiés ; POST public demande permis, GET liste interdit.
- Prix de devis déterminés exclusivement côté serveur ; snapshot stable après modification produit.
- Même clé idempotente + même corps : une seule demande, même réponse ; corps différent : 409 ; deux appels simultanés : une seule création.
- Désactivation admin invalide accès immédiatement ; dernier superAdmin actif intouchable y compris en concurrence.
- CMS brouillon invisible au public jusqu'à publication ; conflit section 409 ; restauration vers brouillon.
- Partenaire inactif non associable ; associations existantes conservées.
- Suppression média référencé refusée.
- Email en échec n'annule pas demande et produit un job réessayable.

- Santé : la logique (200/503) est testée sans réseau en unitaire ; le test d'intégration `health` vérifie la disponibilité réelle de la base Atlas de test (délai de ping `MONGODB_PING_TIMEOUT_MS`, 15 s en test) et échoue en cas de panne effective.
- Les tests ne peuvent ni envoyer d'email réel ni appeler Cloudinary : clés neutralisées dans `vitest.config.ts`, configuration refusée si une clé Resend est présente en test, fournisseur toujours nul en test, worker interdit en test et sur une base `_test`. Les serveurs de développement utilisent une base distincte (une base `_test` y est refusée).
- Emails testés avec un fournisseur simulé (panne, reprise, abandon, verrou expiré, expiration, unicité) : un email simulé ne prouve pas une livraison réelle par Resend.

- SEO : génération de `robots.txt` et des en-têtes des pages fixes, formatage des titres et canonical (tests unitaires) ; plan du site et en-têtes de cache (intégration).

## E2E
Catalogue → variantes → panier persistant → formulaire → référence ; demandes accompagnement et matching ; login/logout ; dashboard responsive et onglet Plus ; édition CMS brouillon/preview/publication ; navigation formulaire dirty ; permissions admin vs superAdmin.

## Qualité
Typecheck, lint, tests et build dans CI ; aucun secret Git ; OpenAPI cohérent avec implémentation ; tests accessibilité clavier et viewport mobile ; contrôles sécurité basiques.

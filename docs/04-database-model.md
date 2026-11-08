# Modèle de données MongoDB

Collections : `users`, `sessions`, `companyProfiles`, `pages`, `services`, `categories`, `products`, `quotations`, `accompanimentRequests`, `matchingRequests`, `partners`, `matchingAssignments`, `notifications`, `emailJobs`, `requestActivities`, `auditLogs`, `media`, `contactMessages`, `idempotencyKeys`, `adminGuards`, `counters`.

## Contraintes
- `users.email` unique normalisé (minuscules) ; rôle `admin|superAdmin`, statut `pending|active|disabled` ; `passwordHash` (scrypt) et `passwordToken` `{hash, purpose: invitation|reset, expiresAt}` jamais sélectionnés par défaut ni exposés.
- `sessions` : `tokenHash` (SHA-256) unique, `csrfToken`, `userId`, `lastActivityAt`, `expiresAt` (TTL), `ip`, `userAgent` ; une session invalide est supprimée.
- Dernier superAdmin actif protégé transactionnellement : toute transaction pouvant retirer un superAdmin actif écrit le document `adminGuards/activeSuperAdmins`, ce qui sérialise les opérations concurrentes.
- `categories.slug` et `products.slug` uniques ; `products.previousSlugs` (anciennes adresses, unicité vérifiée par le service) ; `categories.position` et `isActive` ; produits archivés conservés ; variantes embarquées avec IDs stables ; `services.slug` unique.
- `pages.key` unique ; brouillon (`draft.revision`, sections avec ID UUID et version) et snapshot publié indépendants ; historique `versions` embarqué (20 dernières publications). La collection `companyProfiles` n'est pas créée : l'identité et les coordonnées du site sont gérées par la page CMS `site`.
- `quotations.reference`, `accompanimentRequests.reference`, `matchingRequests.reference` uniques, générées dans la transaction de création via `counters` (un compteur par préfixe et par année). Index sur `status`, `assignedTo`, `createdAt` ; recherche par référence, nom, téléphone et localité.
- `requestActivities` : `requestType` (`quotation|accompaniment|matching`), `requestId`, `actorId` (nul pour le visiteur), type (`created|statusChanged|assignmentChanged|note|partnerAssociated|partnerAssociationUpdated|partnerAssociationRemoved`) et données ; jamais purgés avec les audits. Les mises à jour de statut utilisent une condition sur le statut courant (409 en cas de modification concurrente).
- `partners` : index sur `category`, `status`, `regions`, `archivedAt` ; aucune lecture publique.
- `matchingAssignments` référence une demande et un partenaire ; index unique partiel `(requestId, partnerId)` limité aux associations actives ; désassociation logique (`active=false`, `removedAt`, `removedBy`).
- `idempotencyKeys` index unique `(scope,key)` et TTL sur `expiresAt` ; ne pas compter sur TTL pour l'exclusion concurrente ; la réservation de la clé et la création de la demande sont dans la même transaction, la réponse initiale est stockée avec l'empreinte SHA-256 du payload.
- `contactMessages` : référence unique, `customer {name, phone|null, email|null}`, objet, message, statut, `assigneeId` ; index statut et responsable par date.
- `notifications` : `recipientId`, `kind` (`requestCreated|assigned|requestUpdated`), cible `{type, id}`, référence, titre, texte, `eventKey` (identifiant de l'entrée d'historique source), `readAt`, `expiresAt` (TTL 180 jours) ; index unique `(recipientId, eventKey)` et index `(recipientId, readAt, createdAt)`.
- `emailJobs` : gabarit, destinataire, données de rendu (aucun jeton ni lien secret : les liens à usage unique sont générés à l'envoi), `dedupeKey` unique, statut `pending|processing|sent|failed|cancelled|expired`, tentatives (6 maximum, délais 1 min à 3 h), verrou `lockedUntil` (2 min), dernière erreur résumée, `sendBefore`, purge TTL `purgeAt` à 30 jours. Ajout par upsert dans la transaction métier ; réservation atomique (`findOneAndUpdate`) par le traitement.
- `requestActivities.requestType` inclut `contact` ; index `createdAt` et `(type, createdAt)` pour l'activité récente et les statistiques.
- `auditLogs` conservés 12 mois, TTL paramétrable ; les historiques métier ne sont pas purgés avec les audits.
- `media` contient l'identifiant Cloudinary et les métadonnées (type réel, poids, dimensions, texte alternatif) ; les références sont calculées à la demande par les domaines propriétaires (produits, catégories, services, pages) via un registre du `core`, sans dépendance circulaire ; suppression interdite tant que référencé.

## Transactions
Utiliser transactions pour changements critiques multi-documents : superAdmin final, idempotence + création, changement d'affectation + historique, publication CMS, événement métier + notifications + jobs d'email. MongoDB Atlas (replica set) en développement, test et production ; les tests d'intégration utilisent une base Atlas de test isolée (voir 08).

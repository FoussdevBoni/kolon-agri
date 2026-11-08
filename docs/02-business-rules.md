# Règles métier

## Produits et variantes
Catégories et produits indépendants. Variantes intégrées au produit : id, label, sku facultatif, unité, conditionnement facultatif, prix indicatif facultatif, `priceOnRequest`, disponibilité `available|unavailable|onRequest`, `isActive`. Le produit simple possède une variante Standard. Prix/disponibilité uniquement au niveau variante. Produit publié : au moins une variante active. Variante désactivée ou indisponible non sélectionnable ; `onRequest` sélectionnable sans prix ferme.
Un produit appartient au plus à une catégorie. Cycle de vie `draft|published|archived` : publication explicite, archivage (retiré du public, conservé), restauration en brouillon. Les variantes conservent leur identifiant lors des modifications ; une variante désactivée n'est jamais exposée publiquement. Prix indicatifs en FCFA entiers ; une variante « sur demande » n'a pas de prix. Slugs uniques et non modifiés automatiquement ; un ancien slug reste résolu vers l'adresse courante. Mise en avant (`featured`) pour l'accueil.
Catégories : nom, slug unique, description, image, ordre d'affichage, visibilité. Une catégorie masquée n'est plus listée publiquement (les produits restent visibles s'ils sont publiés) ; suppression refusée tant qu'un produit, même archivé, y est rattaché.

## Services et médias
Services : titre, slug unique, résumé, paragraphes, image, ordre, statut `draft|published` ; seuls les services publiés sont exposés. Médias : JPEG, PNG ou WebP, 5 Mo maximum, 16 à 8 000 px par côté ; un média utilisé par un produit, une catégorie, un service ou une page (brouillon ou version publiée) ne peut pas être supprimé.

## Devis
Multi-produit. Visiteur : nom, téléphone, localisation obligatoires, email et message facultatifs. Lignes : productId, variantId, quantité entière positive. Le serveur ignore tout prix client et fige le nom produit, variante, unité, quantité, prix indicatif, sous-total, total des lignes tarifées et `hasUnpricedItems`. Référence unique DEV-YYYY-NNNNN. Statuts `new|inProgress|processed|closed`. Les modifications ultérieures de catalogue ne modifient pas le devis historique.
Une ligne n'est acceptée que si le produit est publié et la variante active et non `unavailable` ; une variante `onRequest` ou `priceOnRequest` est figée sans prix. Les lignes identiques sont fusionnées (quantités additionnées) ; une ligne invalide fait refuser toute la demande avec le détail par ligne. La réponse publique ne contient que la référence et la date.
Transitions : `new → inProgress|closed` ; `inProgress → processed|closed` ; `processed → inProgress|closed` ; `closed` final.

## Accompagnement
Nom, téléphone, lieu, type, description, phase (`idea|preparation|started|expansion`), besoins obligatoires ; email, surface, budget global du projet facultatifs. Type de projet `crops|marketGardening|livestock|agroProcessing|other`. Surface en hectares (décimale positive) et budget en FCFA entier. Référence ACC-YYYY-NNNNN. Statuts `new|underReview|contacted|engaged|closed|rejected`.
Transitions : `new → underReview|rejected|closed` ; `underReview → contacted|rejected|closed` ; `contacted → engaged|rejected|closed` ; `engaged → closed` ; `closed` et `rejected` finaux.

## Mise en relation
Demande publique ; partenaires internes uniquement. Statuts `new|underReview|searching|partnerIdentified|connected|closed`. Partenaire préexistant et actif exigé avant association. Association `proposed|contacted|interested|declined|connected`; retrait logique, historique conservé.
Demande : coordonnées visiteur, catégorie de besoin (mêmes catégories que les partenaires), description et échéance facultative. Référence MER-YYYY-NNNNN.
Transitions : `new → underReview|closed` ; `underReview → searching|closed` ; `searching → partnerIdentified|closed` ; `partnerIdentified → connected|searching|closed` ; `connected → closed` ; `closed` final. `partnerIdentified` exige une association active ; `connected` exige une association au statut `connected`. Aucune association n'est possible sur une demande clôturée ; un partenaire ne peut être associé deux fois activement à la même demande.
Partenaires (annuaire privé, jamais exposé publiquement) : nom, catégorie `inputSupplier|equipmentSupplier|buyer|serviceProvider|transport|financing|training|other`, description, régions couvertes, contact, téléphone, email, adresse, notes internes ; statut `active|inactive` ; archivage logique. Seul un partenaire actif et non archivé peut être associé ; les associations existantes restent consultables.

## Traitement
Tous les admins actifs voient et traitent toutes les demandes ; responsable unique facultatif ; changements d'affectation, statut, notes tracés dans `requestActivities`. Désactivation admin : retrait des affectations (tracé, motif `accountDisabled`). Seul un admin actif peut être affecté. Une transition non autorisée est refusée (409) avec les statuts possibles. Notes internes non publiques et non modifiables.

## CMS
Ensemble fixe de pages : `home`, `about`, `services`, `catalog`, `quotation-request`, `accompaniment`, `matching`, `contact` et `site` (identité et coordonnées du pied de page), chacune avec ses types de sections autorisés. Types : bandeau, texte, cartes, image et texte, appel à l'action, FAQ, produits mis en avant, liste des services, coordonnées, identité du site ; bandeau, coordonnées et identité limités à une occurrence par page. Liens limités aux chemins internes, `https:`, `mailto:` et `tel:`. Les 20 dernières versions publiées sont conservées.
Sections typées, pas de HTML/JS libre. Édition section par section avec `expectedVersion`; conflit 409. Brouillon séparé du snapshot publié. Sauvegarde manuelle ; publication explicite ; restauration d'une version vers le brouillon uniquement.

## Contact
Formulaire public : nom, objet (3 à 150 caractères), message (10 à 5 000) obligatoires ; téléphone ou email (au moins l'un des deux). Référence CTC-YYYY-NNNNN. Mêmes protections que les demandes (idempotence, limite par IP). Traitement par le workflow commun (responsable, notes, historique). Statuts `new|inProgress|processed|closed` ; transitions `new → inProgress|processed|closed` ; `inProgress → processed|closed` ; `processed → inProgress|closed` ; `closed` final.

## Notifications internes
Créées dans la transaction de l'événement métier, une par destinataire et par événement (pas de doublon en cas de rejeu) : nouvelle demande ou nouveau message → tous les admins actifs ; affectation par un autre admin → le nouveau responsable ; changement de statut, note ou association partenaire par un tiers → le responsable actuel. L'auteur d'une action n'est jamais notifié. Chaque admin ne voit que ses notifications ; marquage lu individuel ou global ; conservation 180 jours. Consultation par rafraîchissement périodique (60 s), sans WebSocket.

## Emails transactionnels
Envoyés par Resend via une file asynchrone (`emailJobs`), jamais dans la requête métier : une panne du fournisseur n'annule pas une demande enregistrée. Accusé de réception au visiteur uniquement si un email est fourni, sans aucun texte saisi par le visiteur (référence seule) et au plus 3 par adresse sur 24 h ; alerte aux admins actifs à chaque nouvelle demande ou message ; email d'affectation au responsable désigné par un tiers ; invitation et réinitialisation de mot de passe. Sans `RESEND_API_KEY`, aucun envoi : les liens d'invitation/réinitialisation restent affichés une fois au superAdmin et « mot de passe oublié » n'a pas d'effet (réponse neutre inchangée).

## Indicateurs du dashboard
Calculés côté serveur sur les données réelles. Catégories de statut : nouvelles (`new`), en cours (statuts intermédiaires, y compris `connected`), terminées (devis `processed|closed`, accompagnement `closed|rejected`, mise en relation `closed`, contact `processed|closed`). « À traiter » : élément ouvert sans responsable, ou nouveau depuis plus de 48 h. Évolution sur 7 j, 30 j (par jour), 90 j (par semaine, lundi) ou 12 mois (par mois), en UTC, comparée à la période précédente ; « menées à terme » = passages vers un statut terminé dans la période. Activité récente sans contenu des notes.

## Idempotence
POST publics devis, accompagnement, matching et contact : `Idempotency-Key` UUID par soumission logique ; clé + scope + empreinte du payload, réponse initiale rejouée si identique ; 409 si payload différent ; 24 h de rétention TTL ; empêcher création concurrente doublonnée par réservation unique et transaction. Reprise réseau avec même clé.

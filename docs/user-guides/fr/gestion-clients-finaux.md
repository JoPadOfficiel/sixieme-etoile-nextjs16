# Guide Utilisateur : Gestion des Clients Finaux (EndCustomers)

## Introduction

Dans le système VTC ERP, la notion de **Client Final** (EndCustomer) permet de distinguer l'entité qui passe la commande (généralement une Agence Partenaire) de la personne ou l'entreprise qui bénéficie réellement du transport.

Cette fonctionnalité "Mini-CRM" est essentielle pour :
*   **Les Agences de Voyage :** Gérer plusieurs clients VIP sous un même compte agence.
*   **La Tarification :** Appliquer une "Taxe de Patience" (Difficulty Score) spécifique au client final, indépendante de l'agence.
*   **Le Dispatch :** Informer les chauffeurs de l'identité réelle du passager.
*   **Les Documents :** Afficher le nom du client final sur les devis et factures pour faciliter la réconciliation comptable de vos partenaires.

---

## Accéder aux Clients Finaux

Les clients finaux sont toujours rattachés à un **Contact Parent** de type "Agence" ou "Business". Ils ne vivent pas "seuls" dans le système.

1.  Allez dans **CRM / Contacts**.
2.  Ouvrez un contact partenaire (ex: "Voyage Deluxe Paris").
3.  Faites défiler jusqu'à la section **"Clients Finaux & Sous-contacts"**.

---

## Ajouter un Client Final

1.  Dans la fiche du contact partenaire, section "Clients Finaux", cliquez sur le bouton **"Ajouter un client final"**.
2.  Un formulaire s'ouvre. Remplissez les informations :
    *   **Prénom / Nom :** Essentiel pour l'identification.
    *   **Email / Téléphone :** Utiles pour le chauffeur.
    *   **Entreprise :** (Optionnel) Si le passager représente lui-même une sous-entité.
    *   **Score de Difficulté (1-10) :** Voir section ci-dessous.
3.  Cliquez sur **"Sauvegarder"**.

![Ajout d'un client final](placeholder-screenshot-add-endcustomer)

---

## Le Score de Difficulté (Patience Tax)

Le **Score de Difficulté** est une note de 1 à 10 attribuée à un client final spécifique.

*   **1** : Client très facile, ponctuel.
*   **5** : Standard.
*   **10** : Client très exigeant, retards fréquents, gestion complexe.

**Impact sur le Prix :**
Le moteur de tarification peut être configuré pour appliquer une majoration automatique (Patience Tax) pour les clients ayant un score élevé (ex: > 7). Cela permet de compenser le temps de gestion supplémentaire requis pour ces clients VIP, sans pénaliser l'agence partenaire globalement.

---

## Utilisation dans les Devis et Réservations

Lors de la création d'un devis pour un partenaire :

1.  Sélectionnez le **Client (Payeur)** : ex "Voyage Deluxe Paris".
2.  Un nouveau champ **"Client Final (Passager)"** apparaît en dessous.
3.  Vous pouvez :
    *   Sélectionner un client final existant dans la liste.
    *   Créer un nouveau client final à la volée via le bouton `+`.
    *   Laisser vide (le système utilisera les infos de l'agence par défaut).

![Sélection client final devis](placeholder-screenshot-quote-selector)

Une fois sélectionné, le nom du client final apparaîtra :
*   Dans le **Cockpit** (résumé du devis).
*   Sur le **PDF du Devis** et de la **Facture** (Mention "Client : [Nom Agence] / Passager : [Nom Client Final]").
*   Sur la **Fiche Mission** pour le chauffeur.

---

## Modification et Suppression

Vous pouvez éditer ou supprimer un client final depuis la fiche du Contact Parent à tout moment.
*   **Modification :** Met à jour les futures réservations. Les devis/factures déjà émis conservent les informations figées au moment de leur création (historique préservé).
*   **Suppression :** Possible uniquement s'il n'y a pas de réservations actives bloquantes (sinon, désactivez-le simplement).

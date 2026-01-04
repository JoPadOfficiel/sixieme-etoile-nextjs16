# Guide Utilisateur : Modification des Notes de Devis

**Version:** 1.0  
**Date:** 2026-01-04  
**Public:** Opérateurs commerciaux, Dispatchers

---

## Introduction

Vous pouvez maintenant modifier les notes opérationnelles d'un devis même après son envoi au client. Cette fonctionnalité permet de mettre à jour les instructions pour les conducteurs sans modifier les conditions commerciales du devis.

### Cas d'Usage

- ✅ Ajouter des instructions de dernière minute pour le conducteur
- ✅ Préciser des détails logistiques (code d'accès, contact sur place)
- ✅ Mettre à jour les informations de contact du passager
- ✅ Ajouter des notes de sécurité ou des préférences client

---

## Règles de Modification

### Champs Modifiables Selon le Statut

| Statut du Devis | Champs Modifiables | Champs Verrouillés              |
| --------------- | ------------------ | ------------------------------- |
| **DRAFT**       | Tous les champs    | Aucun                           |
| **SENT**        | Notes uniquement   | Prix, dates, véhicule, adresses |
| **ACCEPTED**    | Notes uniquement   | Prix, dates, véhicule, adresses |
| **REJECTED**    | Notes uniquement   | Prix, dates, véhicule, adresses |
| **INVOICED**    | Aucun              | Tous les champs                 |

### Principe de Sécurité

**Pourquoi cette restriction ?**

- **Intégrité commerciale** : Le prix et les conditions envoyés au client ne peuvent pas changer
- **Traçabilité** : Toutes les modifications de notes sont enregistrées avec horodatage
- **Flexibilité opérationnelle** : Les détails logistiques peuvent évoluer sans créer un nouveau devis

---

## Modifier les Notes d'un Devis Envoyé

### Étape 1 : Accéder au Devis

1. Allez dans **Devis** → **Liste des devis**
2. Trouvez le devis à modifier (statut SENT, ACCEPTED ou REJECTED)
3. Cliquez sur le devis pour ouvrir les détails

### Étape 2 : Éditer les Notes

1. Dans la section **Activité** ou **Notes opérationnelles**
2. Cliquez sur l'icône **✏️ Modifier les notes**
3. Le champ de notes devient éditable

![Édition des notes](../../../assets/screenshots/quote-notes-edit.png)

### Étape 3 : Saisir les Nouvelles Informations

Ajoutez ou modifiez les informations :

**Exemples de notes utiles** :

```
Instructions conducteur :
- Code portail : 1234A
- Sonner à l'interphone "Dupont"
- Passager avec 3 valises + 1 sac de golf
- Prévoir 10 min supplémentaires pour chargement

Contact sur place :
- M. Dupont : 06 12 34 56 78
- Mme Martin (assistante) : 06 98 76 54 32

Préférences client :
- Température climatisation : 21°C
- Musique : Jazz en sourdine
- Eau fraîche et journaux à bord
```

### Étape 4 : Enregistrer

1. Cliquez sur **Enregistrer les notes**
2. Une confirmation apparaît : "Notes mises à jour avec succès"
3. L'horodatage de modification est enregistré

---

## Historique des Modifications

### Visualiser l'Historique

Chaque modification de notes est tracée :

1. Accédez au devis
2. Section **Historique des modifications**
3. Voyez toutes les versions des notes avec :
   - Date et heure de modification
   - Utilisateur ayant modifié
   - Ancien contenu
   - Nouveau contenu

![Historique des notes](../../../assets/screenshots/quote-notes-history.png)

### Exemple d'Historique

```
📝 2026-01-04 14:30 - Marie Dubois
Ajout : "Code portail : 1234A"

📝 2026-01-04 16:45 - Jean Martin
Modification : "Passager avec 2 valises" → "Passager avec 3 valises + sac de golf"

📝 2026-01-05 09:15 - Marie Dubois
Ajout : "Contact sur place : M. Dupont 06 12 34 56 78"
```

---

## Synchronisation avec le Dispatch

### Affichage dans le Dispatch

Les notes modifiées sont automatiquement synchronisées avec le dispatch :

1. **Mise à jour en temps réel** : Les notes apparaissent immédiatement dans le dispatch
2. **Badge "Notes mises à jour"** : Indicateur visuel pour le dispatcher
3. **Notification** : Alerte si des notes ont été ajoutées après l'affectation

![Notes dans le dispatch](../../../assets/screenshots/dispatch-quote-notes.png)

### Visibilité pour le Conducteur

Les notes sont visibles par le conducteur :

- **Application mobile** : Affichage dans les détails de mission
- **Ordre de mission** : Inclus dans le document PDF
- **Notifications** : Alerte si notes modifiées après affectation

---

## Bonnes Pratiques

### Quoi Mettre dans les Notes

**✅ Informations Opérationnelles** :

- Codes d'accès (portail, parking, immeuble)
- Instructions de stationnement
- Détails de chargement (bagages spéciaux)
- Contacts sur place

**✅ Préférences Client** :

- Température souhaitée
- Musique ou silence
- Équipements demandés (eau, journaux)
- Allergies ou besoins spéciaux

**✅ Instructions Spéciales** :

- Procédures de sécurité
- Protocole VIP
- Contraintes de timing
- Points de rendez-vous alternatifs

### Quoi NE PAS Mettre dans les Notes

**❌ Informations Commerciales** :

- Modifications de prix (créer un nouveau devis)
- Changements de véhicule (créer un nouveau devis)
- Modifications d'adresses (créer un nouveau devis)

**❌ Informations Sensibles** :

- Numéros de carte bancaire
- Mots de passe
- Informations médicales confidentielles

**❌ Critiques ou Commentaires Négatifs** :

- Plaintes sur le client
- Remarques désobligeantes
- Informations non professionnelles

---

## Cas Particuliers

### Notes pour Missions Récurrentes

Pour les missions récurrentes (même client, même trajet) :

1. **Créez un modèle de notes** : Sauvegardez les notes standard
2. **Copiez-collez** : Utilisez le modèle pour chaque nouveau devis
3. **Personnalisez** : Ajustez selon les spécificités de chaque mission

### Notes pour Séjours STAY

Pour les devis STAY (multi-jours) :

- **Notes globales** : S'appliquent à tout le séjour
- **Notes par jour** : Spécifiques à chaque journée de service
- **Notes par service** : Détails pour chaque transfert/excursion

Organisez vos notes avec des titres clairs :

```
=== JOUR 1 - Transfert Aéroport ===
Code portail hôtel : 5678B
Contact : Réception 01 23 45 67 89

=== JOUR 2 - Excursion Versailles ===
RDV devant l'hôtel à 8h45 précises
Prévoir panier pique-nique
```

### Notes Multilingues

Pour les clients internationaux :

- **Langue principale** : Français pour le conducteur
- **Traduction** : Anglais ou autre langue pour le client
- **Séparation claire** : Utilisez des sections distinctes

```
[FR - Conducteur]
Client anglophone, parle peu français
Prévoir GPS en anglais

[EN - Client]
Driver will meet you at Terminal 2E, Gate 6
Look for sign with your name
```

---

## Notifications et Alertes

### Notifications Automatiques

Le système envoie des notifications quand :

- ✉️ **Notes modifiées après affectation** : Le conducteur reçoit une alerte
- ✉️ **Notes importantes** : Mots-clés détectés (VIP, urgent, code)
- ✉️ **Rappel** : 24h avant la mission avec les notes complètes

### Configuration des Alertes

Personnalisez les notifications dans **Paramètres** → **Notifications** :

- **Email** : Recevoir un email à chaque modification
- **SMS** : Alertes SMS pour notes urgentes
- **Push** : Notifications dans l'application mobile
- **Fréquence** : Immédiate, quotidienne, hebdomadaire

---

## Droits et Permissions

### Qui Peut Modifier les Notes ?

Par défaut :

- ✅ **Administrateurs** : Peuvent modifier toutes les notes
- ✅ **Opérateurs commerciaux** : Peuvent modifier les notes de leurs devis
- ✅ **Dispatchers** : Peuvent modifier les notes des missions affectées
- ❌ **Conducteurs** : Lecture seule (peuvent ajouter des commentaires)

### Configuration des Permissions

Personnalisez dans **Paramètres** → **Utilisateurs** → **Permissions** :

- **Modification libre** : Tous les utilisateurs
- **Modification restreinte** : Uniquement créateur du devis
- **Approbation requise** : Modifications nécessitent validation
- **Lecture seule** : Aucune modification possible

---

## Questions Fréquentes (FAQ)

### Q1 : Puis-je supprimer des notes existantes ?

**R :** Oui, vous pouvez modifier ou supprimer le contenu des notes. Cependant, l'historique conserve toutes les versions précédentes pour traçabilité.

### Q2 : Le client voit-il les notes que j'ajoute ?

**R :** Non, les notes opérationnelles sont internes. Le client ne voit que les informations commerciales du devis. Seuls les conducteurs et l'équipe interne ont accès aux notes.

### Q3 : Que se passe-t-il si je modifie les notes pendant que le conducteur est en route ?

**R :** Le conducteur reçoit une notification push immédiate avec les nouvelles notes. Il peut les consulter dans son application mobile.

### Q4 : Puis-je ajouter des pièces jointes aux notes ?

**R :** Actuellement, seul le texte est supporté. Pour des documents (plans, photos), utilisez la section "Documents" du devis et référencez-les dans les notes.

### Q5 : Les notes sont-elles incluses dans la facture ?

**R :** Non, les notes opérationnelles ne figurent pas sur la facture client. Elles sont uniquement visibles dans l'ordre de mission du conducteur et dans le système interne.

---

## Support

Pour toute question sur la modification des notes :

- **Documentation complète** : [docs/api/README.md](../../api/README.md)
- **Guide dispatch** : [docs/user-guides/fr/dispatch-integration.md](dispatch-integration.md)
- **Support technique** : support@sixieme-etoile.fr

---

**Dernière mise à jour** : 2026-01-04  
**Version** : 1.0 (Epic 22 - Story 22.3)

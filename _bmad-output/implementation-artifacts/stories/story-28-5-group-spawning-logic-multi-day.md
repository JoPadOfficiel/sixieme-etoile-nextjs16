---
title: "Story 28.5 - Group Spawning Logic (Multi-Day)"
status: "backlog"
complexity: "MEDIUM"
assigned_agent: "Amelia"
---

# Story 28.5: Group Spawning Logic (Multi-Day)

## Description
Cette story étend la logique de "Spawning" (création de missions opérationnelles à partir d'une commande confirmée) pour gérer les cas complexes : les lignes de devis groupées (Dossiers Mariage, Packages) et les prestations s'étalant sur plusieurs jours.

Le système doit être capable de :
1. Détecter si une `QuoteLine` est un conteneur (`type: GROUP`).
2. Si c'est un groupe, ne pas créer de mission pour le groupe lui-même, mais itérer sur ses enfants.
3. Détecter si une ligne (groupe ou enfant) représente une durée multi-jours (ex: "Forfait 3 Jours").
4. Dans ce cas, générer une mission distincte pour chaque jour de la prestation, en incrémentant la date.

## Critères d'Acceptation (AC)

### AC1 - Gestion des Groupes
- **Donnée** : Une QuoteLine de type `GROUP` contenant 2 enfants (ex: "Transfert Aller", "Transfert Retour").
- **Comportement** :
  - Aucune mission n'est créée pour la ligne `GROUP` parente.
  - Le service itère sur les enfants.
  - 2 Missions distinctes sont créées, une pour chaque enfant.
  - Les missions héritent des infos de leurs lignes respectives.

### AC2 - Gestion Multi-Jours (Time Range)
- **Donnée** : Une QuoteLine (ou un enfant) avec une définition temporelle > 24h ou une quantité explicite interprétée comme jours (ex: `quantity: 3`, unit: `days`).
- **Comportement** :
  - Le système génère 3 Missions.
  - Mission 1 : Date J (PickupAt de la commande ou de la ligne).
  - Mission 2 : Date J+1.
  - Mission 3 : Date J+2.
  - Les horaires (heure de début/fin) sont préservés pour chaque jour.

### AC3 - Liaison
- Toutes les missions générées doivent être liées :
  - Au même `orderId`.
  - À la `quoteLineId` correspondante (l'enfant si groupe, ou la ligne source).

## Cas de Tests (Stratégie)

1. **Test "Wedding Pack" (Groupe Simple)**
   - Créer une Quote avec une ligne GROUP "Mariage".
   - Ajouter 3 enfants : "Mairie", "Église", "Soirée".
   - Confirmer l'Order.
   - Vérifier que 3 missions existent.

2. **Test "Roadshow 3 Days" (Multi-Jour)**
   - Créer une Quote avec une ligne "Mise à disposition 3 jours" (Quantity=3, Start=Lundi 09:00).
   - Confirmer l'Order.
   - Vérifier que 3 missions existent : Lundi 09:00, Mardi 09:00, Mercredi 09:00.

## Contraintes Techniques
- Étendre `SpawnService` (Singleton ou Service Module).
- Utiliser `date-fns` pour l'arithmétique des dates (`addDays`).
- Gérer la transaction Prisma pour garantir que tout ou rien n'est créé.
- `QuoteLine` a une structure récursive (`children`).


## Implementation Details
- **Branch**: `feature/28-5-group-spawn`
- **Files Modified**:
    - `apps/web/modules/saas/dispatch/services/SpawnService.ts` (New Service)
    - `apps/web/modules/saas/dispatch/services/SpawnService.test.ts` (New Test)

## Test Results
- **Vitest**: PASS
    - `should spawn missions for children of a GROUP line`: OK (2 missions created for children)
    - `should spawn multiple missions for Multi-Day line`: OK (3 missions created for 1 line)

## Status
- **Current Status**: review
- **Ready for Review**: Yes

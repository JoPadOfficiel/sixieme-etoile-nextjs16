# Story 27.4: Gantt Mission Rendering (Hybrid)

**Epic:** 27 - Unified Dispatch (Cockpit)
**Status:** Review
**Priority:** High
**Assigned:** Amelia (Developer)

## 📝 Description
Implémentation du composant visuel représentant une mission sur la timeline du Gantt (`MissionGanttCard`). Ce composant affiche les informations essentielles de la mission et différencie visuellement les missions standard (CALCULATED) des missions manuelles (MANUAL) ou brouillons via un style de bordure (plein vs pointillé) et une transparence conditionnelle.

## ✅ Critères d'Acceptation (AC)

- [x] **AC1 - Affichage Basique** : La carte de mission affiche le nom du Client et le Type de mission (ex: "Transfert", "Mise à disposition").
- [x] **AC2 - Distinction Visuelle (Calculated)** : Les missions de type `CALCULATED` ont un style "Plein" (Bordure solide).
- [x] **AC3 - Distinction Visuelle (Manual)** : Les missions de type `MANUAL` ont un style "Pointillé" (Bordure dashed), un fond semi-transparent et un motif rayé.
- [x] **AC4 - Tooltip** : Au survol de la carte, un tooltip affiche les détails complets (Heure début/fin, Adresses départ/arrivée, Statut).
- [x] **AC5 - Responsive** : Le contenu s'adapte et est tronqué proprement si la durée de la mission est courte.

## 🧪 Stratégie de Test

1.  **Vitest** :
    - `MissionGanttCard.test.tsx` créé.
    - Test de rendu des informations (Client, Titre).
    - Test des classes CSS conditionnelles (border-solid pour CALCULATED, border-dashed pour MANUAL, couleurs de statut).
    - Validation du snapshot.
    - **Résultat** : 5 tests passés.

2.  **Browser Check** :
    - Intégration dans `GanttDriverRow` réussie.
    - Vérification visuelle recommandée lors de la QA.

## ⚙️ Implémentation

### Fichiers Modifiés
- `apps/web/modules/saas/dispatch/components/gantt/MissionGanttCard.tsx` (Nouveau)
- `apps/web/modules/saas/dispatch/components/gantt/__tests__/MissionGanttCard.test.tsx` (Nouveau)
- `apps/web/modules/saas/dispatch/components/gantt/GanttDriverRow.tsx` (Modifié - Utilisation de MissionGanttCard)
- `apps/web/modules/saas/dispatch/components/gantt/types.ts` (Consulté)

### Détails Techniques
- Utilisation de `radix-ui/react-tooltip` via le composant UI partagé.
- Styles Tailwind conditionnels via `cn()`.
- Remplacement du composant inline `MissionBlock` par le nouveau composant atomique `MissionGanttCard`.

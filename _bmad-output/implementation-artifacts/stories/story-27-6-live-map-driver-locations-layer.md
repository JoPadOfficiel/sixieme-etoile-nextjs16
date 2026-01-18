# Story 27.6 : Live Map - Driver Locations Layer

**Status:** REVIEW
**Epic:** Epic 27 - Unified Dispatch (Cockpit)

## Description
En tant que **dispatcheur**, je veux voir où se trouvent mes chauffeurs en temps réel sur la carte, afin de prendre des décisions éclairées sur les assignations et le suivi des missions.

La carte doit afficher la dernière position connue de chaque chauffeur sous forme de marqueur (pin). Les marqueurs doivent indiquer visuellement le statut du chauffeur pour permettre une lecture rapide de la disponibilité.

## Critères d'Acceptation (AC)

- **AC1 - Affichage des Chauffeurs** : La carte affiche un marqueur pour chaque chauffeur dont la position est disponible (ou mockée).
- **AC2 - Code Couleur de Statut** :
  - **VERT** : Chauffeur Actif (En service, En mission, Disponible).
  - **GRIS** : Chauffeur Inactif (Off, Pause, Indisponible).
- **AC3 - Données Mockées** : En attendant le flux temps réel complet, utiliser un jeu de données mocké (`DRIVER_POSITIONS_MOCK`) simulant des positions autour de Paris.
- **AC4 - Interaction Simple** : Au survol ou clic d'un marqueur, afficher le nom du chauffeur.

## Cas de Tests Obligatoires

- **Test A (Visuel)** : Charger la page `/dispatch`. Vérifier que la carte s'affiche et contient des marqueurs.
- **Test B (Statut)** : Vérifier la présence d'au moins un marqueur Vert et un marqueur Gris correspondants aux données de test.
- **Test C (Données)** : Vérifier que les positions correspondent aux coordonnées fournies dans le mock.

## Dépendances et Contraintes

- **Tech Stack** : Google Maps (Intégration via `DispatchMapGoogle`).
- **Données** : Utiliser un mock JSON pour les positions initiales.
- **UI** : S'intégré dans le composant `DispatchMapGoogle` existant.
- **Performance** : La carte doit rester fluide même avec 50+ chauffeurs.

## Notes Techniques
- Modifier `DispatchMapGoogle.tsx` pour accepter une prop `drivers`.
- Gérer l'affichage des marqueurs via l'API Google Maps (`google.maps.Marker`).
- Gestion des couleurs via constantes ou icônes SVG/Path.
- Intégrer les traductions manquantes pour les statuts.

## Validation (Amelia)
**Date:** 2026-01-18
**Branche:** `feature/27-6-map-drivers`

### Modifications
- **Refactoring Majeur** : Passage de Leaflet (initialement implémenté) à Google Maps suite à la Code Review pour maintenir la cohérence du projet.
- `DispatchMapGoogle.tsx`: Ajout de la logique d'affichage des `drivers` (marqueurs colorés) et gestion du cas sans mission sélectionnée.
- `DispatchMain.tsx`: Restauration de `DispatchMapGoogle` et suppression des imports Leaflet.
- `driverPositions.ts`: Mock data conservé.
- Traductions (`fr.json`, `en.json`): Ajout des clés `driverStatus` et correction de `sidebar.backlog`.

### Résultat des Tests
- [x] **Chargement Carte** : La carte Google Maps s'affiche correctement (API Key OK).
- [x] **Marqueurs** : 5 marqueurs visibles aux coordonnées spécifiées (Jean Dupont, Marie Curie, etc.).
- [x] **Code Couleur** : Vérifié via Selenium/Browser.
    - Vert (#10B981) pour les statuts ACTIVE.
    - Gris (#9CA3AF) pour les statuts INACTIVE.
- [x] **Interaction** : Le survol affiche le nom du chauffeur (ex: "Jean Dupont (Active)").
- [x] **Nettoyage** : Dépendances Leaflet supprimées.

### Commandes pour Review
```bash
git checkout feature/27-6-map-drivers
pnpm dev
# Aller sur http://localhost:3000/app/sixieme-etoile-vtc/dispatch?view=map
```

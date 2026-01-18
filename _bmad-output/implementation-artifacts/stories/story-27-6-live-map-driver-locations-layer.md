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

- **Tech Stack** : Leaflet (React-Leaflet) requis par instruction spéciale.
- **Données** : Utiliser un mock JSON pour les positions initiales.
- **UI** : S'intégrer dans le conteneur de carte existant ou prévu pour `/dispatch`.
- **Performance** : La carte doit rester fluide même avec 50+ chauffeurs (pas de clustering requis pour l'instant).

## Notes Techniques
- Installer `leaflet` et `react-leaflet` si non présents.
- Créer un composant `LiveFleetMap` isolé.
- Utiliser des icônes SVG simples ou `L.divIcon` pour les marqueurs personnalisés (Vert/Gris).
- CSS: Leaflet nécessite l'import de son CSS.

## Validation (Amelia)
**Date:** 2026-01-18
**Branche:** `feature/27-6-map-drivers`

### Composants Implémentés
- `LiveFleetMap.tsx`: Carte Leaflet centrée sur Paris avec gestion du zoom et des tuiles (CartoDB Light).
- `DriverMarker.tsx`: Marqueur personnalisé utilisant `L.divIcon` avec SVG dynamique selon le statut.
- `driverPositions.ts`: Mock data avec 5 chauffeurs (3 Actifs, 2 Inactifs).
- `DispatchMain.tsx`: Intégration de la carte Leaflet en remplacement temporaire pour la vue "map".

### Résultat des Tests
- [x] **Chargement Carte** : La carte s'affiche correctement dans l'onglet Map.
- [x] **Marqueurs** : 5 marqueurs visibles aux coordonnées spécifiées.
- [x] **Code Couleur** : Vérifié via Selenium/Browser.
    - Vert (#10B981) pour les statuts ACTIVE.
    - Gris (#9CA3AF) pour les statuts INACTIVE.
- [x] **Interaction** : Le survol affiche le nom du chauffeur (ex: "Jean Dupont (ACTIVE)").

### Commandes pour Review
```bash
git checkout feature/27-6-map-drivers
pnpm dev
# Aller sur http://localhost:3000/app/sixieme-etoile-vtc/dispatch?view=map
```

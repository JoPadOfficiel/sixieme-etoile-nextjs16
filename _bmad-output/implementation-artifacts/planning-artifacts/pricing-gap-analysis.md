# Pricing VTC – Gap Analysis (docs/pricing_vtc vs codebase)

**Objectif (méthode BMAD)**

- Produire une matrice factuelle _Doc → Existant → Gap → Reco → impacts_.
- Ne pas intégrer d’agents IA dans le pricing (décisions déterministes, paramétrables).
- Ne pas hardcoder d’exemples (tous montants/seuils doivent être des paramètres d’organisation).

**Périmètre code analysé (références principales)**

- `packages/api/src/services/pricing-engine.ts`
- `packages/api/src/routes/vtc/pricing-calculate.ts`
- `packages/api/src/services/toll-service.ts`
- `packages/api/src/services/fuel-price-service.ts`
- `packages/api/src/services/compliance-validator.ts`
- `packages/api/src/routes/vtc/missions.ts`
- `packages/database/prisma/schema.prisma`

---

## 1) Synthèse exécutive (top gaps)

- **Segmentation de route multi-zones (polyline → segments par zone)** : présent dans la doc, **absent** du moteur (aujourd’hui: zones uniquement pickup/dropoff + multiplicateur).
- **Conformité RSE → staffing → prix (auto)** : le validateur existe, mais **n’est pas intégré** au pricing-engine.
- **Disponibilité chauffeur réelle** : pas de modèle calendrier/indisponibilités, et le dispatch utilise des valeurs “placeholder”.
- **Hybridation jour/nuit et règles MAD “buckets/interpolation”** : partiellement couvert (advanced rates NIGHT + trip types), mais **pas de pondération jour/nuit** ni d’interpolation “buckets” généralisée.
- **TCO/PRK digital twin** : on a un shadow costing (fuel/tolls/wear/driver/parking) mais **pas** de PRK dynamique complet par véhicule (amortissement/dépréciation/maintenance réelle).

---

## 2) Matrice de gaps (par thème)

### A) Zones – topologie, résolution, conflits

| Exigence doc (résumé)                                                 | Existant (code)                                            | Gap                                                                   | Recommandation (MVP)                                                                                   | Impacts code                                                         |
| --------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Zones GeoJSON (polygones/radius/points), avec résolution robuste      | `PricingZone` (GeoJSON + center + radius) + `geo-utils.ts` | Résolution actuelle non configurable; tie-break implicite sur l’ordre | Ajouter `OrganizationPricingSettings.zoneConflictStrategy` + `PricingZone.priority` + debug resolution | `schema.prisma`, `geo-utils.ts`, `pricing-calculate.ts`, UI settings |
| “Closest centroid” / gestion overlaps (“ping-pong frontière”)         | Pas de scoring distance; pas d’anti-oscillation            | Stratégie “closest” non existante                                     | Ajouter stratégie `CLOSEST` (+ `PRIORITY_THEN_*`) et métriques de scoring                              | `geo-utils.ts` + settings                                            |
| Couverture sans trous (anneaux/couronnes) + zones spéciales “percent” | Seed possible côté projet, pas d’invariant métier          | Aucun contrôle de complétude/topologie                                | Ajouter validations admin (lint zones: overlaps/holes) en tooling UI/API                               | `pricing-zones.ts`, UI zone editor                                   |
| Corridors/buffers (autoroutes, etc.)                                  | Non supporté (pas de type corridor/buffer)                 | Modèle manquant                                                       | Ajouter plus tard (non MVP) : type `CORRIDOR` + polyline buffer; sinon documenter “non supporté”       | `schema.prisma`, zone editor, geo engine                             |

### B) Algorithme pricing – hiérarchie, MAD/time-factor, hybridation

| Exigence doc                                                               | Existant                                                                     | Gap                                                                                        | Reco (MVP)                                                                                                  | Impacts                                     |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Hiérarchie: forfaits contractuels > règles intra-zone > fallback dynamique | Présent: `ZoneRoute`/packages > dynamic pricing                              | OK globalement                                                                             | Formaliser l’ordre des règles dans la doc PRD/epics (plus tard)                                             | `pricing-engine.ts`                         |
| Bascule “zone dense” vers MAD (time-factor)                                | Trip types `dispo` + packages; mais pas de bascule auto depuis un `transfer` | La doc décrit une bascule algorithmique; code requiert que l’utilisateur choisisse le type | Ajouter une règle de suggestion (pas auto) ou un mode “auto trip type” configurable                         | `pricing-calculate.ts`, UI quoting          |
| Buckets MAD + interpolation de durée                                       | Pas de buckets génériques; seulement logique de `dispo`/packages             | Manque l’interpolation “buckets” configurable                                              | Ajouter un module “TimeBuckets” paramétrable (liste + stratégie d’interpolation)                            | `pricing-engine.ts`, settings UI            |
| Jour/nuit hybride pondéré (course chevauchante)                            | Advanced rates NIGHT appliqué sur `pickupAt` (pas pondéré)                   | Pas de pondération                                                                         | Introduire une règle de pondération par overlap horaire (nécessite intervalle `[pickupAt, estimatedEndAt]`) | `pricing-engine.ts` + `estimatedEndAt`      |
| Multiplicateurs “client difficulty / patience tax”                         | Aucun champ CRM pour score                                                   | Feature manquante                                                                          | Ajouter un champ `Contact.difficultyScore` + multiplier rule (optionnel)                                    | `schema.prisma`, UI contact, pricing-engine |

### C) Coûts (TCO/PRK), carburant, péages, parking

| Exigence doc                                                | Existant                                                                           | Gap                                                            | Reco (MVP)                                                                          | Impacts                                            |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------- |
| Coût carburant intégré                                      | Oui: `costBreakdown.fuel` + fuel price service (CollectAPI)                        | OK                                                             | Vérifier cohérence par tripType (excursion multi-stop, dispo sans dropoff)          | `fuel-price-service.ts`, `pricing-calculate.ts`    |
| Péages réels via Google Routes + cache                      | Oui: `toll-service.ts` + TollCache + patch du résultat dans `pricing-calculate.ts` | Couverture limitée aux trajets avec dropoff (pas de multi-leg) | Étendre plus tard: péages par leg pour excursions, ou expliquer “estimate only”     | `toll-service.ts`, `pricing-calculate.ts`          |
| Coût parking/frais fixes “zones friction”                   | Parking existe comme composant (paramètre), mais non auto                          | Pas de règle automatique par zone                              | Ajouter un concept “zone fixed surcharge / parking policy” paramétrable par zone    | `PricingZone` (fields), pricing-engine, UI         |
| TCO/PRK véhicule (maintenance, dépréciation, énergie, etc.) | Shadow costing partiel (fuel/tolls/wear/driver/parking)                            | Pas de PRK dynamique complet                                   | Étape ultérieure: enrichir modèle vehicle cost + calcul PRK + alimenter shadow calc | `schema.prisma`, pricing-engine, vehicle selection |

### D) Deadhead / garage logic / home base

| Exigence doc                                        | Existant                                                         | Gap               | Reco (MVP)                                                                          | Impacts                                      |
| --------------------------------------------------- | ---------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------- | -------------------------------------------- |
| Approche + retour (deadhead) inclus au coût interne | Oui via “shadow segments” quand un véhicule/base est sélectionné | OK (base-centric) | Étendre à “driver home base” si requis                                              | `vehicle-selection.ts`, `pricing-engine.ts`  |
| Garages virtuels (domiciles chauffeurs)             | Pas de home location driver dans schema                          | Donnée manquante  | Ajouter plus tard `Driver.homeLat/homeLng` (optionnel) + utilisation dans sélection | `schema.prisma`, dispatch, vehicle selection |

### E) Multi-jours, frais de vie, RSE heavy vehicles

| Exigence doc                                          | Existant                                | Gap                                        | Reco (MVP)                                                                                     | Impacts                                     |
| ----------------------------------------------------- | --------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------- |
| RSE: pauses, amplitude, vitesses capées, etc.         | Oui dans `compliance-validator.ts`      | Non intégré au pricing-engine              | Intégrer la validation + sélection automatique de plan (policy) + stockage dans `tripAnalysis` | `pricing-engine.ts`, `pricing-calculate.ts` |
| Double équipage / chauffeur relais                    | Alternatives générées + coûts (partiel) | Pas appliqué au prix final                 | Même reco: intégrer “best plan” et afficher coût                                               | idem                                        |
| Multi-jours: hôtel/repas/prime                        | Coûts présents mais avec defaults       | Paramétrage incomplet (risque de hardcode) | Déplacer tous montants en settings org (aucune constante métier)                               | `schema.prisma`, compliance-validator       |
| “Perte d’exploitation” / coût d’opportunité jours off | Non présent                             | Feature manquante                          | Ajouter ultérieurement: modèle et règle (configurable par saison)                              | pricing-engine, settings                    |

### F) Route optimization “min(TCO)” vs “min(time)”

| Exigence doc                                                   | Existant                                                                         | Gap               | Reco (MVP)                                                    | Impacts             |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------- | ------------------- |
| Comparer plusieurs scénarios de route (temps / distance / TCO) | Non (Google routing utilisé pour distance/durée; pas d’arbitrage multi-scenario) | Feature manquante | Garder un seul mode pour l’instant; documenter “non supporté” | routing integration |

### G) Dispatch / disponibilité / calendrier

| Exigence doc                         | Existant                         | Gap                            | Reco (MVP)                                                   | Impacts                                |
| ------------------------------------ | -------------------------------- | ------------------------------ | ------------------------------------------------------------ | -------------------------------------- |
| Disponibilité chauffeur réelle       | `missions.ts` a des placeholders | Manque modèle + calcul overlap | Ajouter `DriverCalendarEvent` + calcul overlap avec missions | `schema.prisma`, `missions.ts`, UI     |
| Stocker fenêtre mission pour overlap | `Quote` n’a pas `estimatedEndAt` | Donnée manquante               | Ajouter `Quote.estimatedEndAt` (Option 1)                    | `schema.prisma`, quote creation/update |

---

## 3) Recommandations de cadrage (pour respecter contraintes)

- Toute partie “agent IA / squad” des docs `pricing_vtc` doit être **reformulée en règles déterministes** + paramètres de configuration.
- Tout montant/seuil de type “hôtel/repas/prime/parking/frais friction” doit être **configurable au niveau organisation**, jamais une constante métier.
- La segmentation de route multi-zones est un gros chantier: à isoler comme EPIC dédiée (non MVP si on veut livrer vite).

---

## 4) Couverture PRD/EPICs (mise à jour 30/12/2025)

### Gaps couverts par FR Group 9 (FR61-FR77) et Epic 17

| Gap                                                       | FR         | Story Epic 17 | Statut     |
| --------------------------------------------------------- | ---------- | ------------- | ---------- |
| Résolution conflits zones (stratégies configurables)      | FR61, FR62 | 17.1          | ✅ Couvert |
| Agrégation multiplicateurs zones (MAX/PICKUP/DROPOFF/AVG) | FR63       | 17.2          | ✅ Couvert |
| RSE → staffing → prix (auto)                              | FR64, FR65 | 17.3          | ✅ Couvert |
| Paramètres staffing configurables (hôtel/repas/prime)     | FR66       | 17.4          | ✅ Couvert |
| estimatedEndAt pour overlap missions                      | FR67       | 17.5          | ✅ Couvert |
| Calendrier driver (indisponibilités)                      | FR68       | 17.6          | ✅ Couvert |
| Détection overlap disponibilité                           | FR69       | 17.7          | ✅ Couvert |
| Jour/nuit hybride pondéré                                 | FR70       | 17.8          | ✅ Couvert |
| Buckets MAD + interpolation                               | FR71       | 17.9          | ✅ Couvert |
| Surcharges zones (parking/friction)                       | FR72       | 17.10         | ✅ Couvert |
| Validation topologie zones                                | FR73       | 17.11         | ✅ Couvert |
| Driver home location                                      | FR74       | 17.12         | ✅ Couvert |
| Segmentation route multi-zones                            | FR75       | 17.13         | ✅ Couvert |
| TCO véhicule enrichi                                      | FR76       | 17.14         | ✅ Couvert |
| Client difficulty score (patience tax)                    | FR77       | 17.15         | ✅ Couvert |

### Gaps couverts par FR Group 10 (FR78-FR88) et Epic 18

| Gap                                                          | FR         | Story Epic 18 | Statut     |
| ------------------------------------------------------------ | ---------- | ------------- | ---------- |
| Corridors/buffers (autoroutes)                               | FR78       | 18.1          | ✅ Couvert |
| Bascule auto zone dense → MAD                                | FR79       | 18.2          | ✅ Couvert |
| Détection A/R → MAD automatique                              | FR80, FR88 | 18.3, 18.11   | ✅ Couvert |
| Perte d'exploitation / coût d'opportunité                    | FR81       | 18.4          | ✅ Couvert |
| Arbitrage rester vs rentrer à vide                           | FR82       | 18.5          | ✅ Couvert |
| Route optimization multi-scenario (min(T), min(D), min(TCO)) | FR83       | 18.6          | ✅ Couvert |
| Décomposition trajets transversaux                           | FR84       | 18.7          | ✅ Couvert |
| Vecteurs temporels fixes (Normandie=12h, etc.)               | FR85       | 18.8          | ✅ Couvert |
| Shadow Fleet / Sous-traitants                                | FR86       | 18.9          | ✅ Couvert |
| Algorithme hiérarchique de pricing                           | FR87       | 18.10         | ✅ Couvert |
| Seuils configurables Transfer→MAD                            | FR88       | 18.11         | ✅ Couvert |

### Traçabilité complète

- **PRD mis à jour:** `docs/bmad/prd.md`
  - FR Group 9 (FR61-FR77): Zone resolution, compliance, driver availability
  - FR Group 10 (FR78-FR88): Geospatial avancé, route optimization, yield management
- **EPICs mis à jour:** `docs/bmad/epics.md`
  - Epic 17 (16 stories, 17.1-17.16): Zone resolution, compliance, availability
  - Epic 18 (11 stories, 18.1-18.11): Geospatial avancé, route optimization, yield
- **Total:** 88 Functional Requirements, 18 Epics, 27 nouvelles stories
- **Zéro hardcode:** Tous les montants/seuils sont configurables au niveau organisation
- **Zéro IA/agents:** Toutes les décisions sont déterministes et paramétrables (les "agents IA" des docs pricing_vtc sont reformulés en règles métier configurables)

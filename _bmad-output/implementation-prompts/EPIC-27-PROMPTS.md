@_bmad-output/implementation-prompts/EPIC-27-PROMPTS.md

# IMPLEMENTATION PROMPTS - EPIC 27: Unified Dispatch (Cockpit)

> **Generated for Parallel Agent Execution (Google Jules, Windsurf, Claude Opus)**
> **Context:** "Sixième Etoile" VTC Platform - Next.js 16, Prisma, Tailwind.
> **Format:** BMAD Protocol Strict - Single Story per Prompt.

---

## Story 27.1: Dispatch Shell & Navigation

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 27 - Unified Dispatch (Cockpit)
- Sélectionne la story spécifique : Story 27.1 - Dispatch Shell & Navigation
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 27.1
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/27-1-dispatch-shell
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET du layout (`DispatchPage.tsx`).
   - Utilise CSS Grid/Flex pour garantir une hauteur de viewport 100% sans scrollbar double.
   - Intègre `nuqs` pour stocker l'état `?view=gantt|list` dans l'URL.

3. Stratégie de Test Obligatoire :
   - Vitest : Teste que le changement de mode (Gantt/List) met à jour l'URL.
   - Navigateur MCP : Vérifie le responsive (Desktop vs Mobile) et l'absence de scrollbars parasites.
   - Curl : Non applicable.
   - Vérification DB : Non applicable.
   - Couverture : Vérifie que le Sidebar est collapsible.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "27-1-dispatch-shell-navigation: backlog" à "27-1-dispatch-shell-navigation: review"

---

CONTEXTE SPÉCIFIQUE STORY 27.1 :
Créer la coquille vide du nouveau Cockpit Dispatch.

DÉTAILS TECHNIQUES REQUIS :
- Layout 3 colonnes : Backlog (20%), Main (Gantt/Map), Inspector (Panel droit).
- Gestion du state `viewMode`.

AGENT RECOMMANDÉ : Google Jules (UI).

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 27.2: Mission Synchronization Service

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 27 - Unified Dispatch (Cockpit)
- Sélectionne la story spécifique : Story 27.2 - Backend Mission Synchronization Service
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 27.2
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/27-2-mission-sync-service
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET du service `MissionSyncService`.
   - Logique d'Upsert (Création/Mise à jour des Missions basée sur les lignes de Devis).
   - Gestion des orphelins (Suppression si Unassigned).

3. Stratégie de Test Obligatoire :
   - Vitest : Tests d'intégration (Créer une Quote -> Vérifier que les Missions sont créées).
   - Navigateur MCP : Non applicable.
   - Curl : Non applicable.
   - Vérification DB : Vérifie via `psql` que la table `Mission` est peuplée après la sauvegarde d'un devis.
   - Couverture : Teste la mise à jour d'un horaire dans le devis qui se répercute sur la mission.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "27-2-backend-mission-splitter-service: backlog" à "27-2-backend-mission-splitter-service: review"

---

CONTEXTE SPÉCIFIQUE STORY 27.2 :
Le cœur du système : synchroniser Commercial -> Opérationnel.

DÉTAILS TECHNIQUES REQUIS :
- Hook sur `Quote.update`.
- Mapper `QuoteLine.sourceData` -> `Mission.sourceData`.
- Gérer les suppressions intelligemment.

MCP REQUIS : postgres_vtc_sixiemme_etoile.
AGENT RECOMMANDÉ : Antigravity / Windsurf.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 27.3: Gantt Core Timeline Rendering

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 27 - Unified Dispatch (Cockpit)
- Sélectionne la story spécifique : Story 27.3 - Gantt Core Timeline Rendering
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 27.3
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/27-3-gantt-core
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET du composant Gantt.
   - Utilise `svar-react-gantt` ou une implémentation custom robuste.
   - Affiche les lignes Chauffeurs (Y) et l'axe Temps (X).

3. Stratégie de Test Obligatoire :
   - Vitest : Non applicable.
   - Navigateur MCP : Vérifie que le scroll horizontal fonctionne et que l'échelle de temps est correcte.
   - Curl : Non applicable.
   - Vérification DB : Non applicable.
   - Couverture : Vérifie l'affichage de la ligne "Temps Actuel".

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "27-3-gantt-core-timeline-rendering: backlog" à "27-3-gantt-core-timeline-rendering: review"

---

CONTEXTE SPÉCIFIQUE STORY 27.3 :
Mise en place de la visualisation Gantt.

DÉTAILS TECHNIQUES REQUIS :
- Composant React complexe.
- Performance critique (Virtualisation si beaucoup de chauffeurs).

AGENT RECOMMANDÉ : Windsurf / Google Jules.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 27.4: Hybrid Mission Rendering

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 27 - Unified Dispatch (Cockpit)
- Sélectionne la story spécifique : Story 27.4 - Gantt Mission Rendering (Hybrid)
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 27.4
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/27-4-mission-card
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET du composant `MissionGanttCard`.
   - Différencie visuellement les Missions CALCULATED (Plein) vs MANUAL (Pointillé).

3. Stratégie de Test Obligatoire :
   - Vitest : Snapshot test des variations de cartes.
   - Navigateur MCP : Vérifie le rendu dans le Gantt.
   - Curl : Non applicable.
   - Vérification DB : Non applicable.
   - Couverture : Vérifie les Tooltips au survol.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "27-4-gantt-mission-rendering-hybrid: backlog" à "27-4-gantt-mission-rendering-hybrid: review"

---

CONTEXTE SPÉCIFIQUE STORY 27.4 :
Afficher les "briques" sur le Gantt.

DÉTAILS TECHNIQUES REQUIS :
- Styling conditionnel.
- Affichage des infos clés (Client, Type).

AGENT RECOMMANDÉ : Google Jules.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 27.5: Unassigned Backlog Sidebar

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 27 - Unified Dispatch (Cockpit)
- Sélectionne la story spécifique : Story 27.5 - Unassigned Backlog Sidebar Logic
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 27.5
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/27-5-backlog-sidebar
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET de la Sidebar.
   - Intègre la recherche et les filtres (Catégorie Véhicule).

3. Stratégie de Test Obligatoire :
   - Vitest : Teste la logique de filtrage.
   - Navigateur MCP : Vérifie que la liste se met à jour quand on tape dans la recherche.
   - Curl : Non applicable.
   - Vérification DB : Non applicable.
   - Couverture : Vérifie que seules les missions "Unassigned" apparaissent.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "27-5-unassigned-backlog-sidebar-logic: backlog" à "27-5-unassigned-backlog-sidebar-logic: review"

---

CONTEXTE SPÉCIFIQUE STORY 27.5 :
Gérer la pile de tâches à assigner.

DÉTAILS TECHNIQUES REQUIS :
- Fetch missions where driverId is null.
- Sort by date.

AGENT RECOMMANDÉ : Google Jules.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 27.6: Live Map - Driver Locations

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 27 - Unified Dispatch (Cockpit)
- Sélectionne la story spécifique : Story 27.6 - Live Map Driver Locations Layer
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 27.6
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/27-6-map-drivers
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET du composant Map (Leaflet).
   - Affiche les marqueurs Drivers avec couleurs d'état.

3. Stratégie de Test Obligatoire :
   - Vitest : Non applicable.
   - Navigateur MCP : Vérifie que les pins s'affichent sur la carte.
   - Curl : Non applicable.
   - Vérification DB : Non applicable.
   - Couverture : Vérifie le code couleur (Vert/Gris).

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "27-6-live-map-driver-locations-layer: backlog" à "27-6-live-map-driver-locations-layer: review"

---

CONTEXTE SPÉCIFIQUE STORY 27.6 :
Visualisation géographique de la flotte.

DÉTAILS TECHNIQUES REQUIS :
- Leaflet ou Google Maps.
- Custom Markers.

AGENT RECOMMANDÉ : Google Jules.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 27.9: Dispatch Actions - Drag & Drop Assignment

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 27 - Unified Dispatch (Cockpit)
- Sélectionne la story spécifique : Story 27.9 - Dispatch Actions Drag & Drop Assignment
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 27.9
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/27-9-dnd-assignment
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET de l'interaction Drag & Drop (Backlog -> Gantt).
   - Appelle l'API d'assignation au Drop.

3. Stratégie de Test Obligatoire :
   - Vitest : Non applicable.
   - Navigateur MCP : TEST CRITIQUE - Valide le flux complet d'assignation par Drag & Drop.
   - Curl : Non applicable.
   - Vérification DB : Vérifie que le `driverId` est bien mis à jour en base.
   - Couverture : Teste le revert en cas d'erreur API.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "27-9-dispatch-actions-drag-drop-assignment: backlog" à "27-9-dispatch-actions-drag-drop-assignment: review"

---

CONTEXTE SPÉCIFIQUE STORY 27.9 :
L'action principale du dispatcher.

DÉTAILS TECHNIQUES REQUIS :
- Connecter Backlog (Draggable) et Gantt Rows (Droppable).
- Optimistic Update.

AGENT RECOMMANDÉ : Windsurf / Google Jules.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 27.10: Conflict Detection

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 27 - Unified Dispatch (Cockpit)
- Sélectionne la story spécifique : Story 27.10 - Conflict Detection RSE & Calendar
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 27.10
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/27-10-conflict-detection
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET de la fonction `checkCompliance(mission, driver)`.
   - Ajoute le feedback visuel (Shake/Red Border) dans le Gantt.

3. Stratégie de Test Obligatoire :
   - Vitest : Tests unitaires de la logique de conflit (Overlap, Calendar Events).
   - Navigateur MCP : Vérifie que l'UI empêche ou avertit lors d'un drop invalide.
   - Curl : Non applicable.
   - Vérification DB : Non applicable.
   - Couverture : Teste le cas "Chauffeur en Congé".

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "27-10-conflict-detection-rse-calendar: backlog" à "27-10-conflict-detection-rse-calendar: review"

---

CONTEXTE SPÉCIFIQUE STORY 27.10 :
Garde-fous de conformité.

DÉTAILS TECHNIQUES REQUIS :
- Vérifier les Events Calendrier.
- Vérifier les chevauchements Missions.

AGENT RECOMMANDÉ : Windsurf.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 27.7: Live Map - Mission Context Layer

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 27 - Unified Dispatch (Cockpit)
- Sélectionne la story spécifique : Story 27.7 - Live Map Mission Context Layer
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 27.7
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/27-7-map-mission-route
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET pour afficher le tracé (Polyline) de la mission sélectionnée.
   - Utilise `sourceData.geometry` s'il existe (Google encoded polyline).

3. Stratégie de Test Obligatoire :
   - Vitest : Non applicable.
   - Navigateur MCP : Vérifie que la carte zoome bien sur le trajet lors de la sélection.
   - Curl : Non applicable.
   - Vérification DB : Non applicable.
   - Couverture : Vérifie le cas d'une mission MANUELLE (Pas de tracé -> Pas d'erreur).

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "27-7-live-map-mission-context-layer: backlog" à "27-7-live-map-mission-context-layer: review"

---

CONTEXTE SPÉCIFIQUE STORY 27.7 :
Compréhension contextuelle géographique.

DÉTAILS TECHNIQUES REQUIS :
- Decodage polyline.
- FitBounds.

AGENT RECOMMANDÉ : Google Jules.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 27.8: Map - Smart Assignment Suggestions

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 27 - Unified Dispatch (Cockpit)
- Sélectionne la story spécifique : Story 27.8 - Map Smart Assignment Suggestions
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 27.8
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/27-8-map-suggestions
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET de l'algorithme de suggestion (Distance Euclidienne simple ou appel API Route Matrix).
   - Met en surbrillance les 3 chauffeurs les plus proches.

3. Stratégie de Test Obligatoire :
   - Vitest : Teste l'algo de tri par distance.
   - Navigateur MCP : Vérifie le rendu visuel (Halo ou Couleur distincte pour les candidats).
   - Curl : Non applicable.
   - Vérification DB : Non applicable.
   - Couverture : Vérifie la performance avec 50 chauffeurs.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "27-8-map-smart-assignment-suggestions: backlog" à "27-8-map-smart-assignment-suggestions: review"

---

CONTEXTE SPÉCIFIQUE STORY 27.8 :
Aide à la décision.

DÉTAILS TECHNIQUES REQUIS :
- Calcul géospatial client-side (Turf.js ou simple Haversine) pour réactivité immédiate.

AGENT RECOMMANDÉ : Google Jules / Windsurf.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 27.11: Inspector Panel - Quick Actions

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 27 - Unified Dispatch (Cockpit)
- Sélectionne la story spécifique : Story 27.11 - Inspector Panel Quick Actions
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 27.11
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/27-11-inspector-actions
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET du panneau latéral droit.
   - Boutons : Unassign, Edit Route (ouvre modal Yolo), Cancel.

3. Stratégie de Test Obligatoire :
   - Vitest : Teste les handlers de clic.
   - Navigateur MCP : Vérifie que le clic sur 'Unassign' met à jour le Gantt et remet la mission dans le Backlog.
   - Curl : Non applicable.
   - Vérification DB : Vérifie l'état de la mission en base.
   - Couverture : Vérifie l'appel du modal d'édition.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "27-11-inspector-panel-quick-actions: backlog" à "27-11-inspector-panel-quick-actions: review"

---

CONTEXTE SPÉCIFIQUE STORY 27.11 :
Panneau de détails et actions rapides.

DÉTAILS TECHNIQUES REQUIS :
- Composant UI Shadcn Sheet ou Panel.
- Connexion aux mutations API.

AGENT RECOMMANDÉ : Google Jules.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 27.12: Gantt - Time & Zoom Controls

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 27 - Unified Dispatch (Cockpit)
- Sélectionne la story spécifique : Story 27.12 - Gantt Time Zoom Controls
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 27.12
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/27-12-gantt-zoom
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET des contrôles de zoom (X-Axis scale).
   - Boutons "Today", "Zoom In (+)", "Zoom Out (-)".

3. Stratégie de Test Obligatoire :
   - Vitest : Teste la logique de changement d'échelle (pixels per hour).
   - Navigateur MCP : Vérifie que le Gantt se redessine correctement lors du zoom.
   - Curl : Non applicable.
   - Vérification DB : Non applicable.
   - Couverture : Vérifie les bornes (Zoom max / Zoom min).

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "27-12-gantt-time-zoom-controls: backlog" à "27-12-gantt-time-zoom-controls: review"

---

CONTEXTE SPÉCIFIQUE STORY 27.12 :
Navigation temporelle.

DÉTAILS TECHNIQUES REQUIS :
- Manipuler le state du Gantt (viewPort ou timeScale).

AGENT RECOMMANDÉ : Google Jules.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 27.13: Real-Time Updates

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 27 - Unified Dispatch (Cockpit)
- Sélectionne la story spécifique : Story 27.13 - Real-Time Updates (Polling/Socket)
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 27.13
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/27-13-realtime-updates
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET de la configuration TanStack Query ().
   - OU implémente Supabase Realtime si disponible.
   - Privilégie le Polling (10s) pour la robustesse initiale.

3. Stratégie de Test Obligatoire :
   - Vitest : Non applicable.
   - Navigateur MCP : Ouvre deux fenêtres. Modifie dans l'une, vérifie la mise à jour dans l'autre.
   - Curl : Non applicable.
   - Vérification DB : Non applicable.
   - Couverture : Vérifie que le focus window revalidation est actif.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "27-13-real-time-updates-polling-socket: backlog" à "27-13-real-time-updates-polling-socket: review"

---

CONTEXTE SPÉCIFIQUE STORY 27.13 :
Synchronisation multi-utilisateurs.

DÉTAILS TECHNIQUES REQUIS :
- React Query configuration globale ou locale au Dispatch.

AGENT RECOMMANDÉ : Google Jules.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 27.14: Export Schedule

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 27 - Unified Dispatch (Cockpit)
- Sélectionne la story spécifique : Story 27.14 - Export Schedule
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 27.14
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/27-14-export-schedule
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET de la génération PDF du planning.
   - Liste linéaire des missions par chauffeur pour la journée.

3. Stratégie de Test Obligatoire :
   - Vitest : Non applicable.
   - Navigateur MCP : Génère le PDF et vérifie qu'il contient tous les chauffeurs actifs.
   - Curl : Non applicable.
   - Vérification DB : Non applicable.
   - Couverture : Vérifie la lisibilité.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "27-14-export-schedule: backlog" à "27-14-export-schedule: review"

---

CONTEXTE SPÉCIFIQUE STORY 27.14 :
Impression papier pour le bureau.

DÉTAILS TECHNIQUES REQUIS :
- React-PDF renderer.
- Format A4 Paysage.

AGENT RECOMMANDÉ : Antigravity / Windsurf.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

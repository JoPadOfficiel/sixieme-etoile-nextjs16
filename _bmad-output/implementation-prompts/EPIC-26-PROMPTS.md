@_bmad-output/implementation-prompts/EPIC-26-PROMPTS.md

# IMPLEMENTATION PROMPTS - EPIC 26: Flexible "Yolo Mode" Billing

> **Generated for Parallel Agent Execution (Google Jules, Windsurf, Claude Opus)**
> **Context:** "Sixième Etoile" VTC Platform - Next.js 16, Prisma, Tailwind.
> **Format:** BMAD Protocol Strict - Single Story per Prompt.

---

## Story 26.1: Database Schema Update for Hybrid Blocks

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 26 - Flexible "Yolo Mode" Billing
- Sélectionne la story spécifique : Story 26.1 - Database Schema Update for Hybrid Blocks & Mission Model
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 26.1
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/26-1-schema-update-yolo-billing
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET des fichiers modifiés ou créés (Interdiction formelle des placeholders ou "// ... rest of code").
   - Intégration : Vérifie que les nouveaux modèles (QuoteLine, Mission) sont correctement définis dans schema.prisma.
   - Génère la migration (npx prisma migrate dev --name yolo_schema).

3. Stratégie de Test Obligatoire :
   - Vitest : Non applicable (Migration DB).
   - Navigateur MCP : Non applicable.
   - Curl : Non applicable.
   - Vérification DB : Vérifie via `psql` ou `prisma studio` que les tables `QuoteLine`, `InvoiceLine` et `Mission` ont bien les nouveaux champs (sourceData, displayData, type, etc.).
   - Couverture : Vérifie que TOUS les critères d'acceptation sont couverts.

4. Sortie Finale :
   - Mise à jour du fichier de la Story (Reflète les changements techniques).
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "26-1-database-schema-update-for-hybrid-blocks: backlog" à "26-1-database-schema-update-for-hybrid-blocks: review"

---

CONTEXTE SPÉCIFIQUE STORY 26.1 :
Tu dois refactoriser le schéma Prisma pour supporter l'architecture "Hybrid Blocks" (Yolo) et "Missions".

DÉTAILS TECHNIQUES REQUIS :
- Modifier `QuoteLine` et `InvoiceLine` :
  - Ajouter `type` (Enum: CALCULATED, MANUAL, GROUP).
  - Ajouter `sourceData` (Json?).
  - Ajouter `displayData` (Json).
  - Ajouter `parentId` (String?, relation self).
  - Ajouter `sortOrder` (Int).
- Créer le modèle `Mission` :
  - Champs : id, quoteId, driverId, vehicleId, status, startAt, endAt, sourceData (Json).
  - Relations : Quote, User (Driver), Vehicle.

INTEGRATION CHRONOLOGIQUE :
Cette story est FONDATIONNELLE pour tout l'Epic 26 et 27.

MCP REQUIS : postgres_vtc_sixiemme_etoile (pour vérifier la structure).
AGENT RECOMMANDÉ : Antigravity (Accès Sudo/Terminal requis).

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 26.2: Backward Compatibility Migration Script

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 26 - Flexible "Yolo Mode" Billing
- Sélectionne la story spécifique : Story 26.2 - Backward Compatibility Migration Script
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 26.2
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/26-2-migration-script
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET du script de migration (scripts/migrate-yolo-blocks.ts).
   - Le script doit être idempotent et safe à exécuter.

3. Stratégie de Test Obligatoire :
   - Vitest : Crée un test unitaire qui simule une "Ancienne Quote" et vérifie qu'elle est transformée correctement en "New Blocks".
   - Navigateur MCP : Non applicable.
   - Curl : Non applicable.
   - Vérification DB : Exécute le script sur un dump local (si possible) ou vérifie la logique.
   - Couverture : Vérifie que les cas complexes (Séjours/STAY) sont gérés.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "26-2-backward-compatibility-migration-script: backlog" à "26-2-backward-compatibility-migration-script: review"

---

CONTEXTE SPÉCIFIQUE STORY 26.2 :
Tu dois écrire le script TypeScript pour migrer les données existantes.

DÉTAILS TECHNIQUES REQUIS :
- Convertir les voyages standards en blocs `CALCULATED`.
- Convertir les `STAY` (Séjours) en structure imbriquée de blocs `GROUP`.
- Créer les enregistrements `Mission` correspondants pour chaque voyage migré.
- Assurer que `Quote.finalPrice` reste inchangé.

AGENT RECOMMANDÉ : Antigravity / Windsurf.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 26.3: Hybrid Block Validation Layer (Zod)

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 26 - Flexible "Yolo Mode" Billing
- Sélectionne la story spécifique : Story 26.3 - Hybrid Block Validation Layer (Zod)
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 26.3
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/26-3-zod-validation
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET des fichiers de validation Zod modifiés.
   - Assure-toi que les types sont exportés correctement pour le Frontend.

3. Stratégie de Test Obligatoire :
   - Vitest : Tests unitaires obligatoires pour les validateurs Zod (Cas valides vs Cas invalides).
   - Navigateur MCP : Non applicable.
   - Curl : Non applicable.
   - Vérification DB : Non applicable.
   - Couverture : Teste l'imbrication (Group dans Group = Erreur).

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "26-3-hybrid-block-validation-layer-zod: backlog" à "26-3-hybrid-block-validation-layer-zod: review"

---

CONTEXTE SPÉCIFIQUE STORY 26.3 :
Sécuriser les entrées API pour la nouvelle structure de bloc.

DÉTAILS TECHNIQUES REQUIS :
- Mettre à jour les schémas Zod pour `quotes` et `invoices`.
- Valider récursivement les lignes (ou liste plate avec parentId valide).
- Règles :
  - `GROUP` max depth 1.
  - `CALCULATED` requires `sourceData`.
  - `MANUAL` allows empty `sourceData`.

AGENT RECOMMANDÉ : Google Jules / Windsurf.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 26.4: Backend API CRUD for Nested Lines

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 26 - Flexible "Yolo Mode" Billing
- Sélectionne la story spécifique : Story 26.4 - Backend API CRUD for Nested Lines & Totals
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 26.4
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/26-4-api-crud-nested
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET des routes API (Next.js/tRPC).
   - Utilise des Transactions Prisma pour garantir l'intégrité (Insert/Update/Delete en bloc).

3. Stratégie de Test Obligatoire :
   - Vitest : Tests d'intégration pour la logique de calcul de totaux.
   - Navigateur MCP : Non applicable.
   - Curl : Teste l'endpoint PATCH /api/quotes/:id avec, payload JSON complexe.
   - Vérification DB : Vérifie que le `Quote` parent est bien mis à jour avec le nouveau `finalPrice` après l'appel API.
   - Couverture : Vérifie le calcul des marges server-side.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "26-4-backend-api-crud-for-nested-lines: backlog" à "26-4-backend-api-crud-for-nested-lines: review"

---

CONTEXTE SPÉCIFIQUE STORY 26.4 :
Implémenter la logique de sauvegarde et de recalcule.

DÉTAILS TECHNIQUES REQUIS :
- Endpoint qui accepte une liste plate de lignes avec `parentId`.
- Logique de Diff (Update existantes, Create nouvelles, Delete manquantes).
- Recalcule automatique de `Quote.finalPrice` = somme(displayData.total).
- Recalcule de `Quote.internalCost`.

MCP REQUIS : postgres_vtc_sixiemme_etoile.
AGENT RECOMMANDÉ : Antigravity / Windsurf.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 26.5: UI Universal Block Row Component

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 26 - Flexible "Yolo Mode" Billing
- Sélectionne la story spécifique : Story 26.5 - UI Universal Block Row Component
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 26.5
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/26-5-ui-universal-row
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET du composant React `UniversalLineItemRow.tsx`.
   - Utilise TailwindCSS pour le style.
   - Pas de logique d'édition complexe ici (juste le rendu).

3. Stratégie de Test Obligatoire :
   - Vitest : Test de rendu (Snapshot) pour les 3 types (MANUAL, CALCULATED, GROUP).
   - Navigateur MCP : Ouvre une Storybook ou une page de test pour valider visuellement la ligne.
   - Curl : Non applicable.
   - Vérification DB : Non applicable.
   - Couverture : Vérifie que l'icône "Linked" apparaît bien pour les types CALCULATED.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "26-5-ui-universal-block-row-component: backlog" à "26-5-ui-universal-block-row-component: review"

---

CONTEXTE SPÉCIFIQUE STORY 26.5 :
Créer le composant visuel de base pour une ligne de devis.

DÉTAILS TECHNIQUES REQUIS :
- Props: `line` (QuoteLine), `depth`.
- Rendu conditionnel selon `line.type`.
- Style dense (Tableur/Notion).

AGENT RECOMMANDÉ : Google Jules (Tâche UI isolée).

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 26.6: UI Click-to-Edit Inline Forms

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 26 - Flexible "Yolo Mode" Billing
- Sélectionne la story spécifique : Story 26.6 - UI Click-to-Edit Inline Forms
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 26.6
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/26-6-click-to-edit
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET du composant `InlineInput`.
   - Modifie `UniversalLineItemRow` pour utiliser ce composant.
   - Gère le focus et le "OnBlur" save.

3. Stratégie de Test Obligatoire :
   - Vitest : Test user-event (Click -> Type -> Enter -> Expect onChange).
   - Navigateur MCP : Test manuel d'édition dans le navigateur.
   - Curl : Non applicable.
   - Vérification DB : Non applicable.
   - Couverture : Vérifie que le layout ne "saute" pas lors de l'édition.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "26-6-ui-click-to-edit-inline-forms: backlog" à "26-6-ui-click-to-edit-inline-forms: review"

---

CONTEXTE SPÉCIFIQUE STORY 26.6 :
Rendre les lignes de texte éditables inline.

DÉTAILS TECHNIQUES REQUIS :
- Composant `InlineInput` qui switch entre `<span>` et `<input>`.
- AutoFocus lors de l'activation.
- Commit sur Enter ou Blur.

AGENT RECOMMANDÉ : Google Jules (Tâche UI isolée).

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 26.7: UI Drag & Drop Reordering

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 26 - Flexible "Yolo Mode" Billing
- Sélectionne la story spécifique : Story 26.7 - UI Drag & Drop Reordering & Grouping
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 26.7
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/26-7-dnd-reorder
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET de l'intégration `dnd-kit`.
   - Modifie la liste parent pour être un `SortableContext`.
   - Implémente la logique de "Re-parenting" lors du drop sous un Groupe.

3. Stratégie de Test Obligatoire :
   - Vitest : Complexe à tester unitairement.
   - Navigateur MCP : TEST CRITIQUE - Valide que le Drag & Drop fonctionne visuellement et que l'ordre persiste.
   - Curl : Non applicable.
   - Vérification DB : Vérifie que `sortOrder` et `parentId` sont bien mis à jour en base après sauvegarde.
   - Couverture : Teste le déplacement d'un item DANS et HORS d'un groupe.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "26-7-ui-drag-drop-reordering-grouping: backlog" à "26-7-ui-drag-drop-reordering-grouping: review"

---

CONTEXTE SPÉCIFIQUE STORY 26.7 :
Implémenter le réordonnancement visuel.

DÉTAILS TECHNIQUES REQUIS :
- Utiliser `dnd-kit` (moderne, accessible).
- Ajouter un "Drag Handle" sur chaque ligne.
- Gérer la logique de mise à jour du state local avant l'envoi à l'API.

AGENT RECOMMANDÉ : Google Jules (si à l'aise avec dnd-kit) ou Windsurf.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 26.8: UI Slash Commands Menu

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 26 - Flexible "Yolo Mode" Billing
- Sélectionne la story spécifique : Story 26.8 - UI Slash Commands Menu
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 26.8
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/26-8-slash-menu
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET du composant Popover Menu (Radix/CMDK).
   - Connecte le trigger sur la frappe de la touche "/" dans l'input label.

3. Stratégie de Test Obligatoire :
   - Vitest : Teste la détection de la touche "/".
   - Navigateur MCP : Valide que le menu s'ouvre et que la sélection insère bien un nouveau bloc.
   - Curl : Non applicable.
   - Vérification DB : Non applicable.
   - Couverture : Vérifie les options "Text", "Header", "Discount".

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "26-8-ui-slash-commands-menu: backlog" à "26-8-ui-slash-commands-menu: review"

---

CONTEXTE SPÉCIFIQUE STORY 26.8 :
Ajouter un menu contextuel style "Notion".

DÉTAILS TECHNIQUES REQUIS :
- Trigger: "/" keydown.
- UI: Popover flottant près du curseur.
- Actions: Changer le type de ligne ou insérer une nouvelle ligne.

AGENT RECOMMANDÉ : Google Jules (Tâche UI isolée).

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 26.9: Operational Detach Logic

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 26 - Flexible "Yolo Mode" Billing
- Sélectionne la story spécifique : Story 26.9 - Operational Detach Logic
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 26.9
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/26-9-detach-logic
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET de la logique de détection de changement critique.
   - Implémente le Modal de confirmation "Detach warning".

3. Stratégie de Test Obligatoire :
   - Vitest : Teste la logique conditionnelle (Si modification champ sensible -> Trigger Warning).
   - Navigateur MCP : Valide le flux utilisateur (Changement date -> Modal -> Confirm -> Icon change).
   - Curl : Non applicable.
   - Vérification DB : Non applicable.
   - Couverture : Vérifie que `sourceData` est bien mis à `null` lors du détachement.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "26-9-operational-detach-logic: backlog" à "26-9-operational-detach-logic: review"

---

CONTEXTE SPÉCIFIQUE STORY 26.9 :
Protéger l'intégrité des données opérationnelles.

DÉTAILS TECHNIQUES REQUIS :
- Si l'utilisateur modifie une donnée qui contredit le GPS (ex: Change la date), prévenir.
- Si confirmé, passer en mode MANUAL et supprimer le lien opérationnel.

AGENT RECOMMANDÉ : Google Jules / Windsurf.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 26.10: Real-Time Profitability Computation

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 26 - Flexible "Yolo Mode" Billing
- Sélectionne la story spécifique : Story 26.10 - Real-time Profitability Computation
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 26.10
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/26-10-profitability-badge
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET du calcul de la marge.
   - Ajoute le Badge UI coloré (Vert/Orange/Rouge).

3. Stratégie de Test Obligatoire :
   - Vitest : Teste la formule mathématique (Marge %).
   - Navigateur MCP : Valide que la couleur change dynamiquement quand on change le prix de vente.
   - Curl : Non applicable.
   - Vérification DB : Non applicable.
   - Couverture : Vérifie le cas de division par zéro.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "26-10-real-time-profitability-computation: backlog" à "26-10-real-time-profitability-computation: review"

---

CONTEXTE SPÉCIFIQUE STORY 26.10 :
Afficher la rentabilité en direct.

DÉTAILS TECHNIQUES REQUIS :
- Marge = (Prix Vente - Coût Interne) / Prix Vente.
- Afficher un badge visuel.

AGENT RECOMMANDÉ : Google Jules.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 26.11: PDF Generator (Display Mode)

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 26 - Flexible "Yolo Mode" Billing
- Sélectionne la story spécifique : Story 26.11 - PDF Generator pure Display Mode
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 26.11
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/26-11-pdf-display-mode
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET du template React-PDF modifié.
   - Doit utiliser exclusivement `displayData`.

3. Stratégie de Test Obligatoire :
   - Vitest : Non applicable (PDF).
   - Navigateur MCP : Génère un PDF de test et vérifie visuellement que les libellés correspondent à l'édition utilisateur.
   - Curl : Non applicable.
   - Vérification DB : Non applicable.
   - Couverture : Vérifie que les Groupes s'affichent comme des sous-titres.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "26-11-pdf-generator-pure-display-mode: backlog" à "26-11-pdf-generator-pure-display-mode: review"

---

CONTEXTE SPÉCIFIQUE STORY 26.11 :
Mettre à jour le Devis/Facture PDF.

DÉTAILS TECHNIQUES REQUIS :
- Ignorer `sourceData`.
- Rendre uniquement ce que l'utilisateur a configuré dans `displayData`.

AGENT RECOMMANDÉ : Antigravity / Windsurf.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 26.12: PDF Generator Mission Order

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 26 - Flexible "Yolo Mode" Billing
- Sélectionne la story spécifique : Story 26.12 - PDF Generator Mission Order (Operational Mode)
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 26.12
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/26-12-pdf-mission-order
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET du template Mission Order.
   - Doit prioriser `sourceData` (Vérité opérationnelle).

3. Stratégie de Test Obligatoire :
   - Vitest : Non applicable.
   - Navigateur MCP : Génère un Bon de Mission et vérifie que l'adresse GPS est affichée, même si le client a renommé la ligne en "Trajet VIP".
   - Curl : Non applicable.
   - Vérification DB : Non applicable.
   - Couverture : Vérifie l'avertissement "VOIR NOTES" pour les trajets purement manuels.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "26-12-pdf-generator-mission-order-operational-mode: backlog" à "26-12-pdf-generator-mission-order-operational-mode: review"

---

CONTEXTE SPÉCIFIQUE STORY 26.12 :
Mettre à jour le Bon de Mission pour les chauffeurs.

DÉTAILS TECHNIQUES REQUIS :
- Afficher les données réelles (Heure, Lieu) depuis `sourceData`.
- Si `sourceData` est vide (Manual), afficher un gros Warning.

AGENT RECOMMANDÉ : Antigravity / Windsurf.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 26.13: Block Presets Templates

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 26 - Flexible "Yolo Mode" Billing
- Sélectionne la story spécifique : Story 26.13 - Block Presets Templates (Bonus)
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 26.13
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/26-13-block-templates
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET pour la sauvegarde et le chargement de templates de blocs.
   - Ajoute une table `BlockTemplate` dans le schéma si nécessaire ou utilise un stockage local/JSON.

3. Stratégie de Test Obligatoire :
   - Vitest : Teste la sérialisation/désérialisation d'un bloc en template.
   - Navigateur MCP : Valide le flux "Enregistrer ce bloc" -> "Insérer depuis modèles".
   - Curl : Non applicable.
   - Vérification DB : Vérifie la persistance du template.
   - Couverture : Teste les templates avec et sans prix.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "26-13-block-presets-templates-bonus: backlog" à "26-13-block-presets-templates-bonus: review"

---

CONTEXTE SPÉCIFIQUE STORY 26.13 :
Productivité pour les opérateurs.

DÉTAILS TECHNIQUES REQUIS :
- CRUD simple sur une entité Template.
- Intégration dans le Slash Menu (Story 26.8).

AGENT RECOMMANDÉ : Google Jules.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 26.14: Undo Redo History Support

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 26 - Flexible "Yolo Mode" Billing
- Sélectionne la story spécifique : Story 26.14 - Undo Redo History Support
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 26.14
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/26-14-undo-redo
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Fournis le CODE COMPLET pour intégrer `zundo` ou une logique custom avec Zustand.
   - Mappe les raccourcis clavier Cmd+Z / Cmd+Shift+Z.

3. Stratégie de Test Obligatoire :
   - Vitest : Teste la stack d'historique (State A -> Change -> State B -> Undo -> State A).
   - Navigateur MCP : Valide le comportement utilisateur réel.
   - Curl : Non applicable.
   - Vérification DB : Non applicable.
   - Couverture : Vérifie que l'Undo fonctionne après une suppression de ligne.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "26-14-undo-redo-history-support: backlog" à "26-14-undo-redo-history-support: review"

---

CONTEXTE SPÉCIFIQUE STORY 26.14 :
Filet de sécurité UX.

DÉTAILS TECHNIQUES REQUIS :
- Store Zustand temporal.
- Limite de stack (ex: 50 actions).

AGENT RECOMMANDÉ : Google Jules.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

# IMPLEMENTATION PROMPTS - EPIC 28: Order Management & Intelligent Spawning

> **Generated for Parallel Agent Execution**
> **Context:** "Sixième Etoile" VTC Platform - Next.js 16, Prisma, Tailwind.
> **Format:** BMAD Protocol Strict - Single Story per Prompt.

---

## Story 28.1: Order Entity & Prisma Schema

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 28 - Order Management & Intelligent Spawning
- Sélectionne la story spécifique : Story 28.1 - Order Entity & Prisma Schema
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 28.1
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/28-1-order-schema
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Modifie `schema.prisma`.
   - Crée le modèle `Order` :
     - Champs: `id` (CUID), `status` (Enum), `reference` (String, unique, e.g., "ORD-2024-001"), `clientId` (Relation), `createdAt`, `updatedAt`.
     - Enum `OrderStatus`: `DRAFT`, `QUOTED`, `CONFIRMED`, `INVOICED`, `PAID`, `CANCELLED`.
   - Mets à jour `Quote`: Ajoute `orderId` (optional relation).
   - Mets à jour `Mission`: Ajoute `orderId` (optional relation).
   - Mets à jour `Invoice`: Ajoute `orderId` (optional relation).
   - Génère la migration (`npx prisma migrate dev --name add_order_model`).
   - Mets à jour le seed (`packages/database/prisma/seed.ts`) pour créer des Orders de test.

3. Stratégie de Test Obligatoire :
   - Vitest : Non applicable (Schema).
   - Vérification DB : Vérifie via `prisma studio` ou `psql` que la table Order existe et que les relations sont correctes.
   - Couverture : Vérifie que `reference` est unique.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "28-1-order-entity-prisma-schema: backlog" à "28-1-order-entity-prisma-schema: review"

---

CONTEXTE SPÉCIFIQUE STORY 28.1 :
Poser les fondations.

DÉTAILS TECHNIQUES REQUIS :
- Relation One-to-Many Client -> Orders.
- Relation One-to-Many Order -> Invoices.
- Relation One-to-Many Order -> Missions.

AGENT RECOMMANDÉ : Antigravity.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 28.2: Order State Machine & API

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 28 - Order Management & Intelligent Spawning
- Sélectionne la story spécifique : Story 28.2 - Order State Machine & API
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 28.2
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/28-2-order-api
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Crée les routes `apps/web/app/api/vtc/orders/...`.
   - `POST /`: Créer un Order.
   - `GET /:id`: Vue détaillée (include Quote, Missions, Invoices).
   - `PATCH /:id/status`: Transition d'état (DRAFT -> CONFIRMED, etc.).
   - Implémente la validation Zod.

3. Stratégie de Test Obligatoire :
   - API Test (Curl/Postman) : Crée un order, change son statut, vérifie la persistence.
   - Vitest : Teste les transitions interdites (ex: pas de client -> erreur).
   - Couverture : Teste l'idempotence (confirmer un order déjà confirmé ne doit rien casser).

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "28-2-order-state-machine-api: backlog" à "28-2-order-state-machine-api: review"

---

CONTEXTE SPÉCIFIQUE STORY 28.2 :
Le cerveau du cycle de vie.

DÉTAILS TECHNIQUES REQUIS :
- Zod schemas pour validation.
- Audit logs simples (console.log ou table Audit si existante).

AGENT RECOMMANDÉ : Antigravity.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 28.3: Dossier View UI - Skeleton & Tabs

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 28 - Order Management & Intelligent Spawning
- Sélectionne la story spécifique : Story 28.3 - Dossier View UI - Skeleton & Tabs
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 28.3
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/28-3-dossier-ui
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Page `app/(app)/app/[slug]/orders/[id]/page.tsx`.
   - Layout "Dossier" : Header (Ref, Statut, Client) + KPI Cards.
   - Navigation via Tabs (Shadcn UI) : `Commercial`, `Operations`, `Financial`.
   - Contenu "Placeholder" propre pour chaque tab.

3. Stratégie de Test Obligatoire :
   - Navigateur MCP : Visite la page d'un Order existant. Vérifie la navigation entre onglets.
   - Couverture : Vérifie le responsive mobile.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "28-3-dossier-view-ui-skeleton-tabs: backlog" à "28-3-dossier-view-ui-skeleton-tabs: review"

---

CONTEXTE SPÉCIFIQUE STORY 28.3 :
Le hub central de l'application.

DÉTAILS TECHNIQUES REQUIS :
- Utiliser `Tabs`, `Card`, `Badge` de Shadcn.
- Server Components pour le fetch initial.

AGENT RECOMMANDÉ : Google Jules.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 28.4: Spawning Engine - Trigger Logic

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 28 - Order Management & Intelligent Spawning
- Sélectionne la story spécifique : Story 28.4 - Spawning Engine - Trigger Logic
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 28.4
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/28-4-spawn-engine
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Crée `SpawnService.execute(orderId)`.
   - Déclenché lors du passage à `CONFIRMED`.
   - Itère sur les QuoteLines.
   - Crée une `Mission` par ligne de type TRANSFER ou DISPOSAL.
   - Mappe les champs (Date, Pickup, Dropoff, Pax, VehicleCategory).
   - Lie `Mission.orderId` et `Mission.quoteLineId`.

3. Stratégie de Test Obligatoire :
   - Vitest : Test unitaire du Service (Quote -> Missions).
   - Vérification DB : Confirme un Order via l'API, vérifie que les Missions sont créées.
   - Couverture : Vérifie que le statut Mission est initialisé à `PENDING`.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "28-4-spawning-engine-trigger-logic: backlog" à "28-4-spawning-engine-trigger-logic: review"

---

CONTEXTE SPÉCIFIQUE STORY 28.4 :
Automatisation opérationnelle.

DÉTAILS TECHNIQUES REQUIS :
- Service Backend (Node/TS).
- Prisma Transaction.

AGENT RECOMMANDÉ : Antigravity.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 28.5: Group Spawning Logic (Multi-Day)

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 28 - Order Management & Intelligent Spawning
- Sélectionne la story spécifique : Story 28.5 - Group Spawning Logic (Multi-Day)
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 28.5
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/28-5-group-spawn
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Étend `SpawnService`.
   - Gère les lignes de type `GROUP`.
   - Si Enfants: Itère et spawn récursivement.
   - Si Time-Range sans enfants (ex: "3 Jours"): Spawn 1 mission par jour dans l'intervalle.

3. Stratégie de Test Obligatoire :
   - Vitest : Teste le cas "Wedding Pack 3 Days".
   - Couverture : Vérifie que toutes les missions filles sont bien liées au même Order.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "28-5-group-spawning-logic-multi-day: backlog" à "28-5-group-spawning-logic-multi-day: review"

---

CONTEXTE SPÉCIFIQUE STORY 28.5 :
Complexité Multi-missions.

DÉTAILS TECHNIQUES REQUIS :
- Boucle de dates (date-fns).

AGENT RECOMMANDÉ : Antigravity.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 28.6: Optional Dispatch & Force Enable

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 28 - Order Management & Intelligent Spawning
- Sélectionne la story spécifique : Story 28.6 - Optional Dispatch & Force Enable
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 28.6
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/28-6-optional-dispatch
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Ajoute `dispatchable` (Boolean) à `QuoteLine` (Schema).
   - Update `SpawnService`: Ne spawn que si `dispatchable === true`.
   - Update UI (Quote Lines): Ajoute un toggle "Dispatch" visible avant confirmation.

3. Stratégie de Test Obligatoire :
   - Vitest : Teste qu'une ligne `dispatchable: false` ne crée pas de mission.
   - Navigateur MCP : Toggle le flag dans l'UI et confirme l'ordre.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "28-6-optional-dispatch-force-enable: backlog" à "28-6-optional-dispatch-force-enable: review"

---

CONTEXTE SPÉCIFIQUE STORY 28.6 :
Contrôle fin.

DÉTAILS TECHNIQUES REQUIS :
- Migration Schema.
- UI Switch/Toggle.

AGENT RECOMMANDÉ : Antigravity.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 28.7: Manual Item Handling UI

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 28 - Order Management & Intelligent Spawning
- Sélectionne la story spécifique : Story 28.7 - Manual Item Handling UI
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 28.7
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/28-7-manual-spawn
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Dans `CommercialTab`, ajoute un bouton "Create Mission" sur les lignes manuelles non-linkées.
   - Modal `SpawnMissionModal`: Demande date/heure/véhicule (car la ligne manuelle n'a peut-être pas ces infos).
   - API call `POST /api/missions/spawn-manual` (lié à la ligne).

3. Stratégie de Test Obligatoire :
   - Navigateur MCP : Crée une mission à partir d'une ligne "Extra Stop". Vérifie le lien.
   - Couverture : Vérifie le refresh de l'UI après création.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "28-7-manual-item-handling: backlog" à "28-7-manual-item-handling: review"

---

CONTEXTE SPÉCIFIQUE STORY 28.7 :
Flexibilité sur les imprévus.

DÉTAILS TECHNIQUES REQUIS :
- Dialog/Modal Form.

AGENT RECOMMANDÉ : Google Jules.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 28.13: Ad-Hoc Free Missions

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 28 - Order Management & Intelligent Spawning
- Sélectionne la story spécifique : Story 28.13 - Ad-Hoc Free Missions
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 28.13
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/28-13-free-missions
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Dans `OperationsTab`, ajoute bouton "Add Internal Task".
   - Formulaire création Mission (sans QuoteLine source).
   - Flag `internal` ou `non-billable` (utiliser `type` ou un tag).
   - Affiche ces missions avec un badge spécifique.

3. Stratégie de Test Obligatoire :
   - Navigateur MCP : Ajoute une mission "Lavage Voiture". Vérifie qu'elle apparaît dans le dossier mais pas sur la facture.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "28-13-ad-hoc-free-missions: backlog" à "28-13-ad-hoc-free-missions: review"

---

CONTEXTE SPÉCIFIQUE STORY 28.13 :
Tâches internes.

DÉTAILS TECHNIQUES REQUIS :
- Réutiliser le formulaire de mission standard.

AGENT RECOMMANDÉ : Google Jules.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 28.8: Invoice Generation - Detached Snapshot

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 28 - Order Management & Intelligent Spawning
- Sélectionne la story spécifique : Story 28.8 - Invoice Generation - Detached Snapshot
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 28.8
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/28-8-invoice-factory
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Implémente `InvoiceFactory.createInvoiceFromOrder`.
   - Copie profonde (Deep Copy) des données de QuoteLines vers InvoiceLines (Description, Qty, Price, VAT).
   - Les modifications ultérieures du Devis NE DOIVENT PAS impacter la Facture.
   - Les modifications de la Facture NE DOIVENT PAS impacter le Devis.

3. Stratégie de Test Obligatoire :
   - Vitest : Crée une facture, change le prix sur le devis, vérifie que la facture reste inchangée.
   - Vérification DB : Vérifie les données dupliquées.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "28-8-invoice-generation-detached-snapshot: backlog" à "28-8-invoice-generation-detached-snapshot: review"

---

CONTEXTE SPÉCIFIQUE STORY 28.8 :
Immuabilité fiscale.

DÉTAILS TECHNIQUES REQUIS :
- Pattern Factory.
- Duplication de données intentionnelle.

AGENT RECOMMANDÉ : Antigravity.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 28.9: Invoice UI - Full Editability

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 28 - Order Management & Intelligent Spawning
- Sélectionne la story spécifique : Story 28.9 - Invoice UI - Full Editability
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 28.9
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/28-9-invoice-editor
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Crée `InvoiceEditor` component.
   - Tout est éditable : Description (Input text), Prix (Input Number), TVA.
   - Bouton "Save Changes" pour persister.
   - Recalcul automatique des totaux en JS.

3. Stratégie de Test Obligatoire :
   - Navigateur MCP : Ouvre une facture, change un prix, sauvegarde. Recharge la page pour vérifier la persistence.
   - Couverture : Vérifie le recalcul de la TVA.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "28-9-invoice-ui-full-editability: backlog" à "28-9-invoice-ui-full-editability: review"

---

CONTEXTE SPÉCIFIQUE STORY 28.9 :
Liberté totale pour la finance.

DÉTAILS TECHNIQUES REQUIS :
- Gestion état local + mutation API.

AGENT RECOMMANDÉ : Google Jules.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 28.10: Execution Feedback Loop (Placeholders)

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 28 - Order Management & Intelligent Spawning
- Sélectionne la story spécifique : Story 28.10 - Execution Feedback Loop (Placeholders)
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 28.10
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/28-10-placeholders
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Utils `replacePlaceholders(text, missionContext)`.
   - Tokens supportés : `{{driver}}`, `{{plate}}`, `{{start}}`, `{{end}}`.
   - UI de Prévisualisation dans l'Invoice Editor.
   - Action "Finalize" pour remplacer définitivement les variables par le texte.

3. Stratégie de Test Obligatoire :
   - Vitest : Teste le remplacement de string (Regex).
   - Navigateur MCP : Écrit "Courses avec {{driver}}", active preview, voit "Courses avec John Doe".

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "28-10-execution-feedback-loop-placeholders: backlog" à "28-10-execution-feedback-loop-placeholders: review"

---

CONTEXTE SPÉCIFIQUE STORY 28.10 :
Enrichissement automatique.

DÉTAILS TECHNIQUES REQUIS :
- Regex replacement.

AGENT RECOMMANDÉ : Antigravity.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 28.11: Partial Invoicing

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 28 - Order Management & Intelligent Spawning
- Sélectionne la story spécifique : Story 28.11 - Partial Invoicing
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 28.11
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/28-11-partial-invoice
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - UI `GenerateInvoiceModal`.
   - 3 Modes : "Full Balance", "Deposit %", "Selection manually".
   - Intégration backend pour créer une facture partielle liée à l'Order.

3. Stratégie de Test Obligatoire :
   - Navigateur MCP : Génère une facture d'acompte de 30%. Vérifie le montant.
   - Couverture : Vérifie que le solde restant est correct pour la prochaine facture.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "28-11-partial-invoicing: backlog" à "28-11-partial-invoicing: review"

---

CONTEXTE SPÉCIFIQUE STORY 28.11 :
Acomptes et Solde.

DÉTAILS TECHNIQUES REQUIS :
- Calculs financiers précis.

AGENT RECOMMANDÉ : Google Jules.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 28.12: Post-Mission Pending Charges

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 28 - Order Management & Intelligent Spawning
- Sélectionne la story spécifique : Story 28.12 - Post-Mission Pending Charges
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + épique sélectionnée + story 28.12
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/28-12-pending-charges
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Compare `Mission.executionData` (frais réels) avec `InvoiceLines`.
   - Alert UI : "Des frais en attente ont été détectés".
   - Action "Add to Invoice" : Crée une nouvelle ligne de facture.

3. Stratégie de Test Obligatoire :
   - Navigateur MCP : Ajoute un frais de "Waiting Time" côté opération. Vérifie que l'alerte apparaît côté finance.
   - Couverture : Ajoute le frais et vérifie le total facture.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour le fichier /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Change le statut de "28-12-post-mission-pending-charges: backlog" à "28-12-post-mission-pending-charges: review"

---

CONTEXTE SPÉCIFIQUE STORY 28.12 :
Ne rien oublier de facturer.

DÉTAILS TECHNIQUES REQUIS :
- Diff Logic entre Mission et Invoice.

AGENT RECOMMANDÉ : Antigravity.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

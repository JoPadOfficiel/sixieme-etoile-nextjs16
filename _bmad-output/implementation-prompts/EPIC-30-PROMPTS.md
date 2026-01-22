# IMPLEMENTATION PROMPTS - EPIC 30: Validation & Stabilization of Quote-to-Invoice Workflow
> **Generated for Parallel Agent Execution**
> **Context:** "Sixième Etoile" VTC Platform - Next.js 16, Prisma, Tailwind.
> **Format:** BMAD Protocol Strict - Single Story per Prompt.

---

## Story 30.1: Quote Workflow Fixes & PDF Customization

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 30 - Validation & Stabilization of Quote-to-Invoice Workflow
- Sélectionne la story spécifique : Story 30.1 - Quote Workflow Fixes & PDF Customization
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + Epic 30 + Story 30.1
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/30-1-quote-fixes-pdf
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - **Fix Persistence (CRITIQUE)** : Vérifie le Server Action de sauvegarde. Assure-toi que les modifications du JSON `sourceData` (pickup/dropoff) sont bien persistées en base même si le champ top-level ne change pas.
   - **Fix Actions** :
     - Annulation : Statut `CANCELLED` immédiat, UI verrouillée.
     - Duplication : "Deep Clone" complet des `QuoteLines` avec TOUS les champs (prix, marges, sourceData). Crée un NOUVEAU devis `DRAFT`.
   - **Moteur PDF** :
     - Description Enrichie : Remplace "Transfer" par "Type + Lieux + Véhicule + PAX".
     - Fix Prix 0.00€ : Vérifie le mapping `unitPrice` / `taxRate`.
   - **Settings PDF** : Ajoute une section "PDF Appearance" (Simple/Standard/Full) dans les Settings et un "Live Preview" dans l'admin.
   - **Visuals** : Masque la Map si pas de mission sélectionnée. Affiche la fiche contact immédiatement. Adds traductions manquantes (`quotes.actions.edit`).

3. Stratégie de Test Obligatoire :
   - Navigateur MCP / E2E :
     1. Modifie un devis, sauvegarde, reload -> Vérifie la persistance.
     2. Duplique un devis -> Vérifie que le nouveau a bien TOUTES les lignes et prix.
     3. Génère un PDF -> Vérifie que les descriptions sont riches et les totaux corrects.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour `sprint-status.yaml` : "30-1-quote-workflow-fixes-pdf-customization: review"

---

CONTEXTE SPÉCIFIQUE STORY 30.1 :
Stabilisation critique avant mise en prod. Les bugs de persistance et de PDF bloquent la facturation réelle.

DÉTAILS TECHNIQUES REQUIS :
- Prisma `update` avec gestion JSON.
- React-PDF pour le rendu dynamique.

AGENT RECOMMANDÉ : Antigravity.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 30.2: Robust Unified Dispatch & Gantt Improvements

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 30 - Validation & Stabilization of Quote-to-Invoice Workflow
- Sélectionne la story spécifique : Story 30.2 - Robust Unified Dispatch & Gantt Improvements
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + Epic 30 + Story 30.2
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/30-2-dispatch-robustness
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - **Algorithme "Le Cerveau"** :
     - Crée un helper `checkConstraints(mission, candidate)`.
     - **BLOQUANT** : Vérifie strictement le `licenseType` (Permis) et les Chevauchements horaires (Dispo).
     - **WARNING** : Vérifie les règles RSE (>9h conduite, <11h repos).
     - **Diagnostic** : Retourne un objet précis (ex: `{ excludedByLicense: 2, excludedBySchedule: 3 }`) si aucun candidat.
   - **UI Assignation** :
     - Affiche les Alertes Conflit ("Overlap: 15 min") avec bouton "Force Assign" rouge.
     - Affiche les raisons de rejet si liste vide.
   - **Gantt & UI** :
     - Fix Scroll horizontal (Drag). Backlog responsive.
     - Ajoute "Assign Second Driver" -> Crée un lien `MissionAssignment` secondaire.

3. Stratégie de Test Obligatoire :
   - Test Unitaire (Algorithme) :
     - Cas 1: Chauffeur avec une mission à 10h-12h. Essai d'assigner à 11h -> Doit être rejeté (Dispo).
     - Cas 2: Véhicule "Minibus" (Permis D). Chauffeur "Permis B" -> Doit être rejeté (License).
     - Cas 3: Second Chauffeur -> Vérifie l'affichage double sur le Gantt.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour `sprint-status.yaml` : "30-2-robust-unified-dispatch-gantt-improvements: review"

---

CONTEXTE SPÉCIFIQUE STORY 30.2 :
Le dispatcher doit avoir une confiance aveugle dans le système. Plus d'assignations "illégales" par erreur.

DÉTAILS TECHNIQUES REQUIS :
- Prisma overlaps queries.
- Date-fns pour calculs de temps.

AGENT RECOMMANDÉ : Antigravity.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 30.3: Validated Financial Reporting

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 30 - Validation & Stabilization of Quote-to-Invoice Workflow
- Sélectionne la story spécifique : Story 30.3 - Validated Financial Reporting
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + Epic 30 + Story 30.3
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/30-3-financial-reporting
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - **Changement de Source** :
     - Identifie TOUTES les requêtes de "Rentabilité" ou "Revenu" dans `reports-service.ts`.
     - Remplace les agrégations sur `Quote` par des agrégations sur `Invoice`.
   - **Filtres Stricts** :
     - `WHERE status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')`. Exclure absolument `DRAFT` et `CANCELLED`.
   - **Indicateurs** :
     - Revenu = `sum(Invoice.totalHT)`.
     - Pending = `sum(Invoice.totalTTC - Invoice.amountPaid)`.
   - **UI** : Renomme les labels "Quote Value" -> "Invoiced Revenue".

3. Stratégie de Test Obligatoire :
   - Créer un Devis à 1000€ (Accepté, non facturé) -> Le rapport doit afficher 0€.
   - Créer une Facture à 500€ (Issued) -> Le rapport doit afficher 500€.
   - Vérifier que les graphiques ne plantent pas si aucune donnée.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour `sprint-status.yaml` : "30-3-validated-financial-reporting: review"

---

CONTEXTE SPÉCIFIQUE STORY 30.3 :
Vérité comptable. On ne reporte que ce qui est légalement facturé.

DÉTAILS TECHNIQUES REQUIS :
- Prisma Aggregations (`_sum`).

AGENT RECOMMANDÉ : Antigravity.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 30.4: Invoice Generation Flexibility (Partial Invoicing)

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 30 - Validation & Stabilization of Quote-to-Invoice Workflow
- Sélectionne la story spécifique : Story 30.4 - Invoice Generation Flexibility (Partial Invoicing)
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + Epic 30 + Story 30.4
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/30-4-partial-invoicing
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - **UI Modale** :
     - Intercepte le clic "Generate Invoice". Ouvre `InvoiceGenerationModal`.
     - Affiche la liste des Misions/Items du Dossier.
     - Checkbox pour sélectionner les items à facturer (Défaut: Completed).
   - **Backend Service** :
     - Adapte `createInvoiceFromOrder` pour accepter une liste d'`itemIds`.
     - Recalcule le total de la facture UNIQUEMENT avec les items sélectionnés.
     - Marque les missions facturées (`BILLED`) pour éviter les doublons.
   - **Bonus** : Permettre d'ajouter des "Lignes Libres" (Internal Task) depuis la modale.

3. Stratégie de Test Obligatoire :
   - Dossier avec 3 Missions (A, B, C).
   - Générer Facture 1 avec Mission A uniquement.
   - Vérifier Facture 1 = Prix de A.
   - Générer Facture 2. La Mission A doit être décochée/grisée ou marquée "Déjà facturée". Sélectionner B et C.
   - Vérifier Facture 2 = Prix de B + C.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour `sprint-status.yaml` : "30-4-invoice-generation-flexibility-partial-invoicing: review"

---

CONTEXTE SPÉCIFIQUE STORY 30.4 :
Flexibilité commerciale indispensable pour les dossiers complexes ou annulés partiellement.

DÉTAILS TECHNIQUES REQUIS :
- React Hook Form (pour la sélection).
- Logique de filtrage backend.

AGENT RECOMMANDÉ : Antigravity.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

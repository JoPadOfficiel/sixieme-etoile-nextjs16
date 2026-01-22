# IMPLEMENTATION PROMPTS - EPIC 29: Complete Multi-Mission Quote Lifecycle
> **Generated for Parallel Agent Execution**
> **Context:** "Sixième Etoile" VTC Platform - Next.js 16, Prisma, Tailwind.
> **Format:** BMAD Protocol Strict - Single Story per Prompt.

---

## Story 29.1: Fix Shopping Cart Persistence & Pricing Aggregation

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 29 - Complete Multi-Mission Quote Lifecycle
- Sélectionne la story spécifique : Story 29.1 - Fix Shopping Cart Persistence & Pricing Aggregation
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + Epic 29 + Story 29.1
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/29-1-cart-persistence
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Modifie `QuoteService.create` dans `packages/api/src/routes/vtc/quotes.ts`.
   - Boucle sur chaque item du panier "Shopping Cart".
   - Pour chaque item :
     - Crée une entrée distincte dans `QuoteLine`.
     - Stocke TOUTES les métadonnées opérationnelles (pickup, dropoff, waypoints, distance, duration) dans le champ JSON `sourceData`. C'est CRITIQUE pour éviter la perte de données.
     - Assure que les champs calculés (price, tax) sont corrects au niveau de la ligne.
   - Au niveau Header `Quote` :
     - Aggregation : `finalPrice = sum(lines.price)`.
     - Aggregation : `taxAmount = sum(lines.tax)`.
   - Migration DB : Si nécessaire, ajoute un champ `sourceData` (Json) à `QuoteLine` s'il n'existe pas.

3. Stratégie de Test Obligatoire :
   - API Test : Envoie un payload avec 3 items (Transfert + Dispo + Excursion).
   - Vérification : Vérifie en BD que 3 `QuoteLine` sont créées avec leur `sourceData` complet.
   - Vérification Header : Vérifie que le Total du Quote est correct.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour `sprint-status.yaml` : "29-1-fix-shopping-cart-persistence-pricing-aggregation: review"

---

CONTEXTE SPÉCIFIQUE STORY 29.1 :
Le socle de données. Si ça échoue, tout le reste (gantt, factures) sera faux.

DÉTAILS TECHNIQUES REQUIS :
- Prisma `createMany` ou transactionnel.
- Type JSON pour `sourceData`.

AGENT RECOMMANDÉ : Antigravity.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 29.2: Implement Multi-Mission Quote Detail View

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 29 - Complete Multi-Mission Quote Lifecycle
- Sélectionne la story spécifique : Story 29.2 - Implement Multi-Mission Quote Detail View
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + Epic 29 + Story 29.2
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/29-2-quote-view
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Modifie la page de détail `apps/web/app/(app)/app/[slug]/quotes/[id]/page.tsx`.
   - Composant Liste : Affiche une table de `QuoteLines` au lieu de juste le header.
   - Composant Carte : Affiche `MultiMissionMap`.
     - Doit itérer sur toutes les lignes.
     - Afficher les marqueurs (Start/End) pour CHAQUE transfert.
     - Gérer le "Fit Bounds" pour englober tous les points de toutes les missions.
   - UX : Si je clique sur une ligne dans la liste, la carte zoome sur cette mission spécifique.

3. Stratégie de Test Obligatoire :
   - Navigateur MCP : Ouvre un devis multi-missions existant.
   - Vérification : Voit bien 3 trajets sur la carte, pas juste le premier.
   - Vérification : Les détails (véhicule, distance) de chaque ligne sont lisibles.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour `sprint-status.yaml` : "29-2-implement-multi-mission-quote-detail-view: review"

---

CONTEXTE SPÉCIFIQUE STORY 29.2 :
Visualisation "Yolo". Le commercial doit voir l'ensemble du voyage.

DÉTAILS TECHNIQUES REQUIS :
- Google Maps JS API (Markers array).
- React Context pour la sélection de ligne active.

AGENT RECOMMANDÉ : Google Jules.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 29.3: Ensure Lossless Quote Editing (Hydration)

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 29 - Complete Multi-Mission Quote Lifecycle
- Sélectionne la story spécifique : Story 29.3 - Ensure Lossless Quote Editing (Hydration)
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + Epic 29 + Story 29.3
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/29-3-quote-edit-hydration
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Dans `CreateQuoteCockpit` (ou équivalent YoloQuoteEditor).
   - Ajoute une fonction `hydrateFromQuote(quote: QuoteWithLines)`.
   - Logique :
     - Map chaque `QuoteLine` -> `CartItem`.
     - Utilise `sourceData` pour reconstruire l'état opérationnel (waypoints, dates).
     - Restaure le state Zustand/Context du panier à l'identique.
   - Test : Ouvre un devis, clique "Edit", le panier doit contenir 3 items editables, pas vide ou partiel.

3. Stratégie de Test Obligatoire :
   - Navigateur MCP :
     1. Ouvre un devis à 3 lignes.
     2. Clique Edit.
     3. Ajoute une 4ème ligne.
     4. Sauvegarde.
     5. Vérifie que le devis a maintenant 4 lignes (aucune perte).

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour `sprint-status.yaml` : "29-3-ensure-lossless-quote-editing-hydration: review"

---

CONTEXTE SPÉCIFIQUE STORY 29.3 :
Stabilité de l'édition.

DÉTAILS TECHNIQUES REQUIS :
- Zod parsing de `sourceData`.
- Zustand store action `setItems`.

AGENT RECOMMANDÉ : Antigravity.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 29.4: Implement Intelligent Multi-Mission Spawning (The "Launch")

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 29 - Complete Multi-Mission Quote Lifecycle
- Sélectionne la story spécifique : Story 29.4 - Implement Intelligent Multi-Mission Spawning (The "Launch")
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + Epic 29 + Story 29.4
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/29-4-launch-spawning
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Modifie `SpawnService.execute(orderId)`.
   - Logique CRITIQUE :
     1. Récupère l'Order et ses QuoteLines.
     2. **TRIAGE** : Trie les QuoteLines par date de départ (date/heure la plus tôt en premier).
     3. BOUCLE : Pour chaque ligne (Travel/Disposal) :
        - Génère une `ref` SÉQUENTIELLE : Ex: `OrderRef-01`, `OrderRef-02` (basé sur l'index trié).
        - Crée une `Mission` liée à `orderId` ET `quoteLineId`.
        - Mappe `sourceData` vers les champs Mission (pickup, dropoff, start, end).
   - Idempotence : Si je relance le spawn, il ne doit PAS créer de doublons (vérifier si mission existe pour cette lineId).

3. Stratégie de Test Obligatoire :
   - API Test : Confirme un Order multi-lignes.
   - Vérification :
     - N missions créées.
     - Refs sont séquentielles (01, 02, 03) et chronologiques.
     - Pas de doublons si appelé 2 fois.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour `sprint-status.yaml` : "29-4-implement-intelligent-multi-mission-spawning-the-launch: review"

---

CONTEXTE SPÉCIFIQUE STORY 29.4 :
Transformation commerciale -> opérationnelle.
Le tri chronologique est vital pour la numérotation logique des missions.

DÉTAILS TECHNIQUES REQUIS :
- Lodash `sortBy`.
- Prisma Transaction.

AGENT RECOMMANDÉ : Antigravity.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 29.5: Implement Multi-Mission Invoicing & Sync

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 29 - Complete Multi-Mission Quote Lifecycle
- Sélectionne la story spécifique : Story 29.5 - Implement Multi-Mission Invoicing & Sync
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + Epic 29 + Story 29.5
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/29-5-invoicing-sync
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Crée la feature "Convert Order to Invoice".
   - `InvoiceFactory` : Doit copier les N `QuoteLines` vers N `InvoiceLines`.
   - Garde le lien : `InvoiceLine.quoteLineId`.
   - Affichage : La facture PDF/HTML doit lister clairement chaque prestation avec sa date et son trajet.
   - Sync UI : Si une mission est modifiée (ex: heure changée), ajouter un flag "Out of Sync" sur la ligne de facture correspondante (Optionnel/Stretch).

3. Stratégie de Test Obligatoire :
   - Navigateur MCP :
     1. Confirme Order.
     2. Clique "Générer Facture".
     3. Vérifie que la facture a N lignes identiques au devis.
     4. Vérifie les totaux.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour `sprint-status.yaml` : "29-5-implement-multi-mission-invoicing-sync: review"

---

CONTEXTE SPÉCIFIQUE STORY 29.5 :
Facturation fidèle.

DÉTAILS TECHNIQUES REQUIS :
- Deep copy des lignes.

AGENT RECOMMANDÉ : Antigravity.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 29.6: Upgrade Unified Dispatch Visualization (Gantt Zoom & Axis)

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 29 - Complete Multi-Mission Quote Lifecycle
- Sélectionne la story spécifique : Story 29.6 - Upgrade Unified Dispatch Visualization (Gantt Zoom & Axis)
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + Epic 29 + Story 29.6
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/29-6-gantt-v2
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - **Gantt Component** : Refonte de l'axe temporel.
   - **Continuity** : L'axe X doit être linéaire (Date + Time) et ne pas "reset" à 00h visuellement (pas de saut de ligne).
   - **Zoom Controls** :
     - Ajoute boutons: `Day` (Width/h élevé), `3 Days`, `Week` (Width/h faible).
     - Ajuste dynamiquement `columnWidth` en fonction du zoom.
   - **Date Range Picker** : Remplace le simple "Single Date Picker" par un "Range Picker" (Start - End).
   - Fetch : Le `DispatchProvider` doit fetcher les missions entre `RangeStart` et `RangeEnd` (pas juste 1 jour).

3. Stratégie de Test Obligatoire :
   - Navigateur MCP :
     1. Va sur Dispatch.
     2. Sélectionne 3 jours (Lundi-Mercredi).
     3. Vérifie que l'axe couvre 72h en continu.
     4. Pose une mission à 23h le Lundi et une à 01h le Mardi -> Doivent être proches visuellement, pas séparées.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour `sprint-status.yaml` : "29-6-upgrade-unified-dispatch-visualization-gantt-zoom-axis: review"

---

CONTEXTE SPÉCIFIQUE STORY 29.6 :
UX critique pour les dispatchers de nuit.

DÉTAILS TECHNIQUES REQUIS :
- `date-fns` pour calculs d'intervalles.
- Virtualization (recommandée si > 100 missions).

AGENT RECOMMANDÉ : Google Jules.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 29.7: Dispatch List Integrity & Backlog Separation

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 29 - Complete Multi-Mission Quote Lifecycle
- Sélectionne la story spécifique : Story 29.7 - Dispatch List Integrity & Backlog Separation
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + Epic 29 + Story 29.7
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/29-7-list-integrity
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - **Strict Queries** :
     - `BacklogList` : Query `Mission` WHERE `driverId IS NULL` AND `start >= rangeStart` AND `start <= rangeEnd`.
     - `PlannedList` (Gantt/Table) : Query `Mission` WHERE `driverId IS NOT NULL` (ou All si filtre Actif).
   - **Exclusion** : Assure-toi qu'AUCUN objet `Quote` ou `Order` n'est retourné par ces endpoints. Seulement `Mission`.
   - UI : La liste doit afficher le `Mission.ref` (ex: `ORD-123-01`), le type (Transfer/Dispo), et le badge statut.
   - Ad-Hoc : Les missions "Free" (sans Order parent) doivent apparaître si elles sont dans la plage de date.

3. Stratégie de Test Obligatoire :
   - Vitest / API Test : Crée 1 Order (non lancé), 1 Mission (Non assignée), 1 Mission (Assignée).
     - Le backlog doit montrer 1, pas 2.
     - L'Order non lancé ne doit apparaître nulle part.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour `sprint-status.yaml` : "29-7-dispatch-list-integrity-backlog-separation: review"

---

CONTEXTE SPÉCIFIQUE STORY 29.7 :
Zéro pollution visuelle. Le dispatcher ne veut voir que ce qui est "réel".

DÉTAILS TECHNIQUES REQUIS :
- Prisma filters.

AGENT RECOMMANDÉ : Antigravity.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

---

## Story 29.8: Revamp Mission Sheet PDF Generation (Per-Mission)

```text
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 29 - Complete Multi-Mission Quote Lifecycle
- Sélectionne la story spécifique : Story 29.8 - Revamp Mission Sheet PDF Generation (Per-Mission)
Sortie : Résumé de l'objectif métier, de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Entrée : Extraits pertinents du PRD + Epic 29 + Story 29.8
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, Critères d'acceptation (AC), Cas de tests, Contraintes/Dépendances.
Sortie : La fiche Story complète (Doit être affichée intégralement).

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Crée la branche : feature/29-8-mission-pdf
   - Propose le plan de développement.

2. Implémentation (Instructions Spéciales) :
   - Crée `MissionSheetPdf` service/component (React-PDF ou Puppeteer/JSPDF).
   - **Input** : `Mission` object (avec relations vehicule, driver, client).
   - **Header** :
     - Affiche GROS : `Mission.type` (TRANSFER, DISPOSAL).
     - Affiche ID : `Mission.ref` (ex: `ORD-123-01`).
   - **Body** :
     - Affiche les waypoints spécifiques à CETTE mission uniquement.
     - Cache les infos financières (optionnel, selon config).
     - Affiche le Driver assigné.
   - **Download** : Bouton "Download PDF" sur la carte Mission (Dispatch) et dans la liste (Dossier).

3. Stratégie de Test Obligatoire :
   - Manual : Génère un PDF pour une mission de type EXCURSION.
   - Vérifie visuellement : Titre "EXCURSION", Ref "ORD-XXX-01", Waypoints corrects.

4. Sortie Finale :
   - Mise à jour du fichier de la Story.
   - Liste des fichiers modifiés.
   - Résumé des tests exécutés.
   - Commande Git de push et infos pour la PR.
   - METTRE EN REVIEW la story (status: review)

5. MISE À JOUR OBLIGATOIRE :
   - Mets à jour `sprint-status.yaml` : "29-8-revamp-mission-sheet-pdf-generation: review"

---

CONTEXTE SPÉCIFIQUE STORY 29.8 :
Le document légal pour le chauffeur. Doit être pro et précis.

DÉTAILS TECHNIQUES REQUIS :
- Lib de génération PDF.

AGENT RECOMMANDÉ : Antigravity.

---

CONFIRME la lecture de ce protocole et lance l'ETAPE 1.
```

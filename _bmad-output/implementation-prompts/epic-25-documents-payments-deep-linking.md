# Epic 25: Documents, Payments & Deep Linking Enhancements - Development Prompts

## 🎯 Epic Overview
**Goal:** Finaliser la suite documentaire (Fiches Mission, Invoices, Quotes), personnaliser l'identité visuelle de l'organisation, améliorer la navigation via Deep Linking et implémenter le lettrage multi-factures.
**Stories:** 6 stories pour une complétion totale de la chaîne administrative et opérationnelle.
**Agent Assignment:** Claude 3.5 Sonnet / Claude Opus (Senior Expert)
**Priority:** HIGH - Améliore drastiquement le professionnalisme des documents et l'efficacité opérationnelle.
**Estimated Time:** 6-8h

## 📋 Execution Order & Dependencies
```
25.3 → 25.2 (SÉQUENTIEL - OBLIGATOIRE : La config doit exister pour le layout)
25.1, 25.4, 25.5, 25.6 (PARALLÈLE possible après 25.3)
```
**ATTENTION:** Story 25.3 (Personalization) est le prérequis technique pour le moteur de PDF de la 25.2.

---

## Story 25.1: Generate & Manage Mission Sheets (Fiche Mission)

### 🎯 Assignment Box
- [x] **AGENT:** Claude 3.5 Sonnet
- [x] **STATUS:** À faire
- [x] **STARTED:** 
- [x] **COMPLETED:** 
- [x] **REVIEW:** 

### 📋 System Prompt for Agent

```
Tu agis en tant que BMad Orchestrator. Tu dois suivre strictement la méthode BMAD dans cet ordre immuable :
*(@_bmad-output ) → *(/create-story) → *(/dev-story)

NE JAMAIS changer cet ordre ou sauter une étape.

---

ETAPE 1 : ANALYSE (*@_bmad-output )
Action :
- Lis le PRD et les épiques disponibles.
- Sélectionne l'épique concernée : Epic 25 – Documents, Payments & Deep Linking Enhancements
- Sélectionne la story spécifique : Story 25.1: Generate & Manage Mission Sheets (Fiche Mission)
Sortie : Résumé de l'objectif métier (Transport Order conforme), de la valeur ajoutée et des contraintes clés.

ETAPE 2 : SPECIFICATION (*/create-story)
Agent : Bob (Scrum Master)
Action : Génère une Story BMAD complète et actionnable.
Contenu requis : Description, AC (Previsu, Champs manuels Km/Toll, Historique Driver), Cas de tests.
Sortie : La fiche Story complète.

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
Agent : Amelia (Developer)
Action : Implémentation et Tests.

1. Gestion Git :
   - Branche : feature/25-1-mission-sheets
   - Propose le plan (Templates PDF, Action Dispatch, Hooks d'édition).

2. Implémentation :
   - Générer le PDF Mission (Fiche Mission) avec les données auto-remplies (Ref, Client, Driver, Véhicule).
   - Laisser les champs Km (Base/Arrivée) et Péages vides pour saisie manuelle.
   - Pouvoir éditer les notes avant génération finale.
   - Sauvegarder dans l'historique d'activité du contact Driver.

3. Stratégie de Test :
   - Vitest : Validation du service de génération.
   - Navigateur : Vérifier le bouton "Generate Mission Sheet" dans le Dispatch.
   - Vérification DB : Vérifier la création de l'Activity record pour le Driver.

4. Sortie Finale :
   - Update story file (status: review)
   - Push Git info.

5. MISE À JOUR SPRINT STATUS :
   - Fichier : /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Story 25.1: backlog → review
```

---

## Story 25.2: EU-Compliant Invoice & Quote PDF Layout

### 🎯 Assignment Box
- [x] **AGENT:** Claude 3.5 Sonnet
- [x] **STATUS:** À faire (Dépend de 25.3)
- [x] **STARTED:** 
- [x] **COMPLETED:** 
- [x] **REVIEW:** 

### 📋 System Prompt for Agent

```
Tu agis en tant que BMad Orchestrator. Applique la méthode BMAD strictement.

ETAPE 1 : ANALYSE
- Épique 25, Story 25.2 : EU-Compliant Invoice & Quote PDF Layout.
- Prérequis : Story 25.3 doit être prête pour utiliser les paramètres de logo/position.

ETAPE 2 : SPECIFICATION (*/create-story)
- Définis les AC sur le layout : Logo (Gauche/Droite selon config), "From" block gauche, "Bill To" block droite.
- Main body: Table (Description, Qty, Rate, Total).
- Footer: Mentions légales (SIRET, VAT), numérotation.

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
1. Gestion Git : feature/25-2-compliant-pdf-layout
2. Implémentation : 
   - Refactoriser le moteur de PDF pour supporter la configuration dynamique de la Story 25.3.
   - Aligner strictement les blocs selon les standards FR/EU.
   - Ajouter le bloc "Trip Details" (Distance/Duration) pour les Quotes.
3. Tests :
   - Générer des PDFs de test avec logo à Gauche VS logo à Droite.
   - Vérifier la présence des colonnes obligatoires dans la table des prix.

5. MISE À JOUR SPRINT STATUS :
   - Fichier : /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Story 25.2: backlog → review
```

---

## Story 25.3: Organisation Document Personalization

### 🎯 Assignment Box
- [x] **AGENT:** Claude 3.5 Sonnet
- [x] **STATUS:** À faire (LA FONDATION)
- [x] **STARTED:** 
- [x] **COMPLETED:** 
- [x] **REVIEW:** 

### 📋 System Prompt for Agent

```
Tu agis en tant que BMad Orchestrator. C'est la story FONDATION de l'identité visuelle.

ETAPE 1 : ANALYSE
- Épique 25, Story 25.3 : Organisation Document Personalization.
- Objectif : Upload Logo, Couleur de marque, Position Logo (Gauche/Droite).

ETAPE 2 : SPECIFICATION (*/create-story)
- AC : Formulaire Settings Org, Storage de l'URL du logo dans OrganisationPricingSettings, Toggle Left/Right.

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
1. Gestion Git : feature/25-3-org-personalization
2. Implémentation :
   - Créer/Mettre à jour l'UI dans `/dashboard/settings/organization`.
   - Gérer l'upload du logo (Storage Supabase/S3).
   - Connecter le moteur de rendu PDF globaux pour lire ces nouvelles constantes.
3. Tests :
   - Upload Logo -> Refresh -> Génération PDF -> Vérifier la persistance.

5. MISE À JOUR SPRINT STATUS :
   - Fichier : /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Story 25.3: backlog → review
```

---

## Story 25.4: B2C Invoicing Address & Agency Transparency

### 🎯 Assignment Box
- [ ] **AGENT:** Claude 3.5 Sonnet
- [ ] **STATUS:** À faire
- [ ] **STARTED:** 
- [ ] **COMPLETED:** 
- [ ] **REVIEW:** 

### 📋 System Prompt for Agent

```
BMad Orchestrator Protocol.

ETAPE 1 : ANALYSE
- Épique 25, Story 25.4 : B2C Invoicing Address & Agency Transparency.

ETAPE 2 : SPECIFICATION (*/create-story)
- AC : Nouveau champ `billingAddress` pour les Contacts B2C.
- AC : Ajout auto du texte `(End Customer: {Name})` dans les lignes de facture Agency.

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
1. Gestion Git : feature/25-4-billing-address-transparency
2. Implémentation :
   - Modifier le modèle Contact pour inclure les champs d'adresse de facturation.
   - Modifier la logique de mapping InvoiceLine pour injecter le nom du passager final si lié par une agence.
3. Tests :
   - Créer un contact B2C -> Facturer -> Vérifier l'adresse de facturation sur le PDF.

5. MISE À JOUR SPRINT STATUS :
   - Fichier : /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Story 25.4: backlog → review
```

---

## Story 25.5: Deep Linking Navigation & CRM UX Improvements

### 🎯 Assignment Box
- [ ] **AGENT:** Claude 3.5 Sonnet
- [ ] **STATUS:** À faire
- [ ] **STARTED:** 
- [ ] **COMPLETED:** 
- [ ] **REVIEW:** 

### 📋 System Prompt for Agent

```
BMad Orchestrator Protocol.

ETAPE 1 : ANALYSE
- Épique 25, Story 25.5 : Deep Linking Navigation & CRM UX Improvements.

ETAPE 2 : SPECIFICATION (*/create-story)
- AC : Navigation directe vers Drawer Open avec Tab active via URL Query Params.
- AC : Largeur augmentée des modales/drawers (4xl).
- AC : Colonne "Invoices Count" dans la liste End Customers.

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
1. Gestion Git : feature/25-5-deep-linking-ux
2. Implémentation :
   - Utiliser `useSearchParams` pour détecter les IDs et Tabs à ouvrir au montage des pages.
   - Ajuster les tailles Tailwind des composants UI Dialog/Sheet.
3. Tests :
   - Entrer l'URL `/dashboard/contacts/123?tab=invoices` -> Vérifier l'ouverture auto.

5. MISE À JOUR SPRINT STATUS :
   - Fichier : /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Story 25.5: backlog → review
```

---

## Story 25.6: Multi-Invoice Payment Tracking (Lettrage)

### 🎯 Assignment Box
- [ ] **AGENT:** Claude 3.5 Sonnet
- [ ] **STATUS:** À faire
- [ ] **STARTED:** 
- [ ] **COMPLETED:** 
- [ ] **REVIEW:** 

### 📋 System Prompt for Agent

```
BMad Orchestrator Protocol.

ETAPE 1 : ANALYSE
- Épique 25, Story 25.6 : Multi-Invoice Payment Tracking (Lettrage).

ETAPE 2 : SPECIFICATION (*/create-story)
- AC : Multi-sélection de factures impayées.
- AC : Application d'un montant total selon l'ordre chronologique (FIFO).
- AC : Solde global visible sur la fiche contact.

ETAPE 3 : DEVELOPPEMENT ET VALIDATION (*/dev-story)
1. Gestion Git : feature/25-6-bulk-payment-lettrage
2. Implémentation :
   - Ajouter une checkbox multi-select dans la liste des factures d'un contact.
   - Créer une Server Action `applyBulkPayment`.
   - Gérer les restes à payer partiels.
3. Tests :
   - Payer 1000€ pour 3 factures de 400€ -> Vérifier que 2 sont 'Paid' et 1 est 'Partial' (200€ restants).

5. MISE À JOUR SPRINT STATUS :
   - Fichier : /Users/jopad/Downloads/sixieme-etoile-nextjs16/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Story 25.6: backlog → review
```

---

## 🚀 Execution Strategy

### Ordre de Lancement CRITICAL :
1. **Lancer Story 25.3** (Fondation identité visuelle).
2. **ATTENDRE** la mise en "review" de 25.3.
3. **Lancer Story 25.2** (Layout PDF) qui nécessite les paramètres de la 25.3.
4. Les autres stories (25.1, 25.4, 25.5, 25.6) peuvent être lancées de manière indépendante une fois la fondation 25.3 posée.

### ⚠️ ATTENTION :
- **Cohérence Visuelle** : Assure-toi que les PDF générés dans la 25.1 (Mission) utilisent les mêmes composants de header que la 25.2.
- **Audit Logging** : Toujours logger les paiements du lettrage (25.6) pour la traçabilité comptable.

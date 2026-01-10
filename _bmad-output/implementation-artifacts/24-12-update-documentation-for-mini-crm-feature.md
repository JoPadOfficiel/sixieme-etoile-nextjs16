# Story 24.12: Update Documentation for Mini-CRM Feature

Status: done

## Story

As a **product manager**,  
I want complete documentation for the Mini-CRM feature,  
so that operators understand how to use end-customer management and bidirectional pricing effectively.

## Related FRs

- **Documentation Requirements**: Story 24.12 specify the need for user and admin guides.

## Acceptance Criteria

**AC1 - User Guide: Clients Finaux:**
- **Given** the documentation platform,
- **When** I access the French user guides,
- **Then** I find a new section "Gestion des Clients Finaux" explaining:
  - Definition and business value of End-Customers.
  - Step-by-step guide to add/edit/delete end-customers from Partner Contact pages.
  - Explanation of the Difficulty Score (Patience Tax) and its impact on pricing.
  - How to select an end-customer during quote creation.

**AC2 - User Guide: Tarification Bidirectionnelle:**
- **Given** the documentation platform,
- **When** I look for pricing documentation,
- **Then** I find an explanation of "Prix Grille Agence" vs "Prix Client Direct":
  - When to use each mode.
  - How to interpret the visual comparison indicators (📈/📉).
  - How to switch modes in the quote cockpit.

**AC3 - Admin & Technical Guide:**
- **Given** the technical documentation,
- **When** I read the Mini-CRM section,
- **Then** I find:
  - Data model overview (EndCustomer linked to Contact and Quote).
  - List of primary API endpoints for end-customer management.
  - Brief migration notes for Epic 24.

## Tasks / Subtasks

- [ ] Task 1: Draft User Guide for End-Customers (AC: #1)
  - [ ] 1.1: Create `docs/user-guides/fr/gestion-clients-finaux.md`
  - [ ] 1.2: Document CRUD operations with screenshots (placeholders if needed)
  - [ ] 1.3: Explain Difficulty Score usage
- [ ] Task 2: Draft User Guide for Bidirectional Pricing (AC: #2)
  - [ ] 2.1: Create `docs/user-guides/fr/tarification-bidirectionnelle.md`
  - [ ] 2.2: Explain Grid vs Direct pricing logic
  - [ ] 2.3: Document the cockpit toggle usage
- [ ] Task 3: Technical Documentation (AC: #3)
  - [ ] 3.1: Add EndCustomer model details to Admin Guide
  - [ ] 3.2: Document Hono API routes for developers

## Dev Notes

### Architecture Compliance
- Documentation should be in Markdown format.
- Located in `docs/user-guides/fr/`.
- Consistent with existing guides (e.g., `filtrage-categories-vehicules.md`).

### Multi-tenancy Pattern
- Ensure documentation emphasizes that EndCustomers are scoped to both an Organization and a specific Partner Contact.

## Dev Agent Record

### Agent Model Used
- Antigravity (claude-3-7-sonnet-20250219)

### Completion Notes List
### Completion Notes List
- [2026-01-10] Story generated and initialized as **in-progress**. 
- [2026-01-10] Automated tests (24.11) were confirmed as "Done" by the user.
- [2026-01-10] Documentation created and Tech Spec updated. Story marked as **done**.

## File List

**Created:**
- `docs/user-guides/fr/gestion-clients-finaux.md`
- `docs/user-guides/fr/tarification-bidirectionnelle.md`

**Modified:**
- `docs/bmad/tech-spec.md`


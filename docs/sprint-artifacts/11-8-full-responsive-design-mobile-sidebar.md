# Story 11.8: Full Responsive Design - Mobile Sidebar

**Epic:** Epic 11 - Zone Management Refactoring & UI Improvements  
**Story Key:** 11-8-full-responsive-design-mobile-sidebar  
**Status:** done  
**Created:** 2025-12-01  
**Author:** BMAD Orchestrator

---

## Description

En tant qu'**opérateur VTC**,  
Je veux pouvoir utiliser l'application sur mon téléphone ou ma tablette,  
Afin de gérer les devis et missions en déplacement sans perte de fonctionnalité.

### Contexte

L'application VTC ERP n'est actuellement pas responsive. Sur les petits écrans :

- La sidebar reste en mode horizontal avec scroll horizontal
- Le contenu principal est décalé par `marginLeft` même sur mobile
- Aucun menu hamburger n'est disponible pour la navigation mobile
- L'interface est inutilisable sur mobile et tablette

### Objectif

Implémenter un design responsive complet avec :

- Menu hamburger sur mobile
- Sidebar overlay sur mobile
- Suppression du marginLeft sur mobile
- Animations fluides pour les transitions

---

## Acceptance Criteria

### AC1: Menu Hamburger Mobile

**Given** un utilisateur sur un écran mobile (<768px)  
**When** la page se charge  
**Then** un bouton hamburger (☰) est visible dans le header à la place de la sidebar

### AC2: Ouverture du Menu Mobile

**Given** un utilisateur sur mobile avec le menu fermé  
**When** il clique sur le bouton hamburger  
**Then** un menu overlay s'ouvre avec la navigation complète (Start, Contacts, Dispatch, Quotes, etc.)

### AC3: Contenu Pleine Largeur Mobile

**Given** un utilisateur sur mobile  
**When** le menu mobile est fermé  
**Then** le contenu principal occupe 100% de la largeur de l'écran (pas de marginLeft)

### AC4: Comportement Desktop Préservé

**Given** un utilisateur sur desktop (≥1024px)  
**When** il utilise l'application  
**Then** le comportement actuel est préservé (sidebar collapsible avec toggle button)

### AC5: Fermeture du Menu Mobile

**Given** un utilisateur sur mobile avec le menu ouvert  
**When** il clique sur le bouton X ou à l'extérieur du menu  
**Then** le menu se ferme avec une animation fluide

### AC6: Animations Fluides

**Given** un utilisateur sur mobile  
**When** il ouvre ou ferme le menu  
**Then** les animations sont fluides (transition 200-300ms) sans saccade

### AC7: Organisation Selector Mobile

**Given** un utilisateur sur mobile avec le menu ouvert  
**When** il voit le menu  
**Then** le sélecteur d'organisation est visible et fonctionnel

### AC8: User Menu Mobile

**Given** un utilisateur sur mobile  
**When** le menu est ouvert  
**Then** le menu utilisateur (avatar, logout) est accessible en bas du menu

---

## Technical Tasks

### Task 1: Modifier SidebarContext pour Mobile

- [ ] Ajouter `isMobile` state basé sur window.innerWidth < 768
- [ ] Ajouter `isMobileMenuOpen` state séparé de `isCollapsed`
- [ ] Ajouter `openMobileMenu()` et `closeMobileMenu()` functions
- [ ] Ajouter listener pour resize et mettre à jour `isMobile`

### Task 2: Créer MobileMenuButton Component

- [ ] Créer `MobileMenuButton.tsx` avec icône hamburger (Menu icon de Lucide)
- [ ] Style: visible uniquement sur mobile (md:hidden)
- [ ] OnClick: appeler `openMobileMenu()`

### Task 3: Créer MobileMenuOverlay Component

- [ ] Créer `MobileMenuOverlay.tsx` pour le fond sombre
- [ ] OnClick sur overlay: fermer le menu
- [ ] Animation: fade-in/fade-out

### Task 4: Modifier NavBar pour Mobile

- [ ] Afficher MobileMenuButton sur mobile
- [ ] Transformer la nav en overlay sur mobile
- [ ] Ajouter bouton X pour fermer
- [ ] Afficher tous les items de navigation verticalement
- [ ] Afficher OrganizationSelect et UserMenu dans le menu mobile

### Task 5: Modifier AppWrapper pour Mobile

- [ ] Supprimer marginLeft sur mobile (breakpoint md:)
- [ ] Utiliser className conditionnelle au lieu de style inline

### Task 6: Modifier ContentHeader pour Mobile

- [ ] Cacher le toggle sidebar sur mobile (remplacé par hamburger)
- [ ] Adapter le breadcrumb pour mobile

### Task 7: Tests Playwright

- [ ] Test: Menu hamburger visible sur mobile
- [ ] Test: Ouverture/fermeture du menu
- [ ] Test: Navigation fonctionne sur mobile
- [ ] Test: Comportement desktop préservé

---

## Test Cases

### TC1: Mobile Menu Visibility

```typescript
test("should show hamburger menu on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/app/sixieme-etoile-vtc");

  // Hamburger should be visible
  await expect(page.getByRole("button", { name: /menu/i })).toBeVisible();

  // Sidebar should not be visible
  await expect(page.locator("nav.fixed")).not.toBeVisible();
});
```

### TC2: Mobile Menu Open/Close

```typescript
test("should open and close mobile menu", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/app/sixieme-etoile-vtc");

  // Open menu
  await page.getByRole("button", { name: /menu/i }).click();
  await expect(page.getByRole("navigation")).toBeVisible();

  // Close menu
  await page.getByRole("button", { name: /close/i }).click();
  await expect(page.getByRole("navigation")).not.toBeVisible();
});
```

### TC3: Desktop Behavior Preserved

```typescript
test("should preserve desktop sidebar behavior", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/app/sixieme-etoile-vtc");

  // Sidebar should be visible
  await expect(page.locator("nav.fixed")).toBeVisible();

  // Hamburger should not be visible
  await expect(page.getByRole("button", { name: /menu/i })).not.toBeVisible();
});
```

### TC4: Full Width Content on Mobile

```typescript
test("should have full width content on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/app/sixieme-etoile-vtc");

  const main = page.locator("main");
  const box = await main.boundingBox();

  // Content should start at x=0 (no margin)
  expect(box?.x).toBeLessThan(20);
});
```

---

## Dependencies

- **Existing Components:**

  - `SidebarContext.tsx` - À modifier
  - `NavBar.tsx` - À modifier
  - `AppWrapper.tsx` - À modifier
  - `ContentHeader.tsx` - À modifier

- **UI Libraries:**
  - Lucide React (Menu, X icons)
  - TailwindCSS (breakpoints)
  - shadcn/ui (Button, Sheet)

---

## Files to Modify/Create

| File                                                   | Action | Description                 |
| ------------------------------------------------------ | ------ | --------------------------- |
| `modules/saas/shared/contexts/SidebarContext.tsx`      | Modify | Ajouter gestion mobile      |
| `modules/saas/shared/components/NavBar.tsx`            | Modify | Menu hamburger + overlay    |
| `modules/saas/shared/components/AppWrapper.tsx`        | Modify | Supprimer marginLeft mobile |
| `modules/saas/shared/components/ContentHeader.tsx`     | Modify | Adapter pour mobile         |
| `modules/saas/shared/components/MobileMenuButton.tsx`  | Create | Bouton hamburger            |
| `modules/saas/shared/components/MobileMenuOverlay.tsx` | Create | Overlay sombre              |

---

## Definition of Done

- [ ] Tous les Acceptance Criteria sont validés
- [ ] Tests Playwright passent sur mobile (375px) et desktop (1280px)
- [ ] Pas de régression sur le comportement desktop
- [ ] Animations fluides sans saccade
- [ ] Code review effectuée
- [ ] Documentation mise à jour si nécessaire

---

## Notes

- Utiliser le breakpoint `md` (768px) comme point de bascule mobile/desktop
- Préférer `transform` et `opacity` pour les animations (GPU-accelerated)
- Tester sur iPhone SE (375px) et iPad (768px) comme références

# Story 11.6: Collapsible Main Sidebar

## Story

**As an** operator  
**I want** a button to collapse and expand the main sidebar  
**So that** I can maximize screen space when working with maps or data tables

## Background

The current main sidebar (`NavBar.tsx`) is fixed at 280px width and cannot be collapsed. This takes up significant screen real estate, especially when working with:

- Zone management maps
- Dispatch screens
- Large data tables

The user wants a toggle button to collapse the sidebar to show only icons, and expand it back to full width when needed.

## Tasks

1. **Add collapse state management** - Create context or state for sidebar collapsed state
2. **Create SidebarToggleButton component** - Button to toggle collapsed state
3. **Implement collapsed sidebar view** - Show only icons when collapsed (48-64px width)
4. **Add smooth transition animation** - Animate width change
5. **Persist collapse state** - Save preference to localStorage
6. **Update main content layout** - Adjust content area when sidebar collapses
7. **Add tooltips for collapsed icons** - Show menu item labels on hover
8. **Handle responsive behavior** - Collapsed state on mobile/tablet
9. **Add keyboard shortcut** - Toggle with keyboard (e.g., Cmd+B or Ctrl+\)
10. **Add translations** for tooltip labels
11. **Write E2E tests** for collapse functionality

## Acceptance Criteria

### AC1: Toggle Button Visible

**Given** I am viewing any page with the sidebar  
**When** I look at the sidebar  
**Then** I see a toggle button (chevron or hamburger icon) at the bottom or top of the sidebar

### AC2: Collapse Action

**Given** the sidebar is expanded (280px)  
**When** I click the toggle button  
**Then** the sidebar collapses to icon-only view (48-64px)  
**And** menu items show only icons  
**And** the transition is smooth (200-300ms)

### AC3: Expand Action

**Given** the sidebar is collapsed  
**When** I click the toggle button  
**Then** the sidebar expands to full width (280px)  
**And** menu items show icons and labels  
**And** the transition is smooth

### AC4: Icon-Only View

**Given** the sidebar is collapsed  
**When** I view the menu items  
**Then** I see only the icons  
**And** hovering over an icon shows a tooltip with the menu item label

### AC5: State Persistence

**Given** I collapse the sidebar  
**When** I refresh the page or navigate to another page  
**Then** the sidebar remains collapsed  
**And** my preference is remembered

### AC6: Content Area Adjustment

**Given** the sidebar collapses  
**When** the animation completes  
**Then** the main content area expands to fill the available space  
**And** there is no layout jump or flicker

### AC7: Keyboard Shortcut

**Given** I am on any page  
**When** I press the keyboard shortcut (e.g., Cmd+B on Mac, Ctrl+B on Windows)  
**Then** the sidebar toggles between collapsed and expanded states

### AC8: Mobile Behavior

**Given** I am on a mobile device (< 768px)  
**When** I view the page  
**Then** the sidebar behaves as a drawer (existing behavior)  
**And** the collapse toggle is not shown (or behaves differently)

### AC9: Logo Behavior

**Given** the sidebar is collapsed  
**When** I view the logo area  
**Then** I see a compact version of the logo or just the icon  
**And** clicking it still navigates to the home page

### AC10: Organization Selector

**Given** the sidebar is collapsed  
**When** I view the organization selector  
**Then** it shows only the organization avatar/initial  
**And** clicking it opens the full selector dropdown

## Technical Notes

### State Management Options

1. **React Context** - Create `SidebarContext` for global state
2. **Zustand** - If already used in the project
3. **URL state** - Less recommended for this use case

### Recommended Approach: React Context

```typescript
// contexts/SidebarContext.tsx
interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar-collapsed") === "true";
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(isCollapsed));
  }, [isCollapsed]);

  // ... rest of implementation
}
```

### Files to Modify

- `apps/web/modules/saas/shared/components/NavBar.tsx` - Main sidebar component
- `apps/web/modules/saas/shared/components/AppWrapper.tsx` - Layout wrapper
- `apps/web/app/(saas)/app/layout.tsx` - Add SidebarProvider

### New Files

- `apps/web/modules/saas/shared/contexts/SidebarContext.tsx`
- `apps/web/modules/saas/shared/components/SidebarToggleButton.tsx`
- `apps/web/modules/saas/shared/hooks/useSidebar.ts`

### CSS Considerations

```css
/* Sidebar transition */
.sidebar {
  transition: width 200ms ease-in-out;
}

/* Collapsed state */
.sidebar.collapsed {
  width: 64px;
}

/* Content area adjustment */
.main-content {
  margin-left: var(--sidebar-width);
  transition: margin-left 200ms ease-in-out;
}
```

### Keyboard Shortcut Implementation

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "b") {
      e.preventDefault();
      toggleSidebar();
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [toggleSidebar]);
```

## Out of Scope

- Multiple sidebar layouts
- Sidebar position (left/right) configuration
- Sidebar themes or customization

## Definition of Done

- [ ] Toggle button visible in sidebar
- [ ] Collapse/expand animation works smoothly
- [ ] Icon-only view with tooltips
- [ ] State persisted to localStorage
- [ ] Content area adjusts correctly
- [ ] Keyboard shortcut works
- [ ] Mobile behavior unchanged
- [ ] Logo and org selector adapt to collapsed state
- [ ] Translations added
- [ ] E2E tests passing
- [ ] Code reviewed and approved

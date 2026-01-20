# Story 26.19: Enhanced Quote Cart Interactions


## Status: done

## Code Review & Validation (Auto-Fixed)

### 🔴 Critical Issues
- **Duplicate Logic**: `duplicateSelected` in store was not handling hierarchy correctly. Duplicated children were still pointing to original parents.
  - **Fix**: Rewrote `duplicateSelected` to remap parent IDs for duplicated items, ensuring deep copy integrity.

### 🔴 High Issues
- **Missing Select All**: The header checkbox for "Select All" was missing from `SortableQuoteLinesList.tsx`.
  - **Fix**: Added `Select All` checkbox to the header row with indeterminate state support.

### 🟡 Medium Issues
- **Misleading UI Text**: `SelectionToolbar` claimed deletion was "irreversible" despite Undo support.
  - **Fix**: Removed "Cette action est irréversible" from the confirmation dialog.

### 🟢 Low Issues
- **Duplicate Variable**: Fixed a lint error for duplicate `toggleLineSelection` destructuring.


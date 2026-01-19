
**🔥 CODE REVIEW FINDINGS, JoPad!**

**Story:** Story 26.9 - Operational "Detach" Logic
**Git vs Story Discrepancies:** 0 found
**Issues Found:** 2 Critical, 1 Medium, 1 Low

## 🔴 CRITICAL ISSUES

1. **AC2 Non-Functional / Dead Code**: 
   - The Acceptance Criteria #2 requires a warning modal when modifying sensitive fields like `pickupAt`, `origin`, or `destination`. 
   - However, `UniversalLineItemRow.tsx` **only renders inputs for** `label`, `quantity`, `unitPrice`, and `vatRate`. 
   - The sensitive fields are NOT editable in this component, so `handleFieldChange` will NEVER receive a sensitive field key provided in `SENSITIVE_FIELDS`. 
   - The implemented detection logic (`if (isSensitiveField(field))`) is effectively dead code and the User Story generic requirement is impossible to trigger in the current UI state.

2. **Missing Integration Tests**: 
   - The story checks off "[x] Task 5: Create Unit Tests (AC: All)". 
   - While `detach-utils.test.ts` is excellent, **`UniversalLineItemRow.test.tsx` was NOT updated** to test the new props (`onDetach`) or interactions (Modal, Toast, Label warning). 
   - There is NO verification that the UI actually triggers the logic you built.

## 🟡 MEDIUM ISSUES

1. **Fragile `getOriginalLabelFromSource` Logic**: 
   - In `detach-utils.ts`, attempting to reconstruct the label from `origin + ' -> ' + destination` or guessing typical fields (`tripDescription`) is brittle. 
   - If the business logic for label generation changes, this heuristic will fail silently, potentially breaking the label similarity check (AC1). 
   - It should ideally rely on a dedicated `originalLabel` field from the backend or stronger typing.

## 🟢 LOW ISSUES

1. **Hardcoded Locale**: 
   - `UniversalLineItemRow.tsx` uses `fr-FR` locale hardcoded for numbers, ignoring the user's potential locale preferences, although `currency` is passed as a prop.

---

**Recommendation:**
Since AC2 is functionally blocked by the UI design (no inputs for sensitive fields), I propose we:
1.  **Fix changes** in `UniversalLineItemRow` to at least fully test the parts that DO work (Label Warning, Detach Callback).
2.  **Add comments** explaining why AC2 is partial (waiting for UI to expose those fields).
3.  **Implement missing tests** in `UniversalLineItemRow.test.tsx`.

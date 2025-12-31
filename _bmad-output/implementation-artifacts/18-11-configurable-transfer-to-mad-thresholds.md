# Story 18.11: Configurable Transfer-to-MAD Thresholds

## Story Information

| Field                | Value                                                                |
| -------------------- | -------------------------------------------------------------------- |
| **Story ID**         | 18.11                                                                |
| **Epic**             | Epic 18 - Advanced Geospatial, Route Optimization & Yield Management |
| **Title**            | Configurable Transfer-to-MAD Thresholds                              |
| **Status**           | 🚧 In Progress                                                       |
| **Created**          | 2025-12-31                                                           |
| **Priority**         | Medium                                                               |
| **Estimated Effort** | 3 Story Points                                                       |
| **Branch**           | feature/18-11-transfer-to-mad-thresholds                             |

## User Story

**As an** administrator,  
**I want** to configure the thresholds that trigger automatic transfer-to-MAD suggestions,  
**So that** the system's behavior matches our operational reality.

## Related Requirements

| Requirement | Description                                                                                                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR88**    | The system shall support configurable thresholds for the automatic transfer-to-MAD switch, including minimum waiting time, maximum return distance, and dense zone speed threshold. |

## Acceptance Criteria (BDD)

### AC1: Access Transfer/MAD Thresholds Section

```gherkin
Given an admin in Organisation Pricing Settings (Advanced page)
When they view the page
Then they shall see a new "Transfer/MAD Thresholds" section
And it shall display all configurable threshold fields
```

### AC2: Dense Zone Detection Thresholds (Story 18.2)

```gherkin
Given the Transfer/MAD Thresholds section
When the admin views dense zone settings
Then they shall see:
  - denseZoneSpeedThreshold: speed threshold in km/h (default: 15)
  - autoSwitchToMAD: toggle on/off (default: false)
  - denseZoneCodes: multi-select of zone codes (default: ["PARIS_0"])
```

### AC3: Round-Trip Detection Thresholds (Story 18.3)

```gherkin
Given the Transfer/MAD Thresholds section
When the admin views round-trip settings
Then they shall see:
  - minWaitingTimeForSeparateTransfers: minutes (default: 180)
  - maxReturnDistanceKm: kilometers (default: 50)
  - roundTripBuffer: minutes (default: 30)
  - autoSwitchRoundTripToMAD: toggle on/off (default: false)
```

### AC4: Save Settings

```gherkin
Given modified threshold values
When the admin clicks Save
Then the settings shall be persisted to OrganizationPricingSettings
And a success toast shall be displayed
And new quotes shall use the updated thresholds
```

### AC5: Validation

```gherkin
Given threshold input fields
When the admin enters invalid values (negative, non-numeric)
Then validation errors shall be displayed
And the form shall not submit
```

## Technical Design

### Files to Modify

| File                                                                                            | Action | Description                         |
| ----------------------------------------------------------------------------------------------- | ------ | ----------------------------------- |
| `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/pricing/advanced/page.tsx` | Modify | Add Transfer/MAD Thresholds section |
| `apps/web/content/locales/en.ts`                                                                | Modify | Add English translations            |
| `apps/web/content/locales/fr.ts`                                                                | Modify | Add French translations             |
| `packages/api/src/routes/vtc/pricing-settings.ts`                                               | Verify | Ensure PATCH supports new fields    |

### UI Components to Add

1. **Transfer/MAD Thresholds Card** with:
   - Dense Zone Detection subsection
   - Round-Trip Detection subsection
   - Zone code multi-select (using existing zones)

## Test Cases

| Test ID | Description               | Expected Result                  |
| ------- | ------------------------- | -------------------------------- |
| UI-01   | View Transfer/MAD section | All fields visible with defaults |
| UI-02   | Modify speed threshold    | Value updates, hasChanges=true   |
| UI-03   | Toggle auto-switch        | Toggle works, hasChanges=true    |
| UI-04   | Save settings             | API called, toast shown          |
| UI-05   | Invalid input             | Validation error shown           |

## Dependencies

| Dependency                        | Type         | Status  |
| --------------------------------- | ------------ | ------- |
| Story 18.2 (Dense Zone Detection) | Prerequisite | ✅ Done |
| Story 18.3 (Round-Trip Detection) | Prerequisite | ✅ Done |

## Definition of Done

- [x] Transfer/MAD Thresholds section added to Advanced Pricing Settings
- [x] All 7 threshold fields configurable via UI
- [x] Translations added (fr/en)
- [x] API updated to support new fields (GET/PATCH)
- [ ] Settings persist correctly (manual test)
- [x] Existing detection functions use configured values (already implemented in 18.2/18.3)

## Files Modified

| File                                                                                            | Changes                                                          |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `apps/web/app/(saas)/app/(organizations)/[organizationSlug]/settings/pricing/advanced/page.tsx` | Added Transfer/MAD Thresholds section with 7 configurable fields |
| `packages/i18n/translations/en.json`                                                            | Added English translations for new section and fields            |
| `packages/i18n/translations/fr.json`                                                            | Added French translations for new section and fields             |
| `packages/api/src/routes/vtc/pricing-settings.ts`                                               | Added validation schema and serialization for new fields         |

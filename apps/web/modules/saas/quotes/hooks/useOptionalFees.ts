"use client";

import { useMemo } from "react";
import type { OptionalFeeWithRules } from "./useScenarioHelpers";

// ============================================================================
// Story 6.6: Optional Fees Hook
// Provides optional fees catalogue for auto-application
// Note: Uses mock data until Story 9.3 implements the full API
// ============================================================================

/**
 * Mock optional fees for airport scenarios
 * These will be replaced by API data when Story 9.3 is implemented
 */
const MOCK_AIRPORT_FEES: OptionalFeeWithRules[] = [
  {
    id: "fee-airport-waiting",
    name: "Airport Waiting Fee",
    description: "Standard waiting time at airport (45 min included)",
    amountType: "FIXED",
    amount: 25,
    isTaxable: true,
    vatRate: 20,
    autoApplyRules: {
      triggers: [{ type: "airport" }],
    },
  },
  {
    id: "fee-airport-parking",
    name: "Airport Parking",
    description: "Parking fee at airport terminal",
    amountType: "FIXED",
    amount: 15,
    isTaxable: true,
    vatRate: 20,
    autoApplyRules: {
      triggers: [{ type: "airport" }],
    },
  },
];

/**
 * useOptionalFees Hook
 * 
 * Provides the optional fees catalogue for the current organization.
 * Used by scenario helpers to auto-apply fees for airport transfers.
 * 
 * Note: Currently uses mock data. Will be replaced by API call
 * when Story 9.3 (Optional Fees Catalogue) is implemented.
 * 
 * @see Story 6.6: Implement Helpers for Common Scenarios
 * @see Story 9.3: Optional Fees Catalogue (future)
 * @see FR56: Optional fees with automated triggers
 */
export function useOptionalFees() {
  // TODO: Replace with actual API call when Story 9.3 is implemented
  // const { data, isLoading, error } = useQuery({
  //   queryKey: ["optional-fees"],
  //   queryFn: async () => {
  //     const response = await apiClient.vtc["optional-fees"].$get({
  //       query: { limit: "100", isActive: "true" },
  //     });
  //     return response.json();
  //   },
  // });

  const fees = useMemo(() => MOCK_AIRPORT_FEES, []);

  return {
    fees,
    isLoading: false,
    error: null,
  };
}

export default useOptionalFees;

"use client";

/**
 * useContactBalance Hook (Story 25.6: Multi-Invoice Payment Tracking - Lettrage)
 * 
 * Fetches the outstanding balance and unpaid invoices for a contact.
 */

import { useState, useEffect, useCallback } from "react";
import type { ContactBalance } from "../types/payment";

interface UseContactBalanceOptions {
  contactId: string;
  enabled?: boolean;
}

interface UseContactBalanceReturn {
  data: ContactBalance | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useContactBalance({
  contactId,
  enabled = true,
}: UseContactBalanceOptions): UseContactBalanceReturn {
  const [data, setData] = useState<ContactBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!contactId || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/vtc/invoices/contact-balance/${contactId}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch balance");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Failed to fetch contact balance:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch balance");
    } finally {
      setIsLoading(false);
    }
  }, [contactId, enabled]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchBalance,
  };
}

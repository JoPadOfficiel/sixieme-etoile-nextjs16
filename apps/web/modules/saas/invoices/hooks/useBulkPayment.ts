"use client";

/**
 * useBulkPayment Hook (Story 25.6: Multi-Invoice Payment Tracking - Lettrage)
 * 
 * Provides functionality to apply bulk payments across multiple invoices.
 */

import { useState, useCallback } from "react";
import type { BulkPaymentRequest, BulkPaymentResult } from "../types/payment";

interface UseBulkPaymentReturn {
  applyPayment: (request: BulkPaymentRequest) => Promise<BulkPaymentResult>;
  isLoading: boolean;
  error: string | null;
  result: BulkPaymentResult | null;
  reset: () => void;
}

export function useBulkPayment(): UseBulkPaymentReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkPaymentResult | null>(null);

  const applyPayment = useCallback(async (request: BulkPaymentRequest): Promise<BulkPaymentResult> => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/vtc/invoices/bulk-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to apply payment");
      }

      const paymentResult = await response.json();
      setResult(paymentResult);
      return paymentResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to apply payment";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return {
    applyPayment,
    isLoading,
    error,
    result,
    reset,
  };
}

"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Story 29.2: Context for tracking selected quote line in multi-mission view
 * 
 * Allows QuoteLinesTable and MultiMissionMap to communicate:
 * - Table sets selectedLineId on row click
 * - Map zooms to selected line's mission
 */

interface QuoteLineSelectionContextValue {
  selectedLineId: string | null;
  setSelectedLineId: (id: string | null) => void;
}

const QuoteLineSelectionContext = createContext<QuoteLineSelectionContextValue | null>(null);

interface QuoteLineSelectionProviderProps {
  children: ReactNode;
}

export function QuoteLineSelectionProvider({ children }: QuoteLineSelectionProviderProps) {
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);

  return (
    <QuoteLineSelectionContext.Provider value={{ selectedLineId, setSelectedLineId }}>
      {children}
    </QuoteLineSelectionContext.Provider>
  );
}

export function useQuoteLineSelection() {
  const context = useContext(QuoteLineSelectionContext);
  if (!context) {
    throw new Error("useQuoteLineSelection must be used within QuoteLineSelectionProvider");
  }
  return context;
}

export default QuoteLineSelectionContext;

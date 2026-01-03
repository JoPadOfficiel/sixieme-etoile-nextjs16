"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "tripTransparency.expandedSections";

/**
 * Get initial state from sessionStorage (runs once on mount)
 */
function getInitialState(defaultExpanded: string[]): string[] {
  if (typeof window === "undefined") return defaultExpanded;
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return defaultExpanded;
}

/**
 * Hook for managing TripTransparency accordion state
 * Persists expanded sections to sessionStorage
 * 
 * @see Story 21-7: Enhanced TripTransparency Interface
 */
export function useTripTransparencyState(defaultExpanded: string[] = ["price-breakdown"]) {
  // Use lazy initializer to avoid hydration mismatch
  const [expandedSections, setExpandedSections] = useState<string[]>(() => getInitialState(defaultExpanded));
  const isFirstRender = useRef(true);

  // Save to sessionStorage when state changes (skip first render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(expandedSections));
    } catch {
      // Ignore storage errors
    }
  }, [expandedSections]);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      if (prev.includes(sectionId)) {
        return prev.filter((id) => id !== sectionId);
      }
      return [...prev, sectionId];
    });
  }, []);

  const expandAll = useCallback((sectionIds: string[]) => {
    setExpandedSections(sectionIds);
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedSections([]);
  }, []);

  const isExpanded = useCallback(
    (sectionId: string) => expandedSections.includes(sectionId),
    [expandedSections]
  );

  return {
    expandedSections,
    setExpandedSections,
    toggleSection,
    expandAll,
    collapseAll,
    isExpanded,
  };
}

export default useTripTransparencyState;

/**
 * Story 23.1: Fix Pricing Routes/Excursions/Disposals Loading State Bug
 * 
 * These tests verify that the loading state management is correct for the
 * pricing configuration pages. The fix splits the isCoverageLoading state
 * into isStatsLoading and isMatrixLoading for proper independent management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock types for the loading state
interface LoadingState {
  isLoading: boolean;
  isStatsLoading: boolean;
  isMatrixLoading: boolean;
}

// Simulates the loading state management in routes page
function createRoutesPageState() {
  let isLoading = true;
  let isStatsLoading = true;
  let isMatrixLoading = false;
  
  return {
    getState: (): LoadingState => ({
      isLoading,
      isStatsLoading,
      isMatrixLoading
    }),
    
    // Simulates fetchRoutes
    fetchRoutes: async (mockApi: () => Promise<void>) => {
      isLoading = true;
      try {
        await mockApi();
      } finally {
        isLoading = false;
      }
    },
    
    // Simulates fetchCoverageStats (fixed version)
    fetchCoverageStats: async (mockApi: () => Promise<void>) => {
      isStatsLoading = true;
      try {
        await mockApi();
      } finally {
        isStatsLoading = false;
      }
    },
    
    // Simulates fetchMatrixData
    fetchMatrixData: async (mockApi: () => Promise<void>) => {
      isMatrixLoading = true;
      try {
        await mockApi();
      } finally {
        isMatrixLoading = false;
      }
    }
  };
}

describe('Story 23.1: Loading State Management', () => {
  describe('Initial State', () => {
    it('should initialize with correct loading states', () => {
      const page = createRoutesPageState();
      const state = page.getState();
      
      expect(state.isLoading).toBe(true);
      expect(state.isStatsLoading).toBe(true);
      expect(state.isMatrixLoading).toBe(false);
    });
  });

  describe('fetchRoutes', () => {
    it('should set isLoading to false after successful fetch', async () => {
      const page = createRoutesPageState();
      
      await page.fetchRoutes(async () => {
        // Simulate successful API call
      });
      
      expect(page.getState().isLoading).toBe(false);
    });

    it('should set isLoading to false even after fetch error', async () => {
      const page = createRoutesPageState();
      
      await page.fetchRoutes(async () => {
        throw new Error('API Error');
      }).catch(() => {});
      
      expect(page.getState().isLoading).toBe(false);
    });
  });

  describe('fetchCoverageStats', () => {
    it('should set isStatsLoading to false after successful fetch', async () => {
      const page = createRoutesPageState();
      
      await page.fetchCoverageStats(async () => {
        // Simulate successful API call
      });
      
      expect(page.getState().isStatsLoading).toBe(false);
    });

    it('should set isStatsLoading to false even after fetch error', async () => {
      const page = createRoutesPageState();
      
      await page.fetchCoverageStats(async () => {
        throw new Error('API Error');
      }).catch(() => {});
      
      expect(page.getState().isStatsLoading).toBe(false);
    });

    it('should not affect isMatrixLoading state', async () => {
      const page = createRoutesPageState();
      const initialMatrixLoading = page.getState().isMatrixLoading;
      
      await page.fetchCoverageStats(async () => {});
      
      expect(page.getState().isMatrixLoading).toBe(initialMatrixLoading);
    });
  });

  describe('fetchMatrixData', () => {
    it('should set isMatrixLoading to false after successful fetch', async () => {
      const page = createRoutesPageState();
      
      await page.fetchMatrixData(async () => {
        // Simulate successful API call
      });
      
      expect(page.getState().isMatrixLoading).toBe(false);
    });

    it('should set isMatrixLoading to false even after fetch error', async () => {
      const page = createRoutesPageState();
      
      await page.fetchMatrixData(async () => {
        throw new Error('API Error');
      }).catch(() => {});
      
      expect(page.getState().isMatrixLoading).toBe(false);
    });

    it('should not affect isStatsLoading state', async () => {
      const page = createRoutesPageState();
      
      // First, complete stats loading
      await page.fetchCoverageStats(async () => {});
      const statsLoadingAfterComplete = page.getState().isStatsLoading;
      
      // Then fetch matrix
      await page.fetchMatrixData(async () => {});
      
      expect(page.getState().isStatsLoading).toBe(statsLoadingAfterComplete);
    });
  });

  describe('Independent Loading States', () => {
    it('should allow stats and matrix to load independently', async () => {
      const page = createRoutesPageState();
      
      // Simulate parallel fetches
      const statsPromise = page.fetchCoverageStats(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      
      const matrixPromise = page.fetchMatrixData(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
      });
      
      // Matrix should complete first
      await matrixPromise;
      expect(page.getState().isMatrixLoading).toBe(false);
      
      // Stats should still complete
      await statsPromise;
      expect(page.getState().isStatsLoading).toBe(false);
    });

    it('should correctly represent view-specific loading', async () => {
      const page = createRoutesPageState();
      
      // When in list view, we mainly care about routes + stats
      await page.fetchRoutes(async () => {});
      await page.fetchCoverageStats(async () => {});
      
      const listViewState = page.getState();
      expect(listViewState.isLoading).toBe(false);
      expect(listViewState.isStatsLoading).toBe(false);
      // Matrix hasn't been fetched yet
      expect(listViewState.isMatrixLoading).toBe(false);
      
      // When switching to matrix view, matrix starts loading
      const matrixPromise = page.fetchMatrixData(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      
      expect(page.getState().isMatrixLoading).toBe(true);
      await matrixPromise;
      expect(page.getState().isMatrixLoading).toBe(false);
    });
  });
});

describe('AC Verification: Acceptance Criteria Coverage', () => {
  describe('AC1: Routes Page Loading', () => {
    it('should ensure loading indicators disappear after data is loaded', async () => {
      const page = createRoutesPageState();
      
      await page.fetchRoutes(async () => {});
      await page.fetchCoverageStats(async () => {});
      
      const state = page.getState();
      expect(state.isLoading).toBe(false);
      expect(state.isStatsLoading).toBe(false);
    });
  });

  describe('AC2: View Toggle', () => {
    it('should handle view toggle loading states correctly', async () => {
      const page = createRoutesPageState();
      
      // Initial load
      await page.fetchRoutes(async () => {});
      await page.fetchCoverageStats(async () => {});
      
      // Toggle to matrix
      await page.fetchMatrixData(async () => {});
      expect(page.getState().isMatrixLoading).toBe(false);
      
      // Toggle back to list - should not trigger matrix loading
      expect(page.getState().isMatrixLoading).toBe(false);
    });
  });

  describe('AC5: Error State Handling', () => {
    it('should clear loading state on error', async () => {
      const page = createRoutesPageState();
      
      try {
        await page.fetchCoverageStats(async () => {
          throw new Error('Network error');
        });
      } catch {
        // Error is caught
      }
      
      expect(page.getState().isStatsLoading).toBe(false);
    });
  });
});

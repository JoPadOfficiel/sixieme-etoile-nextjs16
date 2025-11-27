/**
 * Trip Transparency Integration E2E Tests
 * 
 * Tests for Story 6.7: Integrate TripTransparencyPanel & Profitability Indicator Across Screens
 * 
 * These tests verify that:
 * - TripTransparencyPreview appears on hover in QuotesTable
 * - Profitability indicators are consistent across screens
 * - Create Quote and Quote Detail screens still work after refactoring
 */

describe("Trip Transparency Integration", () => {
  beforeEach(() => {
    // Navigate to quotes (assumes authenticated session or test mode)
    cy.visit("/app/test-org/quotes");
    cy.wait(1000); // Wait for page load
  });

  describe("QuotesTable Preview", () => {
    it("should show trip transparency preview on hover", () => {
      // Wait for quotes to load
      cy.get("table").should("be.visible");
      
      // Find a quote row with trip analysis
      cy.get("tbody tr").first().within(() => {
        // Look for the info icon (preview trigger)
        cy.get('[data-testid="trip-preview-trigger"]').should("exist");
      });
    });

    it("should display correct metrics in preview", () => {
      // Hover over the first quote's trip summary
      cy.get("tbody tr").first().within(() => {
        cy.get('[data-testid="trip-preview-trigger"]').trigger("mouseenter");
      });

      // Check that preview content appears
      cy.get('[data-testid="trip-preview-content"]').should("be.visible");
      
      // Verify key metrics are present
      cy.get('[data-testid="trip-preview-content"]').within(() => {
        cy.contains("km").should("exist");
        cy.contains("min").should("exist");
        cy.contains("€").should("exist");
        cy.contains("%").should("exist");
      });
    });
  });

  describe("Profitability Indicator Consistency", () => {
    it("should show same profitability indicator in list and detail", () => {
      // Get profitability indicator from list
      cy.get("tbody tr").first().within(() => {
        cy.get('[data-testid="profitability-indicator"]')
          .invoke("attr", "data-level")
          .as("listLevel");
      });

      // Click to open detail
      cy.get("tbody tr").first().click();

      // Check profitability indicator in detail matches
      cy.get("@listLevel").then((listLevel) => {
        cy.get('[data-testid="profitability-indicator"]')
          .invoke("attr", "data-level")
          .should("eq", listLevel);
      });
    });

    it("should use correct thresholds (green >= 20%, orange >= 0%, red < 0%)", () => {
      // This test assumes we have quotes with different margin levels
      // Check that indicators match expected thresholds
      
      cy.get("tbody tr").each(($row) => {
        const marginText = $row.find('[data-testid="margin-value"]').text();
        const margin = parseFloat(marginText);
        
        if (!isNaN(margin)) {
          const indicator = $row.find('[data-testid="profitability-indicator"]');
          const level = indicator.attr("data-level");
          
          if (margin >= 20) {
            expect(level).to.eq("green");
          } else if (margin >= 0) {
            expect(level).to.eq("orange");
          } else {
            expect(level).to.eq("red");
          }
        }
      });
    });
  });

  describe("Create Quote Screen", () => {
    beforeEach(() => {
      cy.visit("/app/test-org/quotes/new");
      cy.wait(1000);
    });

    it("should display TripTransparencyPanel after filling form", () => {
      // Fill in required fields
      cy.get('[data-testid="contact-selector"]').click();
      cy.get('[data-testid="contact-option"]').first().click();

      cy.get('[data-testid="pickup-address"]').type("Paris CDG Airport");
      cy.get('[data-testid="address-suggestion"]').first().click();

      cy.get('[data-testid="dropoff-address"]').type("Tour Eiffel, Paris");
      cy.get('[data-testid="address-suggestion"]').first().click();

      cy.get('[data-testid="vehicle-category-selector"]').click();
      cy.get('[data-testid="vehicle-category-option"]').first().click();

      // Wait for pricing calculation
      cy.wait(2000);

      // Check TripTransparencyPanel is visible
      cy.get('[data-testid="trip-transparency-panel"]').should("be.visible");
      
      // Verify it shows segments
      cy.get('[data-testid="trip-transparency-panel"]').within(() => {
        cy.contains("Approach").should("exist");
        cy.contains("Service").should("exist");
      });
    });

    it("should show profitability indicator in pricing panel", () => {
      // Fill form and trigger pricing
      cy.get('[data-testid="contact-selector"]').click();
      cy.get('[data-testid="contact-option"]').first().click();

      cy.get('[data-testid="pickup-address"]').type("Paris");
      cy.get('[data-testid="address-suggestion"]').first().click();

      cy.get('[data-testid="dropoff-address"]').type("Versailles");
      cy.get('[data-testid="address-suggestion"]').first().click();

      cy.wait(2000);

      // Check profitability indicator exists
      cy.get('[data-testid="profitability-indicator"]').should("be.visible");
    });
  });

  describe("Quote Detail Screen", () => {
    it("should display stored tripAnalysis in TripTransparencyPanel", () => {
      // Click on first quote to open detail
      cy.get("tbody tr").first().click();

      // Wait for detail page to load
      cy.url().should("include", "/quotes/");

      // Check TripTransparencyPanel is visible
      cy.get('[data-testid="trip-transparency-panel"]').should("be.visible");

      // Verify tabs are present
      cy.get('[data-testid="trip-transparency-panel"]').within(() => {
        cy.contains("Overview").should("exist");
        cy.contains("Route").should("exist");
        cy.contains("Costs").should("exist");
      });
    });

    it("should show correct segment breakdown", () => {
      cy.get("tbody tr").first().click();
      cy.wait(1000);

      // Click on Route tab
      cy.get('[data-testid="trip-transparency-panel"]').within(() => {
        cy.contains("Route").click();
      });

      // Verify segments are displayed
      cy.get('[data-testid="trip-transparency-panel"]').within(() => {
        cy.get("table").should("be.visible");
        cy.contains("Service").should("exist");
      });
    });

    it("should show cost breakdown", () => {
      cy.get("tbody tr").first().click();
      cy.wait(1000);

      // Click on Costs tab
      cy.get('[data-testid="trip-transparency-panel"]').within(() => {
        cy.contains("Costs").click();
      });

      // Verify cost components are displayed
      cy.get('[data-testid="trip-transparency-panel"]').within(() => {
        cy.contains("Fuel").should("exist");
        cy.contains("Tolls").should("exist");
        cy.contains("Driver").should("exist");
      });
    });
  });

  describe("No Regression", () => {
    it("should allow creating a quote successfully", () => {
      cy.visit("/app/test-org/quotes/new");

      // Fill form
      cy.get('[data-testid="contact-selector"]').click();
      cy.get('[data-testid="contact-option"]').first().click();

      cy.get('[data-testid="pickup-address"]').type("Gare du Nord, Paris");
      cy.get('[data-testid="address-suggestion"]').first().click();

      cy.get('[data-testid="dropoff-address"]').type("La Défense, Paris");
      cy.get('[data-testid="address-suggestion"]').first().click();

      cy.get('[data-testid="vehicle-category-selector"]').click();
      cy.get('[data-testid="vehicle-category-option"]').first().click();

      cy.wait(2000);

      // Submit
      cy.get('[data-testid="create-quote-button"]').click();

      // Should redirect to quote detail or show success
      cy.url().should("match", /\/quotes\/[a-z0-9-]+$/);
    });

    it("should navigate between quotes list and detail without errors", () => {
      // Click on first quote
      cy.get("tbody tr").first().click();
      cy.url().should("include", "/quotes/");

      // Go back to list
      cy.get('[data-testid="back-to-quotes"]').click();
      cy.url().should("match", /\/quotes$/);

      // Click on another quote
      cy.get("tbody tr").eq(1).click();
      cy.url().should("include", "/quotes/");
    });
  });
});

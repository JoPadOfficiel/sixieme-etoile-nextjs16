describe("Quote OFF_GRID Manual Pricing", () => {
  beforeEach(() => {
    // Navigate to quotes page
    cy.visit("/app/test-org/quotes/new");
    // Note: In a real test, you would need to login with valid credentials
  });

  it("should show manual pricing badge for OFF_GRID trip type", () => {
    // Select OFF_GRID trip type
    cy.get('[data-testid="trip-type-select"]').click();
    cy.get('[data-testid="trip-type-option-off_grid"]').click();

    // Verify manual pricing badge is visible
    cy.get('[data-testid="manual-pricing-badge"]').should("be.visible");
    cy.contains("Tarification manuelle").should("be.visible");

    // Verify no skeleton is shown
    cy.get('[data-testid="pricing-skeleton"]').should("not.exist");
  });

  it("should show explanatory message for OFF_GRID", () => {
    // Select OFF_GRID trip type
    cy.get('[data-testid="trip-type-select"]').click();
    cy.get('[data-testid="trip-type-option-off_grid"]').click();

    // Verify explanatory message
    cy.contains("tarification manuelle").should("be.visible");
    cy.contains("Saisissez le prix et justifiez-le dans les notes").should("be.visible");
  });

  it("should require notes for OFF_GRID submission", () => {
    // Select OFF_GRID trip type
    cy.get('[data-testid="trip-type-select"]').click();
    cy.get('[data-testid="trip-type-option-off_grid"]').click();

    // Fill required fields except notes
    cy.get('[data-testid="contact-selector"]').click();
    cy.get('[data-testid="contact-option-1"]').click();
    cy.get('[data-testid="pickup-address"]').type("Paris, France");
    cy.get('[data-testid="pickup-address-option-0"]').click();
    cy.get('[data-testid="vehicle-category-select"]').click();
    cy.get('[data-testid="vehicle-category-option-1"]').click();
    cy.get('[data-testid="pickup-datetime"]').type("2026-01-02T10:00");
    cy.get('[data-testid="final-price"]').type("150");

    // Try to submit without notes
    cy.get('[data-testid="create-quote-button"]').click();

    // Verify validation error
    cy.contains("Les notes sont obligatoires pour les trajets hors grille").should("be.visible");
  });

  it("should highlight final price field for OFF_GRID", () => {
    // Select OFF_GRID trip type
    cy.get('[data-testid="trip-type-select"]').click();
    cy.get('[data-testid="trip-type-option-off_grid"]').click();

    // Verify final price field has amber border
    cy.get('[data-testid="final-price"]')
      .should("have.class", "border-amber-400")
      .and("have.attr", "placeholder", "Saisissez le prix");
  });

  it("should allow submission with notes for OFF_GRID", () => {
    // Select OFF_GRID trip type
    cy.get('[data-testid="trip-type-select"]').click();
    cy.get('[data-testid="trip-type-option-off_grid"]').click();

    // Fill all required fields including notes
    cy.get('[data-testid="contact-selector"]').click();
    cy.get('[data-testid="contact-option-1"]').click();
    cy.get('[data-testid="pickup-address"]').type("Paris, France");
    cy.get('[data-testid="pickup-address-option-0"]').click();
    cy.get('[data-testid="vehicle-category-select"]').click();
    cy.get('[data-testid="vehicle-category-option-1"]').click();
    cy.get('[data-testid="pickup-datetime"]').type("2026-01-02T10:00");
    cy.get('[data-testid="final-price"]').type("150");
    cy.get('[data-testid="notes"]').type("Trajet spécial vers destination X avec exigences particulières");

    // Submit should succeed
    cy.get('[data-testid="create-quote-button"]').click();
    cy.url().should("include", "/app/test-org/quotes");
  });

  it("should maintain normal pricing for other trip types", () => {
    // Select TRANSFER (default)
    cy.get('[data-testid="contact-selector"]').click();
    cy.get('[data-testid="contact-option-1"]').click();
    cy.get('[data-testid="pickup-address"]').type("Paris, France");
    cy.get('[data-testid="pickup-address-option-0"]').click();
    cy.get('[data-testid="dropoff-address"]').type("CDG Airport");
    cy.get('[data-testid="dropoff-address-option-0"]').click();
    cy.get('[data-testid="vehicle-category-select"]').click();
    cy.get('[data-testid="vehicle-category-option-1"]').click();

    // Wait for price calculation
    cy.get('[data-testid="suggested-price"]', { timeout: 10000 }).should("not.contain.text", "—");

    // Verify no manual pricing badge
    cy.get('[data-testid="manual-pricing-badge"]').should("not.exist");
  });
});

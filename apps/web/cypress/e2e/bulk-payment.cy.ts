describe("Bulk Payment UI", () => {
  beforeEach(() => {
    // Assuming a custom command or generic login flow
    // cy.login(); 
  });

  it("should allow multi-select and display running total", () => {
    // Visit a contact with invoices (needs seeded data)
    // Using a placeholder contact ID
    cy.visit("/dashboard/contacts?id=contact_123&tab=invoices");
    
    // Check if the select all checkbox exists
    cy.get('[data-testid="invoice-select-all"]').should("exist");
    
    // Click select all
    cy.get('[data-testid="invoice-select-all"]').click();
    
    // Verify that the total badge becomes visible
    cy.get('[data-testid="selected-invoices-total"]').should("be.visible");
  });

  it("should show allocation preview before confirming", () => {
    // Visit the page again
    cy.visit("/dashboard/contacts?id=contact_123&tab=invoices");
    
    // Select invoices
    cy.get('[data-testid="invoice-select-all"]').click();
    
    // Click apply payment button
    cy.get('[data-testid="apply-bulk-payment-btn"]').click();
    
    // Check if modal opens
    cy.get('[role="dialog"]').should("be.visible");
    
    // Type payment amount
    cy.get('[data-testid="payment-amount-input"]').type("1000");
    
    // Check if allocation preview appears
    cy.get('[data-testid="allocation-preview"]').should("exist");
    
    // Ensure confirm button is available
    cy.get('[data-testid="confirm-payment-btn"]').should("be.enabled");
  });
});

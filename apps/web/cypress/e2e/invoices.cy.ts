describe("Invoices", () => {
  const mockInvoices = {
    data: [
      {
        id: "inv-1",
        number: "INV-2025-0001",
        status: "ISSUED",
        issueDate: new Date().toISOString(),
        dueDate: new Date().toISOString(),
        totalExclVat: "100.00",
        totalVat: "20.00",
        totalInclVat: "120.00",
        currency: "EUR",
        contact: {
          id: "contact-1",
          displayName: "Jean Dupont",
          isPartner: false,
          type: "INDIVIDUAL",
        },
        quoteId: "quote-1",
        lines: [], // Not needed for list view
      },
      {
        id: "inv-2",
        number: "INV-2025-0002",
        status: "DRAFT",
        issueDate: new Date().toISOString(),
        dueDate: new Date().toISOString(),
        totalExclVat: "200.00",
        totalVat: "40.00",
        totalInclVat: "240.00",
        currency: "EUR",
        contact: {
          id: "contact-2",
          displayName: "Agence Voyage",
          isPartner: true,
          type: "AGENCY",
        },
        quoteId: null,
        lines: [],
      },
    ],
    meta: {
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    },
  };

  const mockInvoiceDetail = {
    id: "inv-1",
    number: "INV-2025-0001",
    status: "ISSUED",
    issueDate: new Date().toISOString(),
    dueDate: new Date().toISOString(),
    totalExclVat: "100.00",
    totalVat: "20.00",
    totalInclVat: "120.00",
    currency: "EUR",
    notes: "Merci de votre confiance",
    contact: {
      id: "contact-1",
      displayName: "Jean Dupont",
      email: "jean.dupont@example.com",
      phone: "+33612345678",
      billingAddress: "123 Rue de Paris, 75001 Paris",
      vatNumber: null,
      isPartner: false,
      type: "INDIVIDUAL",
    },
    quoteId: "quote-1",
    lines: [
      {
        id: "line-1",
        description: "Transfert CDG - Paris",
        lineType: "SERVICE",
        quantity: "1",
        unitPriceExclVat: "80.00",
        vatRate: "10.00",
        totalExclVat: "80.00",
        totalVat: "8.00",
        sortOrder: 0,
      },
      {
        id: "line-2",
        description: "Siège bébé",
        lineType: "OPTIONAL_FEE",
        quantity: "1",
        unitPriceExclVat: "20.00",
        vatRate: "20.00",
        totalExclVat: "20.00",
        totalVat: "4.00",
        sortOrder: 1,
      },
    ],
  };

  beforeEach(() => {
    // Intercept invoices list
    cy.intercept("GET", "/api/vtc/invoices*", {
      statusCode: 200,
      body: mockInvoices,
    }).as("getInvoices");

    // Intercept invoice detail
    cy.intercept("GET", "/api/vtc/invoices/inv-1", {
      statusCode: 200,
      body: mockInvoiceDetail,
    }).as("getInvoiceDetail");

    // Mock auth session if needed (assuming session cookie or similar mechanism)
    // cy.setCookie("session", "mock-session-token"); 
    
    // Visit invoices page (using a mock org slug)
    cy.visit("/app/test-org/invoices");
  });

  describe("Invoices List", () => {
    it("should display the invoices table with correct headers", () => {
      cy.wait("@getInvoices");
      
      cy.get("h1").should("contain", "Factures");
      
      // Check table headers
      cy.get("th").contains("N° Facture").should("be.visible");
      cy.get("th").contains("Client").should("be.visible");
      cy.get("th").contains("Total TTC").should("be.visible");
      cy.get("th").contains("Statut").should("be.visible");
    });

    it("should display invoice rows with correct data", () => {
      cy.wait("@getInvoices");
      
      // Check first row
      cy.contains("INV-2025-0001").should("be.visible");
      cy.contains("Jean Dupont").should("be.visible");
      cy.contains("120,00 €").should("be.visible");
      cy.contains("Émise").should("be.visible"); // Badge text from translation
      
      // Check second row
      cy.contains("INV-2025-0002").should("be.visible");
      cy.contains("Agence Voyage").should("be.visible");
      cy.contains("Partenaire").should("be.visible"); // Badge text
      cy.contains("Brouillon").should("be.visible"); // Badge text
    });

    it("should filter by status", () => {
      cy.wait("@getInvoices");
      
      // Mock filtered response
      cy.intercept("GET", "/api/vtc/invoices?*status=ISSUED*", {
        statusCode: 200,
        body: {
          ...mockInvoices,
          data: [mockInvoices.data[0]], // Only return the ISSUED invoice
        },
      }).as("getFilteredInvoices");

      // Open status filter
      cy.get("button[role='combobox']").click();
      cy.contains("Émise").click();
      
      cy.wait("@getFilteredInvoices");
      
      // Should only show one invoice
      cy.contains("INV-2025-0001").should("be.visible");
      cy.contains("INV-2025-0002").should("not.exist");
    });
  });

  describe("Invoice Detail", () => {
    it("should navigate to invoice detail on row click", () => {
      cy.wait("@getInvoices");
      
      // Click on the first invoice
      cy.contains("INV-2025-0001").click();
      
      // Should navigate to detail page
      cy.url().should("include", "/invoices/inv-1");
      cy.wait("@getInvoiceDetail");
      
      // Check detail content
      cy.get("h1").should("contain", "Facture INV-2025-0001");
      cy.contains("Jean Dupont").should("be.visible");
      cy.contains("123 Rue de Paris").should("be.visible");
    });

    it("should display invoice lines and totals", () => {
      // Visit detail page directly
      cy.visit("/app/test-org/invoices/inv-1");
      cy.wait("@getInvoiceDetail");
      
      // Check lines
      cy.contains("Lignes de facture").should("be.visible");
      cy.contains("Transfert CDG - Paris").should("be.visible");
      cy.contains("Siège bébé").should("be.visible");
      
      // Check totals
      cy.contains("Total HT").next().should("contain", "100,00 €");
      cy.contains("Total TVA").next().should("contain", "20,00 €");
      cy.contains("Total TTC").next().should("contain", "120,00 €");
      
      // Check VAT breakdown
      cy.contains("TVA 10% sur 80,00 €").should("be.visible");
      cy.contains("8,00 €").should("be.visible");
    });
  });
});

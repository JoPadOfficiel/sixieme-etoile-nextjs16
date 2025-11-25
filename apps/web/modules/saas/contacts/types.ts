/**
 * Contact types for the CRM module
 */

export interface Contact {
  id: string;
  displayName: string;
  type: "INDIVIDUAL" | "BUSINESS" | "AGENCY";
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  vatNumber: string | null;
  siret: string | null;
  billingAddress: string | null;
  isPartner: boolean;
  defaultClientType: "PARTNER" | "PRIVATE";
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactWithCounts extends Contact {
  _count: {
    quotes: number;
    invoices: number;
  };
}

export interface ContactsResponse {
  data: ContactWithCounts[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

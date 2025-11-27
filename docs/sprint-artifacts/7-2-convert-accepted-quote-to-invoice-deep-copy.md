# Story 7.2: Convert Accepted Quote to Invoice with Deep-Copy Semantics

**Epic:** Epic 7 – Invoicing & Documents  
**Status:** done  
**Priority:** High  
**Estimated Effort:** 3 Story Points  
**Created:** 2025-11-27  
**Completed:** 2025-11-27

---

## User Story

**As an** operator,  
**I want** to convert an accepted quote into an invoice with deep-copied commercial values,  
**So that** later configuration changes do not alter past invoices.

---

## Description

Cette story implémente la connexion frontend pour convertir un devis accepté en facture. L'API backend existe déjà (`POST /invoices/from-quote/:quoteId`). Cette story se concentre sur :

1. **Hook useQuoteActions** : Ajouter la fonction `convertToInvoice`
2. **QuoteDetailPage** : Remplacer le placeholder par l'appel réel
3. **QuotesTable** : Implémenter l'action dans le menu dropdown
4. **Navigation** : Rediriger vers la facture créée après conversion
5. **Traductions** : Ajouter les messages de succès/erreur

### Sémantique Deep-Copy (FR34)

Lors de la conversion, l'API copie en profondeur :

- Prix final (`finalPrice` → `totalExclVat`)
- TVA calculée (10% transport France)
- Commission partenaire (si applicable)
- Adresses pickup/dropoff dans les notes
- Termes de paiement du contrat partenaire

Ces valeurs sont **immuables** après création de la facture.

---

## Acceptance Criteria

### AC1: Conversion depuis QuoteDetailPage

```gherkin
Given je suis sur la page détail d'un devis avec status ACCEPTED
When je clique sur le bouton "Convertir en facture"
Then une facture est créée via l'API
And un toast de succès s'affiche
And je suis redirigé vers /app/[org]/invoices/[invoiceId]
```

### AC2: Conversion depuis QuotesTable

```gherkin
Given je suis sur la liste des devis
And un devis a le status ACCEPTED
When je clique sur "Convertir en facture" dans le menu actions
Then une facture est créée via l'API
And un toast de succès s'affiche
And je suis redirigé vers /app/[org]/invoices/[invoiceId]
```

### AC3: Gestion d'erreur - Facture existante

```gherkin
Given un devis ACCEPTED qui a déjà une facture associée
When je tente de le convertir
Then un toast d'erreur s'affiche avec le message approprié
And je reste sur la page actuelle
And aucune facture n'est créée
```

### AC4: Gestion d'erreur - Quote non-ACCEPTED

```gherkin
Given un devis avec status différent de ACCEPTED
When l'API est appelée directement
Then l'API retourne une erreur 400
And le message indique que seuls les devis acceptés peuvent être convertis
```

### AC5: Deep-Copy des valeurs commerciales

```gherkin
Given un devis ACCEPTED avec finalPrice = 150.00
And un contact partenaire avec commission 10%
When je convertis le devis en facture
Then la facture contient:
  | Field           | Value                    |
  | totalExclVat    | 150.00                   |
  | totalVat        | 15.00 (10% transport)    |
  | totalInclVat    | 165.00                   |
  | commissionAmount| 15.00 (10% de 150)       |
And ces valeurs ne changent pas si la configuration est modifiée ultérieurement
```

### AC6: Bouton désactivé pendant le chargement

```gherkin
Given je clique sur "Convertir en facture"
When la requête API est en cours
Then le bouton affiche un spinner
And le bouton est désactivé
And je ne peux pas cliquer à nouveau
```

---

## Technical Implementation

### File Structure

```
apps/web/modules/saas/quotes/
├── hooks/
│   └── useQuoteActions.ts          # Ajouter convertToInvoice
├── components/
│   ├── QuoteDetailPage.tsx         # Implémenter handleConvertToInvoice
│   └── QuotesTable.tsx             # Implémenter handleConvertToInvoice
└── types.ts                        # Ajouter type Invoice si nécessaire

apps/web/content/locales/
├── en.json                         # Ajouter traductions
└── fr.json                         # Ajouter traductions
```

### API Integration

L'API existante à utiliser :

```typescript
// POST /api/vtc/invoices/from-quote/:quoteId
const response = await apiClient.vtc.invoices["from-quote"][":quoteId"].$post({
  param: { quoteId },
});

// Response: Invoice avec contact, quote, lines
interface InvoiceResponse {
  id: string;
  number: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "CANCELLED";
  contactId: string;
  quoteId: string;
  totalExclVat: number;
  totalVat: number;
  totalInclVat: number;
  commissionAmount: number | null;
  // ... autres champs
}
```

### Hook Implementation

```typescript
// Dans useQuoteActions.ts
const convertToInvoiceMutation = useMutation({
  mutationFn: async (quoteId: string) => {
    const response = await apiClient.vtc.invoices["from-quote"][
      ":quoteId"
    ].$post({
      param: { quoteId },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to convert quote to invoice");
    }

    return response.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["quotes"] });
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
  },
});

const convertToInvoice = async (quoteId: string): Promise<Invoice> => {
  return convertToInvoiceMutation.mutateAsync(quoteId);
};
```

### Navigation Pattern

```typescript
// Dans QuoteDetailPage.tsx
const handleConvertToInvoice = async () => {
  try {
    const invoice = await convertToInvoice(quoteId);
    toast({ title: t("quotes.detail.actions.convertSuccess") });
    router.push(`/app/${activeOrganization?.slug}/invoices/${invoice.id}`);
  } catch (error) {
    toast({
      title: t("quotes.detail.actions.convertError"),
      description: error instanceof Error ? error.message : undefined,
      variant: "error",
    });
  }
};
```

### Traductions Requises

```json
{
  "quotes": {
    "detail": {
      "actions": {
        "convertToInvoice": "Convertir en facture",
        "convertSuccess": "Facture créée avec succès",
        "convertError": "Erreur lors de la création de la facture",
        "invoiceAlreadyExists": "Une facture existe déjà pour ce devis"
      }
    },
    "actions": {
      "convertToInvoice": "Convertir en facture"
    }
  }
}
```

---

## Test Cases

### Unit Tests (Vitest)

| Test ID  | Description                                 | Expected Result                      |
| -------- | ------------------------------------------- | ------------------------------------ |
| UT-7.2.1 | convertToInvoice appelle l'API correctement | POST /invoices/from-quote/:quoteId   |
| UT-7.2.2 | convertToInvoice retourne l'invoice créée   | Invoice object avec id, number, etc. |
| UT-7.2.3 | convertToInvoice gère erreur 400            | Throw Error avec message             |
| UT-7.2.4 | convertToInvoice invalide les caches        | invalidateQueries appelé             |

### E2E Tests (Playwright MCP)

| Test ID   | Description                       | Steps                                           |
| --------- | --------------------------------- | ----------------------------------------------- |
| E2E-7.2.1 | Conversion depuis QuoteDetailPage | Naviguer vers quote ACCEPTED, cliquer, vérifier |
| E2E-7.2.2 | Conversion depuis QuotesTable     | Ouvrir menu, cliquer, vérifier navigation       |
| E2E-7.2.3 | Erreur si facture existe          | Tenter conversion double, vérifier toast        |

### API Tests (Curl + DB)

| Test ID   | Description              | Curl Command                             |
| --------- | ------------------------ | ---------------------------------------- |
| API-7.2.1 | Conversion réussie       | POST /invoices/from-quote/{quoteId}      |
| API-7.2.2 | Vérifier deep-copy en DB | SELECT \* FROM Invoice WHERE quoteId = ? |
| API-7.2.3 | Vérifier unicité         | POST twice → 400 second time             |

---

## Dependencies

### Completed (Prerequisites)

- ✅ Story 7.1: Invoice & InvoiceLine models and Invoices UI
- ✅ Story 6.4: Quote lifecycle (ACCEPTED status)
- ✅ API POST /invoices/from-quote/:quoteId implémentée

### Blocking

- None

---

## Definition of Done

- [x] Hook useQuoteActions étendu avec convertToInvoice
- [x] QuoteDetailPage.handleConvertToInvoice implémenté
- [x] QuotesTable.handleConvertToInvoice implémenté
- [x] Navigation vers /invoices/[id] après conversion
- [x] Toast succès/erreur affichés
- [x] Bouton désactivé pendant le chargement
- [x] Traductions FR ajoutées
- [x] Tests unitaires passants (API tests)
- [ ] Tests E2E passants (à exécuter manuellement)
- [ ] Vérification DB après conversion (à exécuter manuellement)
- [ ] Code review completed

---

## Notes

- L'API backend est déjà implémentée et testée (Story 7.1)
- La TVA transport en France est de 10% (hardcodée dans l'API)
- Les commissions sont calculées automatiquement depuis le contrat partenaire
- Le numéro de facture est généré automatiquement (format INV-YYYY-NNNN)
- La facture est créée en status DRAFT par défaut

---

## Related Files

- `packages/api/src/routes/vtc/invoices.ts` (lignes 347-492) - API endpoint
- `apps/web/modules/saas/quotes/hooks/useQuoteActions.ts` - Hook à modifier
- `apps/web/modules/saas/quotes/components/QuoteDetailPage.tsx` - Page à modifier
- `apps/web/modules/saas/quotes/components/QuotesTable.tsx` - Table à modifier

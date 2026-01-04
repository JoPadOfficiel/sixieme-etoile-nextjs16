# User Guide: Subcontracting System

**Version:** 1.0  
**Date:** 2026-01-04  
**Audience:** Dispatchers, Fleet Managers

---

## Introduction

The subcontracting system allows you to efficiently manage mission outsourcing when your internal resources are unavailable. This guide covers subcontractor profile management, profitability analysis, and mission assignment.

### Benefits of Subcontracting

- **Flexibility**: Respond to demand peaks without increasing your fleet
- **Geographic coverage**: Serve areas far from your bases
- **Cost optimization**: Outsource missions that are unprofitable internally
- **Service quality**: Maintain commitments despite constraints

---

## Managing Subcontractor Profiles

### Create a Subcontractor Profile

1. Go to **Settings** → **Subcontractors**
2. Click **+ New Subcontractor**
3. Fill in the information:

#### General Information

- **Company name**: Subcontractor's business name
- **Main contact**: Contact person's name
- **Email**: Contact email address
- **Phone**: Primary phone number
- **Address**: Headquarters address

#### Vehicle Fleet

For each available vehicle category:

- **Category**: Sedan, Van, Minibus, etc.
- **Number of vehicles**: Available quantity
- **Capacity**: Number of passengers
- **Equipment**: WiFi, baby seats, etc.

**Example**:

```
Standard Sedan: 5 vehicles, 3 passengers
Premium Van: 2 vehicles, 7 passengers
```

#### Operating Zones

Define covered geographic zones:

- **Primary zones**: Regular service areas
- **Secondary zones**: On-demand coverage
- **Restrictions**: Uncovered areas

**Example**:

```
Primary zones: Seine-et-Marne (77), Val-de-Marne (94)
Secondary zones: Paris city center
Restrictions: No trips outside Île-de-France
```

#### Pricing Grid

Configure subcontractor rates:

- **Per kilometer rate**: Price per km by category
- **Hourly rate**: Price per hour for availability
- **Packages**: Predefined trips (airports, stations)
- **Minimum fees**: Minimum trip price

**Example**:

```
Sedan: €2.50/km, €45/h, Minimum €50
Van: €3.20/km, €60/h, Minimum €70
```

#### Availability and Response Times

- **Response time**: Average confirmation time
- **Availability**: Service days and hours
- **Required notice**: Minimum booking lead time

### Modify Existing Profile

1. Go to **Settings** → **Subcontractors**
2. Click on the subcontractor to modify
3. Update necessary information
4. Click **Save**

---

## Subcontracting Suggestions

### Automatic Analysis

The system automatically analyzes each mission and suggests subcontracting if:

- ✅ **No internal vehicle available** in the time window
- ✅ **Significant distance from base** (high positioning cost)
- ✅ **Negative profitability** with internal resources
- ✅ **Zone better covered** by a subcontractor

### View Suggestions

In dispatch, missions with subcontracting suggestions display:

- **"Subcontracting suggested" badge**: Orange visual indicator
- **Recommendation icon**: 💡 in mission list
- **Relevance score**: Recommendation percentage

![Subcontracting suggestions](../../../assets/screenshots/subcontracting-suggestions.png)

### Suggestion Details

Click on a suggested mission to see:

1. **Cost comparison**:

   - Estimated internal cost
   - Subcontractor cost
   - Potential savings

2. **Available subcontractors**:

   - List of subcontractors covering the zone
   - Each one's rates
   - Confirmed availability

3. **Profitability analysis**:
   - Margin with internal resources
   - Margin with subcontracting
   - Final recommendation

**Comparison example**:

```
Internal cost: €280 (80km positioning + service)
Subcontractor cost: €180 (local base)
Savings: €100 (35%)
Recommendation: ✅ Subcontract
```

---

## Assigning Mission to Subcontractor

### Assignment Process

1. **Select mission** in dispatch
2. **Open assignment panel**
3. **"Subcontractors" tab**: See available subcontractors
4. **Compare options**: Costs and availability
5. **Select subcontractor**: Click "Assign"
6. **Confirm assignment**: Validate selection

![Subcontractor assignment](../../../assets/screenshots/subcontracting-assignment.png)

### Filtering Subcontractors

Use filters to find the best subcontractor:

- **Vehicle type**: Required category
- **Geographic zone**: Zone coverage
- **Maximum price**: Available budget
- **Availability**: Required time window
- **Rating**: Performance score

### Confirmation and Communication

After assignment:

1. **Automatic notification**: Email sent to subcontractor
2. **Mission details**: Complete information transmitted
3. **Confirmation expected**: Delay according to subcontractor profile
4. **Status updated**: Mission marked "Awaiting confirmation"

---

## Tracking Subcontracted Missions

### Dispatch View

Subcontracted missions are identified by:

- **"Subcontracted" badge**: Blue indicator
- **Subcontractor name**: Displayed in details
- **Confirmation status**: Confirmed / Pending / Refused

### Possible Statuses

- **Assigned**: Mission sent to subcontractor
- **Confirmed**: Subcontractor accepted mission
- **In progress**: Mission being executed
- **Completed**: Mission finished
- **Refused**: Subcontractor declined (reassignment needed)

### Handling Refusals

If a subcontractor refuses:

1. **Immediate notification**: Alert in dispatch
2. **Automatic reassignment**: Alternative suggestions
3. **History preserved**: Refusal reason recorded

---

## Performance Analysis

### Metrics per Subcontractor

Go to **Reports** → **Subcontracting** to see:

- **Number of missions**: Total assigned per period
- **Acceptance rate**: % of confirmed missions
- **Punctuality rate**: % of on-time missions
- **Average rating**: Overall score
- **Average cost**: Average price per mission

### Dashboard

The dashboard displays:

1. **Top 5 subcontractors**: Most used
2. **Savings achieved**: Total amount saved
3. **Subcontracting rate**: % of outsourced missions
4. **Most subcontracted zones**: Geographic analysis

![Subcontracting dashboard](../../../assets/screenshots/subcontracting-dashboard.png)

---

## Invoicing and Payment

### Receiving Invoices

Subcontractor invoices are:

1. **Received by email**: Automatic sending after mission
2. **Recorded in system**: Linked to mission
3. **Automatically verified**: Comparison with agreed rate
4. **Validated or contested**: Approval workflow

### Payment Tracking

- **Pending invoices**: List of invoices to pay
- **Paid invoices**: Payment history
- **Payment schedule**: Planned payment dates
- **Reconciliation**: Amount verification

---

## Tips and Best Practices

### Selecting Subcontractors

**Quality criteria**:

- ✅ Verify VTC insurance and licenses
- ✅ Test with simple missions first
- ✅ Request client references
- ✅ Visit their base if possible

**Rate negotiation**:

- 💡 Negotiate packages for recurring trips
- 💡 Obtain volume-based discounts
- 💡 Clarify additional fees (tolls, parking)

### Optimizing Subcontracting

**When to subcontract**:

- ✅ Distance > 50km from your nearest base
- ✅ Demand peak exceeding your capacity
- ✅ Infrequent geographic zone
- ✅ Negative internal profitability

**When to keep internal**:

- ❌ VIP clients or strategic contracts
- ❌ Highly profitable missions
- ❌ Zone close to your bases
- ❌ Need for maximum quality control

### Relationship Management

- **Regular communication**: Monthly briefing with main subcontractors
- **Constructive feedback**: Share client feedback
- **Recognition**: Value good performance
- **Clear contracts**: Formalize agreements in writing

---

## Frequently Asked Questions (FAQ)

### Q1: How to calculate client selling price with subcontracting?

**A:** The system automatically calculates:

- Subcontractor cost (according to pricing grid)
- - Agency margin (configurable, typically 15-25%)
- = Client selling price

You can manually adjust the margin before sending the quote.

### Q2: What to do if a subcontractor refuses a mission at the last minute?

**A:**

1. System alerts you immediately
2. Alternative suggestions display automatically
3. Reassign to another subcontractor or take internally
4. Refusal is recorded in subcontractor's history

### Q3: Can I subcontract part of a STAY package?

**A:** Yes, for a STAY package, you can:

- Subcontract some services and keep others internal
- Use different subcontractors for different days
- System manages coordination automatically

### Q4: How to handle disputes with a subcontractor?

**A:**

1. Document the problem in mission notes
2. Contact subcontractor directly
3. If unresolved, mark mission as "Dispute"
4. System blocks payments until resolution

### Q5: Do clients know the mission is subcontracted?

**A:** It depends on your configuration:

- **Transparent mode**: Client is informed (subcontractor name visible)
- **White label mode**: Client only sees your brand
- Configure this in Settings → Subcontracting → Visibility

---

## Support

For any questions about subcontracting:

- **API Documentation**: [docs/api/subcontracting-endpoints.md](../../api/subcontracting-endpoints.md)
- **Optimization Guide**: [docs/best-practices/subcontracting-optimization.md](../../best-practices/subcontracting-optimization.md)
- **Technical Support**: support@sixieme-etoile.fr

---

**Last updated**: 2026-01-04  
**Version**: 1.0 (Epic 22)

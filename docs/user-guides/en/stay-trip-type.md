# User Guide: STAY Trip Type (Multi-Day Packages)

**Version:** 1.0  
**Date:** 2026-01-04  
**Audience:** Commercial Operators, Dispatchers

---

## Introduction

The **STAY** trip type allows you to create multi-day packages comprising multiple transport services spread across several days. This guide explains how to create, manage, and invoice complex stay packages.

### Typical Use Cases

- **Tourist stay**: Airport transfer + excursions + return over 3-5 days
- **Corporate event**: Delegation transport over several days with multiple trips
- **Business travel**: Recurring availability during a professional stay

---

## Creating a STAY Quote

### Step 1: Select Trip Type

1. Go to **Quotes** → **New Quote**
2. In the form, select **Trip Type**: `STAY`
3. The interface transforms to display the multi-day configurator

![STAY type selection](../../../assets/screenshots/stay-selection.png)

### Step 2: Configure General Information

Fill in the basic information:

- **Client**: Select the contact (private or partner agency)
- **Vehicle**: Choose the vehicle category
- **Stay dates**: Start date and end date
- **Notes**: Special instructions for the complete stay

### Step 3: Add Service Days

For each day of the stay:

1. Click **+ Add day**
2. Select the date
3. Configure services for that day

![Multi-day calendar](../../../assets/screenshots/stay-calendar.png)

### Step 4: Configure Services per Day

For each day, you can add multiple services:

#### Service Type: TRANSFER

- **Pickup point**: Pickup address
- **Dropoff point**: Dropoff address
- **Pickup time**: Exact time
- **Passengers**: Number of passengers
- **Luggage**: Number of bags

**Example**: CDG Airport → Paris Hotel transfer (Day 1, 10:00 AM)

#### Service Type: EXCURSION

- **Starting point**: Departure address
- **Intermediate stops**: Add circuit waypoints
- **Return point**: Return address
- **Departure time**: Start time
- **Estimated duration**: Total excursion duration

**Example**: Versailles excursion with castle visit (Day 2, 9:00 AM-5:00 PM)

#### Service Type: DISPO (Availability)

- **Pickup point**: Pickup address
- **Availability zone**: Geographic zone
- **Start time**: Availability start time
- **Duration**: Number of availability hours

**Example**: 4-hour availability for Paris meetings (Day 3, 2:00 PM-6:00 PM)

### Step 5: Review Staffing Costs

The system automatically calculates:

- **Hotel nights**: If service ends after 8:00 PM or exceeds 12 hours
- **Meals**: 1 meal per 6 hours of service (max 2/day)
- **Second driver**: If required by RSE regulations

![Staffing costs detail](../../../assets/screenshots/stay-staffing-costs.png)

**Calculation rules**:

- 1 meal = €25 per driver
- 1 night = €85 per driver
- Costs are doubled if 2 drivers required

### Step 6: Review Summary

The **Trip Transparency** panel displays:

1. **Daily summary**: Services and costs for each day
2. **Total staffing costs**: Hotels + meals + second driver
3. **Total stay price**: Sum of all services
4. **Margin**: Overall package profitability

![Stay summary](../../../assets/screenshots/stay-summary.png)

### Step 7: Send Quote

1. Verify all details
2. Click **Send quote**
3. Client receives a detailed quote with day-by-day breakdown

---

## Modifying a STAY Quote

### Before Sending (DRAFT Status)

All fields are editable:

- Add or remove days
- Modify services
- Change times or addresses

### After Sending (SENT/ACCEPTED Status)

**Editable fields**:

- Operational notes only

**Locked fields**:

- Price, services, dates, vehicle

To modify a sent quote, create a new quote or duplicate the existing one.

---

## Converting to Invoice

When a STAY quote is accepted:

1. Access the accepted quote
2. Click **Convert to invoice**
3. Invoice is generated with **detailed lines**:

**Invoice structure**:

```
Line 1: Transfer - Day 1 - CDG → Paris Hotel
Line 2: Excursion - Day 2 - Versailles (8h)
Line 3: Hotel - Day 2 - Driver overnight
Line 4: Meals - Day 2 - Lunch + Dinner
Line 5: Availability - Day 3 - Paris (4h)
Line 6: Transfer - Day 3 - Hotel → CDG
```

Each line displays:

- Service description
- Date
- Unit price
- Applicable VAT

![Detailed STAY invoice](../../../assets/screenshots/stay-invoice.png)

---

## Dispatching STAY Missions

### Dispatch View

STAY missions appear in dispatch with:

- **STAY badge**: Visual indicator of multi-day type
- **Total duration**: Number of stay days
- **Timeline**: Chronological view of services

### Driver Assignment

For each service in the stay:

1. Select the STAY mission
2. Expand the timeline to see services
3. Assign a driver to each service
4. System verifies availability for entire duration

**Important**: The same driver can be assigned to all stay services, or you can use multiple drivers depending on availability.

![STAY dispatch timeline](../../../assets/screenshots/stay-dispatch-timeline.png)

---

## Tips and Best Practices

### When to Use STAY vs Separate Quotes?

**Use STAY when**:

- ✅ Same client over multiple days
- ✅ Global package with negotiated price
- ✅ Single invoice desired
- ✅ Coherent staffing management (hotel, meals)

**Use separate quotes when**:

- ❌ Independent unrelated services
- ❌ Separate invoicing required
- ❌ Different clients
- ❌ Cancellation flexibility per service

### Cost Optimization

1. **Group services**: Reduce empty trips between services
2. **Plan overnight stays**: Avoid unnecessary returns to base
3. **Optimize schedules**: Minimize waiting times
4. **Use single driver**: If RSE regulations permit

### Handling Unexpected Events

- **Service cancellation**: Contact support to modify quote
- **Adding service**: Create complementary quote
- **Schedule change**: Modify notes to inform driver

---

## Frequently Asked Questions (FAQ)

### Q1: Can I mix different vehicle types in a STAY?

**A:** No, currently a STAY package uses the same vehicle category for all services. If you need different vehicles, create separate quotes.

### Q2: How are hotel costs calculated?

**A:** A hotel night is automatically added if:

- Service ends after 8:00 PM, OR
- Total service duration exceeds 12 hours

Cost is €85 per driver per night.

### Q3: Can I modify individual service prices?

**A:** Yes, in the Trip Transparency panel, you can manually adjust prices for each component before sending the quote.

### Q4: How to handle a 2-week stay?

**A:** The STAY system supports stays of any duration. Simply add as many days as needed. For very long stays, consider creating multiple STAY packages per week for more flexibility.

### Q5: Are staffing costs billed to the client?

**A:** Yes, staffing costs (hotel, meals, second driver) are included in the total quote price and appear as separate lines on the invoice for transparency.

---

## Support

For any questions or issues with STAY quotes:

- **Complete documentation**: [docs/api/stay-endpoints.md](../../api/stay-endpoints.md)
- **Best practices guide**: [docs/best-practices/stay-usage-guide.md](../../best-practices/stay-usage-guide.md)
- **Technical support**: support@sixieme-etoile.fr

---

**Last updated**: 2026-01-04  
**Version**: 1.0 (Epic 22)

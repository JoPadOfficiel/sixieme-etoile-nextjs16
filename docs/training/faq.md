# Frequently Asked Questions (FAQ) - Epic 22 Features

**Version:** 1.0  
**Date:** 2026-01-04  
**Last Updated:** 2026-01-04

---

## STAY Trip Type

### Q1: What is the difference between STAY and creating multiple separate quotes?

**A:** A STAY package is a single quote containing multiple services across multiple days, ideal for:

- Same client over consecutive days
- Package pricing with single invoice
- Coordinated staffing (hotels, meals)
- Simplified billing

Separate quotes are better when:

- Services are unrelated or weeks apart
- Different clients or billing entities
- Individual cancellation flexibility needed
- Separate approval processes required

### Q2: Can I mix different vehicle types in a STAY package?

**A:** No, currently a STAY package uses the same vehicle category for all services. If you need different vehicles (e.g., sedan for transfers, van for group excursion), create separate quotes for each vehicle type.

### Q3: How are hotel costs calculated for STAY packages?

**A:** Hotel nights are automatically added when:

- Service ends after 20:00 (8:00 PM), OR
- Total service duration exceeds 12 hours

Cost: €85 per driver per night (configurable in settings)

### Q4: Can I modify a STAY package after sending it to the client?

**A:**

- **Before sending (DRAFT)**: All fields editable
- **After sending (SENT/ACCEPTED)**: Only notes editable
- **To modify services/prices**: Create a new quote or duplicate existing

### Q5: How does invoicing work for STAY packages?

**A:** STAY invoices include detailed line items:

- Each service as separate line (Transfer Day 1, Excursion Day 2, etc.)
- Staffing costs as separate lines (Hotel, Meals)
- Clear breakdown by date
- All with appropriate VAT

### Q6: What happens if a client cancels one day of a multi-day STAY?

**A:** Currently, STAY packages are all-or-nothing. For partial cancellations:

1. Cancel the entire STAY quote
2. Create a new STAY with remaining days
3. Or create separate quotes for each day if flexibility is critical

**Future Enhancement:** Partial day cancellation is planned for a future release.

### Q7: Can I create a STAY package longer than 7 days?

**A:** Yes, there's no technical limit. However, for stays longer than 7 days, consider:

- Creating weekly STAY packages for easier management
- Separate billing per week
- Flexibility for mid-stay modifications

### Q8: How do I handle different pickup times each day?

**A:** Each service within a STAY day has its own pickup time. You can set different times for:

- Morning transfer: 08:00
- Afternoon excursion: 14:00
- Evening transfer: 19:00

All within the same day.

---

## Subcontracting System

### Q9: How does the system suggest subcontracting?

**A:** Automatic suggestions appear when:

- No internal vehicle available in the time window
- Distance from base > 50km (high positioning cost)
- Profitability analysis shows subcontracting is more profitable
- Subcontractor has better zone coverage

### Q10: Can I override subcontracting suggestions?

**A:** Yes, suggestions are recommendations only. You can:

- Ignore the suggestion and assign internally
- Select a different subcontractor than suggested
- Manually assign to any available subcontractor

### Q11: How is pricing calculated with subcontractors?

**A:**

```
Client Price = Subcontractor Cost + Your Margin
```

Example:

- Subcontractor charges: €180
- Your margin: 20% = €36
- Client pays: €216

You can adjust the margin before sending the quote.

### Q12: What happens if a subcontractor refuses a mission?

**A:**

1. You receive immediate notification
2. Mission status changes to "Refused"
3. Alternative subcontractors are suggested
4. You can reassign or take internally
5. Refusal is logged in subcontractor's history

### Q13: Can I subcontract part of a STAY package?

**A:** Yes! For a STAY package, you can:

- Keep some services internal
- Subcontract others to one or more subcontractors
- Mix internal and external resources
- System coordinates everything automatically

### Q14: How do I track subcontractor performance?

**A:** Go to **Reports** → **Subcontracting** to see:

- Acceptance rate (% of missions confirmed)
- Punctuality rate (% on-time)
- Average cost per mission
- Client feedback scores
- Total missions assigned

### Q15: Do clients know when a mission is subcontracted?

**A:** Configurable in **Settings** → **Subcontracting** → **Visibility**:

- **Transparent mode**: Client sees subcontractor name
- **White label mode**: Client only sees your brand

Choose based on your business model and client relationships.

---

## Round Trip Pricing

### Q16: Why did my round trip prices change?

**A:** We fixed a bug where round trips used a simple ×2 multiplier. The new calculation:

- Calculates all 6 segments individually
- Optimizes base selection per segment
- Avoids double-counting empty returns
- More accurate, often cheaper

**Existing quotes**: Keep original pricing (guaranteed)  
**New quotes**: Use accurate segment-based calculation

### Q17: Can I see the old vs new pricing?

**A:** For existing DRAFT quotes:

1. Open the quote
2. Click **Recalculate with new method**
3. Compare side-by-side
4. Choose to keep original or update

### Q18: Will round trips cost more now?

**A:** Not necessarily. The new method:

- Often costs less due to multi-base optimization
- More accurate (reflects real operational costs)
- Transparent (shows all segments)

Prices increase only if the old method underestimated actual costs.

### Q19: How does multi-base optimization work?

**A:** The system selects the closest base for each segment:

Example:

```
Trip: Versailles ↔ Orly
Bases: Bussy (East), Versailles (West)

Optimized:
- Outbound: Versailles base → Versailles → Orly → Bussy base
- Return: Bussy base → Orly → Versailles → Versailles base
Total: 114 km

Non-optimized (all from Bussy):
Total: 180 km

Savings: 66 km
```

---

## Staffing Costs

### Q20: Why are staffing costs shown separately?

**A:** For transparency:

- Clients understand what they're paying for
- Operators see true operational costs
- Accurate profitability analysis
- Compliance with cost breakdown requirements

### Q21: Can I hide staffing costs from clients?

**A:** Yes, configure in **Settings** → **Invoicing** → **Detail Level**:

- **Detailed**: Show all cost components (recommended)
- **Summary**: Show total only
- **Custom**: Choose which components to show

### Q22: How are meal costs calculated?

**A:**

- **Rule**: 1 meal per 6 hours of service
- **Maximum**: 2 meals per day (lunch + dinner)
- **Cost**: €25 per meal per driver (configurable)

Examples:

- 4h service = 0 meals
- 7h service = 1 meal
- 13h service = 2 meals

### Q23: Can I manually adjust staffing costs?

**A:** Yes, in the quote creation:

1. Go to **Trip Transparency** panel
2. Click **Edit** in Staffing Costs section
3. Adjust number of meals, hotel nights, or rates
4. Total recalculates automatically

Use cases:

- Negotiated hotel rates
- Client provides meals
- Special arrangements

### Q24: Are staffing costs included in the quote price?

**A:** Yes, always. Staffing costs are:

- Calculated automatically
- Included in total quote price
- Shown separately on invoice for transparency
- Part of profitability calculations

---

## Quote Notes

### Q25: Can I edit notes after sending a quote?

**A:** Yes! You can now edit notes even after sending. However:

- **Editable**: Notes and operational instructions
- **Locked**: Price, dates, vehicle, addresses

This allows updating driver instructions without changing commercial terms.

### Q26: Will the driver see note changes immediately?

**A:** Yes, if the mission is already assigned:

- Driver receives push notification
- Notes update in real-time in driver app
- Change is logged with timestamp
- Dispatcher sees "Notes updated" badge

### Q27: Can I see who modified the notes?

**A:** Yes, in the quote's **Modification History**:

- Date and time of each change
- User who made the change
- Old content vs new content
- Complete audit trail

### Q28: What should I put in notes vs quote fields?

**Notes are for:**

- Operational instructions (codes, contacts)
- Driver-specific information
- Special requests or preferences
- Logistical details

**Quote fields are for:**

- Commercial information (price, dates)
- Service specifications (addresses, times)
- Client details
- Contractual terms

---

## General Questions

### Q29: How do I get training on new features?

**A:** Multiple resources available:

- **User Guides**: Detailed step-by-step instructions
- **Video Tutorials**: Visual walkthroughs (coming soon)
- **In-app Help**: Contextual help in the interface
- **Support Team**: support@sixieme-etoile.fr

### Q30: Are there any breaking changes in Epic 22?

**A:** No breaking changes:

- All existing quotes/invoices unchanged
- New features are opt-in
- Existing workflows continue to work
- Backward compatible API enhancements

### Q31: How do I report a bug or request a feature?

**A:**

1. **Bugs**: Email support@sixieme-etoile.fr with:

   - Detailed description
   - Steps to reproduce
   - Screenshots if applicable
   - Your user ID and organization

2. **Feature Requests**: Same email, include:
   - Use case description
   - Business value
   - Priority level
   - Any workarounds you're using

### Q32: Where can I find the API documentation?

**A:** Complete API documentation at:

- **STAY Endpoints**: [docs/api/stay-endpoints.md](../api/stay-endpoints.md)
- **Subcontracting**: [docs/api/subcontracting-endpoints.md](../api/subcontracting-endpoints.md)
- **General API**: [docs/api/README.md](../api/README.md)

### Q33: Can I export STAY package data?

**A:** Yes, STAY quotes can be exported as:

- **PDF**: Complete quote with daily breakdown
- **Excel**: Detailed cost analysis
- **JSON**: Via API for integrations
- **Invoice**: After conversion to invoice

### Q34: How do I configure default staffing rates?

**A:** Go to **Settings** → **Pricing** → **Staffing Costs**:

- Meal rates (lunch, dinner)
- Hotel rates (by zone if needed)
- Second driver hourly rate
- Save as organization defaults

### Q35: Is there a mobile app for STAY management?

**A:** Currently:

- **Web interface**: Full STAY management
- **Driver app**: View STAY missions and daily services
- **Mobile web**: Responsive design works on mobile

**Coming soon**: Native mobile app with offline support

---

## Troubleshooting

### Q36: STAY quote creation fails with "Invalid service configuration"

**A:** Check that:

- Each day has at least one service
- All required fields are filled (addresses, times)
- Pickup time is in HH:MM format
- Coordinates are valid (if provided)
- Vehicle category exists and is active

### Q37: Subcontractor suggestions not appearing

**A:** Verify:

- Subcontractor profiles are active
- Operating zones cover the mission area
- Pricing grid is configured
- Mission date/time is within availability
- No conflicting assignments

### Q38: Staffing costs seem incorrect

**A:** Verify calculation:

- Service duration is correct
- End time triggers hotel rule (after 20:00)
- Meal count follows 6-hour rule
- Number of drivers is correct
- Rates match organization settings

### Q39: Round trip pricing doesn't match expectations

**A:** Remember:

- New method calculates 6 segments
- Multi-base optimization may reduce costs
- Check Trip Transparency for segment breakdown
- Compare with old method using recalculate feature

### Q40: Notes not syncing to dispatch

**A:** Try:

- Refresh the dispatch page
- Check that quote is in SENT or ACCEPTED status
- Verify mission was created from the quote
- Check browser console for errors
- Contact support if issue persists

---

## Getting More Help

**Documentation:**

- [User Guides](../user-guides/)
- [API Documentation](../api/)
- [Best Practices](../best-practices/)
- [Troubleshooting Guide](troubleshooting.md)

**Support:**

- Email: support@sixieme-etoile.fr
- Phone: +33 1 23 45 67 89
- Hours: Monday-Friday, 9:00-18:00 CET

**Community:**

- User Forum: forum.sixieme-etoile.fr
- Feature Requests: features.sixieme-etoile.fr

---

**Last Updated:** 2026-01-04  
**Version:** 1.0 (Epic 22)

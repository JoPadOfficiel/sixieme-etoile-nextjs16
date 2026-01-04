# Troubleshooting Guide - Epic 22 Features

**Version:** 1.0  
**Date:** 2026-01-04  
**Last Updated:** 2026-01-04

---

## STAY Trip Type Issues

### Issue: Cannot Create STAY Quote

**Symptoms:**

- "Invalid service configuration" error
- Form validation fails
- Quote creation button disabled

**Solutions:**

1. **Check Required Fields**

   ```
   ✓ Organization selected
   ✓ Contact selected
   ✓ Vehicle category selected
   ✓ At least one day added
   ✓ Each day has at least one service
   ✓ All service addresses filled
   ✓ All pickup times in HH:MM format
   ```

2. **Verify Service Data**

   - Addresses must be valid
   - Coordinates (if provided) must be valid lat/lng
   - Pickup times must be future dates
   - Duration must be positive number

3. **Check Browser Console**
   - Open Developer Tools (F12)
   - Look for red error messages
   - Screenshot and send to support if unclear

**Still Not Working?**

- Try creating with minimal data (1 day, 1 service)
- Clear browser cache and cookies
- Try different browser
- Contact support with error details

---

### Issue: STAY Pricing Seems Incorrect

**Symptoms:**

- Total cost doesn't match expectations
- Staffing costs too high/low
- Margin calculation wrong

**Diagnostic Steps:**

1. **Check Trip Transparency Panel**

   - Expand all sections
   - Verify each service cost
   - Check staffing breakdown
   - Review segment distances

2. **Verify Staffing Calculations**

   ```
   Meals:
   - Count = floor(duration_hours / 6)
   - Max 2 per day
   - Cost = count × €25 × drivers

   Hotel:
   - Required if end_time > 20:00 OR duration > 12h
   - Cost = nights × €85 × drivers

   Second Driver:
   - Required if duration > 13h OR distance > 500km
   - Cost = hours × hourly_rate
   ```

3. **Check Organization Settings**
   - Settings → Pricing → Staffing Costs
   - Verify rates match expectations
   - Check if custom rates apply

**Common Causes:**

- Service duration longer than expected
- End time after 20:00 triggering hotel
- Second driver requirement not anticipated
- Custom rates configured differently

**Fix:**

- Adjust service times to avoid hotel
- Split long services into shorter segments
- Manually override staffing costs if needed
- Update organization default rates

---

### Issue: Cannot Add Service to STAY Day

**Symptoms:**

- "+ Add Service" button not working
- Service form doesn't appear
- Service not saved

**Solutions:**

1. **Check Quote Status**

   - Only DRAFT quotes can be modified
   - SENT/ACCEPTED quotes are locked
   - Create new quote if needed

2. **Verify Day Exists**

   - Day must be created first
   - Check day is selected
   - Try refreshing the page

3. **Check Service Limit**
   - Maximum 10 services per day
   - Remove unused services if at limit

**Workaround:**

- Save quote and reopen
- Create day first, then add services
- Use duplicate quote feature

---

### Issue: STAY Invoice Missing Line Items

**Symptoms:**

- Invoice created but incomplete
- Missing service lines
- Staffing costs not itemized

**Solutions:**

1. **Verify Quote Conversion**

   - Quote must be ACCEPTED status
   - All services must have costs
   - Check quote has stayDays data

2. **Check Invoice Generation**

   - Settings → Invoicing → STAY Options
   - Verify "Detailed line items" enabled
   - Check VAT rates configured

3. **Regenerate Invoice**
   - Delete incomplete invoice
   - Re-convert quote to invoice
   - Verify all lines present

**Prevention:**

- Always review quote before accepting
- Verify all costs calculated
- Test with sample quote first

---

## Subcontracting Issues

### Issue: No Subcontracting Suggestions

**Symptoms:**

- Suggestions badge not appearing
- Subcontractors tab empty
- No recommendations shown

**Diagnostic Steps:**

1. **Check Subcontractor Profiles**

   ```
   Settings → Subcontractors
   ✓ At least one active profile exists
   ✓ Operating zones configured
   ✓ Pricing grid filled
   ✓ Availability set
   ```

2. **Verify Mission Criteria**

   - Mission location in subcontractor zone
   - Mission date/time in availability window
   - Vehicle category available from subcontractor

3. **Check Suggestion Thresholds**
   - Settings → Subcontracting → Suggestions
   - Verify thresholds not too restrictive
   - Check profitability calculation enabled

**Common Causes:**

- No subcontractors cover the zone
- Mission outside availability hours
- Profitability threshold too high
- Suggestion feature disabled

**Fix:**

- Add/update subcontractor profiles
- Adjust operating zones
- Lower suggestion thresholds
- Enable automatic suggestions

---

### Issue: Subcontractor Assignment Fails

**Symptoms:**

- "Assignment failed" error
- Subcontractor not receiving notification
- Mission status not updating

**Solutions:**

1. **Verify Subcontractor Status**

   - Profile is active
   - Email address valid
   - Not at capacity limit
   - No conflicting assignments

2. **Check Mission Data**

   - All required fields filled
   - Pickup/dropoff addresses valid
   - Date/time in future
   - Vehicle category matches

3. **Review Email Settings**
   - Settings → Integrations → Email
   - SMTP configured correctly
   - Test email sending
   - Check spam folder

**Workaround:**

- Manually contact subcontractor
- Update assignment status manually
- Resend notification email

---

### Issue: Subcontractor Refuses Mission

**Symptoms:**

- Mission marked as "Refused"
- Need to reassign quickly
- Client waiting for confirmation

**Immediate Actions:**

1. **Check Alternative Subcontractors**

   - View suggested alternatives
   - Compare costs and availability
   - Select best option

2. **Consider Internal Assignment**

   - Check internal vehicle availability
   - Calculate profitability
   - Assign if viable

3. **Contact Client if Needed**
   - Inform of slight delay
   - Confirm new assignment
   - Update pickup time if necessary

**Prevention:**

- Build relationships with multiple subcontractors
- Have backup options ready
- Confirm availability before assigning
- Track refusal patterns

---

## Round Trip Pricing Issues

### Issue: Round Trip Price Changed After Update

**Symptoms:**

- Existing quote shows different price
- Client questions price change
- Confusion about calculation

**Explanation:**

- Epic 22 fixed round trip calculation bug
- Old method: Simple ×2 multiplier
- New method: Accurate segment-based
- Existing quotes keep original price

**Solutions:**

1. **For Existing Quotes**

   - Original price is guaranteed
   - No retroactive changes
   - Badge shows "Legacy calculation"

2. **For New Quotes**

   - Use accurate segment calculation
   - Show Trip Transparency to client
   - Explain improved accuracy

3. **To Compare Methods**
   - Open DRAFT quote
   - Click "Recalculate with new method"
   - Review side-by-side comparison
   - Choose which to use

**Client Communication:**

```
"We've improved our pricing accuracy. Your quote
uses our enhanced calculation that better reflects
actual operational costs. The detailed breakdown
shows exactly what you're paying for."
```

---

### Issue: Round Trip Segments Don't Make Sense

**Symptoms:**

- Unexpected base selections
- Segments seem inefficient
- Total distance higher than expected

**Diagnostic Steps:**

1. **Review Segment Breakdown**

   - Open Trip Transparency
   - Check each of 6 segments
   - Verify base selections
   - Calculate total distance

2. **Check Multi-Base Settings**

   - Settings → Fleet → Operating Bases
   - Verify all bases active
   - Check base locations correct
   - Review optimization enabled

3. **Understand Optimization Logic**
   ```
   System selects closest base for each segment:
   - Segment A: Closest to pickup
   - Segment C: Closest to dropoff
   - Segment D: Closest to dropoff (return leg)
   - Segment F: Closest to pickup (return leg)
   ```

**Common Misunderstandings:**

- System optimizes per segment, not overall
- Different bases may be used for different segments
- Optimization considers positioning costs
- Result may differ from manual calculation

**Fix:**

- Enable/disable multi-base optimization
- Force specific base if needed
- Review base locations
- Contact support for complex cases

---

## Staffing Costs Issues

### Issue: Hotel Cost Not Calculated

**Symptoms:**

- Service ends after 20:00 but no hotel
- Long service (>12h) but no hotel
- Staffing costs seem low

**Diagnostic Steps:**

1. **Check Service End Time**

   ```
   Pickup: 10:00
   Duration: 8 hours
   End time: 18:00 (before 20:00 = no hotel)

   vs

   Pickup: 14:00
   Duration: 8 hours
   End time: 22:00 (after 20:00 = hotel required)
   ```

2. **Verify Duration Calculation**

   - Check estimated duration
   - Include all stops and waiting time
   - Account for traffic
   - Verify calculation in Trip Transparency

3. **Check Settings**
   - Settings → Pricing → Staffing
   - Verify hotel trigger time (default 20:00)
   - Check duration threshold (default 12h)

**Fix:**

- Adjust service end time
- Manually add hotel if needed
- Update organization settings
- Recalculate quote

---

### Issue: Too Many Meals Calculated

**Symptoms:**

- Meal count higher than expected
- 4-hour service shows 1 meal
- Costs seem inflated

**Explanation:**

```
Meal Calculation Rule:
- 1 meal per 6 hours (rounded down)
- Maximum 2 per day

Examples:
- 4h = 0 meals (4 ÷ 6 = 0.67 → 0)
- 6h = 1 meal (6 ÷ 6 = 1)
- 7h = 1 meal (7 ÷ 6 = 1.16 → 1)
- 12h = 2 meals (12 ÷ 6 = 2)
- 18h = 2 meals (capped at 2/day)
```

**Solutions:**

1. **Verify Duration**

   - Check actual service duration
   - Include all segments
   - Account for waiting time

2. **Adjust if Needed**

   - Manually override meal count
   - Split service into shorter segments
   - Update duration estimate

3. **Configure Rates**
   - Settings → Pricing → Staffing
   - Adjust meal calculation rule
   - Set custom rates if needed

---

## Quote Notes Issues

### Issue: Cannot Edit Notes After Sending

**Symptoms:**

- Notes field is read-only
- Edit button not appearing
- Changes not saving

**Solutions:**

1. **Check Quote Status**

   ```
   ✓ SENT: Notes editable
   ✓ ACCEPTED: Notes editable
   ✓ REJECTED: Notes editable
   ✗ INVOICED: Notes locked
   ```

2. **Verify Permissions**

   - Check user role
   - Settings → Users → Permissions
   - Verify "Edit notes" permission
   - Contact admin if needed

3. **Check Browser**
   - Refresh page
   - Clear cache
   - Try different browser
   - Disable browser extensions

**Workaround:**

- Contact admin to edit
- Add notes in dispatch instead
- Create internal note document

---

### Issue: Notes Not Syncing to Dispatch

**Symptoms:**

- Notes updated in quote
- Not visible in dispatch
- Driver not receiving updates

**Diagnostic Steps:**

1. **Verify Mission Created**

   - Quote must be ACCEPTED
   - Mission created from quote
   - Check dispatch for mission

2. **Check Sync Status**

   - Refresh dispatch page
   - Check browser console for errors
   - Verify WebSocket connection

3. **Test Notification**
   - Update notes again
   - Check driver app
   - Verify notification settings

**Fix:**

- Manually refresh dispatch
- Resend mission to driver
- Contact support if persistent

---

## General Troubleshooting

### Browser Issues

**Clear Cache and Cookies:**

```
Chrome: Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
Firefox: Ctrl+Shift+Delete
Safari: Cmd+Option+E
```

**Disable Extensions:**

- Try incognito/private mode
- Disable ad blockers
- Disable script blockers

**Update Browser:**

- Use latest version
- Supported browsers:
  - Chrome 90+
  - Firefox 88+
  - Safari 14+
  - Edge 90+

---

### Performance Issues

**Slow Page Loading:**

1. Check internet connection
2. Clear browser cache
3. Reduce number of open tabs
4. Disable unnecessary extensions

**Slow Quote Creation:**

1. Simplify quote (fewer services)
2. Save frequently
3. Close other applications
4. Check system resources

**Timeout Errors:**

1. Retry the operation
2. Break into smaller operations
3. Check server status
4. Contact support

---

### Data Issues

**Missing Data:**

1. Check filters applied
2. Verify date range
3. Check organization selection
4. Refresh page

**Incorrect Data:**

1. Verify source data
2. Check calculation settings
3. Review recent changes
4. Contact support with details

**Sync Issues:**

1. Refresh page
2. Log out and log in
3. Check internet connection
4. Verify server status

---

## Getting Help

### Before Contacting Support

**Gather Information:**

- Screenshot of error
- Steps to reproduce
- Browser and version
- User ID and organization
- Quote/mission ID if applicable

**Try Basic Fixes:**

- Refresh page
- Clear cache
- Try different browser
- Log out and log in

### Contact Support

**Email:** support@sixieme-etoile.fr

**Include:**

1. Detailed description
2. Screenshots/screen recording
3. Steps to reproduce
4. Expected vs actual behavior
5. User and organization info
6. Urgency level

**Response Time:**

- Critical: 2 hours
- High: 4 hours
- Medium: 24 hours
- Low: 48 hours

### Emergency Support

**Phone:** +33 1 23 45 67 89  
**Hours:** 24/7 for critical issues

**Critical Issues:**

- System completely down
- Data loss
- Security breach
- Payment processing failure

---

## Known Issues

### Current Known Issues (as of 2026-01-04)

1. **STAY Timeline Display**

   - Issue: Timeline may not display correctly on small screens
   - Workaround: Use desktop or tablet
   - Fix: Planned for next release

2. **Subcontractor Email Notifications**

   - Issue: Occasional delay in email delivery
   - Workaround: Manual phone confirmation
   - Fix: Email service upgrade in progress

3. **Round Trip Recalculation**
   - Issue: Recalculation button may timeout for very old quotes
   - Workaround: Create new quote
   - Fix: Performance optimization planned

### Resolved Issues

- ✅ Round trip double-counting (Fixed in Epic 22)
- ✅ Staffing costs not displayed (Fixed in Epic 22)
- ✅ Notes not editable after sending (Fixed in Epic 22)
- ✅ Subcontractor suggestions not working (Fixed in Epic 22)

---

## Diagnostic Tools

### Browser Console

**Open Console:**

- Chrome/Firefox: F12 or Ctrl+Shift+I
- Safari: Cmd+Option+I

**Look For:**

- Red error messages
- Network failures (red in Network tab)
- JavaScript errors

### Network Tab

**Check:**

- Failed requests (red)
- Slow requests (>5s)
- 4xx/5xx status codes

### Application Tab

**Verify:**

- Cookies present
- Session token valid
- Local storage data

---

## Preventive Measures

### Best Practices

1. **Save Frequently**

   - Save quotes as DRAFT regularly
   - Don't rely on auto-save alone

2. **Test Before Production**

   - Create test quotes
   - Verify calculations
   - Review before sending to clients

3. **Keep Browser Updated**

   - Enable auto-updates
   - Use supported browsers
   - Clear cache weekly

4. **Regular Backups**

   - Export important quotes
   - Save PDFs of invoices
   - Document custom configurations

5. **Stay Informed**
   - Read release notes
   - Watch training videos
   - Join user forum

---

**Related Documentation:**

- [FAQ](faq.md)
- [User Guides](../user-guides/)
- [API Documentation](../api/)

**Support:** support@sixieme-etoile.fr

---

**Last Updated:** 2026-01-04  
**Version:** 1.0 (Epic 22)

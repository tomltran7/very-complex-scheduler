# Quick Start Guide - Resident Scheduler

## 5-Minute Setup

### 1. Install the Script (2 minutes)
1. Open your Google Sheet with resident data
2. Go to **Extensions > Apps Script**
3. Delete any existing code
4. Copy and paste the entire contents of `scheduler.gs`
5. Click **Save** (💾)
6. Close the Apps Script tab

### 2. Authorize & Setup (2 minutes)
1. Refresh your Google Sheet
2. Wait for the **"Resident Scheduler"** menu to appear
3. Click **Resident Scheduler > Setup Validation Formulas**
4. Authorize the script when prompted (follow the prompts)
5. Validation columns will be created automatically

### 3. Prepare Your Data (1 minute)
1. Enter any **PTO** and **Request** days in the schedule grid
2. Verify resident names, sites, ranks, and classes are correct

### 4. Schedule! (30 seconds)
1. Click **Resident Scheduler > Auto-Schedule Shifts**
2. Confirm the action
3. Review the results in the validation columns

## Daily Usage

### To Schedule a New Month:
```
1. Clear old data (keep structure)
2. Update dates in row 3
3. Update day names in row 4
4. Enter PTO and Request days
5. Run "Auto-Schedule Shifts"
6. Run "Validate Schedule"
```

### To Make Manual Changes:
```
1. Edit any cell with shift codes (S1, S2, S3, S4, S5)
2. Run "Validate Schedule" to check for violations
3. Fix any violations shown
```

### To Start Over:
```
1. Run "Clear All Schedules"
2. This preserves PTO/Request entries
3. Run "Auto-Schedule Shifts" again
```

## Shift Codes Quick Reference

| Site | Shift | Time | Type |
|------|-------|------|------|
| Oly | S1 | 6:00-18:00 | Day |
| Oly | S2 | 7:00-19:00 | Day |
| Oly | S3 | 10:00-22:00 | Day |
| Oly | S4 | 18:00-6:00 | **Night** |
| Oly | S5 | 19:00-7:00 | **Night** |
| Dyer | S1 | 10:00-22:00 | Day |
| CP | S1 | 10:00-21:00 | Day |

## Validation Columns

| Column | Check | What It Means |
|--------|-------|---------------|
| AH | Shift Check | Total shifts within class limit? |
| AI | 60hrs Check | No more than 60hrs in any 7 days? |
| AJ | PTO Violation | Enough blank days for PTO? |

**"OK"** = Compliant ✓  
**"Violation"** = Fix needed ✗

## Common Issues

### "Violation" appears after scheduling
- Run **Validate Schedule** to see details
- The auto-scheduler tries to avoid violations, but constraints may be too tight
- Consider adjusting PTO/Request days or resident assignments

### Some shifts not filled
- This is normal - the scheduler prioritizes compliance over coverage
- No minimum coverage requirement
- Manually assign if needed (then validate)

### Menu doesn't appear
- Refresh the page
- Wait 10-15 seconds
- Check that script was saved properly

## Key Constraints

✓ **Max Shifts**: PGY1=15, PGY2=14, PGY3=13, IM=15 (Chiefs -2)  
✓ **60-Hour Rule**: Max 60 hours in any 7-day period  
✓ **Wednesday**: No day shifts (night shifts OK)  
✓ **Dyer/CP**: All classes eligible (PGY3 preferred)  
✓ **No Imbalanced Shifts**: No same-day doubles or day/night consecutive transitions  
✓ **Dedicated Night Workers**: Night shift residents work nights all month  
✓ **Site Assignment**: Residents only work at their assigned site  

## Need More Help?

- **In-app help**: Click **Resident Scheduler > Help**
- **Detailed setup**: See `SETUP_INSTRUCTIONS.md`
- **Formula details**: See `VALIDATION_FORMULAS.md`
- **Full documentation**: See `README.md`

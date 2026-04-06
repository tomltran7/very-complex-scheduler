# Resident Scheduler - Setup Instructions

## Overview
This is a Google Sheets-based automated scheduling system for resident shifts that respects all constraints including PTO, requests, shift limits, and work hour regulations.

## Initial Setup

### Step 1: Prepare Your Google Sheet

Your spreadsheet should have the following structure:

#### Required Columns:
- **Column A**: Row numbers (optional)
- **Column B**: Resident Names (rows 7-31)
- **Column C**: Hospital Site (Oly, Dyer, or CP only)
- **Columns D-AE**: Schedule days (28 days for the month)
- **Column AF**: Rank (enter "C" for Chief, leave blank otherwise)
- **Column AG**: Class (PGY1, PGY2, PGY3, or IM)
- **Column AH**: Shift Check (validation - will be auto-created)
- **Column AI**: 60hrs Check (validation - will be auto-created)
- **Column AJ**: PTO Violation (validation - will be auto-created)

#### Required Rows:
- **Row 3**: Dates (in columns D-AE)
- **Row 4**: Day names (Mon, Tue, Wed, etc. in columns D-AE)
- **Row 6**: Headers
- **Rows 7-31**: Resident data

### Step 2: Install the Google Apps Script

1. Open your Google Sheet
2. Go to **Extensions > Apps Script**
3. Delete any existing code in the editor
4. Copy the entire contents of `scheduler.gs` file
5. Paste it into the Apps Script editor
6. Click the **Save** icon (💾) or press Ctrl+S / Cmd+S
7. Name your project "Resident Scheduler"
8. Close the Apps Script tab

### Step 3: Authorize the Script

1. Refresh your Google Sheet
2. You should see a new menu called **"Resident Scheduler"** appear (may take a few seconds)
3. Click **Resident Scheduler > Setup Validation Formulas**
4. Google will ask you to authorize the script:
   - Click "Continue"
   - Select your Google account
   - Click "Advanced" (if you see a warning)
   - Click "Go to Resident Scheduler (unsafe)" - this is safe, it's your own script
   - Click "Allow"
5. The validation formulas will be created in columns AH, AI, and AJ

### Step 4: Enter Base Data

1. **Enter Resident Information** (rows 7-31):
   - Column B: Full names of residents
   - Column C: Assigned hospital site (must be exactly: Oly, Dyer, or CP)
   - Column AF: Enter "C" if the resident is a Chief, leave blank otherwise
   - Column AG: Enter class (must be exactly: PGY1, PGY2, PGY3, or IM)

2. **Enter Dates and Days** (row 3 and 4):
   - Row 3, Columns D-AE: Enter the dates for the month (e.g., 1, 2, 3... 28)
   - Row 4, Columns D-AE: Enter day names (Mon, Tue, Wed, Thu, Fri, Sat, Sun)

3. **Enter PTO and Requests**:
   - In the schedule area (columns D-AE, rows 7-31), enter:
     - "PTO" for paid time off days
     - "Request" for requested days off
   - The scheduler will work around these constraints

## Using the Scheduler

### Auto-Schedule Shifts

1. Click **Resident Scheduler > Auto-Schedule Shifts**
2. Confirm the action
3. The system will automatically:
   - Assign shifts to residents
   - Respect all PTO and Request days
   - Follow all constraints (shift limits, 60-hour rule, etc.)
   - Prioritize PGY3 residents for coverage
   - Balance day and night shifts
   - Prevent same-day double shifts (imbalanced distribution)

### Validate Schedule

After scheduling (or making manual changes):
1. Click **Resident Scheduler > Validate Schedule**
2. Review any violations reported
3. The validation columns (AH, AI, AJ) will show "OK" or "Violation" for each resident

### Clear Schedule

To start over:
1. Click **Resident Scheduler > Clear All Schedules**
2. This will clear all shift assignments but preserve PTO and Request entries
3. You can then run Auto-Schedule again

### Manual Adjustments

You can manually edit any shift assignments:
- Enter shift codes: S1, S2, S3, S4, S5
- The validation formulas will automatically check for violations
- Run "Validate Schedule" to see a summary

## Shift Codes

### Oly (Olympia) Site:
- **S1**: 6:00-18:00 (Day shift)
- **S2**: 7:00-19:00 (Day shift)
- **S3**: 10:00-22:00 (Day shift)
- **S4**: 18:00-6:00 (Night shift)
- **S5**: 19:00-7:00 (Night shift)

### Dyer Site:
- **S1**: 10:00-22:00 (Day shift)

### CP Site:
- **S1**: 10:00-21:00 (Day shift)

## Constraints and Rules

The scheduler automatically enforces:

### Shift Limits:
- PGY1: 15 shifts max
- PGY2: 14 shifts max
- PGY3: 13 shifts max
- IM: 15 shifts max
- Chiefs (C): 2 fewer shifts than their class

### Work Hour Rules:
- No more than 60 hours in any 7-consecutive-day period
- Each shift counts as 12 hours

### Wednesday Conference:
- No day shifts on Wednesdays
- Night shifts on Wednesday are allowed
- Residents on night shift Tuesday night are excused from Wednesday conference

### Site Restrictions:
- Dyer and CP sites prefer PGY3 residents but can schedule any class
- Residents can only work at their assigned hospital site
- Priority: Oly > Dyer > CP (when PGY3 residents are limited)

### Scheduling Rules:
- No same-day double shifts (prevents 12hr+ shifts like S1+S4)
- No consecutive-day day/night transitions (prevents S1→S4, S1→S5, S2→S5, S5→S2, etc.)
- Consecutive night shifts are allowed
- Dedicated night shift workers (residents assigned night shifts work nights all month)
- No minimum coverage requirement
- PTO and Request days are always respected

## Troubleshooting

### Menu Not Appearing
- Refresh the page
- Close and reopen the spreadsheet
- Check that the script was saved properly

### "Violation" in Validation Columns
- **Shift Check**: Resident has too many shifts for their class
- **60hrs Check**: Resident exceeds 60 hours in a 7-day window
- **PTO Violation**: Not enough blank days to cover PTO requirements

### Not Enough Coverage
- The scheduler prioritizes constraint compliance over coverage
- If there aren't enough eligible residents, some shifts may remain unfilled
- Consider adjusting PTO/Request days or resident assignments

### Script Authorization Issues
- Make sure you're the owner of the spreadsheet
- Try authorizing from a different browser
- Check your Google account security settings

## Getting Help

Click **Resident Scheduler > Help** in the menu for quick reference.

For detailed constraint information, see `VALIDATION_FORMULAS.md`.

# Resident Scheduler

A Google Sheets-based automated scheduling system for resident physicians that ensures compliance with work hour regulations, shift limits, and institutional constraints.

## Overview

This system automates the complex task of scheduling resident shifts across multiple hospital sites while respecting:
- Individual PTO and time-off requests
- Class-based shift limits (PGY1, PGY2, PGY3, IM)
- ACGME work hour regulations (60-hour rule)
- Site-specific requirements
- Wednesday conference schedules
- Balanced shift distribution

## Features

### ✨ Automated Scheduling
- One-click shift assignment for the entire month
- Intelligent constraint-based algorithm
- Prioritizes PGY3 residents for coverage
- Balances day and night shifts
- Prevents scheduling conflicts

### ✅ Real-Time Validation
- Three validation checks per resident
- Instant feedback on violations
- Detailed violation reporting
- Formula-based compliance checking

### 🎯 Constraint Enforcement
- **Shift Limits**: Enforces max shifts by class (PGY1: 15, PGY2: 14, PGY3: 13, IM: 15)
- **Chief Reduction**: Automatically reduces shifts by 2 for Chief residents
- **60-Hour Rule**: Prevents >60 hours in any 7-day period
- **Wednesday Conference**: Blocks day shifts on Wednesdays
- **Class Diversity**: Ensures at least one resident from each class (PGY1, PGY2, PGY3) on every shift
- **Site Restrictions**: Dyer and CP prefer PGY3 residents
- **PTO Compliance**: Ensures adequate time off for PTO days
- **No Imbalanced Distribution**: Prevents same-day shifts AND consecutive-day day/night transitions (e.g., S1→S4, S1→S5, S2→S5, S5→S2)
- **Dedicated Night Workers**: Residents assigned to night shifts work nights all month

### 🔧 User-Friendly Interface
- Custom menu in Google Sheets
- No coding required for daily use
- Clear validation messages
- Easy manual override capability

## Quick Start

1. **Install**: Copy `scheduler.gs` into Google Apps Script (Extensions > Apps Script)
2. **Setup**: Run "Setup Validation Formulas" from the Resident Scheduler menu
3. **Prepare**: Enter PTO and Request days in your schedule
4. **Schedule**: Click "Auto-Schedule Shifts"
5. **Validate**: Review validation columns for any violations

See `QUICK_START_GUIDE.md` for detailed 5-minute setup instructions.

## Documentation

- **`QUICK_START_GUIDE.md`**: 5-minute setup and daily usage
- **`SETUP_INSTRUCTIONS.md`**: Detailed installation and configuration
- **`VALIDATION_FORMULAS.md`**: Technical details on validation logic
- **`scheduler.gs`**: The Google Apps Script source code

## System Requirements

- Google Sheets (any plan, including free)
- Google account with script authorization
- Modern web browser

## Spreadsheet Structure

### Required Columns:
- **B**: Resident Names (rows 7-31)
- **C**: Hospital Site (Oly, Dyer, CP)
- **D-AE**: Schedule Days (28 days)
- **AF**: Rank (C for Chief, blank otherwise)
- **AG**: Class (PGY1, PGY2, PGY3, IM)
- **AH**: Shift Check (auto-created)
- **AI**: 60hrs Check (auto-created)
- **AJ**: PTO Violation (auto-created)

### Required Rows:
- **3**: Dates
- **4**: Day names
- **6**: Headers
- **7-31**: Resident data

## Shift Types

### Olympia (Oly)
- **S1**: 6:00-18:00 (Day)
- **S2**: 7:00-19:00 (Day)
- **S3**: 10:00-22:00 (Day)
- **S4**: 18:00-6:00 (Night)
- **S5**: 19:00-7:00 (Night)

### Dyer
- **S1**: 10:00-22:00 (Day, PGY3 only)

### CP
- **S1**: 10:00-21:00 (Day, PGY3 only)

## Scheduling Algorithm

The auto-scheduler uses a constraint-based approach:

1. **Load Data**: Reads resident information, sites, classes, and existing PTO/Requests
2. **Prioritize**: Sorts residents (PGY3 first for coverage requirements)
3. **Iterate**: For each day and shift:
   - Find eligible residents (site match, not on PTO, within limits)
   - Check 60-hour rule compliance
   - Verify no same-day conflicts
   - Prefer PGY3 for Dyer/CP
   - Balance day/night shifts
4. **Assign**: Assign shift to best candidate
5. **Validate**: Check all constraints after completion

## Constraints & Rules

### Shift Limits by Class
| Class | Max Shifts | Chief Max |
|-------|-----------|-----------|
| PGY1  | 15        | N/A       |
| PGY2  | 14        | N/A       |
| PGY3  | 13        | 11        |
| IM    | 15        | N/A       |

### Work Hour Regulations
- Maximum 60 hours in any 7-consecutive-day period
- Each shift = 12 hours
- PTO and Request days excluded from hour calculations

### Wednesday Conference
- No day shifts allowed (S1, S2, S3)
- Night shifts permitted (S4, S5)
- Residents on night shift Tuesday night excused from conference

### Site Requirements
- **Oly**: All classes eligible, all shifts available
- **Dyer**: All classes eligible (PGY3 preferred), S1 shift only
- **CP**: All classes eligible (PGY3 preferred), S1 shift only
- **Priority**: When PGY3 limited: Oly > Dyer > CP

### Scheduling Rules
- Residents only work at assigned site
- At least one resident from each class (PGY1, PGY2, PGY3) on every shift
- No same-day double shifts (prevents 12hr+ shifts)
- No consecutive-day day/night transitions (prevents S1→S4, S1→S5, S2→S5, S5→S2, etc.)
- Consecutive night shifts allowed
- Dedicated night shift workers (residents assigned night shifts work nights all month)
- Multiple residents can be assigned to the same shift
- PTO and Request days always respected

## Menu Options

### Auto-Schedule Shifts
Automatically assigns shifts for the entire month while respecting all constraints.

### Clear All Schedules
Removes all shift assignments but preserves PTO and Request entries.

### Validate Schedule
Checks current schedule for violations and displays a summary report.

### Setup Validation Formulas
Creates the three validation formulas in columns AH, AI, AJ.

### Help
Displays quick reference information.

## Validation Checks

### 1. Shift Check (Column AH)
Ensures resident doesn't exceed max shifts for their class/rank.
- **OK**: Within limit
- **Violation**: Too many shifts assigned

### 2. 60hrs Check (Column AI)
Verifies no 7-day period exceeds 60 hours.
- **OK**: Compliant with work hour rules
- **Violation**: Exceeds 60 hours in at least one 7-day window

### 3. PTO Violation (Column AJ)
Confirms adequate unscheduled days for PTO.
- **OK**: Sufficient blank days
- **Violation**: Not enough days off for PTO entitlement

## Manual Adjustments

You can manually edit any shift assignment:
1. Click on a cell in the schedule area (columns D-AE)
2. Enter a shift code (S1, S2, S3, S4, S5) or leave blank
3. Enter "PTO" or "Request" for time off
4. Run "Validate Schedule" to check compliance

The validation formulas automatically update as you make changes.

## Troubleshooting

### Menu Not Appearing
- Refresh the page and wait 10-15 seconds
- Verify the script was saved in Apps Script
- Check browser console for errors

### Authorization Issues
- Ensure you're the spreadsheet owner
- Try a different browser
- Check Google account security settings
- Follow the "unsafe" prompts (your script is safe)

### Violations After Auto-Schedule
- Constraints may be too restrictive
- Review PTO/Request distribution
- Consider adjusting resident site assignments
- Manually adjust and re-validate

### Insufficient Coverage
- No minimum coverage enforced by design
- Scheduler prioritizes compliance over coverage
- Manually assign additional shifts if needed
- Validate after manual changes

### Script Errors
- Check that all required columns exist
- Verify data format (exact values: "C", "PGY1", "Oly", etc.)
- Ensure rows 7-31 are used for residents
- Check Apps Script execution log (View > Logs)

## Best Practices

1. **Setup Once**: Install script and validation formulas once per sheet
2. **Monthly Routine**: 
   - Update dates and days
   - Enter PTO/Requests
   - Run auto-scheduler
   - Validate results
   - Make manual adjustments if needed
3. **Validate Often**: Run validation after any manual changes
4. **Fix Violations Immediately**: Don't accumulate violations
5. **Balance PTO**: Spread PTO throughout the month for better scheduling
6. **Review Coverage**: Check that critical shifts are covered

## Technical Details

### Technology Stack
- **Platform**: Google Sheets
- **Language**: Google Apps Script (JavaScript)
- **Formulas**: Google Sheets formula language
- **Storage**: Google Drive

### Algorithm Complexity
- Time: O(days × shifts × residents)
- Space: O(residents × days)
- Typical runtime: 2-5 seconds for 25 residents × 28 days

### Limitations
- Maximum 25 residents (rows 7-31)
- Maximum 28 days per month (columns D-AE)
- Requires manual date/day entry
- No multi-month scheduling
- No shift swapping interface

## Future Enhancements

Potential improvements (not currently implemented):
- Multi-month scheduling
- Shift swap requests
- Mobile app interface
- Email notifications
- Advanced reporting
- Historical analytics
- Preference-based scheduling

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the documentation files
3. Use the in-app Help menu
4. Check the Apps Script execution log

## License

This is a custom solution built for resident scheduling. Modify as needed for your institution.

## Version

**Version 1.0** - Initial release with full automated scheduling and validation

---

**Built with Google Apps Script for non-technical teams**

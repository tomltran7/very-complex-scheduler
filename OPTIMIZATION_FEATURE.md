# Day/Night Balance Optimization Feature

## Overview
A new optimization feature has been added to the Resident Scheduler that analyzes existing schedules and suggests resident swaps to improve day/night shift balance.

## How It Works

### 1. Analysis Phase
- Loads the current schedule from the sheet
- Counts day vs night shifts for each day
- Identifies "problem days" with imbalanced distribution
  - Days with no night coverage (critical issue)
  - Days with ratio > 2.5:1 between day/night shifts

### 2. Candidate Search
- Finds pairs of residents who could be swapped:
  - One day worker (primarily S1/S2 shifts)
  - One night worker (primarily S4/S5 shifts)
  - Same site (Oly ↔ Oly only)
  - Same class (PGY1 ↔ PGY1, PGY2 ↔ PGY2, etc.)
  - Similar shift counts (within 3 shifts)

### 3. Validation
For each potential swap, validates:
- No PTO/Request conflicts
- 60-hour rule still satisfied
- Improvement in distribution balance

### 4. Recommendation
- Selects the best swap based on improvement score
- Shows before/after comparison
- Allows user to approve or reject

## How to Use

1. **Run initial scheduling:**
   - Use "Auto-Schedule Shifts" from the menu
   - Review the generated schedule

2. **Check distribution warnings:**
   - Look at rows 32-34 for day/night counts and warnings

3. **Run optimization:**
   - Click "Resident Scheduler" → "Optimize Day/Night Balance"
   - Review the suggested swap
   - Click "Yes" to apply or "No" to keep current schedule

4. **Iterate if needed:**
   - Run the optimization multiple times
   - Each run finds the best single swap opportunity
   - Stop when no more improvements are found

## Example Output

```
Found optimization opportunity!

Swap: Carter ↔ Armando

Carter: 14 nights → 15 nights
Armando: 15 nights → 14 nights

Problem days before: 6
Problem days after: 2
Improvement score: +4.0

Apply this swap?
```

## Constraints Maintained

The optimization ensures:
- ✅ No PTO/Request violations
- ✅ 60-hour rule respected
- ✅ Class balance maintained (PGY1↔PGY1, etc.)
- ✅ Similar workload (within 3 shifts)
- ✅ Same site only (no Oly↔Dyer swaps)

## Limitations

1. **Full month swap only:** Swaps the entire schedule for both residents (not individual days)
2. **Same class requirement:** Only swaps residents of the same training level
3. **Single swap per run:** Finds one optimal swap per execution
4. **Oly residents only:** Currently only works for Olympia site residents
5. **Post-scheduling only:** Must have an existing schedule to optimize

## Tips for Best Results

1. **Run after initial scheduling** - Don't manually edit the schedule before optimization
2. **Check logs** - View execution logs (Ctrl+Enter in Apps Script editor) for detailed swap analysis
3. **Multiple iterations** - Run 2-3 times to apply multiple beneficial swaps
4. **Review validation columns** - Verify all checks still pass after optimization

## Technical Details

### Balance Threshold
A day is considered "balanced" if:
- Ratio ≤ 2.5:1 (day:night or night:day)
- At least 1 shift of each type (exceptions: Wednesday can be night-only)

### Improvement Score
```
Score = (Problem days before) - (Problem days after)
```
Higher scores = better improvement

### Swap Selection Priority
1. Highest improvement score
2. Fewest problem days remaining
3. First valid candidate (if tied)

## Future Enhancements (Potential)

- Support for partial swaps (individual days instead of full month)
- Multi-resident swaps (A→B→C→A rotation)
- Cross-site optimization (if operationally viable)
- Automatic multi-swap optimization
- Distribution target customization (adjust 2.5:1 threshold)

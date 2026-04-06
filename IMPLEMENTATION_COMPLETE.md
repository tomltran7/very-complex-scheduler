# Smart Rebalancing Algorithm - Implementation Summary

## Implementation Complete ✅

### New Functions Added

1. **isWednesday(dayIndex, dates)**
   - Checks if a day is Wednesday (no day shifts allowed)
   - Handles various Wednesday name formats

2. **getOlyResidents(residents)**
   - Filters residents to OLY site only
   - Critical for duplicate detection scope

3. **wouldDropBelowMinimum(dayIndex, shiftToRemove, sheet, residents, dates)**
   - Validates minimum coverage before removing shifts
   - Regular days: 2 day + 2 night = 4 total
   - Wednesday: 2 night + 0 day = 2 total

4. **findDay1ReductionMove()**
   - Strategy 1: Special handling for Day 1
   - Moves excess night shifts from Day 1 to days 7-28
   - Validates Wednesday and minimum coverage constraints

5. **findDuplicateShiftMove()**
   - Strategy 2: Fixes duplicate shift types (OLY site only)
   - Changes shift type AND moves to different day
   - Example: Two S5s on Day 10 → Change one to S4, move to Day 20

6. **findHighToLowMove()**
   - Strategy 3: Balances high days (3+) to low days (0-1)
   - Moves from surplus to deficit
   - Validates all constraints

7. **validateMoveConstraints()**
   - Comprehensive validation:
     * PTO/Request conflicts
     * Wednesday day shift prohibition
     * Minimum coverage protection
     * 60-hour rule
     * Consecutive day/night mixing
   - Returns true/false for move validity

8. **applyMoveToSheet()**
   - Applies move to Google Sheets
   - Handles both standard moves and duplicate fixes

9. **updateDistributionAfterMove()**
   - Updates in-memory distribution after each move
   - Recalculates balance status

### Main Algorithm Flow

```
optimizeDayNightBalance()
├── Load schedule and analyze distribution
├── Identify problem days
├── FOR each pass (max 10):
│   ├── STRATEGY 1: Fix Day 1 (if unbalanced)
│   │   └── Move night shifts from Day 1 to days 7-28
│   ├── STRATEGY 2: Fix duplicates (OLY only)
│   │   └── Change shift type + move to different day
│   └── STRATEGY 3: High→Low balancing
│       └── Move from 3+ days to 0-1 days
└── Report results to user
```

### Constraint Enforcement

| Constraint | Where Enforced | How |
|------------|---------------|-----|
| Wednesday = nights only | validateMoveConstraints() | Check isWednesday() before moving day shifts |
| Minimum 4 shifts/day | wouldDropBelowMinimum() | Count shifts before removal, block if < 2 day or < 2 night |
| OLY site filtering | All strategies | Use getOlyResidents() before counting/moving |
| PTO/Request blocking | validateMoveConstraints() | Check resident.ptoRequests[day] |
| 60-hour rule | validateMoveConstraints() | check60HourRuleForSchedule() |
| No day/night mixing | validateMoveConstraints() | Check adjacent days' shift types |

### Key Differences from Previous Version

**BEFORE (Broken):**
- ❌ Could move day shifts to Wednesday
- ❌ Could drop below minimum coverage
- ❌ Counted duplicates across ALL sites (Dyer, CP, Trauma, etc.)

**AFTER (Fixed):**
- ✅ Wednesday constraint enforced in validateMoveConstraints()
- ✅ Minimum coverage checked in wouldDropBelowMinimum()
- ✅ Duplicates detected ONLY at OLY site via getOlyResidents()

### Automatic Execution

- Runs up to 10 passes automatically
- Stops when no more valid moves found
- Applies moves immediately to sheet
- Logs all actions for debugging
- Reports final results with before/after comparison

### User Interface

**Dialog Message:**
```
Optimize Day/Night Balance

This will automatically rebalance the schedule:
• Move shifts from high days (3+) to low days (0-1)
• Fix duplicate shift types (OLY site only)
• Maintain minimum 4 shifts/day (2 day + 2 night)
• Respect Wednesday constraint (nights only)
• Extra effort on Day 1

Continue?
```

**Result Message:**
```
Optimization Complete!

Moves applied: 15
Problem days before: 8
Problem days after: 1

Remaining issues:
  Day 0: 2/3 (limited by PTO/Requests)

Changes made:
[DAY 1] Bakheshi: Day 0→15 (S5)
[DUPLICATE] Carter: Day 10 (S5→S4)→Day 20
[BALANCE] Ellis: Day 5→18 (S2)
...and 12 more
```

## Files Modified

- `scheduler.gs`: Complete rewrite of optimizeDayNightBalance() and helper functions

## Testing Recommended

1. **Scenario: Wednesday Protection**
   - Start: Day 10 (Wed) has 0 day / 2 night
   - Try: Move S2 from another day → Day 10
   - Expected: BLOCKED

2. **Scenario: Minimum Coverage**
   - Start: Day 5 has 2 day / 2 night (minimum)
   - Try: Move S5 from Day 5 to Day 20
   - Expected: BLOCKED (would drop below 2 nights)

3. **Scenario: OLY Filtering**
   - Day 12: Bakheshi (OLY) S5, Carter (OLY) S5, Kandula (Dyer) S1
   - Expected: Duplicate detected (2 S5s at OLY)
   - Expected: Kandula ignored (different site)

## Next Steps

1. ✅ Run optimization on output-7-automated.csv
2. ✅ Verify Wednesday stays night-only
3. ✅ Verify no days drop below 4 shifts
4. ✅ Compare results to output-7-manual.csv
5. ✅ Commit changes if successful

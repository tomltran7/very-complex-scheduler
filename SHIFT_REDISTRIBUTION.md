# Shift Redistribution Optimization

## Overview
The enhanced optimization feature now includes **shift redistribution** - a smarter way to balance day/night distribution by moving individual shifts from the front to the back of the month, rather than swapping entire resident schedules.

## How It Works

### Two-Phase Optimization

**Phase 1: Shift Redistribution** (NEW)
- Moves individual shifts from early days (first half) to later days (second half)
- Targets days close to optimal ratios: 2/3, 3/2, 2/2, or 3/3
- Less disruptive than full resident swaps
- Maintains all constraints

**Phase 2: Full Resident Swaps** (Existing)
- Falls back to swapping entire month schedules
- Used when shift redistribution can't fix the issue
- Swaps day worker ↔ night worker

### Optimal Ratios
The system aims for these day/night balances:
- **2/3** - 2 day shifts, 3 night shifts
- **3/2** - 3 day shifts, 2 night shifts  
- **2/2** - 2 day shifts, 2 night shifts (perfectly balanced)
- **3/3** - 3 day shifts, 3 night shifts (higher volume, balanced)

### Algorithm

1. **Identify imbalanced days** using row 34 warnings
2. **Find source days** (first half) with too many of one shift type
3. **Find target days** (second half) that need that shift type
4. **Validate moves**:
   - No PTO conflicts
   - No consecutive day/night mixing
   - 60-hour rule maintained
   - Moving helps both source and target days
5. **Calculate improvement score**:
   - Problem days reduced × 10
   - Distance from optimal ratios improved
6. **Apply best move**

## Example Scenarios

### Scenario 1: Excess Night Shifts in First Half

**Current state:**
- Day 5: 1 day / 5 nights ⚠️ (too many nights)
- Day 22: 3 days / 1 night ⚠️ (too few nights)

**Solution:**
- Move a night shift from Day 5 to Day 22
- Resident working S5 on Day 5 gets moved to Day 22
- Result: Day 5 = 1/4, Day 22 = 3/2 ✓

### Scenario 2: Minor Imbalance

**Current state:**
- Day 3: 2 days / 4 nights ⚠️ (off by 1-2 from optimal)
- Day 25: 4 days / 2 nights ⚠️ (off by 1-2 from optimal)

**Solution:**
- Move night shift from Day 3 → Day 25
- Result: Day 3 = 2/3 ✓, Day 25 = 4/3 (improved)

## Constraints Maintained

✅ **No PTO conflicts** - Never moves shifts on PTO days  
✅ **60-hour rule** - Validates entire schedule after move  
✅ **No day/night mixing** - Cannot create consecutive day→night or night→day patterns  
✅ **Shift type consistency** - Same shift type at source and destination  
✅ **Site restrictions** - Only works within same site (Oly)

## Validation Rules

### Consecutive Day Conflicts
A shift move is **invalid** if it creates:
- Day shift → Night shift (e.g., S2 on day X, then S5 on day X+1)
- Night shift → Day shift (e.g., S5 on day X, then S2 on day X+1)

### Example: Valid Move
```
Before:  Day 5: S5  | Day 6: (blank) | Day 7: S5
After:   Day 5: (blank) | Day 6: (blank) | Day 7: S5, Day 22: S5
✓ Valid - No consecutive conflicts
```

### Example: Invalid Move
```
Before:  Day 5: S5 | Day 6: S2 | Day 7: (blank)
Try:     Move Day 5 S5 → Day 7
After:   Day 5: (blank) | Day 6: S2 | Day 7: S5
✗ Invalid - Creates S2→S5 consecutive conflict
```

## Improvement Scoring

```
Total Score = (Problem Days Reduced × 10) + Distance Improvement

Where:
- Problem Days Reduced = count of days that move from Warning → OK
- Distance Improvement = how much closer to optimal ratios (2/3, 3/2, 2/2, 3/3)
```

**Example:**
- Before: 6 problem days, source day distance = 2, target day distance = 2
- After: 4 problem days, source day distance = 1, target day distance = 0
- Score = (6-4)×10 + (2+2)-(1+0) = 20 + 3 = **23 points**

## User Experience

### Output Example
```
Found shift redistribution opportunity!

Move: Carter
From: Day 5 (S5) → Day 22 (S5)

Day 5: 1/5 → 1/4
Day 22: 3/1 → 3/2

Problem days before: 6
Problem days after: 4
Improvement score: +23.0

Apply this shift move?
```

### When to Use

Run "Optimize Day/Night Balance" after initial scheduling. The system will:
1. **First** try shift redistribution (individual moves)
2. **If no good moves found**, try full resident swaps
3. **If no improvements possible**, notify user

You can run it **multiple times** to apply several optimizations iteratively.

## Advantages Over Full Swaps

| Feature | Shift Redistribution | Full Resident Swap |
|---------|---------------------|-------------------|
| Disruption | Low (1 shift moved) | High (entire month swapped) |
| Precision | Targets specific problem days | Global effect |
| Constraints | Easier to maintain | More complex validation |
| Typical Use | Minor imbalances | Major structural issues |
| Iterations | Can run many times | Limited by resident pool |

## Limitations

1. **First half → Second half only** - Only moves shifts forward in time
2. **Same shift type** - Doesn't change S5 to S4, etc.
3. **One shift at a time** - Each run moves one shift
4. **Requires problem days in both halves** - Needs source and target days

## Tips for Best Results

1. **Run multiple times** - Each run handles one move, iterate for multiple improvements
2. **Review logs** - Check Apps Script logs for detailed analysis
3. **Validate after each run** - Ensure all checks still pass
4. **Combine with swaps** - If redistribution doesn't fully resolve, use Phase 2 swaps

## Technical Implementation

### Key Functions
- `findShiftRedistributionMoves()` - Searches for valid moves
- `validateShiftMove()` - Checks all constraints
- `calculateShiftMoveImprovement()` - Scores each potential move
- `getDistanceFromOptimal()` - Calculates deviation from ideal ratios
- `applyShiftMove()` - Applies the move to the sheet

### Performance
- Evaluates all possible moves (typically 50-200 candidates)
- Finds best move in <5 seconds for typical schedules
- Validation ensures no constraint violations

## Future Enhancements

- Multi-shift moves (move 2-3 shifts in one operation)
- Bi-directional moves (back-to-front when beneficial)
- Cross-site optimization (if operationally viable)
- Smart batching (apply multiple compatible moves together)
- Predictive scoring (suggest optimal target state)

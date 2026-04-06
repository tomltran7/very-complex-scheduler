# Re-Evaluation: Smart Rebalancing Algorithm

## Issues Identified

### Issue 1: Wednesday Constraint Not Enforced
**Problem:** Optimization was potentially adding day shifts to Wednesday  
**Constraint:** Wednesday can ONLY have night shifts (S4/S5), NO day shifts (S1/S2)  
**Fix Needed:** Check if target day is Wednesday before moving day shifts

### Issue 2: Minimum Coverage Misunderstood
**Problem:** Did not enforce minimum 4-shift coverage  
**Constraint:** Every day (except Wednesday) must have:
- Minimum 2 day shifts: S1 (1) + S2 (1) = 2 people
- Minimum 2 night shifts: S4 (1) + S5 (1) = 2 people
- Total minimum: 4 shifts per day

**Wednesday exception:**
- Minimum 2 night shifts: S4 (1) + S5 (1) = 2 people
- No day shifts allowed

**Fix Needed:** Validate that moving a shift doesn't drop below minimum coverage

### Issue 3: Duplicate Check Scope Too Broad
**Problem:** Duplicate detection checked ALL residents (including Dyer, CP, Trauma, etc.)  
**Correct Scope:** Should ONLY check residents assigned to OLY site  
**Reason:** Other sites have different schedules and shouldn't be counted

**Fix Needed:** Filter residents by site === 'Oly' before counting duplicates

## Corrected Requirements

### Constraint Checklist
1. ✅ PTO/Request conflicts blocked
2. ✅ 60-hour rule enforced
3. ✅ No consecutive day/night mixing
4. ✅ **Wednesday: No day shifts allowed** (NEW)
5. ✅ **Minimum coverage: 4 shifts/day (2 day + 2 night)** (NEW)
6. ✅ **Duplicate check: OLY site only** (NEW)

### Site-Specific Scheduling
- **OLY**: Multiple residents, needs duplicate checking
- **Dyer**: Single S1 shift, no duplicates possible
- **CP**: Single S1 shift, no duplicates possible
- **Other sites**: (Trauma, ICU, etc.) Not scheduled in this system

### Day Types
1. **Regular Days (Mon, Tue, Thu-Sun):**
   - Minimum: S1(1) + S2(1) + S4(1) + S5(1) = 4 shifts
   - Additional: More S2s and S5s for reserves
   - Target ratios: 2/2, 2/3, 3/2, 3/3

2. **Wednesday:**
   - Minimum: S4(1) + S5(1) = 2 shifts
   - NO day shifts (S1, S2, S3 forbidden)
   - Target ratios: 0/2, 0/3

## Strategy Re-Design

### Strategy 1: Day 1 Special Handling
```javascript
findDay1ReductionMove() {
  // Find OLY night shifts on Day 1
  for resident in OLY_RESIDENTS {
    if resident has S4 or S5 on Day 1:
      for targetDay in 7-28:
        // CHECK: Is targetDay Wednesday?
        if targetDay is Wednesday:
          continue // Can still move nights to Wednesday
        
        // CHECK: Will Day 1 drop below minimum?
        if (Day 1 night shifts == 2):
          continue // Can't remove, would drop below minimum
        
        // Validate and apply move
  }
}
```

### Strategy 2: Duplicate Shift Detection (CORRECTED)
```javascript
findDuplicateShiftMove() {
  for problem in problemDays:
    day = problem.index
    
    // FILTER: Only OLY residents
    olyResidents = residents.filter(r => r.site === 'Oly')
    
    // Count shifts for OLY residents only
    shiftCounts = {S1:0, S2:0, S3:0, S4:0, S5:0}
    for resident in olyResidents:
      shift = getShift(resident, day)
      shiftCounts[shift]++
    
    // Find duplicates (2+ of same type)
    for shiftType with count >= 2:
      // Change one and move
      newShiftType = alternate(shiftType) // S5→S4, S4→S5, etc.
      
      // Find target day
      for targetDay in problemDays:
        // CHECK: Is targetDay Wednesday?
        if targetDay is Wednesday AND newShiftType is day shift:
          continue // Can't move day shift to Wednesday
        
        // CHECK: Will source day drop below minimum?
        if removingThisShiftDropsBelowMinimum(day, shiftType):
          continue
        
        // Validate and apply
  }
}
```

### Strategy 3: High-to-Low Balancing (CORRECTED)
```javascript
findHighToLowMove() {
  highDays = days with 3+ of one type
  lowDays = days with 0-1 of one type
  
  for highDay in highDays:
    for resident in OLY_RESIDENTS: // Filter by site
      shift = getShift(resident, highDay)
      
      // CHECK: Will removing drop below minimum?
      if (highDay has 2 day shifts AND shift is day shift):
        continue // Can't remove, minimum 2 day shifts required
      if (highDay has 2 night shifts AND shift is night shift):
        continue // Can't remove, minimum 2 night shifts required
      
      for lowDay in lowDays:
        // CHECK: Is lowDay Wednesday?
        if lowDay is Wednesday AND shift is day shift:
          continue // Can't add day shift to Wednesday
        
        // Validate and apply
  }
}
```

## Validation Functions Needed

### 1. isWednesday(dayIndex, dates)
```javascript
function isWednesday(dayIndex, dates) {
  const dayName = dates[dayIndex].dayName.toLowerCase();
  return dayName === 'wed' || dayName === 'wednesday' || dayName.startsWith('wed');
}
```

### 2. wouldDropBelowMinimum(day, shiftToRemove, sheet)
```javascript
function wouldDropBelowMinimum(day, shiftToRemove, sheet, residents) {
  // Count current shifts on this day (OLY only)
  let dayCounts = {S1: 0, S2: 0};
  let nightCounts = {S4: 0, S5: 0};
  
  for resident in OLY_RESIDENTS:
    shift = getShift(resident, day);
    if shift in [S1, S2]: dayCounts[shift]++;
    if shift in [S4, S5]: nightCounts[shift]++;
  
  // Check if removing this shift drops below minimum
  if shiftToRemove in [S1, S2]:
    totalDay = dayCounts[S1] + dayCounts[S2];
    if totalDay - 1 < 2: return true; // Would drop below 2 day shifts
  
  if shiftToRemove in [S4, S5]:
    totalNight = nightCounts[S4] + nightCounts[S5];
    if totalNight - 1 < 2: return true; // Would drop below 2 night shifts
  
  return false;
}
```

### 3. getOlyResidents(residents)
```javascript
function getOlyResidents(residents) {
  return residents.filter(r => r.site === 'Oly');
}
```

## Testing Checklist

Before re-implementing, test scenarios:

### Scenario 1: Wednesday Protection
```
Initial: Day 10 (Wed) has 0 day / 2 night
Action: Try to move S2 from Day 11 → Day 10
Expected: BLOCKED (Wednesday can't have day shifts)
```

### Scenario 2: Minimum Coverage Protection
```
Initial: Day 5 has S1(1), S2(1), S4(1), S5(2) = 2 day / 3 night
Action: Try to move S5 from Day 5 → Day 20
Check: Day 5 still has 2 nights after move?
  - After: S4(1), S5(1) = 2 nights ✓ OK to proceed
```

```
Initial: Day 8 has S1(1), S2(1), S4(1), S5(1) = 2 day / 2 night (minimum)
Action: Try to move S5 from Day 8 → Day 15
Check: Day 8 would have only 1 night after
Expected: BLOCKED (drops below minimum)
```

### Scenario 3: OLY Site Filtering
```
Day 12 has:
- Bakheshi (OLY): S5
- Carter (OLY): S5  
- Kandula (Dyer): S1
- Nguyen (CP): S1

Duplicate check should find:
- S5 duplicate at OLY (Bakheshi + Carter)

Duplicate check should NOT consider:
- Kandula (Dyer site)
- Nguyen (CP site)
```

## Recommended Implementation Approach

1. **First:** Add validation functions
   - isWednesday()
   - wouldDropBelowMinimum()
   - getOlyResidents()

2. **Second:** Update each strategy function
   - Add Wednesday checks
   - Add minimum coverage checks
   - Filter by OLY site

3. **Third:** Test with output7-automated.csv
   - Verify Wednesday stays night-only
   - Verify no days drop below 4 shifts
   - Verify duplicates only detected at OLY

4. **Fourth:** Compare to manual output
   - Should achieve similar results (8→1 warnings)
   - Day 1 may remain problematic (PTO limits)

## Summary of Changes Needed

| Component | Issue | Fix |
|-----------|-------|-----|
| All strategies | No Wednesday check | Add isWednesday() validation |
| All strategies | No minimum check | Add wouldDropBelowMinimum() validation |
| Duplicate detection | Checks all sites | Filter to getOlyResidents() only |
| Strategy functions | Process all residents | Filter to OLY site in loops |

Should I proceed with implementing these corrections?

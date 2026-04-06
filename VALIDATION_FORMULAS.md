# Validation Formulas Reference

## Overview
This document explains the three validation formulas used to ensure scheduling compliance. These formulas are automatically created in columns AH, AI, and AJ when you run "Setup Validation Formulas" from the menu.

## Formula 1: Shift Check (Column AH)

### Purpose
Validates that each resident does not exceed their maximum allowed shifts per month based on their class and rank.

### Formula
```
=IF(COUNTIF(D7:AE7,"<>")-COUNTIF(D7:AE7,"PTO")-COUNTIF(D7:AE7,"Request")>IF(AF7="C",11,IF(AG7="PGY3",13,IF(AG7="PGY2",14,IF(OR(AG7="PGY1",AG7="IM"),15,15)))),"Violation","OK")
```

### How It Works
1. **Count Total Shifts**: `COUNTIF(D7:AE7,"<>")` counts all non-empty cells in the schedule row
2. **Subtract PTO Days**: `COUNTIF(D7:AE7,"PTO")` removes PTO days from the count
3. **Subtract Request Days**: `COUNTIF(D7:AE7,"Request")` removes Request days from the count
4. **Calculate Max Allowed**: 
   - If Rank (AF7) = "C" (Chief): 11 shifts (13 - 2 for chief reduction)
   - If Class (AG7) = "PGY3": 13 shifts
   - If Class (AG7) = "PGY2": 14 shifts
   - If Class (AG7) = "PGY1" or "IM": 15 shifts
5. **Compare**: If actual shifts > max allowed, return "Violation", otherwise "OK"

### Max Shift Limits
| Class | Base Max | Chief Max |
|-------|----------|-----------|
| PGY1  | 15       | N/A       |
| PGY2  | 14       | N/A       |
| PGY3  | 13       | 11        |
| IM    | 15       | N/A       |

**Note**: Only PGY3 residents can be Chiefs, which reduces their max by 2 shifts.

## Formula 2: 60-Hour Check (Column AI)

### Purpose
Ensures that no resident works more than 60 hours in any 7-consecutive-day period throughout the month.

### Formula
```
=IF(OR(
  (COUNTIF(D7:J7,"<>")-COUNTIF(D7:J7,"PTO")-COUNTIF(D7:J7,"Request"))*12>60,
  (COUNTIF(E7:K7,"<>")-COUNTIF(E7:K7,"PTO")-COUNTIF(E7:K7,"Request"))*12>60,
  (COUNTIF(F7:L7,"<>")-COUNTIF(F7:L7,"PTO")-COUNTIF(F7:L7,"Request"))*12>60,
  (COUNTIF(G7:M7,"<>")-COUNTIF(G7:M7,"PTO")-COUNTIF(G7:M7,"Request"))*12>60,
  (COUNTIF(H7:N7,"<>")-COUNTIF(H7:N7,"PTO")-COUNTIF(H7:N7,"Request"))*12>60,
  (COUNTIF(I7:O7,"<>")-COUNTIF(I7:O7,"PTO")-COUNTIF(I7:O7,"Request"))*12>60,
  (COUNTIF(J7:P7,"<>")-COUNTIF(J7:P7,"PTO")-COUNTIF(J7:P7,"Request"))*12>60,
  (COUNTIF(K7:Q7,"<>")-COUNTIF(K7:Q7,"PTO")-COUNTIF(K7:Q7,"Request"))*12>60,
  (COUNTIF(L7:R7,"<>")-COUNTIF(L7:R7,"PTO")-COUNTIF(L7:R7,"Request"))*12>60,
  (COUNTIF(M7:S7,"<>")-COUNTIF(M7:S7,"PTO")-COUNTIF(M7:S7,"Request"))*12>60,
  (COUNTIF(N7:T7,"<>")-COUNTIF(N7:T7,"PTO")-COUNTIF(N7:T7,"Request"))*12>60,
  (COUNTIF(O7:U7,"<>")-COUNTIF(O7:U7,"PTO")-COUNTIF(O7:U7,"Request"))*12>60,
  (COUNTIF(P7:V7,"<>")-COUNTIF(P7:V7,"PTO")-COUNTIF(P7:V7,"Request"))*12>60,
  (COUNTIF(Q7:W7,"<>")-COUNTIF(Q7:W7,"PTO")-COUNTIF(Q7:W7,"Request"))*12>60,
  (COUNTIF(R7:X7,"<>")-COUNTIF(R7:X7,"PTO")-COUNTIF(R7:X7,"Request"))*12>60,
  (COUNTIF(S7:Y7,"<>")-COUNTIF(S7:Y7,"PTO")-COUNTIF(S7:Y7,"Request"))*12>60,
  (COUNTIF(T7:Z7,"<>")-COUNTIF(T7:Z7,"PTO")-COUNTIF(T7:Z7,"Request"))*12>60,
  (COUNTIF(U7:AA7,"<>")-COUNTIF(U7:AA7,"PTO")-COUNTIF(U7:AA7,"Request"))*12>60,
  (COUNTIF(V7:AB7,"<>")-COUNTIF(V7:AB7,"PTO")-COUNTIF(V7:AB7,"Request"))*12>60,
  (COUNTIF(W7:AC7,"<>")-COUNTIF(W7:AC7,"PTO")-COUNTIF(W7:AC7,"Request"))*12>60,
  (COUNTIF(X7:AD7,"<>")-COUNTIF(X7:AD7,"PTO")-COUNTIF(X7:AD7,"Request"))*12>60,
  (COUNTIF(Y7:AE7,"<>")-COUNTIF(Y7:AE7,"PTO")-COUNTIF(Y7:AE7,"Request"))*12>60
),"Violation","OK")
```

### How It Works
1. **Check Each 7-Day Window**: The formula checks 22 different 7-day windows:
   - Days 1-7 (D7:J7)
   - Days 2-8 (E7:K7)
   - Days 3-9 (F7:L7)
   - ... and so on through Days 22-28 (Y7:AE7)

2. **For Each Window**:
   - Count shifts (non-empty cells)
   - Subtract PTO and Request days
   - Multiply by 12 (hours per shift)
   - Check if total > 60 hours

3. **Result**: If ANY window exceeds 60 hours, return "Violation", otherwise "OK"

### Example
If a resident works 6 shifts in days 5-11:
- 6 shifts × 12 hours = 72 hours
- 72 > 60 → **Violation**

If a resident works 5 shifts in days 5-11:
- 5 shifts × 12 hours = 60 hours
- 60 ≤ 60 → **OK**

## Formula 3: PTO Violation (Column AJ)

### Purpose
Ensures that residents have enough unscheduled days to properly account for their PTO usage.

### Formula
```
=IF(COUNTBLANK(D7:AE7)>=ROUND(COUNTIF(D7:AE7,"PTO")*8/12,0),"OK","Violation")
```

### How It Works
1. **Count PTO Days**: `COUNTIF(D7:AE7,"PTO")` counts how many days are marked as PTO
2. **Calculate Required Off Days**: `COUNTIF(D7:AE7,"PTO")*8/12` 
   - Assumes 8-hour PTO days vs 12-hour shifts
   - Converts PTO days to equivalent shift reductions
   - Rounds to nearest whole number
3. **Count Blank Days**: `COUNTBLANK(D7:AE7)` counts unscheduled days
4. **Compare**: If blank days ≥ required off days, return "OK", otherwise "Violation"

### Example
If a resident has 3 PTO days:
- Required off days = ROUND(3 × 8/12, 0) = ROUND(2, 0) = 2
- If they have 2 or more blank days → **OK**
- If they have fewer than 2 blank days → **Violation**

### Rationale
PTO days are typically 8-hour days, but shifts are 12 hours. This formula ensures that residents get appropriate time off equivalent to their PTO entitlement.

## Applying Formulas to Your Sheet

### Automatic Setup
Run **Resident Scheduler > Setup Validation Formulas** from the menu. This will:
1. Create headers in row 6 for columns AH, AI, AJ
2. Apply formulas to all resident rows (7-31)
3. Adjust row numbers automatically for each resident

### Manual Setup
If you need to add formulas manually:

1. **Column AH (Shift Check)** - Row 7:
   ```
   =IF(COUNTIF(D7:AE7,"<>")-COUNTIF(D7:AE7,"PTO")-COUNTIF(D7:AE7,"Request")>IF(AF7="C",11,IF(AG7="PGY3",13,IF(AG7="PGY2",14,IF(OR(AG7="PGY1",AG7="IM"),15,15)))),"Violation","OK")
   ```

2. **Column AI (60hrs Check)** - Row 7:
   ```
   =IF(OR((COUNTIF(D7:J7,"<>")-COUNTIF(D7:J7,"PTO")-COUNTIF(D7:J7,"Request"))*12>60,(COUNTIF(E7:K7,"<>")-COUNTIF(E7:K7,"PTO")-COUNTIF(E7:K7,"Request"))*12>60,(COUNTIF(F7:L7,"<>")-COUNTIF(F7:L7,"PTO")-COUNTIF(F7:L7,"Request"))*12>60,(COUNTIF(G7:M7,"<>")-COUNTIF(G7:M7,"PTO")-COUNTIF(G7:M7,"Request"))*12>60,(COUNTIF(H7:N7,"<>")-COUNTIF(H7:N7,"PTO")-COUNTIF(H7:N7,"Request"))*12>60,(COUNTIF(I7:O7,"<>")-COUNTIF(I7:O7,"PTO")-COUNTIF(I7:O7,"Request"))*12>60,(COUNTIF(J7:P7,"<>")-COUNTIF(J7:P7,"PTO")-COUNTIF(J7:P7,"Request"))*12>60,(COUNTIF(K7:Q7,"<>")-COUNTIF(K7:Q7,"PTO")-COUNTIF(K7:Q7,"Request"))*12>60,(COUNTIF(L7:R7,"<>")-COUNTIF(L7:R7,"PTO")-COUNTIF(L7:R7,"Request"))*12>60,(COUNTIF(M7:S7,"<>")-COUNTIF(M7:S7,"PTO")-COUNTIF(M7:S7,"Request"))*12>60,(COUNTIF(N7:T7,"<>")-COUNTIF(N7:T7,"PTO")-COUNTIF(N7:T7,"Request"))*12>60,(COUNTIF(O7:U7,"<>")-COUNTIF(O7:U7,"PTO")-COUNTIF(O7:U7,"Request"))*12>60,(COUNTIF(P7:V7,"<>")-COUNTIF(P7:V7,"PTO")-COUNTIF(P7:V7,"Request"))*12>60,(COUNTIF(Q7:W7,"<>")-COUNTIF(Q7:W7,"PTO")-COUNTIF(Q7:W7,"Request"))*12>60,(COUNTIF(R7:X7,"<>")-COUNTIF(R7:X7,"PTO")-COUNTIF(R7:X7,"Request"))*12>60,(COUNTIF(S7:Y7,"<>")-COUNTIF(S7:Y7,"PTO")-COUNTIF(S7:Y7,"Request"))*12>60,(COUNTIF(T7:Z7,"<>")-COUNTIF(T7:Z7,"PTO")-COUNTIF(T7:Z7,"Request"))*12>60,(COUNTIF(U7:AA7,"<>")-COUNTIF(U7:AA7,"PTO")-COUNTIF(U7:AA7,"Request"))*12>60,(COUNTIF(V7:AB7,"<>")-COUNTIF(V7:AB7,"PTO")-COUNTIF(V7:AB7,"Request"))*12>60,(COUNTIF(W7:AC7,"<>")-COUNTIF(W7:AC7,"PTO")-COUNTIF(W7:AC7,"Request"))*12>60,(COUNTIF(X7:AD7,"<>")-COUNTIF(X7:AD7,"PTO")-COUNTIF(X7:AD7,"Request"))*12>60,(COUNTIF(Y7:AE7,"<>")-COUNTIF(Y7:AE7,"PTO")-COUNTIF(Y7:AE7,"Request"))*12>60),"Violation","OK")
   ```

3. **Column AJ (PTO Violation)** - Row 7:
   ```
   =IF(COUNTBLANK(D7:AE7)>=ROUND(COUNTIF(D7:AE7,"PTO")*8/12,0),"OK","Violation")
   ```

4. Copy these formulas down to row 31 for all residents

## Interpreting Results

### All "OK"
Schedule is compliant with all constraints. Good to go!

### "Violation" in Shift Check
- Resident has too many shifts assigned
- Check their class and rank
- Reduce their shift count or verify their classification is correct

### "Violation" in 60hrs Check
- Resident exceeds 60 hours in at least one 7-day window
- Look for clusters of shifts
- Spread out shifts more evenly or reduce total shifts

### "Violation" in PTO Violation
- Not enough blank days to cover PTO
- Either reduce scheduled shifts or verify PTO count is correct
- Remember: 3 PTO days requires ~2 blank days

## Tips for Compliance

1. **Run validation after every change** - Use the "Validate Schedule" menu option
2. **Fix violations immediately** - Don't let them accumulate
3. **Balance shifts** - Spread shifts evenly throughout the month
4. **Use the auto-scheduler** - It's designed to avoid violations
5. **Manual edits** - Be careful when manually adjusting; always validate after

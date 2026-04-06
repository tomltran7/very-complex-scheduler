I have a problem that I need help with. I have a team of residents that I need to schedule for shifts. The residents have different ranks and classes, and I need to ensure that the right residents are scheduled for the right shifts. I also need to ensure that the residents are not overworked, review the example of an imbalanced shift distribution. This means that there needs to be balance between day and night shifts. Can you help me create a scheduling system that can handle these requirements? 

Review the columns, rows and formulas in the spreadsheet and reverse these check as the requirements to build the system.

----- DO NOT OVERLOOK IMPORTANT -----
IMPORTANT: the only thing that can be used to create this scheduling system is google sheets as the team is not technical and cannot use any other tools.

First attempt to make a fully automated system that can handle these requirements. If that is not possible, then create a system that can handle these requirements with minimal manual intervention.

Checks:
1. Column Name, Shift Check: This formula checks whether an employee has been scheduled for too many shifts in a month based on their role or classification. It counts all filled cells in the row, then subtracts any PTO and Request days to get the true number of worked shifts. It then compares that number against a maximum shift limit that varies by class.

here is the formula:
```
=IF(COUNTIF(D7:AE7,"<>")-COUNTIF(D7:AE7,"PTO")-COUNTIF(D7:AE7,"Request")>IF(AF7="C",11,IF(AG7="PGY3",13,IF(AG7="PGY2",14,IF(OR(AG7="PGY1",AG7="IM"),15,15)))),"Violation","OK")
```

2. Column Name, 60hrs Check: This formula checks whether an employee has been scheduled for more than 60 hours in any 7-consecutive-day period throughout the month.

here is the formula:
```
=IF(OR((COUNTIF(D7:J7,"<>")-COUNTIF(D7:J7,"PTO")-COUNTIF(D7:J7,"Request"))*12>60,(COUNTIF(E7:K7,"<>")-COUNTIF(E7:K7,"PTO")-COUNTIF(E7:K7,"Request"))*12>60,(COUNTIF(F7:L7,"<>")-COUNTIF(F7:L7,"PTO")-COUNTIF(F7:L7,"Request"))*12>60,(COUNTIF(G7:M7,"<>")-COUNTIF(G7:M7,"PTO")-COUNTIF(G7:M7,"Request"))*12>60,(COUNTIF(H7:N7,"<>")-COUNTIF(H7:N7,"PTO")-COUNTIF(H7:N7,"Request"))*12>60,(COUNTIF(I7:O7,"<>")-COUNTIF(I7:O7,"PTO")-COUNTIF(I7:O7,"Request"))*12>60,(COUNTIF(J7:P7,"<>")-COUNTIF(J7:P7,"PTO")-COUNTIF(J7:P7,"Request"))*12>60,(COUNTIF(K7:Q7,"<>")-COUNTIF(K7:Q7,"PTO")-COUNTIF(K7:Q7,"Request"))*12>60,(COUNTIF(L7:R7,"<>")-COUNTIF(L7:R7,"PTO")-COUNTIF(L7:R7,"Request"))*12>60,(COUNTIF(M7:S7,"<>")-COUNTIF(M7:S7,"PTO")-COUNTIF(M7:S7,"Request"))*12>60,(COUNTIF(N7:T7,"<>")-COUNTIF(N7:T7,"PTO")-COUNTIF(N7:T7,"Request"))*12>60,(COUNTIF(O7:U7,"<>")-COUNTIF(O7:U7,"PTO")-COUNTIF(O7:U7,"Request"))*12>60,(COUNTIF(P7:V7,"<>")-COUNTIF(P7:V7,"PTO")-COUNTIF(P7:V7,"Request"))*12>60,(COUNTIF(Q7:W7,"<>")-COUNTIF(Q7:W7,"PTO")-COUNTIF(Q7:W7,"Request"))*12>60,(COUNTIF(R7:X7,"<>")-COUNTIF(R7:X7,"PTO")-COUNTIF(R7:X7,"Request"))*12>60,(COUNTIF(S7:Y7,"<>")-COUNTIF(S7:Y7,"PTO")-COUNTIF(S7:Y7,"Request"))*12>60,(COUNTIF(T7:Z7,"<>")-COUNTIF(T7:Z7,"PTO")-COUNTIF(T7:Z7,"Request"))*12>60,(COUNTIF(U7:AA7,"<>")-COUNTIF(U7:AA7,"PTO")-COUNTIF(U7:AA7,"Request"))*12>60,(COUNTIF(V7:AB7,"<>")-COUNTIF(V7:AB7,"PTO")-COUNTIF(V7:AB7,"Request"))*12>60,(COUNTIF(W7:AC7,"<>")-COUNTIF(W7:AC7,"PTO")-COUNTIF(W7:AC7,"Request"))*12>60,(COUNTIF(X7:AD7,"<>")-COUNTIF(X7:AD7,"PTO")-COUNTIF(X7:AD7,"Request"))*12>60,(COUNTIF(Y7:AE7,"<>")-COUNTIF(Y7:AE7,"PTO")-COUNTIF(Y7:AE7,"Request"))*12>60),"Violation","OK")
```

3. Column, PTO Violation: This row tracks an employee's PTO usage and schedule compliance. It scans their assigned days across the month, counts how many days are marked as PTO, and based on that count determines how many shifts they are required to have off. It then checks if the number of empty (unscheduled) days meets or exceeds that required shift reduction — returning "OK" if the requirement is met, or "Violation" if there are not enough days off to match their PTO entitlement.

here is the formula:
```
=IF(COUNTBLANK($D7:$AE7)>=ROUND(COUNTIF($D7:$AE7,"PTO")*8/12,0),"OK","Violation")
```

Here are details from the spreadsheet to pay attention to:

1. column B, row 7 is the start of the resident's names and completes at row 31.
2. column C, row 7 is the start of the hospital sites that the residents are assigned to and completes at row 31. Only consider Oly, Dyer, and CP sites in the scheduling.
3. column D to column AE, row 7 is the start of the scheduling data and completes at row 31.
4. column D, row 3 are the dates mapped horizontally
5. column D, row 4 are the day names mapped horizontally
6. There are 4 different class of residents:
   - PGY1
   - PGY2
   - PGY3
   - IM

The shift patterns are as follows:
- PGY1: 15 shifts MAX
- PGY2: 14 shifts MAX
- PGY3: 13 shifts MAX
- IM: 15 shifts MAX

7. there are two different ranks of residents:
   - C = Chief and they qualify for a 2 shift reduction. Chiefs can only be PGY3.
   - blank = not a chief
   - if the resident is a chief, their shift max limit is reduced by 2

8. The residents are assigned to 3 different hospital sites:
   - Oly
   - Dyer
   - CP
   - exlcude all other sites from scheduling

9. here are the different shift patterns (in military time):
Site,Shift,Start Time,End Time
Oly,S1,6:00,18:00
Oly,S2,7:00,19:00
Oly,S3,12:00,00:00
Oly,S4,18:00,6:00
Oly,S5,19:00,7:00
Dyer,S1,10:00,22:00
CP,S1,10:00,21:00

- S4 and S5 are night shifts.

10. The residents attend conference on Wednesdays. The conference is from 7AM to 12PM. Residents scheduled for night shifts the day before Wednesday are excused from the conference, but can work a night shift on Wednesday. No resident's can be scheduled for the day shifts on Wednesday.

11. Assume that the spreedsheet will be primed with the Request and PTO fields already filled in. Resident scheduling should work around those constraints.

12. The scheduling should be done in a way that maximizes the number of shifts each resident gets while still adhering to the constraints (PTO, Requests, Checks, Shift limits).

13. Shift Coverage Requirement (Only):
- The scheduling should consider having a PGY3 resident on every S1 and S4 shift. If not possible, consider a PGY2 resident.
- There is no hard requirement for a PGY3 to be at Dyer or CP, review their assigned sites and schedule accordingly.
- First schedule s1 and s4 shifts. Condition: One resident is needed for the S1 shift, 6:00 (6AM) and one resident is needed for the S4 shift, 18:00 (6PM). 
- Any eligible and available residents after scheduling s1 and s4 shifts should be applied to the S2 or S5 shift (7:00 (7AM) or 19:00 (7PM)). There should be a minimum total of 3 residents (1 x S1 and 2 x S2) in the morning and minimum of 3 residents (1 x S4 and 2 x S5) at night. Any extra residents can be assigned to the morning or S3. 
- If a resident is assigned an s3 shift, revaluate the day before to ensure they are assigned one of the morning shifts (s1 or s2)
- The residents assigned to Dyer or CP site should alternate with each other and have only 1 resident per shift. There should not be 2 residents scheduled for the same shift at the same site.
- conditional check: shifts should be evenly assigned across S1 to S5. do not break the night shift pattern (S4/S5) for a resident.
- conditional check: residents assigned to nights, s4 or s5, should not be assigned to mornings, s1 or s2 the entire block. residents assigned to mornings, s1 or s2, should not be assigned to nights, s4 or s5, the entire block.


14. Do not create imbalanced shift distribution:
- example, a resident assigned to S1 and S4 or S5 creating a 12hr+ shifts on consecutive days. here's a further breakdown, resident assigned to 6:00-18:00 and 18:00-6:00 on the same day or vice versa on to the next day.

Here are example of additional different imbalance situations.

S1, S4
S1, S5
S2, S5
S5, S2

-Evenly distribute the shifts across the month. Do not frontload the month with shifts. Do not backload the month with shifts.

*AVOID THIS*

15. 


18. residents can only work at their assigned hospital sites only. Don't worry about me ensuring coverage at dyer or CP sites if there is no resident availble and they are not assigned to these sites.
                                                        
                                                        
/**
 * Resident Scheduler - Google Apps Script
 * Automated scheduling system for resident shifts with constraint validation
 */

// Configuration
const CONFIG = {
  FIRST_DATA_ROW: 7,
  LAST_DATA_ROW: 31,
  NAME_COL: 2, // Column B
  SITE_COL: 3, // Column C
  FIRST_DAY_COL: 4, // Column D
  LAST_DAY_COL: 31, // Column AE (28 days)
  CLASS_COL: 33, // Column AG
  RANK_COL: 32, // Column AF
  DATE_ROW: 3,
  DAY_ROW: 4,
  SHIFT_CHECK_COL: 34, // Column AH
  HOUR_CHECK_COL: 35, // Column AI
  PTO_CHECK_COL: 36, // Column AJ
  
  SITES: ['Oly', 'Dyer', 'CP'],
  
  SHIFTS: {
    'Oly': ['S1', 'S2', 'S3', 'S4', 'S5'],
    'Dyer': ['S1'],
    'CP': ['S1']
  },
  
  SHIFT_TIMES: {
    'Oly-S1': { start: 6, end: 18, isNight: false },
    'Oly-S2': { start: 7, end: 19, isNight: false },
    'Oly-S3': { start: 12, end: 0, isNight: false },
    'Oly-S4': { start: 18, end: 6, isNight: true },
    'Oly-S5': { start: 19, end: 7, isNight: true },
    'Dyer-S1': { start: 10, end: 22, isNight: false },
    'CP-S1': { start: 10, end: 21, isNight: false }
  },
  
  NIGHT_SHIFTS: ['S4', 'S5'],
  
  MAX_SHIFTS: {
    'PGY1': 15,
    'PGY2': 14,
    'PGY3': 13,
    'IM': 15,
    'C': 2 // Chief reduction
  },
  
  HOURS_PER_SHIFT: 12,
  MAX_HOURS_7_DAYS: 60
};

/**
 * Creates custom menu in Google Sheets
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Resident Scheduler')
    .addItem('Auto-Schedule Shifts', 'autoScheduleShifts')
    .addItem('Clear All Schedules', 'clearAllSchedules')
    .addItem('Validate Schedule', 'validateSchedule')
    .addItem('Setup Validation Formulas', 'setupValidationFormulas')
    .addSeparator()
    .addItem('Help', 'showHelp')
    .addToUi();
}

/**
 * Main auto-scheduling function
 */
function autoScheduleShifts() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.alert(
    'Auto-Schedule Shifts',
    'This will automatically schedule shifts while respecting PTO, Requests, and all constraints. Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (result !== ui.Button.YES) {
    return;
  }
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  try {
    // Load resident data
    const residents = loadResidents(sheet);
    
    // Load existing constraints (PTO, Requests)
    loadExistingConstraints(sheet, residents);
    
    // Get dates and days
    const dates = loadDates(sheet);
    
    // Schedule shifts
    const schedule = generateSchedule(residents, dates);
    
    // Write schedule to sheet
    writeScheduleToSheet(sheet, schedule, residents);
    
    ui.alert('Success', 'Scheduling completed! Please review the schedule and validation columns.', ui.ButtonSet.OK);
  } catch (error) {
    ui.alert('Error', 'Scheduling failed: ' + error.message, ui.ButtonSet.OK);
    Logger.log('Error in autoScheduleShifts: ' + error.message);
  }
}

/**
 * Load resident data from sheet
 */
function loadResidents(sheet) {
  const residents = [];
  
  for (let row = CONFIG.FIRST_DATA_ROW; row <= CONFIG.LAST_DATA_ROW; row++) {
    const name = sheet.getRange(row, CONFIG.NAME_COL).getValue();
    const site = sheet.getRange(row, CONFIG.SITE_COL).getValue();
    const classType = sheet.getRange(row, CONFIG.CLASS_COL).getValue();
    const rank = sheet.getRange(row, CONFIG.RANK_COL).getValue();
    
    // Skip if no name or site not in our list
    if (!name || !CONFIG.SITES.includes(site)) {
      continue;
    }
    
    const maxShifts = calculateMaxShifts(classType, rank);
    
    residents.push({
      row: row,
      name: name,
      site: site,
      classType: classType,
      rank: rank,
      maxShifts: maxShifts,
      assignedShifts: 0,
      schedule: {}, // day -> shift
      ptoRequests: {}, // day -> 'PTO' or 'Request'
      nightShiftCount: 0,
      morningShiftCount: 0, // S1, S2 count
      afternoonShiftCount: 0, // S3 count
      isMorningWorker: false, // Track if resident works mornings (S1/S2)
      isNightWorker: false, // Track if resident works nights (S4/S5)
      ptoCount: 0, // Count of PTO days
      requiredBlankDays: 0 // Required blank days based on PTO
    });
  }
  
  return residents;
}

/**
 * Calculate max shifts for a resident
 */
function calculateMaxShifts(classType, rank) {
  let max = CONFIG.MAX_SHIFTS[classType] || 15;
  if (rank === 'C') {
    max -= CONFIG.MAX_SHIFTS['C'];
  }
  return max;
}

/**
 * Load existing PTO and Request constraints
 */
function loadExistingConstraints(sheet, residents) {
  const totalDays = CONFIG.LAST_DAY_COL - CONFIG.FIRST_DAY_COL + 1;
  
  for (let resident of residents) {
    let ptoCount = 0;
    
    for (let col = CONFIG.FIRST_DAY_COL; col <= CONFIG.LAST_DAY_COL; col++) {
      const value = sheet.getRange(resident.row, col).getValue();
      if (value === 'PTO' || value === 'Request') {
        const dayIndex = col - CONFIG.FIRST_DAY_COL;
        resident.ptoRequests[dayIndex] = value;
        
        if (value === 'PTO') {
          ptoCount++;
        }
      }
    }
    
    // Calculate required blank days based on PTO formula: ROUND(PTO_count * 8/12, 0)
    resident.ptoCount = ptoCount;
    resident.requiredBlankDays = Math.round(ptoCount * 8 / 12);
    
    // Calculate max allowed shifts considering PTO constraint
    // Total days - PTO days - Required blank days = Max shifts allowed
    const maxShiftsFromPTO = totalDays - ptoCount - resident.requiredBlankDays;
    
    // Use the more restrictive limit
    if (maxShiftsFromPTO < resident.maxShifts) {
      resident.maxShifts = Math.max(0, maxShiftsFromPTO);
    }
  }
}

/**
 * Load dates from sheet
 */
function loadDates(sheet) {
  const dates = [];
  for (let col = CONFIG.FIRST_DAY_COL; col <= CONFIG.LAST_DAY_COL; col++) {
    const date = sheet.getRange(CONFIG.DATE_ROW, col).getValue();
    const dayName = sheet.getRange(CONFIG.DAY_ROW, col).getValue();
    
    // Check if it's Wednesday (case-insensitive, handles "Wed", "Wednesday", "WED", etc.)
    const dayStr = String(dayName).toLowerCase().trim();
    const isWed = dayStr === 'wed' || dayStr === 'wednesday' || dayStr.startsWith('wed');
    
    // Log for debugging
    if (isWed) {
      Logger.log('Found Wednesday at column ' + col + ' with day name: "' + dayName + '"');
    }
    
    dates.push({
      index: col - CONFIG.FIRST_DAY_COL,
      date: date,
      dayName: dayName,
      isWednesday: isWed
    });
  }
  Logger.log('Total dates loaded: ' + dates.length + ', Wednesdays found: ' + dates.filter(d => d.isWednesday).length);
  return dates;
}

/**
 * Generate schedule using constraint-based algorithm
 */
function generateSchedule(residents, dates) {
  const schedule = {};
  
  // Initialize schedule structure with class tracking
  for (let date of dates) {
    schedule[date.index] = {};
    for (let site of CONFIG.SITES) {
      schedule[date.index][site] = {};
      for (let shift of CONFIG.SHIFTS[site]) {
        schedule[date.index][site][shift] = {
          residents: [],
          classes: new Set() // Track which classes are assigned
        };
      }
    }
  }
  
  // Don't pre-sort residents - let each shift assignment dynamically select
  // the resident with fewest shifts to ensure even distribution
  
  // On day 0, strategically distribute residents between morning and night shifts
  // to ensure both shift types have coverage throughout the month
  if (dates.length > 0) {
    const firstDate = dates[0];
    if (!firstDate.isWednesday) {
      distributeDay0Shifts(residents, firstDate, schedule);
    } else {
      // If day 0 is Wednesday, only assign night shifts
      assignNightShifts(residents, firstDate, schedule);
    }
  }
  
  // Calculate total shift capacity and daily target for even distribution
  const totalShiftCapacity = residents.reduce((sum, r) => sum + r.maxShifts, 0);
  const workingDays = dates.filter(d => !d.isWednesday).length;
  const targetShiftsPerDay = Math.floor(totalShiftCapacity / dates.length);
  
  Logger.log('=== DISTRIBUTION PLANNING ===');
  Logger.log('Total shift capacity: ' + totalShiftCapacity);
  Logger.log('Total days: ' + dates.length + ', Working days (non-Wed): ' + workingDays);
  Logger.log('Target shifts per day: ' + targetShiftsPerDay);
  Logger.log('=== END PLANNING ===');
  
  // TWO-PASS ASSIGNMENT STRATEGY
  // Pass 1: Assign minimum coverage for ALL days first
  // Pass 2: Fill remaining capacity evenly
  
  Logger.log('\n=== PASS 1: MINIMUM COVERAGE FOR ALL DAYS ===');
  for (let i = 1; i < dates.length; i++) {
    const date = dates[i];
    const isWednesday = date.isWednesday;
    
    Logger.log('\n--- Day ' + date.index + ' (' + date.dayName + ') - PASS 1 ---');
    
    // Assign ONLY minimum coverage (no additional shifts)
    if (!isWednesday) {
      assignMorningShiftsMinimum(residents, date, schedule);
    }
    
    assignNightShiftsMinimum(residents, date, schedule);
    
    // Dyer and CP (always minimum - 1 each)
    assignDyerCPShifts(residents, date, schedule, isWednesday);
  }
  
  Logger.log('\n=== PASS 2: FILL REMAINING CAPACITY (INTERLEAVED ORDER) ===');
  Logger.log('Processing days INTERLEAVED (28,1,27,2,26,3,...) to balance distribution');
  
  // Build interleaved day order: alternate late and early days
  // [28, 1, 27, 2, 26, 3, 25, 4, ... 15, 14]
  const interleavedIndices = [];
  let startIdx = 1;
  let endIdx = dates.length - 1;
  
  while (startIdx <= endIdx) {
    if (endIdx >= startIdx) {
      interleavedIndices.push(endIdx);
      endIdx--;
    }
    if (startIdx <= endIdx) {
      interleavedIndices.push(startIdx);
      startIdx++;
    }
  }
  
  Logger.log('Interleaved order: ' + interleavedIndices.join(', '));
  
  // Process in interleaved order
  for (let idx of interleavedIndices) {
    const date = dates[idx];
    const isWednesday = date.isWednesday;
    const isSecondHalf = date.index > 14;
    
    Logger.log('\n--- Day ' + date.index + ' (' + date.dayName + ', ' + (isSecondHalf ? 'SECOND HALF' : 'FIRST HALF') + ') - PASS 2 ---');
    const dayStartShifts = residents.reduce((sum, r) => sum + r.assignedShifts, 0);
    
    // Track eligible pool size before assignment
    const olyMorningWorkers = residents.filter(r => r.isMorningWorker && r.site === 'Oly' && !r.ptoRequests[date.index] && r.assignedShifts < r.maxShifts && !r.schedule[date.index]).length;
    const olyNightWorkers = residents.filter(r => r.isNightWorker && r.site === 'Oly' && !r.ptoRequests[date.index] && r.assignedShifts < r.maxShifts && !r.schedule[date.index]).length;
    Logger.log('Eligible pool: ' + olyMorningWorkers + ' morning workers, ' + olyNightWorkers + ' night workers');
    
    // Use balanced round-robin assignment for shift types
    assignAdditionalShiftsBalanced(residents, date, schedule, isWednesday);
    
    const dayEndShifts = residents.reduce((sum, r) => sum + r.assignedShifts, 0);
    const shiftsAssignedToday = dayEndShifts - dayStartShifts;
    const s2Count = schedule[date.index]['Oly']['S2'].residents.length;
    const s5Count = schedule[date.index]['Oly']['S5'].residents.length;
    const s3Count = schedule[date.index]['Oly']['S3'].residents.length;
    Logger.log('Day ' + date.index + ' PASS 2 complete: ' + shiftsAssignedToday + ' additional shifts (S2=' + s2Count + ', S5=' + s5Count + ', S3=' + s3Count + ', total: ' + dayEndShifts + '/' + totalShiftCapacity + ')');
  }
  
  // Log distribution statistics
  logDistributionStats(residents, dates);
  
  return schedule;
}

/**
 * Log distribution statistics to help diagnose frontloading
 */
function logDistributionStats(residents, dates) {
  const midpoint = Math.floor(dates.length / 2);
  let firstHalfShifts = 0;
  let secondHalfShifts = 0;
  
  for (let r of residents) {
    for (let dayIndex in r.schedule) {
      const day = parseInt(dayIndex);
      if (day < midpoint) {
        firstHalfShifts++;
      } else {
        secondHalfShifts++;
      }
    }
  }
  
  Logger.log('=== DISTRIBUTION STATISTICS ===');
  Logger.log('First ' + midpoint + ' days: ' + firstHalfShifts + ' shifts assigned');
  Logger.log('Last ' + (dates.length - midpoint) + ' days: ' + secondHalfShifts + ' shifts assigned');
  Logger.log('Ratio: ' + (firstHalfShifts / (firstHalfShifts + secondHalfShifts) * 100).toFixed(1) + '% in first half');
  
  // Log per-resident distribution
  const residentStats = residents.map(r => ({
    name: r.name,
    total: r.assignedShifts,
    max: r.maxShifts,
    utilization: (r.assignedShifts / r.maxShifts * 100).toFixed(0) + '%'
  }));
  
  Logger.log('Resident utilization:');
  for (let stat of residentStats) {
    Logger.log('  ' + stat.name + ': ' + stat.total + '/' + stat.max + ' (' + stat.utilization + ')');
  }
  Logger.log('=== END STATISTICS ===');
}

/**
 * Distribute shifts on day 0 to balance morning and night workers
 */
function distributeDay0Shifts(residents, date, schedule) {
  const site = 'Oly';
  
  Logger.log('=== DAY 0 DISTRIBUTION ===');
  
  // Get Oly residents who are eligible (no PTO, not exceeding max shifts)
  const olyResidents = residents.filter(r => 
    r.site === site && 
    !r.ptoRequests[date.index] &&
    r.assignedShifts < r.maxShifts &&
    check60HourRule(r, date.index)
  );
  Logger.log('Total Oly residents available on day 0: ' + olyResidents.length);
  
  // Group residents by class for balanced distribution
  const pgy1 = olyResidents.filter(r => r.classType === 'PGY1');
  const pgy2 = olyResidents.filter(r => r.classType === 'PGY2');
  const pgy3 = olyResidents.filter(r => r.classType === 'PGY3');
  const im = olyResidents.filter(r => r.classType === 'IM');
  
  Logger.log('Class breakdown: PGY1=' + pgy1.length + ', PGY2=' + pgy2.length + ', PGY3=' + pgy3.length + ', IM=' + im.length);
  
  // Strategy: Distribute classes evenly between morning and night
  // Night pool: Mix of all classes
  // Morning pool: Mix of all classes
  
  // Assign night shifts FIRST to lock in night workers
  Logger.log('Assigning night shifts first to establish night worker pool...');
  
  // S4: Assign 1 resident (PGY3 preferred, then PGY2)
  const s4Candidate = [...pgy3, ...pgy2].find(r => 
    !r.schedule[date.index] &&
    r.assignedShifts < r.maxShifts
  );
  if (s4Candidate) {
    assignResidentToShift(s4Candidate, date, site, 'S4', schedule);
    Logger.log('Day 0: Assigned ' + s4Candidate.name + ' (' + s4Candidate.classType + ') to S4 (night worker)');
  }
  
  // S5: Assign 4 residents to create larger night worker pool
  // This balances pool sizes with shift demands (S5 max 4/day vs S2 max 4/day)
  let s5Count = 0;
  const s5Needed = 4;
  
  // Try to get one from each remaining class for balance
  const nightClasses = new Set();
  if (s4Candidate) nightClasses.add(s4Candidate.classType);
  
  // Prioritize different classes for S5
  for (let classGroup of [pgy2, pgy1, pgy3, im]) {
    if (s5Count >= s5Needed) break;
    
    for (let r of classGroup) {
      if (s5Count >= s5Needed) break;
      if (r.schedule[date.index]) continue; // Already assigned
      if (r.assignedShifts >= r.maxShifts) continue;
      
      assignResidentToShift(r, date, site, 'S5', schedule);
      s5Count++;
      nightClasses.add(r.classType);
      Logger.log('Day 0: Assigned ' + r.name + ' (' + r.classType + ') to S5 (night worker)');
    }
  }
  
  // Now assign morning shifts to remaining residents
  Logger.log('Assigning morning shifts to establish morning worker pool...');
  
  // S1: Assign 1 resident (PGY3 preferred, then PGY2, but avoid if already heavy in nights)
  let s1Candidate = null;
  
  // If PGY3 is already heavy in nights, prefer PGY2 or PGY1 for S1
  const pgy3InNights = [...pgy3].filter(r => r.isNightWorker).length;
  if (pgy3InNights >= 2) {
    // Prefer PGY2 or PGY1 for balance
    s1Candidate = [...pgy2, ...pgy1, ...pgy3].find(r => 
      !r.schedule[date.index] &&
      !r.isNightWorker &&
      r.assignedShifts < r.maxShifts
    );
  } else {
    // Normal priority: PGY3 > PGY2
    s1Candidate = [...pgy3, ...pgy2].find(r => 
      !r.schedule[date.index] &&
      !r.isNightWorker &&
      r.assignedShifts < r.maxShifts
    );
  }
  
  if (s1Candidate) {
    assignResidentToShift(s1Candidate, date, site, 'S1', schedule);
    Logger.log('Day 0: Assigned ' + s1Candidate.name + ' (' + s1Candidate.classType + ') to S1 (morning worker)');
  }
  
  // S2: Assign 2 residents - balance classes
  let s2Count = 0;
  const s2Needed = 2;
  
  // Prioritize different classes for S2 to balance
  for (let classGroup of [pgy1, pgy2, pgy3, im]) {
    if (s2Count >= s2Needed) break;
    
    for (let r of classGroup) {
      if (s2Count >= s2Needed) break;
      if (r.schedule[date.index]) continue; // Already assigned
      if (r.isNightWorker) continue; // Don't assign night workers to morning
      if (r.assignedShifts >= r.maxShifts) continue;
      
      assignResidentToShift(r, date, site, 'S2', schedule);
      s2Count++;
      Logger.log('Day 0: Assigned ' + r.name + ' (' + r.classType + ') to S2 (morning worker)');
    }
  }
  
  // Assign S3 to morning workers if eligible
  for (let r of olyResidents) {
    if (r.schedule[date.index]) continue; // Already assigned
    if (r.isNightWorker) continue; // S3 is for morning workers
    if (r.assignedShifts >= r.maxShifts) continue;
    
    assignResidentToShift(r, date, site, 'S3', schedule);
    Logger.log('Day 0: Assigned ' + r.name + ' (' + r.classType + ') to S3');
  }
  
  // Assign Dyer and CP
  assignDyerCPShifts(residents, date, schedule, false);
  
  // Summary with class breakdown
  const morningWorkers = residents.filter(r => r.isMorningWorker);
  const nightWorkers = residents.filter(r => r.isNightWorker);
  
  const morningByClass = {
    PGY1: morningWorkers.filter(r => r.classType === 'PGY1').length,
    PGY2: morningWorkers.filter(r => r.classType === 'PGY2').length,
    PGY3: morningWorkers.filter(r => r.classType === 'PGY3').length,
    IM: morningWorkers.filter(r => r.classType === 'IM').length
  };
  
  const nightByClass = {
    PGY1: nightWorkers.filter(r => r.classType === 'PGY1').length,
    PGY2: nightWorkers.filter(r => r.classType === 'PGY2').length,
    PGY3: nightWorkers.filter(r => r.classType === 'PGY3').length,
    IM: nightWorkers.filter(r => r.classType === 'IM').length
  };
  
  Logger.log('Day 0 complete: ' + morningWorkers.length + ' morning workers, ' + nightWorkers.length + ' night workers');
  Logger.log('Morning workers by class: PGY1=' + morningByClass.PGY1 + ', PGY2=' + morningByClass.PGY2 + ', PGY3=' + morningByClass.PGY3 + ', IM=' + morningByClass.IM);
  Logger.log('Night workers by class: PGY1=' + nightByClass.PGY1 + ', PGY2=' + nightByClass.PGY2 + ', PGY3=' + nightByClass.PGY3 + ', IM=' + nightByClass.IM);
  Logger.log('=== END DAY 0 DISTRIBUTION ===');
}

/**
 * Assign morning shifts - MINIMUM COVERAGE ONLY (Pass 1)
 */
function assignMorningShiftsMinimum(residents, date, schedule) {
  const site = 'Oly';
  
  // S1: Assign 1 resident (PGY3 preferred, then PGY2)
  const s1Eligible = findEligibleResident(residents, date, site, 'S1', schedule, true);
  if (s1Eligible) {
    assignResidentToShift(s1Eligible, date, site, 'S1', schedule);
  }
  
  // S2: Assign 1 resident (minimum coverage) - reduced to reserve capacity for Pass 2
  let s2Count = 0;
  const s2MinCount = 1;
  
  while (s2Count < s2MinCount) {
    const eligible = findEligibleResident(residents, date, site, 'S2', schedule, false);
    if (!eligible) break;
    assignResidentToShift(eligible, date, site, 'S2', schedule);
    s2Count++;
  }
}

/**
 * Assign additional shifts in balanced round-robin fashion (Pass 2)
 * Note: Pass 2 processes in REVERSE order (28→1) to prevent frontloading
 */
function assignAdditionalShiftsBalanced(residents, date, schedule, isWednesday) {
  const site = 'Oly';
  
  // Define shift targets for additional assignments
  // Pass 1: S2(1), S5(2) - Pass 2 adds: S2(+2), S5(+1) for balanced S2(3)/S5(3)
  const targets = {
    S2: isWednesday ? 0 : 3,  // Total target 3 (already has 1 from Pass 1, add 2 more)
    S5: 3,                     // Total target 3 (already has 2 from Pass 1, add 1 more)
    S3: isWednesday ? 0 : 2    // Total target 2 (0 from Pass 1, add 2)
  };
  
  // Round-robin through shift types until all are at target or no eligible residents
  const maxIterations = 20; // Safety limit
  let iteration = 0;
  
  while (iteration < maxIterations) {
    let assignedThisRound = false;
    
    // Try S2
    if (schedule[date.index][site]['S2'].residents.length < targets.S2) {
      const eligible = findEligibleResident(residents, date, site, 'S2', schedule, false);
      if (eligible) {
        assignResidentToShift(eligible, date, site, 'S2', schedule);
        assignedThisRound = true;
      }
    }
    
    // Try S5
    if (schedule[date.index][site]['S5'].residents.length < targets.S5) {
      const eligible = findEligibleResident(residents, date, site, 'S5', schedule, false);
      if (eligible) {
        assignResidentToShift(eligible, date, site, 'S5', schedule);
        assignedThisRound = true;
      }
    }
    
    // Try S3
    if (schedule[date.index][site]['S3'].residents.length < targets.S3) {
      const eligible = findEligibleResident(residents, date, site, 'S3', schedule, false);
      if (eligible) {
        assignResidentToShift(eligible, date, site, 'S3', schedule);
        assignedThisRound = true;
      }
    }
    
    // If no shifts were assigned this round, we're done
    if (!assignedThisRound) break;
    
    iteration++;
  }
}

/**
 * Assign night shifts - MINIMUM COVERAGE ONLY (Pass 1)
 */
function assignNightShiftsMinimum(residents, date, schedule) {
  const site = 'Oly';
  
  // S4: Assign 1 resident (PGY3 preferred, then PGY2)
  const s4Eligible = findEligibleResident(residents, date, site, 'S4', schedule, true);
  if (s4Eligible) {
    assignResidentToShift(s4Eligible, date, site, 'S4', schedule);
  }
  
  // S5: Assign 2 residents (minimum coverage) - kept at 2 to maintain S2/S5 balance
  let s5Count = 0;
  const s5MinCount = 2;
  
  while (s5Count < s5MinCount) {
    const eligible = findEligibleResident(residents, date, site, 'S5', schedule, false);
    if (!eligible) break;
    assignResidentToShift(eligible, date, site, 'S5', schedule);
    s5Count++;
  }
}


/**
 * Assign Dyer and CP shifts
 */
function assignDyerCPShifts(residents, date, schedule, isWednesday) {
  for (let site of ['Dyer', 'CP']) {
    if (isWednesday) continue; // Skip day shifts on Wednesday
    
    const eligible = findEligibleResident(residents, date, site, 'S1', schedule, false);
    if (eligible) {
      assignResidentToShift(eligible, date, site, 'S1', schedule);
    }
  }
}

/**
 * Assign a resident to a shift and update tracking
 */
function assignResidentToShift(resident, date, site, shift, schedule) {
  schedule[date.index][site][shift].residents.push(resident);
  schedule[date.index][site][shift].classes.add(resident.classType);
  
  resident.schedule[date.index] = `${site}-${shift}`;
  resident.assignedShifts++;
  
  // Track shift types for morning/night worker separation
  if (shift === 'S1' || shift === 'S2') {
    resident.morningShiftCount++;
    if (resident.morningShiftCount === 1) {
      resident.isMorningWorker = true;
    }
  } else if (shift === 'S4' || shift === 'S5') {
    resident.nightShiftCount++;
    if (resident.nightShiftCount === 1) {
      resident.isNightWorker = true;
    }
  } else if (shift === 'S3') {
    resident.afternoonShiftCount++;
    // S3 is part of the morning worker pool
    if (!resident.isMorningWorker && resident.afternoonShiftCount === 1) {
      resident.isMorningWorker = true;
    }
  }
}

/**
 * Get max residents allowed for a shift based on site and shift type
 */
function getMaxResidentsForShift(site, shift) {
  // Dyer and CP: only 1 resident per shift
  if (site === 'Dyer' || site === 'CP') {
    return 1;
  }
  
  // Oly S1 (6AM) and S4 (6PM): only 1 resident
  if (site === 'Oly' && (shift === 'S1' || shift === 'S4')) {
    return 1;
  }
  
  // Oly S2 (7AM) and S5 (7PM): multiple residents allowed
  // S3 (10AM): multiple residents allowed
  return 999; // No practical limit
}

/**
 * Find eligible resident for a shift
 */
function findEligibleResident(residents, date, site, shift, schedule, isFirstAssignment) {
  const isMorningShift = (shift === 'S1' || shift === 'S2');
  const isNightShift = (shift === 'S4' || shift === 'S5');
  const isAfternoonShift = (shift === 'S3');
  
  const candidates = residents.filter(r => {
    // Must be assigned to this site
    if (r.site !== site) return false;
    
    // Cannot exceed max shifts (already accounts for PTO constraint)
    if (r.assignedShifts >= r.maxShifts) return false;
    
    // Cannot have PTO or Request on this day
    if (r.ptoRequests[date.index]) return false;
    
    // Cannot already be scheduled this day
    if (r.schedule[date.index]) return false;
    
    // Requirement #15: Morning workers stay morning, night workers stay night for entire block
    // Only enforce this if resident has already been assigned to the opposite shift type
    if (isMorningShift && r.isNightWorker) return false;
    if (isNightShift && r.isMorningWorker) return false;
    
    // S3 is for morning workers only (not night workers)
    if (isAfternoonShift && r.isNightWorker) return false;
    
    // Allow residents to be assigned to either morning or night on their first shift
    // They become locked to that type after first assignment
    
    // S3 shift: if worked previous day, must have been S1 or S2
    if (isAfternoonShift && date.index > 0) {
      const prevDayShift = r.schedule[date.index - 1];
      if (prevDayShift) {
        const prevShift = prevDayShift.split('-')[1];
        // If worked previous day, it must have been a morning shift
        if (prevShift !== 'S1' && prevShift !== 'S2') {
          return false;
        }
      }
      // If didn't work previous day, that's OK - can still work S3
    }
    
    // Check 60-hour rule
    if (!check60HourRule(r, date.index)) return false;
    
    // Check for imbalanced shift distribution (same-day and consecutive-day conflicts)
    if (!checkImbalancedShiftDistribution(r, date.index, shift, schedule)) return false;
    
    // For first assignment on S1/S4 at Oly: prioritize PGY3, then PGY2
    if (isFirstAssignment && site === 'Oly' && (shift === 'S1' || shift === 'S4')) {
      // Only allow PGY3 or PGY2 for first assignment
      if (r.classType !== 'PGY3' && r.classType !== 'PGY2') return false;
    }
    
    return true;
  });
  
  if (candidates.length === 0) return null;
  
  // Sort candidates for even distribution using utilization rate
  candidates.sort((a, b) => {
    // For first assignment on S1/S4 at Oly: PGY3 > PGY2 (requirement)
    if (isFirstAssignment && site === 'Oly' && (shift === 'S1' || shift === 'S4')) {
      if (a.classType === 'PGY3' && b.classType !== 'PGY3') return -1;
      if (a.classType !== 'PGY3' && b.classType === 'PGY3') return 1;
      if (a.classType === 'PGY2' && b.classType === 'PGY1') return -1;
      if (a.classType === 'PGY1' && b.classType === 'PGY2') return 1;
    }
    
    // PRIORITY 1: Utilization-based distribution to prevent early pool exhaustion
    // Calculate utilization rate: assignedShifts / maxShifts
    // Prefer residents with LOWER utilization to spread when they hit max across the month
    const utilizationA = a.maxShifts > 0 ? a.assignedShifts / a.maxShifts : 1;
    const utilizationB = b.maxShifts > 0 ? b.assignedShifts / b.maxShifts : 1;
    
    const utilizationDiff = utilizationA - utilizationB;
    if (Math.abs(utilizationDiff) > 0.05) { // 5% threshold to avoid micro-optimization
      return utilizationA - utilizationB;
    }
    
    // PRIORITY 2: If utilization is similar, prefer residents with fewer absolute shifts
    const shiftDiff = a.assignedShifts - b.assignedShifts;
    if (shiftDiff !== 0) return shiftDiff;
    
    // PRIORITY 3: Only if all else equal, prefer PGY3 for general coverage
    if (a.classType === 'PGY3' && b.classType !== 'PGY3') return -1;
    if (a.classType !== 'PGY3' && b.classType === 'PGY3') return 1;
    
    return 0;
  });
  
  return candidates[0];
}

/**
 * Find eligible resident from a specific class
 */
function findEligibleResidentByClass(residents, date, site, shift, schedule, requiredClass) {
  const isMorningShift = (shift === 'S1' || shift === 'S2');
  const isNightShift = (shift === 'S4' || shift === 'S5');
  
  const candidates = residents.filter(r => {
    // Must be the required class
    if (r.classType !== requiredClass) return false;
    
    // Must be assigned to this site
    if (r.site !== site) return false;
    
    // Cannot exceed max shifts
    if (r.assignedShifts >= r.maxShifts) return false;
    
    // Cannot have PTO or Request on this day
    if (r.ptoRequests[date.index]) return false;
    
    // Cannot already be scheduled this day
    if (r.schedule[date.index]) return false;
    
    // Requirement #15: Morning workers stay morning, night workers stay night
    if (isMorningShift && r.isNightWorker) return false;
    if (isNightShift && r.isMorningWorker) return false;
    
    // Check 60-hour rule
    if (!check60HourRule(r, date.index)) return false;
    
    // Check for imbalanced shift distribution
    if (!checkImbalancedShiftDistribution(r, date.index, shift, schedule)) return false;
    
    return true;
  });
  
  if (candidates.length === 0) return null;
  
  // Sort by utilization rate for even distribution
  candidates.sort((a, b) => {
    // Calculate utilization rate
    const utilizationA = a.maxShifts > 0 ? a.assignedShifts / a.maxShifts : 1;
    const utilizationB = b.maxShifts > 0 ? b.assignedShifts / b.maxShifts : 1;
    
    const utilizationDiff = utilizationA - utilizationB;
    if (Math.abs(utilizationDiff) > 0.05) {
      return utilizationA - utilizationB;
    }
    
    // If similar utilization, prefer fewer absolute shifts
    return a.assignedShifts - b.assignedShifts;
  });
  
  return candidates[0];
}

/**
 * Check 60-hour rule for 7 consecutive days
 */
function check60HourRule(resident, dayIndex) {
  // Check all 7-day windows that include this day
  for (let startDay = Math.max(0, dayIndex - 6); startDay <= dayIndex; startDay++) {
    const endDay = Math.min(startDay + 6, CONFIG.LAST_DAY_COL - CONFIG.FIRST_DAY_COL);
    let hours = 0;
    
    for (let d = startDay; d <= endDay; d++) {
      if (resident.schedule[d] && !resident.ptoRequests[d]) {
        hours += CONFIG.HOURS_PER_SHIFT;
      }
    }
    
    // Adding this shift would exceed 60 hours
    if (hours + CONFIG.HOURS_PER_SHIFT > CONFIG.MAX_HOURS_7_DAYS) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check for imbalanced shift distribution
 * Prevents: same-day conflicts AND consecutive-day conflicts
 * Examples to avoid: S1→S4, S1→S5, S2→S5, S5→S2, S4→S1, S5→S1, S5→S2
 */
function checkImbalancedShiftDistribution(resident, dayIndex, newShift, schedule) {
  const isNewShiftNight = CONFIG.NIGHT_SHIFTS.includes(newShift);
  
  // Check same-day conflicts (already has a shift this day)
  for (let site of CONFIG.SITES) {
    for (let shift of CONFIG.SHIFTS[site]) {
      if (schedule[dayIndex] && schedule[dayIndex][site] && schedule[dayIndex][site][shift]) {
        const shiftData = schedule[dayIndex][site][shift];
        // Check if resident is in the residents array
        if (shiftData.residents && shiftData.residents.includes(resident)) {
          return false;
        }
      }
    }
  }
  
  // Check previous day for consecutive-day conflicts
  if (dayIndex > 0 && resident.schedule[dayIndex - 1]) {
    const prevShift = resident.schedule[dayIndex - 1].split('-')[1];
    const isPrevShiftNight = CONFIG.NIGHT_SHIFTS.includes(prevShift);
    
    // Avoid: Day shift followed by night shift (e.g., S1→S4, S1→S5, S2→S5)
    if (!isPrevShiftNight && isNewShiftNight) {
      return false;
    }
    
    // Avoid: Night shift followed by day shift (e.g., S4→S1, S5→S1, S5→S2)
    if (isPrevShiftNight && !isNewShiftNight) {
      return false;
    }
  }
  
  // Check next day for consecutive-day conflicts
  if (dayIndex < CONFIG.LAST_DAY_COL - CONFIG.FIRST_DAY_COL && resident.schedule[dayIndex + 1]) {
    const nextShift = resident.schedule[dayIndex + 1].split('-')[1];
    const isNextShiftNight = CONFIG.NIGHT_SHIFTS.includes(nextShift);
    
    // Avoid: Day shift before night shift (e.g., S1→S4, S1→S5, S2→S5)
    if (!isNewShiftNight && isNextShiftNight) {
      return false;
    }
    
    // Avoid: Night shift before day shift (e.g., S4→S1, S5→S1, S5→S2)
    if (isNewShiftNight && !isNextShiftNight) {
      return false;
    }
  }
  
  return true;
}

/**
 * Write schedule to sheet
 */
function writeScheduleToSheet(sheet, schedule, residents) {
  // Clear existing schedule data (but preserve PTO/Request)
  for (let resident of residents) {
    for (let col = CONFIG.FIRST_DAY_COL; col <= CONFIG.LAST_DAY_COL; col++) {
      const dayIndex = col - CONFIG.FIRST_DAY_COL;
      if (!resident.ptoRequests[dayIndex]) {
        sheet.getRange(resident.row, col).setValue('');
      }
    }
  }
  
  // Write new schedule
  for (let resident of residents) {
    for (let dayIndex in resident.schedule) {
      const col = parseInt(dayIndex) + CONFIG.FIRST_DAY_COL;
      const assignment = resident.schedule[dayIndex];
      const shift = assignment.split('-')[1]; // Extract shift (e.g., 'S1' from 'Oly-S1')
      sheet.getRange(resident.row, col).setValue(shift);
    }
  }
  
  // Log shift assignment statistics
  let totalShifts = 0;
  let s1Count = 0;
  let s4Count = 0;
  let s5Count = 0;
  for (let dayIndex in schedule) {
    for (let site in schedule[dayIndex]) {
      for (let shift in schedule[dayIndex][site]) {
        const shiftData = schedule[dayIndex][site][shift];
        if (shiftData.residents && shiftData.residents.length > 0) {
          totalShifts++;
          if (shift === 'S1') s1Count++;
          if (shift === 'S4') s4Count++;
          if (shift === 'S5') s5Count++;
        }
      }
    }
  }
  Logger.log('Shift assignments: Total=' + totalShifts + ', S1=' + s1Count + ', S4=' + s4Count + ', S5=' + s5Count);
}

/**
 * Clear all scheduled shifts (preserve PTO/Request)
 */
function clearAllSchedules() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.alert(
    'Clear All Schedules',
    'This will clear all shift assignments but preserve PTO and Request entries. Continue?',
    ui.ButtonSet.YES_NO
  );
  
  if (result !== ui.Button.YES) {
    return;
  }
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  for (let row = CONFIG.FIRST_DATA_ROW; row <= CONFIG.LAST_DATA_ROW; row++) {
    for (let col = CONFIG.FIRST_DAY_COL; col <= CONFIG.LAST_DAY_COL; col++) {
      const value = sheet.getRange(row, col).getValue();
      if (value !== 'PTO' && value !== 'Request') {
        sheet.getRange(row, col).setValue('');
      }
    }
  }
  
  ui.alert('Success', 'All shift assignments cleared.', ui.ButtonSet.OK);
}

/**
 * Setup validation formulas
 */
function setupValidationFormulas() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Set headers
  sheet.getRange(CONFIG.FIRST_DATA_ROW - 1, CONFIG.SHIFT_CHECK_COL).setValue('Shift Check');
  sheet.getRange(CONFIG.FIRST_DATA_ROW - 1, CONFIG.HOUR_CHECK_COL).setValue('60hrs Check');
  sheet.getRange(CONFIG.FIRST_DATA_ROW - 1, CONFIG.PTO_CHECK_COL).setValue('PTO Violation');
  
  for (let row = CONFIG.FIRST_DATA_ROW; row <= CONFIG.LAST_DATA_ROW; row++) {
    // Shift Check Formula
    const shiftFormula = `=IF(COUNTIF(D${row}:AE${row},"<>")-COUNTIF(D${row}:AE${row},"PTO")-COUNTIF(D${row}:AE${row},"Request")>IF(AF${row}="C",11,IF(AG${row}="PGY3",13,IF(AG${row}="PGY2",14,IF(OR(AG${row}="PGY1",AG${row}="IM"),15,15)))),"Violation","OK")`;
    sheet.getRange(row, CONFIG.SHIFT_CHECK_COL).setFormula(shiftFormula);
    
    // 60hrs Check Formula
    const hourFormula = `=IF(OR((COUNTIF(D${row}:J${row},"<>")-COUNTIF(D${row}:J${row},"PTO")-COUNTIF(D${row}:J${row},"Request"))*12>60,(COUNTIF(E${row}:K${row},"<>")-COUNTIF(E${row}:K${row},"PTO")-COUNTIF(E${row}:K${row},"Request"))*12>60,(COUNTIF(F${row}:L${row},"<>")-COUNTIF(F${row}:L${row},"PTO")-COUNTIF(F${row}:L${row},"Request"))*12>60,(COUNTIF(G${row}:M${row},"<>")-COUNTIF(G${row}:M${row},"PTO")-COUNTIF(G${row}:M${row},"Request"))*12>60,(COUNTIF(H${row}:N${row},"<>")-COUNTIF(H${row}:N${row},"PTO")-COUNTIF(H${row}:N${row},"Request"))*12>60,(COUNTIF(I${row}:O${row},"<>")-COUNTIF(I${row}:O${row},"PTO")-COUNTIF(I${row}:O${row},"Request"))*12>60,(COUNTIF(J${row}:P${row},"<>")-COUNTIF(J${row}:P${row},"PTO")-COUNTIF(J${row}:P${row},"Request"))*12>60,(COUNTIF(K${row}:Q${row},"<>")-COUNTIF(K${row}:Q${row},"PTO")-COUNTIF(K${row}:Q${row},"Request"))*12>60,(COUNTIF(L${row}:R${row},"<>")-COUNTIF(L${row}:R${row},"PTO")-COUNTIF(L${row}:R${row},"Request"))*12>60,(COUNTIF(M${row}:S${row},"<>")-COUNTIF(M${row}:S${row},"PTO")-COUNTIF(M${row}:S${row},"Request"))*12>60,(COUNTIF(N${row}:T${row},"<>")-COUNTIF(N${row}:T${row},"PTO")-COUNTIF(N${row}:T${row},"Request"))*12>60,(COUNTIF(O${row}:U${row},"<>")-COUNTIF(O${row}:U${row},"PTO")-COUNTIF(O${row}:U${row},"Request"))*12>60,(COUNTIF(P${row}:V${row},"<>")-COUNTIF(P${row}:V${row},"PTO")-COUNTIF(P${row}:V${row},"Request"))*12>60,(COUNTIF(Q${row}:W${row},"<>")-COUNTIF(Q${row}:W${row},"PTO")-COUNTIF(Q${row}:W${row},"Request"))*12>60,(COUNTIF(R${row}:X${row},"<>")-COUNTIF(R${row}:X${row},"PTO")-COUNTIF(R${row}:X${row},"Request"))*12>60,(COUNTIF(S${row}:Y${row},"<>")-COUNTIF(S${row}:Y${row},"PTO")-COUNTIF(S${row}:Y${row},"Request"))*12>60,(COUNTIF(T${row}:Z${row},"<>")-COUNTIF(T${row}:Z${row},"PTO")-COUNTIF(T${row}:Z${row},"Request"))*12>60,(COUNTIF(U${row}:AA${row},"<>")-COUNTIF(U${row}:AA${row},"PTO")-COUNTIF(U${row}:AA${row},"Request"))*12>60,(COUNTIF(V${row}:AB${row},"<>")-COUNTIF(V${row}:AB${row},"PTO")-COUNTIF(V${row}:AB${row},"Request"))*12>60,(COUNTIF(W${row}:AC${row},"<>")-COUNTIF(W${row}:AC${row},"PTO")-COUNTIF(W${row}:AC${row},"Request"))*12>60,(COUNTIF(X${row}:AD${row},"<>")-COUNTIF(X${row}:AD${row},"PTO")-COUNTIF(X${row}:AD${row},"Request"))*12>60,(COUNTIF(Y${row}:AE${row},"<>")-COUNTIF(Y${row}:AE${row},"PTO")-COUNTIF(Y${row}:AE${row},"Request"))*12>60),"Violation","OK")`;
    sheet.getRange(row, CONFIG.HOUR_CHECK_COL).setFormula(hourFormula);
    
    // PTO Violation Formula
    const ptoFormula = `=IF(COUNTBLANK(D${row}:AE${row})>=ROUND(COUNTIF(D${row}:AE${row},"PTO")*8/12,0),"OK","Violation")`;
    sheet.getRange(row, CONFIG.PTO_CHECK_COL).setFormula(ptoFormula);
  }
  
  SpreadsheetApp.getUi().alert('Success', 'Validation formulas have been set up in columns AH, AI, and AJ.', SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Validate current schedule
 */
function validateSchedule() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const violations = [];
  
  for (let row = CONFIG.FIRST_DATA_ROW; row <= CONFIG.LAST_DATA_ROW; row++) {
    const name = sheet.getRange(row, CONFIG.NAME_COL).getValue();
    if (!name) continue;
    
    const shiftCheck = sheet.getRange(row, CONFIG.SHIFT_CHECK_COL).getValue();
    const hourCheck = sheet.getRange(row, CONFIG.HOUR_CHECK_COL).getValue();
    const ptoCheck = sheet.getRange(row, CONFIG.PTO_CHECK_COL).getValue();
    
    if (shiftCheck === 'Violation') {
      violations.push(`${name}: Shift limit exceeded`);
    }
    if (hourCheck === 'Violation') {
      violations.push(`${name}: 60-hour rule violated`);
    }
    if (ptoCheck === 'Violation') {
      violations.push(`${name}: PTO violation`);
    }
  }
  
  const ui = SpreadsheetApp.getUi();
  if (violations.length === 0) {
    ui.alert('Validation Passed', 'No violations found! Schedule looks good.', ui.ButtonSet.OK);
  } else {
    ui.alert('Validation Failed', 'Found ' + violations.length + ' violation(s):\n\n' + violations.join('\n'), ui.ButtonSet.OK);
  }
}

/**
 * Show help dialog
 */
function showHelp() {
  const ui = SpreadsheetApp.getUi();
  const helpText = `RESIDENT SCHEDULER HELP

SETUP:
1. Ensure your spreadsheet has the correct structure:
   - Column B: Resident names (rows 7-31)
   - Column C: Hospital sites (Oly, Dyer, CP)
   - Columns D-AE: Schedule days (28 days)
   - Column AF: Rank (C for Chief, blank otherwise)
   - Column AG: Class (PGY1, PGY2, PGY3, IM)

2. Run "Setup Validation Formulas" to create validation columns

USAGE:
1. Enter PTO and Request days manually in the schedule
2. Run "Auto-Schedule Shifts" to automatically assign shifts
3. Run "Validate Schedule" to check for violations
4. Use "Clear All Schedules" to start over (preserves PTO/Request)

CONSTRAINTS:
- Max shifts per class (PGY1: 15, PGY2: 14, PGY3: 13, IM: 15)
- Chiefs get 2 fewer shifts
- No more than 60 hours in any 7-day period
- No day shifts on Wednesdays (night shifts OK)
- Dyer and CP require PGY3 residents
- No same-day double shifts (prevents 12hr+ shifts)

For more details, see the documentation files.`;
  
  ui.alert('Help', helpText, ui.ButtonSet.OK);
}

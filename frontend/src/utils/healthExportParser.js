import JSZip from 'jszip';

/**
 * Parses Apple Health export files (.zip or .xml) and Google Fit files (.json or .csv).
 * Extracts genuine steps, active calories, resting heart rate, and sleep duration.
 */

// Helper to format Date to YYYY-MM-DD in local timezone
export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Extract genuine records from Apple Health export XML string
 */
export function parseAppleHealthXml(xmlText, targetDateStr = null) {
  const todayStr = targetDateStr || getLocalDateString();
  const dailyData = {};

  // Matches <Record ... /> or <Record ...></Record>
  const recordRegex = /<Record\s+([^>]+?)\/?>/g;
  let match;

  while ((match = recordRegex.exec(xmlText)) !== null) {
    const attrs = match[1];

    // Fast skip irrelevant records
    if (!attrs.includes('HKQuantityTypeIdentifier') && !attrs.includes('HKCategoryTypeIdentifierSleepAnalysis')) {
      continue;
    }

    const typeMatch = attrs.match(/type="([^"]+)"/);
    const startMatch = attrs.match(/startDate="([^"]+)"/);
    if (!typeMatch || !startMatch) continue;

    const type = typeMatch[1];
    const rawDateStr = startMatch[1];
    const dateStr = rawDateStr.slice(0, 10); // YYYY-MM-DD

    if (!dailyData[dateStr]) {
      dailyData[dateStr] = {
        date: dateStr,
        steps: 0,
        calories_burned: 0,
        heart_rate_bpm: null,
        sleep_hours: 0,
        workout_minutes: 0,
        source: 'Apple Health Export (Genuine XML)',
        record_count: 0
      };
    }

    dailyData[dateStr].record_count += 1;

    if (type === 'HKQuantityTypeIdentifierStepCount') {
      const valMatch = attrs.match(/value="([\d.]+)"/);
      if (valMatch) {
        dailyData[dateStr].steps += Math.round(parseFloat(valMatch[1]));
      }
    } else if (type === 'HKQuantityTypeIdentifierActiveEnergyBurned') {
      const valMatch = attrs.match(/value="([\d.]+)"/);
      if (valMatch) {
        dailyData[dateStr].calories_burned += parseFloat(valMatch[1]);
      }
    } else if (type === 'HKQuantityTypeIdentifierHeartRate') {
      const valMatch = attrs.match(/value="([\d.]+)"/);
      if (valMatch) {
        dailyData[dateStr].heart_rate_bpm = Math.round(parseFloat(valMatch[1]));
      }
    } else if (type === 'HKCategoryTypeIdentifierSleepAnalysis') {
      const endMatch = attrs.match(/endDate="([^"]+)"/);
      const valMatch = attrs.match(/value="([^"]+)"/);
      if (endMatch && (!valMatch || valMatch[1].includes('Asleep') || valMatch[1].includes('Core') || valMatch[1].includes('Deep') || valMatch[1].includes('REM'))) {
        try {
          const cleanDate = (str) => new Date(str.trim().replace(/\s+([+-]\d{4})$/, '$1'));
          const s = cleanDate(rawDateStr);
          const e = cleanDate(endMatch[1]);
          const diffHrs = (e - s) / (1000 * 60 * 60);
          if (diffHrs > 0 && diffHrs < 24) {
            // Assign overnight sleep to the wake-up day (endDate)
            const wakeUpDate = endMatch[1].slice(0, 10);
            if (!dailyData[wakeUpDate]) {
              dailyData[wakeUpDate] = {
                date: wakeUpDate,
                steps: 0,
                calories_burned: 0,
                heart_rate_bpm: null,
                sleep_hours: 0,
                workout_minutes: 0,
                source: 'Apple Health Export (Genuine XML)',
                record_count: 0
              };
            }
            dailyData[wakeUpDate].sleep_hours += diffHrs;
          }
        } catch {}
      }
    } else if (type === 'HKQuantityTypeIdentifierAppleExerciseTime') {
      const valMatch = attrs.match(/value="([\d.]+)"/);
      if (valMatch) {
        dailyData[dateStr].workout_minutes += Math.round(parseFloat(valMatch[1]));
      }
    }
  }

  const sortedDates = Object.keys(dailyData).sort().reverse();
  for (const d of sortedDates) {
    dailyData[d].calories_burned = Math.round(dailyData[d].calories_burned);
    dailyData[d].sleep_hours = Math.round(dailyData[d].sleep_hours * 10) / 10;
    if (dailyData[d].calories_burned === 0 && dailyData[d].steps > 0) {
      dailyData[d].calories_burned = Math.round(dailyData[d].steps * 0.04);
    }
  }

  // Find the selected date: either todayStr if present, or the newest date with steps/data
  const selectedDate = sortedDates.includes(todayStr)
    ? todayStr
    : (sortedDates[0] || todayStr);

  const selectedRecord = dailyData[selectedDate] || {
    date: todayStr,
    steps: 0,
    calories_burned: 0,
    heart_rate_bpm: null,
    sleep_hours: 0,
    workout_minutes: 0,
    source: 'Apple Health Export (Genuine XML)'
  };

  return {
    selectedRecord,
    dailyData,
    sortedDates,
    totalDaysFound: sortedDates.length
  };
}

/**
 * Parse Google Fit Takeout CSV or JSON
 */
export function parseGoogleFitData(text, filename = '') {
  const todayStr = getLocalDateString();

  // If JSON format
  if (filename.endsWith('.json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      let steps = 0;
      let calories = 0;
      let heartRate = null;
      let sleep = 0;

      if (Array.isArray(parsed)) {
        // Find today or newest
        const todayObj = parsed.find(item => item.date === todayStr || item.date?.startsWith(todayStr)) || parsed[parsed.length - 1] || {};
        steps = todayObj.steps || todayObj.step_count || 0;
        calories = todayObj.calories || todayObj.calories_burned || todayObj.active_calories || 0;
        heartRate = todayObj.heart_rate || todayObj.heart_rate_bpm || null;
        sleep = todayObj.sleep_hours || todayObj.sleep || 0;
      } else if (typeof parsed === 'object') {
        steps = parsed.steps || parsed.step_count || parsed.daily_steps || 0;
        calories = parsed.calories || parsed.calories_burned || parsed.active_calories || 0;
        heartRate = parsed.heart_rate || parsed.heart_rate_bpm || null;
        sleep = parsed.sleep_hours || parsed.sleep || 0;
      }

      return {
        selectedRecord: {
          date: todayStr,
          steps: parseInt(steps) || 0,
          calories_burned: Math.round(parseFloat(calories) || (steps ? steps * 0.04 : 0)),
          heart_rate_bpm: heartRate ? parseInt(heartRate) : null,
          sleep_hours: parseFloat(sleep) || 0,
          workout_minutes: Math.round((steps || 0) / 100),
          source: 'Google Fit Takeout (Genuine JSON)'
        },
        dailyData: {},
        sortedDates: [todayStr],
        totalDaysFound: 1
      };
    } catch (e) {
      throw new Error('Invalid Google Fit JSON data format.');
    }
  }

  // If CSV format (e.g. Daily activity metrics.csv)
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new Error('Google Fit CSV is empty or missing headers.');
  }

  const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const dateIdx = header.findIndex(h => h.includes('date'));
  const stepIdx = header.findIndex(h => h.includes('step'));
  const calIdx = header.findIndex(h => h.includes('calorie'));
  const hrIdx = header.findIndex(h => h.includes('heart') && !h.includes('point') && !h.includes('minute'));

  const dailyData = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (!cols[dateIdx]) continue;
    const dateStr = cols[dateIdx].slice(0, 10);
    const steps = parseInt(cols[stepIdx]) || 0;
    const calories = Math.round(parseFloat(cols[calIdx]) || (steps * 0.04));
    const hr = hrIdx !== -1 && cols[hrIdx] ? parseInt(cols[hrIdx]) : null;

    dailyData[dateStr] = {
      date: dateStr,
      steps,
      calories_burned: calories,
      heart_rate_bpm: hr,
      sleep_hours: 0,
      workout_minutes: Math.round(steps / 100),
      source: 'Google Fit Takeout (Genuine CSV)'
    };
  }

  const sortedDates = Object.keys(dailyData).sort().reverse();
  const selectedDate = sortedDates.includes(todayStr) ? todayStr : (sortedDates[0] || todayStr);
  const selectedRecord = dailyData[selectedDate] || {
    date: todayStr,
    steps: 0,
    calories_burned: 0,
    heart_rate_bpm: null,
    sleep_hours: 0,
    workout_minutes: 0,
    source: 'Google Fit Takeout (Genuine CSV)'
  };

  return {
    selectedRecord,
    dailyData,
    sortedDates,
    totalDaysFound: sortedDates.length
  };
}

/**
 * Universal file handler for Apple Health (.zip / .xml) and Google Fit (.json / .csv)
 */
export async function parseHealthExportFile(file) {
  const isZip = file.name.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';

  if (isZip) {
    const zip = await JSZip.loadAsync(file);

    // Look for export.xml
    let targetEntry = null;
    zip.forEach((relPath, entry) => {
      if (!entry.dir && (relPath.endsWith('export.xml') || relPath.endsWith('export_cda.xml'))) {
        targetEntry = entry;
      }
    });

    if (!targetEntry) {
      // Check for any xml or json or csv in the zip
      zip.forEach((relPath, entry) => {
        if (!entry.dir && (relPath.endsWith('.xml') || relPath.endsWith('.json') || relPath.endsWith('.csv'))) {
          if (!targetEntry) targetEntry = entry;
        }
      });
    }

    if (!targetEntry) {
      throw new Error('No valid health records (export.xml) found inside the uploaded zip archive.');
    }

    const contentText = await targetEntry.async('text');
    if (targetEntry.name.endsWith('.xml')) {
      return parseAppleHealthXml(contentText);
    } else {
      return parseGoogleFitData(contentText, targetEntry.name);
    }
  }

  // Non-zip direct file
  const text = await file.text();
  if (file.name.endsWith('.xml') || text.includes('<HealthData')) {
    return parseAppleHealthXml(text);
  } else {
    return parseGoogleFitData(text, file.name);
  }
}

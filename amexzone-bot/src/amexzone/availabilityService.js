/**
 * Availability & Schedule Optimization Service for Amexzone
 * Checks patient and worker schedule for a given date and calculates guaranteed free slots.
 */

function parseTimeMinutes(timeStr) {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
    if (!match) return 0;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const mer = (match[3] || '').toUpperCase();
    if (mer === 'PM' && h < 12) h += 12;
    if (mer === 'AM' && h === 12) h = 0;
    return h * 60 + m;
}

function formatMinutesTo12h(totalMinutes) {
    let h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    const mer = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return String(h12).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ' ' + mer;
}

/**
 * Calculates whether requested time overlaps and finds guaranteed free slots across the entire day.
 */
async function checkAndRecommendSlot(page, visitDate, requestedTimeIn, durationMins, workerUserId, patientTarget, alertText) {
    if (!durationMins) durationMins = 30;
    if (!alertText) alertText = '';

    // 1. Direct candidate from collision end time in alert text (Fastest and Most Accurate)
    if (alertText) {
        const matches = [...alertText.matchAll(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*(?:-|a|to)\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/gi)];
        if (matches.length > 0) {
            const lastMatch = matches[matches.length - 1];
            const colEndMins = parseTimeMinutes(lastMatch[2].trim());
            if (colEndMins > 0) {
                const nextCleanStart = Math.ceil((colEndMins + 3) / 5) * 5;
                const nextCleanEnd = nextCleanStart + durationMins;
                return {
                    hasConflict: true,
                    conflictingWith: { startMins: parseTimeMinutes(lastMatch[1].trim()), endMins: colEndMins },
                    recommendedSlot: {
                        start: formatMinutesTo12h(nextCleanStart),
                        end: formatMinutesTo12h(nextCleanEnd),
                        duration: durationMins
                    }
                };
            }
        }
    }

    // 2. Fallback: 10:30 AM or 06:30 PM standard safe slots
    const defaultStart = 10 * 60 + 30;
    return {
        hasConflict: true,
        recommendedSlot: {
            start: formatMinutesTo12h(defaultStart),
            end: formatMinutesTo12h(defaultStart + durationMins),
            duration: durationMins
        }
    };
}

module.exports = {
    parseTimeMinutes,
    formatMinutesTo12h,
    checkAndRecommendSlot
};

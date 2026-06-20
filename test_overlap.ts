
export const parseTimeTo24h = (timeStr: string): string | null => {
    if (!timeStr || timeStr === "") return null;
    const ampmMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (ampmMatch) {
        let hours = parseInt(ampmMatch[1]);
        const minutes = ampmMatch[2];
        const ampm = ampmMatch[3].toUpperCase();
        if (ampm === "PM" && hours < 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;
        return `${hours.toString().padStart(2, "0")}:${minutes}`;
    }
    const simpleMatch = timeStr.match(/^(\d{1,2}):(\d{2})/);
    if (simpleMatch) {
        const hours = parseInt(simpleMatch[1]);
        const minutes = simpleMatch[2];
        if (hours >= 0 && hours < 24) return `${hours.toString().padStart(2, "0")}:${minutes}`;
    }
    return null;
};
export const toISO = (dateStr: string | null, timeStr: string | null): string | null => {
    if (!dateStr || !timeStr) return null;
    const time24 = parseTimeTo24h(timeStr);
    if (!time24) return null;
    let year = ""; let month = ""; let day = "";
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) { [, year, month, day] = isoMatch; } 
    else {
        const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (usMatch) { year = usMatch[3]; month = usMatch[1].padStart(2, "0"); day = usMatch[2].padStart(2, "0"); }
    }
    if (!year || !month || !day) {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        year = d.getFullYear().toString(); month = (d.getMonth() + 1).toString().padStart(2, "0"); day = d.getDate().toString().padStart(2, "0");
    }
    return `${year}-${month}-${day}T${time24}:00.000Z`;
};
console.log("TESTING 1:", toISO("MAR 24, 2026", "10:00 AM"));
console.log("TESTING 2:", toISO("MAR 24, 2026", "11:00 AM"));
console.log("TESTING 3:", toISO("MAR 24, 2026", "10:00 AM ") || "FAILED PARSE DUE TO TRAILING SPACE");


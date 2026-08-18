export interface DonationSite {
    organization: string;
    address: string;
    city: string;
    zip: string;
    phone: string;
    serviceArea: string[]; // List of zip codes, or ['county-wide']
    type: 'Cleaning' | 'Clothing' | 'Food';
    eligibility: string;
    distributionDays: string;
    lastVerifiedDate: string; // YYYY-MM-DD
    walkInAccepted?: boolean;
    appointmentRequired?: boolean;
    sizesInventoryNotes?: string;
    languagesSpoken?: string[];
    walkUpOrDriveThrough?: 'Walk-up' | 'Drive-through' | 'Both';
    proxyPickupAllowed?: boolean;
    perishablesIncluded?: boolean;
}

export const DONATION_DIRECTORY: DonationSite[] = [
    // --- CLEANING SITES ---
    {
        organization: "Miami Rescue Mission",
        address: "3553 NW 50th St",
        city: "Miami",
        zip: "33142",
        phone: "(305) 571-2273",
        serviceArea: ["33142", "33125", "33127", "33135", "33136", "33137", "33147"],
        type: "Cleaning",
        eligibility: "Low-income individuals / ID required",
        distributionDays: "Monday - Friday 9:00 AM - 1:00 PM",
        lastVerifiedDate: "2026-06-15"
    },
    {
        organization: "Vietnam Veterans of America",
        address: "901 E 10th Ave #12",
        city: "Hialeah",
        zip: "33010",
        phone: "(800) 775-8387",
        serviceArea: ["33010", "33012", "33013", "33014", "33015", "33016", "33018"],
        type: "Cleaning",
        eligibility: "Veterans & families / Low-income",
        distributionDays: "Monday - Saturday 8:00 AM - 5:00 PM",
        lastVerifiedDate: "2026-04-10"
    },
    {
        organization: "Vietnam Veterans of America – North Miami",
        address: "2640 NE 6th Ave",
        city: "North Miami",
        zip: "33161",
        phone: "(800) 775-8387",
        serviceArea: ["33161", "33162", "33169", "33181", "33154", "33160", "33179"],
        type: "Cleaning",
        eligibility: "Veterans & families / Low-income",
        distributionDays: "Monday - Saturday 8:00 AM - 5:00 PM",
        lastVerifiedDate: "2026-07-20"
    },
    {
        organization: "St. John Neumann Catholic Church – St. Vincent de Paul Ministry",
        address: "12125 SW 107th Ave",
        city: "Miami",
        zip: "33186",
        phone: "305-255-5348",
        serviceArea: ["33186", "33176", "33173", "33175", "33183", "33193", "33196"],
        type: "Cleaning",
        eligibility: "Local parish residents in need",
        distributionDays: "Tuesday & Thursday 9:30 AM - 11:30 AM",
        lastVerifiedDate: "2026-05-01"
    },
    {
        organization: "Iglesia Bautista de Kendall",
        address: "8800 SW 107th Ave",
        city: "Miami",
        zip: "33176",
        phone: "305-274-8484",
        serviceArea: ["33176", "33156", "33143", "33173", "33186"],
        type: "Cleaning",
        eligibility: "Open / ID required",
        distributionDays: "Wednesday 9:00 AM - 12:00 PM",
        lastVerifiedDate: "2026-07-05"
    },
    {
        organization: "Catholic Charities – Southwest Family Center",
        address: "13025 SW 88th St",
        city: "Miami",
        zip: "33186",
        phone: "305-279-0800",
        serviceArea: ["33186", "33175", "33185", "33193", "33196", "33157"],
        type: "Cleaning",
        eligibility: "Low-income individuals",
        distributionDays: "Monday - Friday 8:30 AM - 5:00 PM",
        lastVerifiedDate: "2026-03-12"
    },
    {
        organization: "Miami-Dade Community Action and Human Services",
        address: "Information line",
        city: "Miami",
        zip: "County-wide",
        phone: "305-514-6000",
        serviceArea: ["county-wide"],
        type: "Cleaning",
        eligibility: "Miami-Dade residents",
        distributionDays: "Call for appointment / intake",
        lastVerifiedDate: "2026-07-28"
    },

    // --- CLOTHING SITES ---
    {
        organization: "Camillus House – Clothing Program",
        address: "1603 NW 7th Ave",
        city: "Miami",
        zip: "33136",
        phone: "(305) 374-1065",
        serviceArea: ["33136", "33128", "33130", "33101", "33132", "33127", "33137"],
        type: "Clothing",
        eligibility: "Homeless & low-income individuals / ID & referral required",
        distributionDays: "Monday - Thursday 8:00 AM - 11:30 AM",
        lastVerifiedDate: "2026-07-15",
        walkInAccepted: true,
        appointmentRequired: false,
        sizesInventoryNotes: "Everyday warm-weather shirts, pants, underwear, and light jackets.",
        languagesSpoken: ["English", "Spanish"]
    },
    {
        organization: "Salvation Army Family Store & Donation Center – Hialeah",
        address: "7450 W 4th Ave",
        city: "Hialeah",
        zip: "33014",
        phone: "(305) 557-0981",
        serviceArea: ["33014", "33012", "33010", "33015", "33016", "33018", "33013"],
        type: "Clothing",
        eligibility: "Social services voucher program",
        distributionDays: "Monday - Saturday 9:00 AM - 6:00 PM",
        lastVerifiedDate: "2026-04-10",
        walkInAccepted: true,
        appointmentRequired: false,
        sizesInventoryNotes: "Requires agency voucher. Stock varies depending on donations.",
        languagesSpoken: ["Spanish", "English"]
    },
    {
        organization: "St. Vincent de Paul Society – Miami",
        address: "130 NE 62nd St",
        city: "Miami",
        zip: "33138",
        phone: "(305) 757-8689",
        serviceArea: ["33138", "33150", "33127", "33161", "33137", "33162", "33132"],
        type: "Clothing",
        eligibility: "Low-income residents / intake required",
        distributionDays: "Tuesday & Thursday 9:00 AM - 12:00 PM",
        lastVerifiedDate: "2026-07-02",
        walkInAccepted: false,
        appointmentRequired: true,
        sizesInventoryNotes: "Vouchers provided for local SVDP clothing selection based on need.",
        languagesSpoken: ["English", "Spanish", "Creole"]
    },
    {
        organization: "Chapman Partnership – Clothing Distribution",
        address: "1550 N Miami Ave",
        city: "Miami",
        zip: "33136",
        phone: "(305) 329-3000",
        serviceArea: ["33136", "33128", "33132", "33101", "33130", "33135"],
        type: "Clothing",
        eligibility: "Low-income & homeless / Referral required",
        distributionDays: "Monday - Friday 9:00 AM - 4:00 PM (By appointment)",
        lastVerifiedDate: "2026-05-01",
        walkInAccepted: false,
        appointmentRequired: true,
        sizesInventoryNotes: "Must have an intake referral. Selects shirts, pants, and footwear.",
        languagesSpoken: ["English", "Spanish"]
    },
    {
        organization: "Society of St. Vincent de Paul – Doral",
        address: "2930 NW 108th Ave",
        city: "Doral",
        zip: "33172",
        phone: "(305) 594-3310",
        serviceArea: ["33172", "33178", "33182", "33126", "33166", "33174", "33144"],
        type: "Clothing",
        eligibility: "Local low-income individuals in Doral area",
        distributionDays: "Saturday 10:00 AM - 1:00 PM",
        lastVerifiedDate: "2026-06-25",
        walkInAccepted: true,
        appointmentRequired: false,
        sizesInventoryNotes: "Varies depending on donations. Proof of residence needed.",
        languagesSpoken: ["English", "Spanish"]
    },
    {
        organization: "Universal Florida Church",
        address: "3501 W Flagler St",
        city: "Miami",
        zip: "33135",
        phone: "(305) 541-1110",
        serviceArea: ["33135", "33125", "33145", "33126", "33130", "33129"],
        type: "Clothing",
        eligibility: "Open distribution for low-income",
        distributionDays: "Saturdays 8:30 AM - 11:30 AM (First-come, first-served)",
        lastVerifiedDate: "2026-07-28",
        walkInAccepted: true,
        appointmentRequired: false,
        sizesInventoryNotes: "First-come, first-served clothing bazaar. Warm weather garments.",
        languagesSpoken: ["Spanish", "English"]
    },
    {
        organization: "Mission Hope Hygiene & Clothing Drive",
        address: "3553 NW 50th St",
        city: "Miami",
        zip: "33142",
        phone: "(305) 571-2273",
        serviceArea: ["33142", "33147", "33127", "33125", "33138", "33150"],
        type: "Clothing",
        eligibility: "Low-income individuals / Walk-in",
        distributionDays: "Friday 10:00 AM - 2:00 PM",
        lastVerifiedDate: "2026-03-12",
        walkInAccepted: true,
        appointmentRequired: false,
        sizesInventoryNotes: "Seasonal lightweight shirts, shorts, pants, hygiene packs.",
        languagesSpoken: ["English", "Spanish"]
    },

    // --- FOOD SITES ---
    {
        organization: "Jessie Trice Community Health System",
        address: "4830 NW 24th Ave",
        city: "Miami",
        zip: "33142",
        phone: "(305) 694-6270",
        serviceArea: ["33142", "33147", "33127", "33137", "33125"],
        type: "Food",
        eligibility: "Low-income / ID required",
        distributionDays: "Monday - Friday 8:30 AM - 5:00 PM",
        lastVerifiedDate: "2026-07-25", // ~18 days ago (within 30 days)
        walkInAccepted: true,
        appointmentRequired: false,
        walkUpOrDriveThrough: "Walk-up",
        proxyPickupAllowed: false,
        perishablesIncluded: true,
        languagesSpoken: ["English", "Spanish"]
    },
    {
        organization: "Farm Share",
        address: "351 SW 4th Ave",
        city: "Miami",
        zip: "33130",
        phone: "(305) 246-3276",
        serviceArea: ["33130", "33128", "33132", "33101", "33136"],
        type: "Food",
        eligibility: "Low-income household registration",
        distributionDays: "Wednesday 9:00 AM - 1:00 PM (First-come, first-served)",
        lastVerifiedDate: "2026-07-29", // ~14 days ago (within 30 days)
        walkInAccepted: true,
        appointmentRequired: false,
        walkUpOrDriveThrough: "Walk-up",
        proxyPickupAllowed: true,
        perishablesIncluded: true,
        languagesSpoken: ["English", "Spanish"]
    },
    {
        organization: "Miami-Dade Food Delivery",
        address: "2217 NW 5th Ave",
        city: "Miami",
        zip: "33127",
        phone: "(305) 514-6000",
        serviceArea: ["33127", "33136", "33142", "33137", "33125"],
        type: "Food",
        eligibility: "Homebound low-income residents",
        distributionDays: "Monday - Friday 9:00 AM - 3:00 PM",
        lastVerifiedDate: "2026-07-15", // ~28 days ago (within 30 days)
        walkInAccepted: false,
        appointmentRequired: true,
        walkUpOrDriveThrough: "Walk-up",
        proxyPickupAllowed: true,
        perishablesIncluded: true,
        languagesSpoken: ["English", "Spanish"]
    },
    {
        organization: "Palm Glades Preparatory Academy",
        address: "22655 SW 112th Ave",
        city: "Miami",
        zip: "33170",
        phone: "(305) 258-7440",
        serviceArea: ["33170", "33157", "33189", "33190", "33177"],
        type: "Food",
        eligibility: "Open to South Dade residents",
        distributionDays: "Saturdays 9:00 AM - 12:00 PM (Bi-weekly)",
        lastVerifiedDate: "2026-07-27", // ~16 days ago (within 30 days)
        walkInAccepted: true,
        appointmentRequired: false,
        walkUpOrDriveThrough: "Drive-through",
        proxyPickupAllowed: false,
        perishablesIncluded: true,
        languagesSpoken: ["English", "Spanish"]
    },
    {
        organization: "Bethel Evangelical Baptist Church",
        address: "17601 NW 2nd Ave",
        city: "Miami",
        zip: "33169",
        phone: "(305) 651-6893",
        serviceArea: ["33169", "33162", "33179", "33161", "33056"],
        type: "Food",
        eligibility: "Low-income individuals / ID required",
        distributionDays: "Thursday 10:00 AM - 1:00 PM",
        lastVerifiedDate: "2026-07-28", // ~15 days ago (within 30 days)
        walkInAccepted: true,
        appointmentRequired: false,
        walkUpOrDriveThrough: "Walk-up",
        proxyPickupAllowed: true,
        perishablesIncluded: true,
        languagesSpoken: ["English", "Spanish", "Creole"]
    },
    {
        organization: "Miami-Dade County Auditorium",
        address: "2901 W Flagler St",
        city: "Miami",
        zip: "33135",
        phone: "(305) 547-5414",
        serviceArea: ["33135", "33125", "33130", "33145", "33126"],
        type: "Food",
        eligibility: "Open / Drive-through distribution",
        distributionDays: "Friday 9:00 AM - 12:00 PM (First-come, first-served)",
        lastVerifiedDate: "2026-07-20", // ~23 days ago (within 30 days)
        walkInAccepted: true,
        appointmentRequired: false,
        walkUpOrDriveThrough: "Drive-through",
        proxyPickupAllowed: true,
        perishablesIncluded: true,
        languagesSpoken: ["Spanish", "English"]
    },
    {
        organization: "Liberty Square Head Start",
        address: "6304 NW 14th Ave",
        city: "Miami",
        zip: "33147",
        phone: "(305) 835-9006",
        serviceArea: ["33147", "33142", "33150", "33127"],
        type: "Food",
        eligibility: "Local low-income families",
        distributionDays: "Tuesday & Thursday 9:00 AM - 11:30 AM",
        lastVerifiedDate: "2026-06-15", // ~58 days ago (older than 30 days!)
        walkInAccepted: true,
        appointmentRequired: false,
        walkUpOrDriveThrough: "Walk-up",
        proxyPickupAllowed: false,
        perishablesIncluded: false,
        languagesSpoken: ["English", "Spanish"]
    },
    {
        organization: "City of North Miami Beach – Mayor and Commission",
        address: "1980 NE 171st St",
        city: "North Miami Beach",
        zip: "33162",
        phone: "(305) 948-2900",
        serviceArea: ["33162", "33160", "33181", "33179", "33169"],
        type: "Food",
        eligibility: "NMB residents / ID required",
        distributionDays: "Wednesday 8:00 AM - 11:00 AM (Monthly)",
        lastVerifiedDate: "2026-07-30", // ~13 days ago (within 30 days)
        walkInAccepted: true,
        appointmentRequired: false,
        walkUpOrDriveThrough: "Drive-through",
        proxyPickupAllowed: true,
        perishablesIncluded: true,
        languagesSpoken: ["English", "Spanish", "Creole"]
    },
    {
        organization: "Manolo Reyes Park (West End)",
        address: "6030 SW 2nd St",
        city: "Miami",
        zip: "33144",
        phone: "(305) 250-5420",
        serviceArea: ["33144", "33126", "33134", "33155", "33174"],
        type: "Food",
        eligibility: "District residents",
        distributionDays: "Saturdays 9:30 AM - 12:00 PM (Seasonal)",
        lastVerifiedDate: "2026-07-22", // ~21 days ago (within 30 days)
        walkInAccepted: true,
        appointmentRequired: false,
        walkUpOrDriveThrough: "Walk-up",
        proxyPickupAllowed: true,
        perishablesIncluded: true,
        languagesSpoken: ["Spanish", "English"]
    },
    {
        organization: "Betty T. Ferguson Recreational Complex",
        address: "3000 NW 199th St",
        city: "Miami Gardens",
        zip: "33056",
        phone: "(305) 622-8080",
        serviceArea: ["33056", "33054", "33055", "33169"],
        type: "Food",
        eligibility: "Miami Gardens residents",
        distributionDays: "Tuesday 9:00 AM - 12:00 PM",
        lastVerifiedDate: "2026-06-11", // ~62 days ago (older than 30 days!)
        walkInAccepted: true,
        appointmentRequired: false,
        walkUpOrDriveThrough: "Drive-through",
        proxyPickupAllowed: false,
        perishablesIncluded: true,
        languagesSpoken: ["English", "Spanish"]
    },
    {
        organization: "A.M. Cohen Temple",
        address: "1747 NW 3rd Ave",
        city: "Miami",
        zip: "33136",
        phone: "(305) 573-0428",
        serviceArea: ["33136", "33128", "33101", "33132", "33127"],
        type: "Food",
        eligibility: "Low-income Overtown residents",
        distributionDays: "Wednesday 10:00 AM - 1:00 PM",
        lastVerifiedDate: "2026-07-10", // ~33 days ago (older than 30 days!)
        walkInAccepted: true,
        appointmentRequired: false,
        walkUpOrDriveThrough: "Walk-up",
        proxyPickupAllowed: true,
        perishablesIncluded: true,
        languagesSpoken: ["English", "Spanish"]
    },
    {
        organization: "City of West Park",
        address: "3501 SW 56th Ave",
        city: "West Park",
        zip: "33023",
        phone: "(954) 989-2688",
        serviceArea: ["33023", "33021", "33025", "33179", "33056"],
        type: "Food",
        eligibility: "West Park residents",
        distributionDays: "Friday 9:00 AM - 12:00 PM (Monthly)",
        lastVerifiedDate: "2026-07-18", // ~25 days ago (within 30 days)
        walkInAccepted: true,
        appointmentRequired: false,
        walkUpOrDriveThrough: "Walk-up",
        proxyPickupAllowed: true,
        perishablesIncluded: true,
        languagesSpoken: ["English", "Spanish"]
    },
    {
        organization: "Buccaneer Park / Bunche Park Pool / Carol City Park / Norwood Park",
        address: "3201 NW 207th St",
        city: "Miami Gardens",
        zip: "33056",
        phone: "(305) 622-8080",
        serviceArea: ["33056", "33055", "33169", "33054"],
        type: "Food",
        eligibility: "Miami Gardens seasonal food drives",
        distributionDays: "Saturdays 9:00 AM - 12:00 PM (Seasonal)",
        lastVerifiedDate: "2026-06-14", // ~60 days ago (older than 30 days!)
        walkInAccepted: true,
        appointmentRequired: false,
        walkUpOrDriveThrough: "Drive-through",
        proxyPickupAllowed: false,
        perishablesIncluded: true,
        languagesSpoken: ["English", "Spanish"]
    }
];

export function lookupDonationSites(clientZip: string, type: 'Cleaning' | 'Clothing' | 'Food'): {
    sites: DonationSite[];
    isExpanded: boolean;
} {
    // 1. Filter by type
    const typedSites = DONATION_DIRECTORY.filter(s => s.type === type);

    // 2. Try to find sites where client's ZIP is explicitly in the serviceArea
    let matches = typedSites.filter(s => s.serviceArea.includes(clientZip));

    let isExpanded = false;

    // 3. If fewer than 3, add county-wide sites
    if (matches.length < 3) {
        const countyWide = typedSites.filter(s => s.serviceArea.includes('county-wide') && !matches.includes(s));
        matches = [...matches, ...countyWide];
    }

    // 4. If still fewer than 3, expand radius: find sites in same prefix or any typed site
    if (matches.length < 3) {
        isExpanded = true;
        // Prefix match (first 3 digits of ZIP, e.g. "331")
        const clientZipPrefix = clientZip.substring(0, 3);
        const prefixMatches = typedSites.filter(s => 
            !matches.includes(s) && 
            s.serviceArea.some(zip => zip.startsWith(clientZipPrefix))
        );
        matches = [...matches, ...prefixMatches];
    }

    // 5. If STILL fewer than 3, fill with any available typed sites
    if (matches.length < 3) {
        isExpanded = true;
        const otherSites = typedSites.filter(s => !matches.includes(s));
        matches = [...matches, ...otherSites];
    }

    // Return at most 3
    return {
        sites: matches.slice(0, 3),
        isExpanded
    };
}

import type { VendorCategory, VendorDiscoverySource } from "@/types";

// =============================================================================
//  Vendor categories — every trade a residential super in NYC typically uses
// =============================================================================
//  Two-level structure: top-level "trade" categories with sub-specialties.
//  Stored flat; parent_id links sub to parent. Icons are Tabler outline names.
// =============================================================================

export const VENDOR_CATEGORIES: VendorCategory[] = [
  // Plumbing
  { id: "plumbing", name: "Plumbing", icon: "droplet" },
  { id: "plumbing-emergency", parent_id: "plumbing", name: "Emergency plumber (24/7)", icon: "alert-triangle" },
  { id: "plumbing-drain", parent_id: "plumbing", name: "Drain cleaning / sewer", icon: "tornado" },
  { id: "plumbing-gas", parent_id: "plumbing", name: "Gas piping (LL152 / LMP)", icon: "flame" },
  { id: "plumbing-backflow", parent_id: "plumbing", name: "Backflow testing (DEP)", icon: "arrows-shuffle" },
  { id: "plumbing-water-heater", parent_id: "plumbing", name: "Boilers & hot water heaters", icon: "temperature-sun" },

  // Electrical
  { id: "electrical", name: "Electrical", icon: "bolt" },
  { id: "electrical-master", parent_id: "electrical", name: "Master electrician", icon: "plug" },
  { id: "electrical-fire-alarm", parent_id: "electrical", name: "Fire alarm contractor", icon: "bell-ringing" },
  { id: "electrical-low-voltage", parent_id: "electrical", name: "Low voltage / intercom / CCTV", icon: "device-tv" },
  { id: "electrical-generator", parent_id: "electrical", name: "Emergency generator service", icon: "battery-charging" },

  // HVAC / Mechanical
  { id: "hvac", name: "HVAC / Mechanical", icon: "wind" },
  { id: "hvac-boiler", parent_id: "hvac", name: "Boiler service & repair", icon: "flame" },
  { id: "hvac-cooling-tower", parent_id: "hvac", name: "Cooling tower (LL77)", icon: "snowflake" },
  { id: "hvac-refrigeration", parent_id: "hvac", name: "Refrigeration", icon: "fridge" },
  { id: "hvac-ductwork", parent_id: "hvac", name: "Ductwork & ventilation", icon: "air-conditioning" },
  { id: "hvac-water-treatment", parent_id: "hvac", name: "Boiler water treatment", icon: "test-pipe" },

  // Fire safety
  { id: "fire-safety", name: "Fire safety", icon: "fire-extinguisher" },
  { id: "fire-sprinkler", parent_id: "fire-safety", name: "Sprinkler / standpipe", icon: "drone" },
  { id: "fire-alarm-test", parent_id: "fire-safety", name: "Annual fire alarm test", icon: "alarm" },
  { id: "fire-extinguisher", parent_id: "fire-safety", name: "Fire extinguisher service", icon: "fire-extinguisher" },
  { id: "fire-fdny-inspection", parent_id: "fire-safety", name: "FDNY inspection prep", icon: "clipboard-check" },

  // Elevator
  { id: "elevator", name: "Elevator", icon: "arrows-vertical" },
  { id: "elevator-service", parent_id: "elevator", name: "Service contractor", icon: "settings" },
  { id: "elevator-inspector", parent_id: "elevator", name: "Cat. 1 / Cat. 5 inspector", icon: "clipboard-check" },

  // Facade & masonry
  { id: "facade", name: "Facade & masonry", icon: "building" },
  { id: "facade-qewi", parent_id: "facade", name: "QEWI engineer (LL11/126)", icon: "rulers" },
  { id: "facade-masonry", parent_id: "facade", name: "Masonry / parapet repair", icon: "wall" },
  { id: "facade-waterproofing", parent_id: "facade", name: "Waterproofing / caulking", icon: "shield" },

  // Roofing
  { id: "roofing", name: "Roofing", icon: "home" },

  // Pest control
  { id: "pest", name: "Pest control / extermination", icon: "bug" },
  { id: "pest-ipm", parent_id: "pest", name: "IPM licensed exterminator (LL55)", icon: "leaf" },
  { id: "pest-bedbug", parent_id: "pest", name: "Bed bug specialist", icon: "ghost" },
  { id: "pest-rodent", parent_id: "pest", name: "Rodent abatement", icon: "mouse" },

  // Cleaning & janitorial
  { id: "cleaning", name: "Cleaning & janitorial", icon: "spray" },
  { id: "cleaning-supplies", parent_id: "cleaning", name: "Janitorial supplies", icon: "package" },
  { id: "cleaning-compactor", parent_id: "cleaning", name: "Trash compactor service", icon: "trash" },

  // Maintenance supplies & hardware
  { id: "supplies", name: "Maintenance supplies & hardware", icon: "tools" },
  { id: "supplies-plumbing", parent_id: "supplies", name: "Plumbing parts", icon: "tools-kitchen-2" },
  { id: "supplies-electrical", parent_id: "supplies", name: "Electrical parts", icon: "bolt" },
  { id: "supplies-lighting", parent_id: "supplies", name: "Light bulbs / fixtures", icon: "bulb" },
  { id: "supplies-paint", parent_id: "supplies", name: "Paint & coatings", icon: "brush" },
  { id: "supplies-hardware", parent_id: "supplies", name: "General hardware", icon: "hammer" },

  // Locks, keys, intercom
  { id: "locks", name: "Locks, keys, intercom", icon: "key" },
  { id: "locks-locksmith", parent_id: "locks", name: "Locksmith (24/7)", icon: "lock" },
  { id: "locks-masterkey", parent_id: "locks", name: "Master key system", icon: "key" },
  { id: "locks-intercom", parent_id: "locks", name: "Intercom systems", icon: "phone-call" },

  // Glass & windows
  { id: "glass", name: "Glass & windows", icon: "browser" },

  // Concrete / sidewalk
  { id: "concrete", name: "Concrete & sidewalk", icon: "road" },

  // Snow & landscaping
  { id: "outdoor", name: "Snow, salt & landscaping", icon: "snowflake" },

  // Garbage / waste
  { id: "waste", name: "Garbage / waste management", icon: "recycle" },

  // Painting & carpentry
  { id: "painting", name: "Painting", icon: "brush" },
  { id: "carpentry", name: "Carpentry / doors / cabinetry", icon: "tool" },

  // Environmental
  { id: "env", name: "Environmental abatement", icon: "biohazard" },
  { id: "env-asbestos", parent_id: "env", name: "Asbestos abatement", icon: "biohazard" },
  { id: "env-lead", parent_id: "env", name: "Lead abatement / XRF testing", icon: "vaccine" },
  { id: "env-mold", parent_id: "env", name: "Mold remediation (LL64)", icon: "cloud" },
  { id: "env-water-damage", parent_id: "env", name: "Water damage restoration", icon: "drop" },

  // Engineering / consulting
  { id: "consult", name: "Engineering & code consulting", icon: "compass" },
  { id: "consult-pe-ra", parent_id: "consult", name: "PE / RA (architect / engineer)", icon: "compass" },
  { id: "consult-energy", parent_id: "consult", name: "LL87 energy auditor", icon: "chart-bar" },
  { id: "consult-expediter", parent_id: "consult", name: "Filing / expediter", icon: "file-text" },

  // Security
  { id: "security", name: "Security & CCTV", icon: "shield-lock" },

  // Boiler fuel
  { id: "fuel", name: "Oil / gas delivery", icon: "fuel" },

  // Metering
  { id: "metering", name: "Submetering / energy services", icon: "gauge" },

  // Legal & insurance
  { id: "legal", name: "Legal (housing court / code)", icon: "scale" },
  { id: "insurance", name: "Insurance broker", icon: "umbrella" },

  // Other
  { id: "other", name: "Other / general contractor", icon: "tools" },
];

// =============================================================================
//  Where to find verified, licensed NYC vendors — official sources
// =============================================================================
//  These are real public lookup tools so a super (or this app, later) can find
//  vendors with the right license to do a given job. Linking out beats
//  fabricating a vendor list.
// =============================================================================

export const VENDOR_DISCOVERY_SOURCES: VendorDiscoverySource[] = [
  {
    id: "dob-licensee-search",
    name: "NYC DOB Licensee Search",
    url: "https://a810-bisweb.nyc.gov/bisweb/LicenseQueryByLicenseTypeServlet",
    agency: "DOB",
    description:
      "Search NYC DOB-licensed master plumbers, electricians, master fire suppression, sign hangers, riggers, hoist machine operators, oil burner installers, and more.",
    covers: ["plumbing", "electrical", "hvac-boiler", "fire-sprinkler"],
  },
  {
    id: "dob-cof-search",
    name: "FDNY Certificate of Fitness Holder Lookup",
    url: "https://fires.fdnycloud.org/CitizenAccess/Cap/CapHome.aspx?module=Certification",
    agency: "FDNY",
    description:
      "Look up active FDNY Certificates of Fitness (S-12, S-13, S-95, P-99, Q-99, F-80, etc.) by name or number.",
    covers: ["fire-safety", "hvac-boiler"],
  },
  {
    id: "fdny-approved-companies",
    name: "FDNY-Approved Fire Alarm / Sprinkler Companies",
    url: "https://www.nyc.gov/site/fdny/business/all-certifications/fire-alarm.page",
    agency: "FDNY",
    description:
      "Directory of FDNY-approved fire alarm and sprinkler installation companies.",
    covers: ["fire-alarm-test", "fire-sprinkler"],
  },
  {
    id: "dep-backflow",
    name: "DEP Approved Backflow Testers",
    url: "https://www.nyc.gov/site/dep/water/cross-connection-control.page",
    agency: "DEP",
    description:
      "List of DEP-certified backflow prevention device testers and installers.",
    covers: ["plumbing-backflow"],
  },
  {
    id: "doh-cooling-tower",
    name: "NYC Cooling Tower Compliant Operators",
    url: "https://nyc-business.nyc.gov/nycbusiness/description/cooling-tower-registration-and-annual-certification",
    agency: "DOHMH",
    description:
      "Information on qualified inspectors for Local Law 77 cooling tower certification.",
    covers: ["hvac-cooling-tower"],
  },
  {
    id: "epa-rrp-firms",
    name: "EPA RRP-Certified Firms",
    url: "https://cfpub.epa.gov/flpp/pub/index.cfm?do=main.firmSearch",
    agency: "Federal/EPA",
    description:
      "Federal EPA database of Renovation/Repair/Painting-certified firms (required for lead-impacted paint disturbance).",
    covers: ["painting", "env-lead"],
  },
  {
    id: "nys-mold-licensees",
    name: "NYS Mold Assessor / Remediator License Lookup",
    url: "https://applications.labor.ny.gov/IBET/search.do?searchType=mold",
    agency: "DOHMH",
    description:
      "NYS Department of Labor lookup for licensed mold assessors and remediators (required for jobs >10 sqft).",
    covers: ["env-mold"],
  },
  {
    id: "doh-asbestos",
    name: "NYS Asbestos Handler Licensee Lookup",
    url: "https://applications.labor.ny.gov/IBET/search.do?searchType=asbestos",
    agency: "DOHMH",
    description: "Search NYS Department of Labor for asbestos handler licensees.",
    covers: ["env-asbestos"],
  },
  {
    id: "dob-elevator-agencies",
    name: "DOB Elevator Inspection Agencies",
    url: "https://www.nyc.gov/site/buildings/safety/elevators.page",
    agency: "DOB",
    description:
      "Authorized elevator inspection agencies and resources, including Category 1 and Category 5 inspectors.",
    covers: ["elevator-inspector"],
  },
  {
    id: "ddc-pest-ipm",
    name: "HPD IPM Pest Control Resources",
    url: "https://www.nyc.gov/site/hpd/services-and-information/asthma-free-housing-act.page",
    agency: "HPD",
    description:
      "Local Law 55 / Asthma-Free Housing Act resources and IPM guidance.",
    covers: ["pest-ipm"],
  },
  {
    id: "rebny-vendor-directory",
    name: "REBNY Member Vendor Directory",
    url: "https://www.rebny.com/",
    agency: "DOB",
    description:
      "Real Estate Board of NY member directory — many vetted property service vendors are listed.",
    covers: ["consult-pe-ra", "consult-expediter", "other"],
  },
  {
    id: "32bj-trades",
    name: "32BJ Maintenance / Trades Network",
    url: "https://www.seiu32bj.org/",
    agency: "DOB",
    description:
      "32BJ SEIU represents many NYC building service workers — useful for finding union-rate maintenance support and per-diem help.",
    covers: ["cleaning", "other"],
  },
];

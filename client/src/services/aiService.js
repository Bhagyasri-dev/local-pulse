/**
 * aiService.js – Rule-based Mock AI (no API key required).
 * SRS FR7:  AI-Assisted Issue Analysis
 * SRS FR8:  Duplicate Report Detection
 * SRS FR9:  Suspicious Report Verification
 * SRS FR16: AI Assistant chatbot
 *
 * Returns structured JSON after 800ms simulated delay.
 * Used as client-side fallback when backend AI route is unavailable.
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── keyword tables ────────────────────────────────────────────────────────────
const CATEGORY_MAP = {
  'Roads and Infrastructure': ['pothole','road','crack','pavement','footpath','bridge','traffic','signal','tarmac','highway','construction'],
  'Electricity':              ['light','street light','power','electric','wire','pole','outage','transformer','dark','electricity'],
  'Water Supply':             ['water','pipe','leak','flood','drainage','sewage','burst','tap','supply','overflow'],
  'Sanitation':               ['garbage','trash','waste','dump','smell','dirty','clean','litter','hygiene','rubbish'],
  'Public Facilities':        ['park','bench','toilet','restroom','playground','school','hospital','bus stop','public','library'],
};

const SEVERITY_MAP = {
  critical: ['fire','accident','emergency','gas leak','collapse','flood','unsafe','danger','hazard','explosion'],
  high:     ['major','serious','broken','damaged','blocked','fallen','burst','severe','urgent'],
  medium:   ['issue','problem','repair','crack','leaking','not working','faulty'],
  low:      ['minor','small','suggestion','request','maintenance','slight'],
};

const SUSPICIOUS = ['free money','advertisement','buy','sell','click here','whatsapp','call me','visit us','promo','discount'];

// ── helpers ───────────────────────────────────────────────────────────────────
const detectCategory = (text) => {
  const lower = text.toLowerCase();
  for (const [cat, words] of Object.entries(CATEGORY_MAP))
    if (words.some((w) => lower.includes(w))) return cat;
  return 'Other';
};

const detectSeverity = (text) => {
  const lower = text.toLowerCase();
  for (const [sev, words] of Object.entries(SEVERITY_MAP))
    if (words.some((w) => lower.includes(w))) return sev;
  return 'medium';
};

const priorityFromSeverity = (s) => ({ critical: 5, high: 4, medium: 3, low: 2 }[s] ?? 3);

const isSuspiciousText = (text) => SUSPICIOUS.some((p) => text.toLowerCase().includes(p));

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * analyseReport(description, category?)
 * SRS FR7 – AI-Assisted Issue Analysis
 */
export const analyseReport = async (description, providedCategory) => {
  await sleep(800);
  if (!description) throw new Error('Description is required for analysis');

  const category    = providedCategory || detectCategory(description);
  const severity    = detectSeverity(description);
  const priority    = priorityFromSeverity(severity);
  const isSuspicious = isSuspiciousText(description);

  const summaries = {
    critical: 'This report indicates a critical civic issue requiring immediate attention.',
    high:     'This report describes a serious issue that should be prioritised for early resolution.',
    medium:   'This report identifies a moderate civic issue. It should be reviewed and addressed in routine operations.',
    low:      'This report flags a minor maintenance concern. Schedule at convenience.',
  };

  return {
    category,
    severity,
    priority,
    isDuplicate:       false,
    duplicateOfReport: null,
    isSuspicious,
    suspiciousReason:  isSuspicious ? 'Description contains promotional or off-topic content.' : null,
    suggestedDepartment: category,
    summary: summaries[severity],
    analysedAt: new Date().toISOString(),
  };
};

/**
 * checkDuplicate(newReport, existingReports)
 * SRS FR8 – Duplicate Report Detection
 * Checks geographic proximity + category match.
 */
export const checkDuplicate = async (newReport, existingReports = []) => {
  await sleep(400);
  const { latitude, longitude, category } = newReport;
  const threshold = 0.005; // ~500 m in degrees

  const match = existingReports.find((r) => {
    if (!r.location?.coordinates) return false;
    const [rLng, rLat] = r.location.coordinates;
    const distLat = Math.abs(rLat - parseFloat(latitude));
    const distLng = Math.abs(rLng - parseFloat(longitude));
    return distLat < threshold && distLng < threshold && r.category === category;
  });

  return {
    isDuplicate: !!match,
    duplicateOfReport: match?._id || null,
    message: match
      ? `A similar ${category} issue was already reported nearby (Report #${match._id}).`
      : 'No duplicates found.',
  };
};

/**
 * askAssistant(question)
 * SRS FR16 – AI Assistant for platform guidance.
 */
export const askAssistant = async (question) => {
  await sleep(800);
  const q = question.toLowerCase();

  const rules = [
    { keys: ['how','report','submit','create'], ans: 'To report an issue, click "Report Issue" from your dashboard. Fill in the category, write a clear description, upload a photo as evidence, then confirm your GPS location on the map before submitting.' },
    { keys: ['status','track','progress'], ans: 'You can track your report under "My Reports". Statuses progress: Submitted → Under Review → Verified → Assigned → In Progress → Resolved.' },
    { keys: ['category','type','kind'], ans: 'Issue categories: Roads & Infrastructure, Electricity, Water Supply, Sanitation, Public Facilities. Choose the one that best matches your issue.' },
    { keys: ['photo','image','evidence','picture'], ans: 'Upload a clear photograph of the issue. Supported formats: JPG, PNG (max 5 MB). Good evidence speeds up verification.' },
    { keys: ['location','gps','map','coordinate'], ans: 'Allow browser location access when prompted. Your GPS coordinates are captured automatically. You can adjust the pin on the map before submitting.' },
    { keys: ['duplicate','similar','already'], ans: 'Our AI checks for nearby duplicate reports. If one is found, your report is still saved but linked to the original – no need to resubmit.' },
    { keys: ['authority','officer','review','who'], ans: 'Reports are reviewed by local authority officers via the Authority Portal. They verify, assign to the relevant department, and update status through to resolution.' },
    { keys: ['community','verify','confirm','neighbour'], ans: 'Nearby citizens can confirm an issue by clicking "Confirm" on a report card. After 3+ confirmations, the report is marked community-verified.' },
    { keys: ['ai','artificial','analysis','analyse'], ans: 'Our AI analyses each report to classify the issue category, detect severity, flag possible duplicates, and identify suspicious content – all automatically.' },
    { keys: ['resolution','resolve','fixed','done'], ans: 'Once an issue is fixed, the authority officer uploads resolution evidence and marks the report Resolved. You will see this in My Reports.' },
  ];

  for (const rule of rules)
    if (rule.keys.some((k) => q.includes(k)))
      return { question, answer: rule.ans, timestamp: new Date().toISOString() };

  return {
    question,
    answer: 'I can help with LocalPulse! Ask me about: reporting an issue, tracking status, categories, photos, GPS location, duplicates, authority review, or community verification.',
    timestamp: new Date().toISOString(),
  };
};

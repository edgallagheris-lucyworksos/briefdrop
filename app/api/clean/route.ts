import { NextResponse } from "next/server";

type DecisionLevel = "low" | "medium" | "high";
type QuoteReadiness = "ready for rough estimate" | "follow-up needed" | "inspection needed" | "not enough information";
type BudgetSignal = "present" | "missing";
type LaneKey = "site" | "services" | "disputes" | "support";
type MatterState = { matterTitle?: string; senderName?: string; senderRole?: string; senderOrg?: string; senderEmail?: string; senderPhone?: string; defaultSignoff?: string; recipientName?: string; recipientRole?: string; recipientOrg?: string; recipientRef?: string; matterStatus?: string; workDone?: string; verifiedMaterial?: string; };
type BriefDropResult = { brief: string; requirements: string[]; missingInfo: string[]; nextSteps: string[]; money: string[]; questionsFound: string[]; risks: string[]; assumptions: string[]; chronology: string[]; termsExplained: string[]; rightsChecks: string[]; dutiesChecks: string[]; evidenceChecklist: string[]; deadlineFlags: string[]; clientReply: string; followUpQuestions: string[]; internalBrief: string; quotePrep: string; discoveryPrep: string; quoteReadiness: QuoteReadiness; budgetSignal: BudgetSignal; urgency: DecisionLevel; scopeClarity: DecisionLevel; };

const uniq = (items: string[]) => [...new Set(items.map(x => x.trim()).filter(Boolean))];
const norm = (text: string) => text.replace(/\r/g, "").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
const splitSentences = (text: string) => text.split(/(?<=[.?!])\s+/).map(s => s.trim()).filter(Boolean);
const collect = (text: string, regex: RegExp) => uniq(Array.from(text.matchAll(regex), m => m[0]));
const extractQuestions = (text: string) => uniq(splitSentences(text).filter(s => s.includes("?")));
const extractMoney = (text: string) => uniq([
  ...collect(text, /(?:£\s?\d[\d,]*(?:\.\d{1,2})?\s?(?:k|m)?(?:\s?(?:to|-|–)\s?£?\s?\d[\d,]*(?:\.\d{1,2})?\s?(?:k|m)?)?)/gi),
  ...collect(text, /(?:\b(?:budget|budgets|ballpark|estimate|estimated|roughly|around|about|max spend|maximum spend|fixed fee|fee|deposit|retainer|labour only|labor only|daily rate|day rate|hourly rate|instalments?|installments?|payment plan|outstanding balance|cash available now|arrears|costs|allowance|hardship payment|council tax)\b[^.?!]{0,60})/gi),
]);
const extractMeasurements = (text: string) => uniq([
  ...collect(text, /\b\d+(?:\.\d+)?\s?(?:mm|cm|m|metre|metres|meter|meters|sqm|sq m|m2|square metres|square meters)\b/gi),
  ...collect(text, /\b\d+(?:\.\d+)?\s?x\s?\d+(?:\.\d+)?\s?(?:m|metres|meters|cm|mm)?\b/gi),
  ...collect(text, /\b(?:\d+(?:\.\d+)?)\s?(?:bed|bedroom|bedrooms|storey|story|floor|floors|emails?|departments?|rooms?)\b/gi),
]);
const extractTiming = (text: string) => uniq([
  ...collect(text, /\b(?:asap|urgent|immediately|this week|next week|this month|next month|weekend|weekends|evenings|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi),
  ...collect(text, /\b(?:before|after|from|by)\s+(?:the\s+)?\d{1,2}(?:st|nd|rd|th)?\b/gi),
  ...collect(text, /\b(?:in\s+\d+\s+days?|within\s+\d+\s+days?|\d+\s+days?\s+after)\b/gi),
  ...collect(text, /\b(?:tenant due|move in|moving out|deadline|access from|review this week|proposal before|response due|hearing date|appeal deadline|decision date)\b[^.?!]{0,36}/gi),
]);

function detectCategories(text: string, lane: LaneKey) {
  const rules: Array<[RegExp,string]> = [
    [/\bbathroom|shower room|wc|toilet\b/i, "Bathroom / washroom work"], [/\bkitchen|worktop|sink|cupboard|unit\b/i, "Kitchen / cabinetry work"], [/\bbedroom|lounge|living room|front room|hall|hallway|landing\b/i, "Internal room repairs / finishing"], [/\broof|gutter|downpipe|render|repoint|window|door|elevation\b/i, "External repairs / envelope work"], [/\bwebsite|landing page|seo|ads|marketing|campaign|content|email sequence\b/i, "Marketing / digital service work"], [/\bbrand|branding|logo|design|deck|presentation\b/i, "Branding / design work"], [/\bautomation|workflow|crm|zapier|notion|airtable|system|handoff|intake\b/i, "Ops / automation work"], [/\bcopywriting|proposal|pitch|script\b/i, "Writing / communication work"], [/\bconsult|strategy|advice|review|audit\b/i, "Consulting / advisory work"], [/\bdispute|invoice|payment|withheld|settlement|without prejudice|complaint\b/i, "Dispute / payment issue"], [/\bcouncil|housing|benefit|support form|winter|allowance|hardship|council tax\b/i, "Council / support issue"],
  ];
  const out = rules.filter(([r]) => r.test(text)).map(([,l]) => l);
  out.push(lane === "site" ? "Site / scope matter" : lane === "services" ? "Services / fees matter" : lane === "disputes" ? "Disputes / position matter" : "Council / housing / support matter");
  return uniq(out);
}
function detectIssues(text: string, lane: LaneKey) {
  const rules: Array<[RegExp,string]> = [
    [/\bleak|leaking|escape of water|water ingress\b/i, "Leak or water ingress"], [/\bdamp|moisture|wet|mould|mold\b/i, "Damp, moisture, or mould issue"], [/\bcrack|cracking|movement\b/i, "Cracking or movement concern"], [/\bdeadline|urgent|due in|response due\b/i, "Urgency or deadline pressure"], [/\bquote|price|estimate|ballpark|rough figure\b/i, "Pricing request"], [/\bnot sure|maybe|possibly|might\b/i, "Scope uncertainty"], [/\bvideo|videos|photos|attachment\b/i, "Supporting material may exist"], [/\bpayment|invoice|settlement|arrears|overdue\b/i, "Payment or debt issue"], [/\bform|application|decision|appeal|reconsideration|complaint\b/i, "Form or decision-handling issue"],
  ];
  const out = rules.filter(([r]) => r.test(text)).map(([,l]) => l);
  if (lane === "disputes") out.push("Chronology likely needed");
  if (lane === "support") out.push("Process and entitlement wording may need checking");
  return uniq(out);
}
function laneSpecificRequirements(text: string, lane: LaneKey) {
  const out: string[] = [];
  if (lane === "site") { if (extractMeasurements(text).length) out.push("Known sizes or quantities supplied"); out.push("Scope and exclusions need defining"); if (/access|tenant|occupied|staff/i.test(text)) out.push("Access constraints matter"); }
  if (lane === "services") { out.push("Deliverables need defining"); if (/revision|rounds?/i.test(text)) out.push("Revision limits are relevant"); if (/budget|fee|retainer|rate/i.test(text)) out.push("Fee framing is relevant"); }
  if (lane === "disputes") { out.push("Chronology and evidence trail matter"); if (/invoice|payment|settlement/i.test(text)) out.push("Payment position needs separating from narrative"); if (/without prejudice|settlement/i.test(text)) out.push("Protected wording may be needed"); }
  if (lane === "support") { out.push("Plain-English explanation is needed", "Evidence checklist is relevant", "Possible rights, duties, or process checks may matter"); if (/heating|winter|fuel|cold/i.test(text)) out.push("Heating / winter support angle may apply"); if (/housing|repair|damp|mould|mold/i.test(text)) out.push("Housing condition angle may apply"); }
  return uniq(out);
}
function buildChronology(text: string, matter: MatterState, lane: LaneKey) {
  const out: string[] = [];
  if (matter.workDone?.trim()) out.push(`Work already done: ${matter.workDone}`);
  out.push(...extractTiming(text).map(t => `Timing marker: ${t}`));
  if (lane === "disputes") out.push("Put the message trail, invoices, and requests in date order before sending a final reply");
  if (lane === "support") out.push("Put the letter date, decision date, reference, and response deadline in order");
  return uniq(out).slice(0,8);
}
function buildTermsExplained(text: string, lane: LaneKey) {
  if (lane !== "support") return [];
  const terms: Array<[RegExp,string]> = [
    [/priority need/i, "Priority need: a housing term that can affect what duty a council may owe."], [/reasonable preference/i, "Reasonable preference: housing allocation priority that may apply in some cases."], [/discretionary/i, "Discretionary: not automatic, usually decided case by case."], [/hardship/i, "Hardship: financial difficulty that may support an application or request for help."], [/reconsideration/i, "Reconsideration: asking for a decision to be looked at again."], [/appeal/i, "Appeal: challenging a decision through a formal route."], [/council tax/i, "Council tax: local tax on homes, with possible reductions, discounts, or support in some cases."], [/housing/i, "Housing: the accommodation, repair, allocation, or homelessness side of the matter."],
  ];
  const out = terms.filter(([r]) => r.test(text)).map(([,x]) => x);
  if (!out.length) out.push("Key terms should be translated into plain English before relying on official wording.");
  return uniq(out).slice(0,6);
}
function buildRightsChecks(text: string, lane: LaneKey) {
  if (lane !== "support") return [];
  const out = ["Check what support, review, or complaint route may apply before sending the final response."];
  if (/housing|repair|damp|mould|mold/i.test(text)) out.push("Check whether the housing condition issue supports a formal repair or escalation route.");
  if (/council tax|benefit|support|allowance|hardship/i.test(text)) out.push("Check what reduction, hardship, or support route may be available on the facts supplied.");
  if (/decision|reconsideration|appeal/i.test(text)) out.push("Check whether there is a review, reconsideration, or appeal path and what deadline applies.");
  return uniq(out);
}
function buildDutiesChecks(text: string, lane: LaneKey) {
  if (lane !== "support") return [];
  const out = ["Check what the authority or provider may need to consider, and do not state duties as guaranteed without verification."];
  if (/housing|repair|damp|mould|mold/i.test(text)) out.push("Check whether inspection, repair response, or complaint handling duties may be relevant.");
  if (/decision|application|form/i.test(text)) out.push("Check whether the decision-maker must consider the evidence supplied and follow the stated process.");
  return uniq(out);
}
function buildEvidenceChecklist(text: string, lane: LaneKey, matter: MatterState) {
  const out: string[] = [];
  if (/photos|video|videos/i.test(text)) out.push("Photos or videos already mentioned");
  if (matter.verifiedMaterial?.trim()) out.push("Verified material already logged in matter setup");
  if (lane === "disputes") out.push("Message screenshots, invoice references, and date order");
  if (lane === "support") out.push("Official letter or form, reference number, dates, and supporting documents");
  if (lane === "site") out.push("Measurements, photos, access details, and scope notes");
  if (lane === "services") out.push("Brief, deliverable list, timing, and fee expectations");
  return uniq(out);
}
function buildDeadlineFlags(text: string, lane: LaneKey, matter: MatterState) {
  const out = extractTiming(`${text} ${matter.verifiedMaterial || ""}`).map(t => `Check deadline / timing: ${t}`);
  if (lane === "support" && !out.length) out.push("Check whether the form, decision, or complaint route has a response deadline.");
  if (lane === "disputes" && !out.length) out.push("Check whether a response date, payment date, or next escalation date matters.");
  return uniq(out);
}
function buildRequirements(text: string, lane: LaneKey, matter: MatterState) {
  const out = [...detectCategories(text, lane), ...detectIssues(text, lane), ...laneSpecificRequirements(text, lane)];
  const m = extractMeasurements(text), t = extractTiming(text);
  if (m.length) out.push(`Known sizes / quantities: ${m.slice(0,4).join(", ")}`);
  if (t.length) out.push(`Timing constraints: ${t.slice(0,3).join(", ")}`);
  if (matter.workDone?.trim()) out.push("Previous work already done has been supplied in matter setup");
  if (matter.verifiedMaterial?.trim()) out.push("Verified / safe material to reuse has been supplied in matter setup");
  return uniq(out);
}
function buildMissingInfo(text: string, lane: LaneKey, matter: MatterState) {
  const out: string[] = [];
  if (!extractMeasurements(text).length && lane === "site") out.push("Accurate measurements, quantities, or site scope size");
  if (!extractTiming(text).length) out.push("Deadline, preferred timing, or urgency");
  if (!extractMoney(text).length && lane !== "support") out.push("Budget, fee range, or pricing expectation");
  if (!/\bphotos|video|videos|brief|attachment|notes|letter|form\b/i.test(text)) out.push("Supporting material such as photos, files, letters, forms, or notes");
  if (!matter.senderName?.trim()) out.push("Sender / signer name in matter setup");
  if (!matter.recipientName?.trim() && !matter.recipientOrg?.trim()) out.push("Recipient or organisation in matter setup");
  if (lane === "disputes" && !matter.workDone?.trim()) out.push("Clear note of what has already been sent or completed");
  if (lane === "support") {
    if (!/decision|letter|application|form|ref|reference/i.test(text) && !matter.recipientRef?.trim()) out.push("Decision reference, form reference, or case reference");
    if (!matter.verifiedMaterial?.trim()) out.push("Verified facts, evidence, or safe wording to reuse");
  }
  if (lane === "services" && !/deliverable|email|page|proposal|scope|brief/i.test(text)) out.push("Clear deliverable list");
  return uniq(out);
}
function buildNextSteps(text: string, lane: LaneKey, matter: MatterState) {
  const out: string[] = [];
  if (!matter.matterTitle?.trim()) out.push("Set a clear matter title so the pack can be reused and tracked");
  if (!matter.senderName?.trim()) out.push("Complete the sender / sign-off block before using external drafts");
  if (lane === "site") out.push("Confirm whether the next step is inspection, provisional price, or firm quote", "Separate urgent work from cosmetic work");
  if (lane === "services") out.push("Confirm deliverables, revision limit, and client inputs before pricing firmly", "Use the commercial draft as the base for the proposal response");
  if (lane === "disputes") out.push("Build a chronology using work already done and verified material first", "Separate evidence-backed facts from disputed points before sending a reply");
  if (lane === "support") out.push("Translate the official wording into plain English before drafting a response", "Check deadlines, references, and what evidence is still missing before sending anything");
  if (/photos|video|videos/i.test(text)) out.push("Use any photos or videos as supporting evidence, not as the only basis for final conclusions");
  return uniq(out);
}
function buildRisks(text: string, lane: LaneKey, matter: MatterState) {
  const out: string[] = [];
  if (/\bnot sure|maybe|possibly|might\b/i.test(text)) out.push("Scope or narrative is still uncertain");
  if (!matter.senderName?.trim()) out.push("External draft may be weak without a clear sender / sign-off block");
  if (!matter.recipientName?.trim() && !matter.recipientOrg?.trim()) out.push("Recipient identity is incomplete");
  if (lane === "disputes") { out.push("Do not overstate agreement or certainty without an evidence trail"); if (!matter.verifiedMaterial?.trim()) out.push("No verified material logged yet to anchor the position"); }
  if (lane === "support") out.push("Do not present possible rights or duties as guaranteed entitlements", "Dates, decision references, and official wording may be incomplete");
  return uniq(out);
}
function buildAssumptions(text: string, lane: LaneKey, matter: MatterState) {
  const out: string[] = [];
  if (matter.workDone?.trim()) out.push("Assumes the logged previous work is broadly accurate and can frame the next draft");
  if (matter.verifiedMaterial?.trim()) out.push("Assumes the verified material block is safe to reuse");
  if (lane === "site") out.push("Assumes this matter needs scoping or pricing rather than immediate delivery only");
  if (lane === "services") out.push("Assumes a commercial reply or proposal-style output is wanted");
  if (lane === "disputes") out.push("Assumes the user wants a firm but non-overstated position");
  if (lane === "support") out.push("Assumes the user wants explanation, structure, and draft support rather than entitlement determination");
  return uniq(out);
}
function buildBrief(text: string, lane: LaneKey, matter: MatterState) {
  const cats = detectCategories(text, lane), issues = detectIssues(text, lane), money = extractMoney(text), timing = extractTiming(text);
  return [matter.matterTitle?.trim() ? `Matter: ${matter.matterTitle}.` : "", cats.length ? `This looks like ${cats.slice(0,2).join(" and ").toLowerCase()}.` : "This looks like a matter that still needs classification.", issues.length ? `Key signals include ${issues.slice(0,4).join(", ").toLowerCase()}.` : "The matter still needs a cleaner problem definition.", money.length ? `Money or pricing references: ${money.slice(0,2).join(" | ")}.` : "", timing.length ? `Timing mentioned: ${timing.slice(0,3).join(" | ")}.` : "", matter.workDone?.trim() ? "Previous work already done has been supplied and should frame the next draft." : ""].filter(Boolean).join(" ");
}
function buildFollowUpQuestions(text: string, lane: LaneKey, matter: MatterState) {
  const out: string[] = [];
  if (!matter.matterTitle?.trim()) out.push("What is the short title for this matter?");
  if (!matter.recipientName?.trim() && !matter.recipientOrg?.trim()) out.push("Who exactly is this draft for?");
  if (lane === "site") { out.push("What exact scope do you want priced first?"); if (!extractMeasurements(text).length) out.push("Can you share measurements, quantities, or a clearer size of the work?"); }
  if (lane === "services") out.push("What are the exact deliverables and how many revision rounds are expected?", "What client inputs are needed before work can start?");
  if (lane === "disputes") out.push("What are the key dates in order and what has already been sent?", "Which facts are verified and which points are still disputed?");
  if (lane === "support") out.push("What letter, form, or decision is this responding to?", "What deadline or response date applies?", "What evidence already exists and what is still missing?");
  return uniq(out);
}
function buildClientReply(result: BriefDropResult, lane: LaneKey, matter: MatterState) {
  const opener = matter.recipientName ? `Dear ${matter.recipientName},` : "Hello,";
  const core = lane === "disputes" ? "I have reviewed the current position and separated the key facts from the points that still need evidence." : lane === "support" ? "I have reviewed the current information and set out the main points, missing details, and next steps clearly." : "I have reviewed the current information and set out the key points clearly.";
  return [opener, "", core, result.brief, result.missingInfo.length ? `To move this forward, I still need: ${result.missingInfo.slice(0,4).join("; ")}.` : "", result.followUpQuestions.length ? `Key questions: ${result.followUpQuestions.slice(0,3).join(" ")}` : "", "", matter.defaultSignoff || "Kind regards", matter.senderName || ""].filter(Boolean).join("\n");
}
function buildInternalBrief(result: BriefDropResult, lane: LaneKey, matter: MatterState) {
  return [`MATTER: ${matter.matterTitle || "Untitled matter"}`, `LANE: ${lane}`, `STATUS: ${matter.matterStatus || "Open"}`, `BRIEF: ${result.brief}`, `FACTS: ${result.requirements.join("; ") || "None"}`, `GAPS: ${result.missingInfo.join("; ") || "None"}`, `WORK DONE: ${matter.workDone || "None logged"}`, `VERIFIED: ${matter.verifiedMaterial || "None logged"}`, `RISKS: ${result.risks.join("; ") || "None"}`].join("\n");
}
function buildQuotePrep(result: BriefDropResult, lane: LaneKey) {
  const laneLine = lane === "site" ? "Scope / pricing prep" : lane === "services" ? "Commercial / proposal prep" : "Commercial position prep";
  return [laneLine, `- Scope summary: ${result.brief}`, `- Requirements to include: ${result.requirements.join("; ") || "None"}`, `- Missing info before a firm figure: ${result.missingInfo.join("; ") || "None"}`, `- Price signals: ${result.money.join("; ") || "None"}`, `- Risks: ${result.risks.join("; ") || "None"}`].join("\n");
}
function buildDiscoveryPrep(result: BriefDropResult, lane: LaneKey, matter: MatterState) {
  const extra = lane === "support" ? "- Support-specific checks: terms, process, evidence, references, deadlines" : lane === "disputes" ? "- Dispute-specific checks: chronology, evidence chain, admissions risk" : "- Discovery-specific checks: scope, unknowns, next questions";
  return ["Discovery / evidence prep", `- Core brief: ${result.brief}`, `- Main unknowns: ${result.missingInfo.join("; ") || "None"}`, `- Key questions to ask: ${result.followUpQuestions.join("; ") || "None"}`, `- Assumptions to test: ${result.assumptions.join("; ") || "None"}`, extra, matter.verifiedMaterial?.trim() ? `- Verified material already logged: ${matter.verifiedMaterial}` : ""].filter(Boolean).join("\n");
}
function deriveQuoteReadiness(text: string, lane: LaneKey, missing: string[], risks: string[]): QuoteReadiness {
  const hasBudget = extractMoney(text).length > 0, hasMeasurements = extractMeasurements(text).length > 0, needsInspection = /\bleak|damp|moisture|crack|movement|site visit|inspect|come look\b/i.test(text);
  if (lane === "support") return missing.length > 3 ? "follow-up needed" : "ready for rough estimate";
  if (missing.length >= 5 && !hasBudget && !hasMeasurements) return "not enough information";
  if (needsInspection || risks.some(r => r.toLowerCase().includes("evidence trail"))) return "inspection needed";
  if (missing.length > 0 && (!hasMeasurements || !hasBudget)) return "follow-up needed";
  return "ready for rough estimate";
}
const deriveBudgetSignal = (text: string, lane: LaneKey): BudgetSignal => lane === "support" ? (/allowance|support|payment|arrears|cost|budget|hardship/i.test(text) ? "present" : "missing") : (extractMoney(text).length > 0 ? "present" : "missing");
const deriveUrgency = (text: string, matter: MatterState): DecisionLevel => /\burgent|asap|immediately|tenant due|deadline|due in|before|hearing|response due\b/i.test(`${text} ${matter.workDone || ""}`) ? "high" : extractTiming(`${text} ${matter.workDone || ""}`).length > 0 ? "medium" : "low";
function deriveScopeClarity(text: string, lane: LaneKey, missing: string[], reqs: string[]): DecisionLevel {
  if (lane === "support") return missing.length > 4 ? "low" : missing.length > 2 ? "medium" : "high";
  if (missing.length >= 5 || /\bnot sure|maybe|possibly|might\b/i.test(text)) return "low";
  if (reqs.length >= 4 && missing.length <= 2) return "high";
  return "medium";
}
function smartFallback(input: string, lane: LaneKey, matter: MatterState): BriefDropResult {
  const text = norm(input);
  const partial = { brief: buildBrief(text, lane, matter), requirements: buildRequirements(text, lane, matter), missingInfo: buildMissingInfo(text, lane, matter), nextSteps: buildNextSteps(text, lane, matter), money: extractMoney(text), questionsFound: extractQuestions(text), risks: buildRisks(text, lane, matter), assumptions: buildAssumptions(text, lane, matter), chronology: buildChronology(text, matter, lane), termsExplained: buildTermsExplained(text, lane), rightsChecks: buildRightsChecks(text, lane), dutiesChecks: buildDutiesChecks(text, lane), evidenceChecklist: buildEvidenceChecklist(text, lane, matter), deadlineFlags: buildDeadlineFlags(text, lane, matter), followUpQuestions: buildFollowUpQuestions(text, lane, matter) };
  const base = partial as unknown as BriefDropResult;
  return { ...partial, clientReply: buildClientReply(base, lane, matter), internalBrief: buildInternalBrief(base, lane, matter), quotePrep: buildQuotePrep(base, lane), discoveryPrep: buildDiscoveryPrep(base, lane, matter), quoteReadiness: deriveQuoteReadiness(text, lane, partial.missingInfo, partial.risks), budgetSignal: deriveBudgetSignal(text, lane), urgency: deriveUrgency(text, matter), scopeClarity: deriveScopeClarity(text, lane, partial.missingInfo, partial.requirements) };
}
export async function GET() { return NextResponse.json({ ok: true, route: "clean" }); }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = body?.input?.trim(); const lane = (body?.lane || "services") as LaneKey; const matter = (body?.matter || {}) as MatterState;
    if (!input) return NextResponse.json({ error: "No input provided." }, { status: 400 });
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === "your_openai_api_key_here") return NextResponse.json(smartFallback(input, lane, matter));
    const contextBlock = [ `Lane: ${lane}`, matter.matterTitle ? `Matter title: ${matter.matterTitle}` : "", matter.matterStatus ? `Matter status: ${matter.matterStatus}` : "", [matter.senderName, matter.senderRole, matter.senderOrg].filter(Boolean).length ? `Sender: ${[matter.senderName, matter.senderRole, matter.senderOrg].filter(Boolean).join(" · ")}` : "", [matter.recipientName, matter.recipientRole, matter.recipientOrg].filter(Boolean).length ? `Recipient: ${[matter.recipientName, matter.recipientRole, matter.recipientOrg].filter(Boolean).join(" · ")}` : "", matter.recipientRef ? `Reference: ${matter.recipientRef}` : "", matter.workDone ? `Work already done: ${matter.workDone}` : "", matter.verifiedMaterial ? `Verified material: ${matter.verifiedMaterial}` : "" ].filter(Boolean).join("\n");
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: "gpt-5.4-mini", input: [ { role: "system", content: "You are BriefDrop. Turn messy incoming text into a usable working pack. Use the lane and matter context. Do not invent facts. Be concise, practical, and structured. For disputes, prioritise chronology, evidence gaps, risk wording, and reply safety. For support, prioritise plain-English explanation, terminology help, possible rights or duties to check, missing evidence, deadline flags, and next steps. For site, prioritise scope, access, exclusions, and pricing readiness. For services, prioritise deliverables, fees, and client dependencies." }, { role: "user", content: `${contextBlock}\n\nSource material:\n${input}` } ], text: { format: { type: "json_schema", name: "briefdrop_result", strict: true, schema: { type: "object", additionalProperties: false, properties: { brief: { type: "string" }, requirements: { type: "array", items: { type: "string" } }, missingInfo: { type: "array", items: { type: "string" } }, nextSteps: { type: "array", items: { type: "string" } }, money: { type: "array", items: { type: "string" } }, questionsFound: { type: "array", items: { type: "string" } }, risks: { type: "array", items: { type: "string" } }, assumptions: { type: "array", items: { type: "string" } }, chronology: { type: "array", items: { type: "string" } }, termsExplained: { type: "array", items: { type: "string" } }, rightsChecks: { type: "array", items: { type: "string" } }, dutiesChecks: { type: "array", items: { type: "string" } }, evidenceChecklist: { type: "array", items: { type: "string" } }, deadlineFlags: { type: "array", items: { type: "string" } }, clientReply: { type: "string" }, followUpQuestions: { type: "array", items: { type: "string" } }, internalBrief: { type: "string" }, quotePrep: { type: "string" }, discoveryPrep: { type: "string" }, quoteReadiness: { type: "string" }, budgetSignal: { type: "string" }, urgency: { type: "string" }, scopeClarity: { type: "string" } }, required: ["brief","requirements","missingInfo","nextSteps","money","questionsFound","risks","assumptions","chronology","termsExplained","rightsChecks","dutiesChecks","evidenceChecklist","deadlineFlags","clientReply","followUpQuestions","internalBrief","quotePrep","discoveryPrep","quoteReadiness","budgetSignal","urgency","scopeClarity"] } } }, max_output_tokens: 1400 }) });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || "OpenAI request failed", raw: data }, { status: response.status });
    let textOut = ""; if (typeof data.output_text === "string" && data.output_text.trim()) textOut = data.output_text; else if (Array.isArray(data.output)) textOut = data.output.flatMap((item: any) => item.content || []).map((c: any) => c.text || "").join("\n");
    if (!textOut) return NextResponse.json({ error: "Empty response from OpenAI", raw: data }, { status: 500 });
    try { return NextResponse.json(JSON.parse(textOut) as BriefDropResult); } catch { return NextResponse.json({ error: "Model did not return valid JSON", raw: textOut }, { status: 500 }); }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

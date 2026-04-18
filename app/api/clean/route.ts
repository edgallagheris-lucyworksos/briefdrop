import { NextResponse } from "next/server";

type DecisionLevel = "low" | "medium" | "high";
type QuoteReadiness = "ready for rough estimate" | "follow-up needed" | "inspection needed" | "not enough information";
type BudgetSignal = "present" | "missing";
type LaneKey = "site" | "services" | "disputes" | "support";

type MatterState = {
  matterTitle?: string;
  senderName?: string;
  senderRole?: string;
  senderOrg?: string;
  senderEmail?: string;
  senderPhone?: string;
  defaultSignoff?: string;
  recipientName?: string;
  recipientRole?: string;
  recipientOrg?: string;
  recipientRef?: string;
  matterStatus?: string;
  workDone?: string;
  verifiedMaterial?: string;
};

type BriefDropResult = {
  brief: string;
  requirements: string[];
  missingInfo: string[];
  nextSteps: string[];
  money: string[];
  questionsFound: string[];
  risks: string[];
  assumptions: string[];
  clientReply: string;
  followUpQuestions: string[];
  internalBrief: string;
  quotePrep: string;
  discoveryPrep: string;
  quoteReadiness: QuoteReadiness;
  budgetSignal: BudgetSignal;
  urgency: DecisionLevel;
  scopeClarity: DecisionLevel;
};

function normalise(text: string) {
  return text.replace(/\r/g, "").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
}
function unique(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}
function splitSentences(text: string) {
  return text.split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter(Boolean);
}
function collectMatches(text: string, regex: RegExp) {
  return unique(Array.from(text.matchAll(regex), (match) => match[0]));
}
function extractQuestions(text: string) {
  return unique(splitSentences(text).filter((s) => s.includes("?")));
}
function extractMoney(text: string) {
  const patterns = [
    /(?:£\s?\d[\d,]*(?:\.\d{1,2})?\s?(?:k|m)?(?:\s?(?:to|-|–)\s?£?\s?\d[\d,]*(?:\.\d{1,2})?\s?(?:k|m)?)?)/gi,
    /(?:\b(?:budget|budgets|ballpark|estimate|estimated|roughly|around|about|max spend|maximum spend|fixed fee|fee|deposit|retainer|labour only|labor only|daily rate|day rate|hourly rate|instalments?|installments?|payment plan|outstanding balance|cash available now|arrears|costs)\b[^.?!]{0,60})/gi,
  ];
  return unique(patterns.flatMap((pattern) => collectMatches(text, pattern)));
}
function extractMeasurements(text: string) {
  const patterns = [
    /\b\d+(?:\.\d+)?\s?(?:mm|cm|m|metre|metres|meter|meters|sqm|sq m|m2|square metres|square meters)\b/gi,
    /\b\d+(?:\.\d+)?\s?x\s?\d+(?:\.\d+)?\s?(?:m|metres|meters|cm|mm)?\b/gi,
    /\b(?:\d+(?:\.\d+)?)\s?(?:bed|bedroom|bedrooms|storey|story|floor|floors|emails?|departments?|rooms?)\b/gi,
  ];
  return unique(patterns.flatMap((pattern) => collectMatches(text, pattern)));
}
function extractTiming(text: string) {
  const patterns = [
    /\b(?:asap|urgent|immediately|this week|next week|this month|next month|weekend|weekends|evenings|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    /\b(?:before|after|from|by)\s+(?:the\s+)?\d{1,2}(?:st|nd|rd|th)?\b/gi,
    /\b(?:in\s+\d+\s+days?|within\s+\d+\s+days?|\d+\s+days?\s+after)\b/gi,
    /\b(?:tenant due|move in|moving out|deadline|access from|review this week|proposal before|response due|hearing date)\b[^.?!]{0,36}/gi,
  ];
  return unique(patterns.flatMap((pattern) => collectMatches(text, pattern)));
}
function detectCategories(text: string, lane: LaneKey) {
  const lower = text.toLowerCase();
  const items: string[] = [];
  const categories: Array<[RegExp, string]> = [
    [/\bbathroom|shower room|wc|toilet\b/i, "Bathroom / washroom work"],
    [/\bkitchen|worktop|sink|cupboard|unit\b/i, "Kitchen / cabinetry work"],
    [/\bbedroom|lounge|living room|front room|hall|hallway|landing\b/i, "Internal room repairs / finishing"],
    [/\broof|gutter|downpipe|render|repoint|window|door|elevation\b/i, "External repairs / envelope work"],
    [/\bwebsite|landing page|seo|ads|marketing|campaign|content|email sequence\b/i, "Marketing / digital service work"],
    [/\bbrand|branding|logo|design|deck|presentation\b/i, "Branding / design work"],
    [/\bautomation|workflow|crm|zapier|notion|airtable|system|handoff|intake\b/i, "Ops / automation work"],
    [/\bcopywriting|proposal|pitch|script\b/i, "Writing / communication work"],
    [/\bconsult|strategy|advice|review|audit\b/i, "Consulting / advisory work"],
    [/\bdispute|invoice|payment|withheld|settlement|without prejudice|complaint\b/i, "Dispute / payment issue"],
    [/\bcouncil|housing|benefit|support form|winter|allowance|hardship|council tax\b/i, "Council / support issue"],
  ];
  for (const [regex, label] of categories) if (regex.test(lower)) items.push(label);
  if (lane === "site") items.push("Site / scope matter");
  if (lane === "services") items.push("Services / fees matter");
  if (lane === "disputes") items.push("Disputes / position matter");
  if (lane === "support") items.push("Council / housing / support matter");
  return unique(items);
}
function detectIssues(text: string, lane: LaneKey) {
  const lower = text.toLowerCase();
  const items: string[] = [];
  const issues: Array<[RegExp, string]> = [
    [/\bleak|leaking|escape of water|water ingress\b/i, "Leak or water ingress"],
    [/\bdamp|moisture|wet|mould|mold\b/i, "Damp, moisture, or mould issue"],
    [/\bcrack|cracking|movement\b/i, "Cracking or movement concern"],
    [/\bdeadline|urgent|due in|response due\b/i, "Urgency or deadline pressure"],
    [/\bquote|price|estimate|ballpark|rough figure\b/i, "Pricing request"],
    [/\bnot sure|maybe|possibly|might\b/i, "Scope uncertainty"],
    [/\bvideo|videos|photos|attachment\b/i, "Supporting material may exist"],
    [/\bpayment|invoice|settlement|arrears|overdue\b/i, "Payment or debt issue"],
    [/\bform|application|decision|appeal|reconsideration|complaint\b/i, "Form or decision-handling issue"],
  ];
  for (const [regex, label] of issues) if (regex.test(lower)) items.push(label);
  if (lane === "disputes" && !/chronolog/i.test(lower)) items.push("Chronology likely needed");
  if (lane === "support" && !/deadline|decision|application/i.test(lower)) items.push("Process and entitlement wording may need checking");
  return unique(items);
}
function laneSpecificRequirements(text: string, lane: LaneKey) {
  const lower = text.toLowerCase();
  const items: string[] = [];
  if (lane === "site") {
    if (extractMeasurements(text).length) items.push("Known sizes or quantities supplied");
    items.push("Scope and exclusions need defining");
    if (/access|tenant|occupied|staff/i.test(lower)) items.push("Access constraints matter");
  }
  if (lane === "services") {
    items.push("Deliverables need defining");
    if (/revision|rounds?/i.test(lower)) items.push("Revision limits are relevant");
    if (/budget|fee|retainer|rate/i.test(lower)) items.push("Fee framing is relevant");
  }
  if (lane === "disputes") {
    items.push("Chronology and evidence trail matter");
    if (/invoice|payment|settlement/i.test(lower)) items.push("Payment position needs separating from narrative");
    if (/without prejudice|settlement/i.test(lower)) items.push("Protected wording may be needed");
  }
  if (lane === "support") {
    items.push("Plain-English explanation is needed");
    items.push("Evidence checklist is relevant");
    items.push("Possible rights, duties, or process checks may matter");
    if (/heating|winter|fuel|cold/i.test(lower)) items.push("Heating / winter support angle may apply");
    if (/housing|repair|damp|mould|mold/i.test(lower)) items.push("Housing condition angle may apply");
  }
  return unique(items);
}
function buildRequirements(text: string, lane: LaneKey, matter: MatterState) {
  const items: string[] = [];
  const measurements = extractMeasurements(text);
  const timing = extractTiming(text);
  items.push(...detectCategories(text, lane), ...detectIssues(text, lane), ...laneSpecificRequirements(text, lane));
  if (measurements.length) items.push(`Known sizes / quantities: ${measurements.slice(0, 4).join(", ")}`);
  if (timing.length) items.push(`Timing constraints: ${timing.slice(0, 3).join(", ")}`);
  if (matter.workDone?.trim()) items.push("Previous work already done has been supplied in matter setup");
  if (matter.verifiedMaterial?.trim()) items.push("Verified / safe material to reuse has been supplied in matter setup");
  return unique(items);
}
function buildMissingInfo(text: string, lane: LaneKey, matter: MatterState) {
  const lower = text.toLowerCase();
  const items: string[] = [];
  const measurements = extractMeasurements(text);
  const money = extractMoney(text);
  const timing = extractTiming(text);
  if (!measurements.length && lane === "site") items.push("Accurate measurements, quantities, or site scope size");
  if (!timing.length) items.push("Deadline, preferred timing, or urgency");
  if (!money.length && lane !== "support") items.push("Budget, fee range, or pricing expectation");
  if (!/\bphotos|video|videos|brief|attachment|notes|letter|form\b/i.test(lower)) items.push("Supporting material such as photos, files, letters, forms, or notes");
  if (!matter.senderName?.trim()) items.push("Sender / signer name in matter setup");
  if (!matter.recipientName?.trim() && !matter.recipientOrg?.trim()) items.push("Recipient or organisation in matter setup");
  if (lane === "disputes" && !matter.workDone?.trim()) items.push("Clear note of what has already been sent or completed");
  if (lane === "support") {
    if (!/decision|letter|application|form|ref|reference/i.test(lower) && !matter.recipientRef?.trim()) items.push("Decision reference, form reference, or case reference");
    if (!matter.verifiedMaterial?.trim()) items.push("Verified facts, evidence, or safe wording to reuse");
  }
  if (lane === "services" && !/deliverable|email|page|proposal|scope|brief/i.test(lower)) items.push("Clear deliverable list");
  return unique(items);
}
function buildNextSteps(text: string, lane: LaneKey, matter: MatterState) {
  const lower = text.toLowerCase();
  const items: string[] = [];
  if (!matter.matterTitle?.trim()) items.push("Set a clear matter title so the pack can be reused and tracked");
  if (!matter.senderName?.trim()) items.push("Complete the sender / sign-off block before using external drafts");
  if (lane === "site") {
    items.push("Confirm whether the next step is inspection, provisional price, or firm quote");
    items.push("Separate urgent work from cosmetic work");
  }
  if (lane === "services") {
    items.push("Confirm deliverables, revision limit, and client inputs before pricing firmly");
    items.push("Use the commercial draft as the base for the proposal response");
  }
  if (lane === "disputes") {
    items.push("Build a chronology using work already done and verified material first");
    items.push("Separate evidence-backed facts from disputed points before sending a reply");
  }
  if (lane === "support") {
    items.push("Translate the official wording into plain English before drafting a response");
    items.push("Check deadlines, references, and what evidence is still missing before sending anything");
  }
  if (/photos|video|videos/i.test(lower)) items.push("Use any photos or videos as supporting evidence, not as the only basis for final conclusions");
  return unique(items);
}
function buildRisks(text: string, lane: LaneKey, matter: MatterState) {
  const lower = text.toLowerCase();
  const items: string[] = [];
  if (/\bnot sure|maybe|possibly|might\b/i.test(lower)) items.push("Scope or narrative is still uncertain");
  if (!matter.senderName?.trim()) items.push("External draft may be weak without a clear sender / sign-off block");
  if (!matter.recipientName?.trim() && !matter.recipientOrg?.trim()) items.push("Recipient identity is incomplete");
  if (lane === "disputes") {
    items.push("Do not overstate agreement or certainty without an evidence trail");
    if (!matter.verifiedMaterial?.trim()) items.push("No verified material logged yet to anchor the position");
  }
  if (lane === "support") {
    items.push("Do not present possible rights or duties as guaranteed entitlements");
    items.push("Dates, decision references, and official wording may be incomplete");
  }
  return unique(items);
}
function buildAssumptions(text: string, lane: LaneKey, matter: MatterState) {
  const items: string[] = [];
  if (matter.workDone?.trim()) items.push("Assumes the logged previous work is broadly accurate and can frame the next draft");
  if (matter.verifiedMaterial?.trim()) items.push("Assumes the verified material block is safe to reuse");
  if (lane === "site") items.push("Assumes this matter needs scoping or pricing rather than immediate delivery only");
  if (lane === "services") items.push("Assumes a commercial reply or proposal-style output is wanted");
  if (lane === "disputes") items.push("Assumes the user wants a firm but non-overstated position");
  if (lane === "support") items.push("Assumes the user wants explanation, structure, and draft support rather than entitlement determination");
  return unique(items);
}
function buildBrief(text: string, lane: LaneKey, matter: MatterState) {
  const categories = detectCategories(text, lane);
  const issues = detectIssues(text, lane);
  const money = extractMoney(text);
  const timing = extractTiming(text);
  return [
    matter.matterTitle?.trim() ? `Matter: ${matter.matterTitle}.` : "",
    categories.length ? `This looks like ${categories.slice(0, 2).join(" and ").toLowerCase()}.` : "This looks like a matter that still needs classification.",
    issues.length ? `Key signals include ${issues.slice(0, 4).join(", ").toLowerCase()}.` : "The matter still needs a cleaner problem definition.",
    money.length ? `Money or pricing references: ${money.slice(0, 2).join(" | ")}.` : "",
    timing.length ? `Timing mentioned: ${timing.slice(0, 3).join(" | ")}.` : "",
    matter.workDone?.trim() ? "Previous work already done has been supplied and should frame the next draft." : "",
  ].filter(Boolean).join(" ");
}
function buildFollowUpQuestions(text: string, lane: LaneKey, matter: MatterState) {
  const items: string[] = [];
  if (!matter.matterTitle?.trim()) items.push("What is the short title for this matter?");
  if (!matter.recipientName?.trim() && !matter.recipientOrg?.trim()) items.push("Who exactly is this draft for?");
  if (lane === "site") {
    items.push("What exact scope do you want priced first?");
    if (!extractMeasurements(text).length) items.push("Can you share measurements, quantities, or a clearer size of the work?");
  }
  if (lane === "services") {
    items.push("What are the exact deliverables and how many revision rounds are expected?");
    items.push("What client inputs are needed before work can start?");
  }
  if (lane === "disputes") {
    items.push("What are the key dates in order and what has already been sent?" );
    items.push("Which facts are verified and which points are still disputed?");
  }
  if (lane === "support") {
    items.push("What letter, form, or decision is this responding to?");
    items.push("What deadline or response date applies?");
    items.push("What evidence already exists and what is still missing?");
  }
  return unique(items);
}
function buildClientReply(result: BriefDropResult, lane: LaneKey, matter: MatterState) {
  const opener = matter.recipientName ? `Dear ${matter.recipientName},` : "Hello,";
  const core = lane === "disputes"
    ? "I have reviewed the current position and separated the key facts from the points that still need evidence."
    : lane === "support"
      ? "I have reviewed the current information and set out the main points, missing details, and next steps clearly."
      : "I have reviewed the current information and set out the key points clearly.";
  return [
    opener,
    "",
    core,
    result.brief,
    result.missingInfo.length ? `To move this forward, I still need: ${result.missingInfo.slice(0, 4).join("; ")}.` : "",
    result.followUpQuestions.length ? `Key questions: ${result.followUpQuestions.slice(0, 3).join(" ")}` : "",
    "",
    matter.defaultSignoff || "Kind regards",
    matter.senderName || "",
  ].filter(Boolean).join("\n");
}
function buildInternalBrief(result: BriefDropResult, lane: LaneKey, matter: MatterState) {
  return [
    `MATTER: ${matter.matterTitle || "Untitled matter"}`,
    `LANE: ${lane}`,
    `STATUS: ${matter.matterStatus || "Open"}`,
    `BRIEF: ${result.brief}`,
    `FACTS: ${result.requirements.join("; ") || "None"}`,
    `GAPS: ${result.missingInfo.join("; ") || "None"}`,
    `WORK DONE: ${matter.workDone || "None logged"}`,
    `VERIFIED: ${matter.verifiedMaterial || "None logged"}`,
    `RISKS: ${result.risks.join("; ") || "None"}`,
  ].join("\n");
}
function buildQuotePrep(result: BriefDropResult, lane: LaneKey) {
  const laneLine = lane === "site" ? "Scope / pricing prep" : lane === "services" ? "Commercial / proposal prep" : "Commercial position prep";
  return [
    laneLine,
    `- Scope summary: ${result.brief}`,
    `- Requirements to include: ${result.requirements.join("; ") || "None"}`,
    `- Missing info before a firm figure: ${result.missingInfo.join("; ") || "None"}`,
    `- Price signals: ${result.money.join("; ") || "None"}`,
    `- Risks: ${result.risks.join("; ") || "None"}`,
  ].join("\n");
}
function buildDiscoveryPrep(result: BriefDropResult, lane: LaneKey, matter: MatterState) {
  const extra = lane === "support"
    ? "- Support-specific checks: terms, process, evidence, references, deadlines"
    : lane === "disputes"
      ? "- Dispute-specific checks: chronology, evidence chain, admissions risk"
      : "- Discovery-specific checks: scope, unknowns, next questions";
  return [
    "Discovery / evidence prep",
    `- Core brief: ${result.brief}`,
    `- Main unknowns: ${result.missingInfo.join("; ") || "None"}`,
    `- Key questions to ask: ${result.followUpQuestions.join("; ") || "None"}`,
    `- Assumptions to test: ${result.assumptions.join("; ") || "None"}`,
    `${extra}`,
    matter.verifiedMaterial?.trim() ? `- Verified material already logged: ${matter.verifiedMaterial}` : "",
  ].filter(Boolean).join("\n");
}
function deriveQuoteReadiness(text: string, lane: LaneKey, missingInfo: string[], risks: string[]): QuoteReadiness {
  const lower = text.toLowerCase();
  const hasBudget = extractMoney(text).length > 0;
  const hasMeasurements = extractMeasurements(text).length > 0;
  const needsInspection = /\bleak|damp|moisture|crack|movement|site visit|inspect|come look\b/i.test(lower);
  if (lane === "support") return missingInfo.length > 3 ? "follow-up needed" : "ready for rough estimate";
  if (missingInfo.length >= 5 && !hasBudget && !hasMeasurements) return "not enough information";
  if (needsInspection || risks.some((risk) => risk.toLowerCase().includes("evidence trail"))) return "inspection needed";
  if (missingInfo.length > 0 && (!hasMeasurements || !hasBudget)) return "follow-up needed";
  return "ready for rough estimate";
}
function deriveBudgetSignal(text: string, lane: LaneKey): BudgetSignal {
  if (lane === "support") return /allowance|support|payment|arrears|cost|budget|hardship/i.test(text) ? "present" : "missing";
  return extractMoney(text).length > 0 ? "present" : "missing";
}
function deriveUrgency(text: string, matter: MatterState): DecisionLevel {
  const lower = `${text} ${matter.workDone || ""}`.toLowerCase();
  if (/\burgent|asap|immediately|tenant due|deadline|due in|before|hearing|response due\b/i.test(lower)) return "high";
  if (extractTiming(lower).length > 0) return "medium";
  return "low";
}
function deriveScopeClarity(text: string, lane: LaneKey, missingInfo: string[], requirements: string[]): DecisionLevel {
  const lower = text.toLowerCase();
  if (lane === "support") return missingInfo.length > 4 ? "low" : missingInfo.length > 2 ? "medium" : "high";
  if (missingInfo.length >= 5 || /\bnot sure|maybe|possibly|might\b/i.test(lower)) return "low";
  if (requirements.length >= 4 && missingInfo.length <= 2) return "high";
  return "medium";
}
function smartFallback(input: string, lane: LaneKey, matter: MatterState): BriefDropResult {
  const text = normalise(input);
  const partial = {
    brief: buildBrief(text, lane, matter),
    requirements: buildRequirements(text, lane, matter),
    missingInfo: buildMissingInfo(text, lane, matter),
    nextSteps: buildNextSteps(text, lane, matter),
    money: extractMoney(text),
    questionsFound: extractQuestions(text),
    risks: buildRisks(text, lane, matter),
    assumptions: buildAssumptions(text, lane, matter),
    followUpQuestions: buildFollowUpQuestions(text, lane, matter),
  };
  return {
    ...partial,
    clientReply: buildClientReply(partial as BriefDropResult, lane, matter),
    internalBrief: buildInternalBrief(partial as BriefDropResult, lane, matter),
    quotePrep: buildQuotePrep(partial as BriefDropResult, lane),
    discoveryPrep: buildDiscoveryPrep(partial as BriefDropResult, lane, matter),
    quoteReadiness: deriveQuoteReadiness(text, lane, partial.missingInfo, partial.risks),
    budgetSignal: deriveBudgetSignal(text, lane),
    urgency: deriveUrgency(text, matter),
    scopeClarity: deriveScopeClarity(text, lane, partial.missingInfo, partial.requirements),
  };
}
export async function GET() {
  return NextResponse.json({ ok: true, route: "clean" });
}
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = body?.input?.trim();
    const lane = (body?.lane || "services") as LaneKey;
    const matter = (body?.matter || {}) as MatterState;
    if (!input) return NextResponse.json({ error: "No input provided." }, { status: 400 });
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === "your_openai_api_key_here") return NextResponse.json(smartFallback(input, lane, matter));
    const contextBlock = [
      `Lane: ${lane}`,
      matter.matterTitle ? `Matter title: ${matter.matterTitle}` : "",
      matter.matterStatus ? `Matter status: ${matter.matterStatus}` : "",
      [matter.senderName, matter.senderRole, matter.senderOrg].filter(Boolean).length ? `Sender: ${[matter.senderName, matter.senderRole, matter.senderOrg].filter(Boolean).join(" · ")}` : "",
      [matter.recipientName, matter.recipientRole, matter.recipientOrg].filter(Boolean).length ? `Recipient: ${[matter.recipientName, matter.recipientRole, matter.recipientOrg].filter(Boolean).join(" · ")}` : "",
      matter.recipientRef ? `Reference: ${matter.recipientRef}` : "",
      matter.workDone ? `Work already done: ${matter.workDone}` : "",
      matter.verifiedMaterial ? `Verified material: ${matter.verifiedMaterial}` : "",
    ].filter(Boolean).join("\n");
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        input: [
          {
            role: "system",
            content:
              "You are BriefDrop. Turn messy incoming text into a usable working pack. Use the lane and matter context. Do not invent facts. Be concise, practical, and structured. For disputes, prioritise chronology, evidence gaps, and risk wording. For support, prioritise plain-English explanation, missing evidence, process checks, and next steps. For site, prioritise scope, access, and pricing readiness. For services, prioritise deliverables, fees, and client dependencies.",
          },
          { role: "user", content: `${contextBlock}\n\nSource material:\n${input}` },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "briefdrop_result",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                brief: { type: "string" },
                requirements: { type: "array", items: { type: "string" } },
                missingInfo: { type: "array", items: { type: "string" } },
                nextSteps: { type: "array", items: { type: "string" } },
                money: { type: "array", items: { type: "string" } },
                questionsFound: { type: "array", items: { type: "string" } },
                risks: { type: "array", items: { type: "string" } },
                assumptions: { type: "array", items: { type: "string" } },
                clientReply: { type: "string" },
                followUpQuestions: { type: "array", items: { type: "string" } },
                internalBrief: { type: "string" },
                quotePrep: { type: "string" },
                discoveryPrep: { type: "string" },
                quoteReadiness: { type: "string" },
                budgetSignal: { type: "string" },
                urgency: { type: "string" },
                scopeClarity: { type: "string" },
              },
              required: [
                "brief",
                "requirements",
                "missingInfo",
                "nextSteps",
                "money",
                "questionsFound",
                "risks",
                "assumptions",
                "clientReply",
                "followUpQuestions",
                "internalBrief",
                "quotePrep",
                "discoveryPrep",
                "quoteReadiness",
                "budgetSignal",
                "urgency",
                "scopeClarity",
              ],
            },
          },
        },
        max_output_tokens: 1200,
      }),
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || "OpenAI request failed", raw: data }, { status: response.status });
    let textOut = "";
    if (typeof data.output_text === "string" && data.output_text.trim()) textOut = data.output_text;
    else if (Array.isArray(data.output)) textOut = data.output.flatMap((item: any) => item.content || []).map((c: any) => c.text || "").join("\n");
    if (!textOut) return NextResponse.json({ error: "Empty response from OpenAI", raw: data }, { status: 500 });
    try {
      return NextResponse.json(JSON.parse(textOut) as BriefDropResult);
    } catch {
      return NextResponse.json({ error: "Model did not return valid JSON", raw: textOut }, { status: 500 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

type DecisionLevel = "low" | "medium" | "high";
type QuoteReadiness = "ready for rough estimate" | "follow-up needed" | "inspection needed" | "not enough information";
type BudgetSignal = "present" | "missing";

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

function normalise(text: string) { return text.replace(/\r/g, "").replace(/\n+/g, " ").replace(/\s+/g, " ").trim(); }
function unique(items: string[]) { return [...new Set(items.map((item) => item.trim()).filter(Boolean))]; }
function splitSentences(text: string) { return text.split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter(Boolean); }
function collectMatches(text: string, regex: RegExp) { return unique(Array.from(text.matchAll(regex), (match) => match[0])); }
function extractQuestions(text: string) { return unique(splitSentences(text).filter((s) => s.includes("?"))); }
function extractMoney(text: string) {
  const patterns = [
    /(?:£\s?\d[\d,]*(?:\.\d{1,2})?\s?(?:k|m)?(?:\s?(?:to|-|–)\s?£?\s?\d[\d,]*(?:\.\d{1,2})?\s?(?:k|m)?)?)/gi,
    /(?:\b(?:budget|budgets|ballpark|estimate|estimated|roughly|around|about|max spend|maximum spend|fixed fee|fee|deposit|retainer|labour only|labor only|daily rate|day rate|hourly rate|instalments?|installments?|payment plan|outstanding balance|cash available now)\b[^.?!]{0,50})/gi,
  ];
  return unique(patterns.flatMap((pattern) => collectMatches(text, pattern)));
}
function extractMeasurements(text: string) {
  const patterns = [
    /\b\d+(?:\.\d+)?\s?(?:mm|cm|m|metre|metres|meter|meters|sqm|sq m|m2|square metres|square meters)\b/gi,
    /\b\d+(?:\.\d+)?\s?x\s?\d+(?:\.\d+)?\s?(?:m|metres|meters|cm|mm)?\b/gi,
    /\b(?:\d+(?:\.\d+)?)\s?(?:bed|bedroom|bedrooms|storey|story|floor|floors|emails?|departments?)\b/gi,
  ];
  return unique(patterns.flatMap((pattern) => collectMatches(text, pattern)));
}
function extractTiming(text: string) {
  const patterns = [
    /\b(?:asap|urgent|immediately|this week|next week|this month|next month|weekend|weekends|evenings|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    /\b(?:before|after|from)\s+(?:the\s+)?\d{1,2}(?:st|nd|rd|th)?\b/gi,
    /\b(?:in\s+\d+\s+days?|within\s+\d+\s+days?|\d+\s+days?\s+after)\b/gi,
    /\b(?:tenant due|move in|moving out|deadline|access from|review this week|proposal before)\b[^.?!]{0,30}/gi,
  ];
  return unique(patterns.flatMap((pattern) => collectMatches(text, pattern)));
}
function detectCategories(text: string) {
  const lower = text.toLowerCase(); const items: string[] = [];
  const categories: Array<[RegExp, string]> = [
    [/\bbathroom|shower room|wc|toilet\b/i, "Bathroom / washroom work"],[/\bkitchen|worktop|sink|cupboard|unit\b/i, "Kitchen / cabinetry work"],[/\bbedroom|lounge|living room|front room|hall|hallway|landing\b/i, "Internal room repairs / finishing"],[/\broof|gutter|downpipe|render|repoint|window|door|elevation\b/i, "External repairs / envelope work"],[/\bpartition|stud|office|fit-?out|commercial\b/i, "Commercial / fit-out work"],[/\bwebsite|landing page|seo|ads|marketing|campaign|content|email sequence\b/i, "Marketing / digital service work"],[/\bbrand|branding|logo|design|deck|presentation\b/i, "Branding / design work"],[/\bautomation|workflow|crm|zapier|notion|airtable|system|handoff|intake\b/i, "Ops / automation work"],[/\bcopywriting|proposal|pitch|script\b/i, "Writing / communication work"],[/\bconsult|strategy|advice|review|audit\b/i, "Consulting / advisory work"],[/\belectric|socket|data|power|lighting\b/i, "Electrical / data work"],[/\bpaint|painting|decorate|decorating|plaster|skim|making good\b/i, "Finishing / decorating work"],
  ];
  for (const [regex, label] of categories) if (regex.test(lower)) items.push(label);
  return unique(items);
}
function detectIssues(text: string) {
  const lower = text.toLowerCase(); const items: string[] = [];
  const issues: Array<[RegExp, string]> = [
    [/\bleak|leaking|escape of water|water ingress\b/i, "Leak or water ingress"],[/\bdamp|moisture|wet\b/i, "Damp or moisture issue"],[/\bcrack|cracking|movement\b/i, "Cracking or movement concern"],[/\bsoft floor|spongy|springy|damaged floor|movement in one floor tile\b/i, "Possible floor damage"],[/\bextractor|fan|ventilation\b/i, "Ventilation / extractor issue"],[/\btile|tiling|retile|splashback\b/i, "Tiling work"],[/\bdoor|doors|frame|threshold\b/i, "Door or frame work"],[/\bskirting\b/i, "Skirting / trim work"],[/\bdeadline|urgent|due in\b/i, "Urgency or deadline pressure"],[/\bquote|price|estimate|ballpark|rough figure\b/i, "Pricing request"],[/\bnot sure|maybe|possibly|might\b/i, "Scope uncertainty"],[/\bvideo|videos|photos\b/i, "Remote quoting may be possible"],
  ];
  for (const [regex, label] of issues) if (regex.test(lower)) items.push(label);
  return unique(items);
}
function detectSupplyAndCommercial(text: string) {
  const lower = text.toLowerCase(); const items: string[] = [];
  const rules: Array<[RegExp, string]> = [
    [/\bwe can supply|we will supply|we'll supply|we've got|already bought|already have\b/i, "Client may be supplying some materials, assets, or inputs"],[/\blabour only|labor only\b/i, "Labour-only pricing may be requested"],[/\bstaged|phase|phased\b/i, "Work may need staging"],[/\bdeposit|retainer|instalment|installment|payment plan\b/i, "Payment structure is relevant"],[/\boccupied|tenant|staff are in|outside main office hours|weekdays only|access\b/i, "Access / occupancy constraints apply"],[/\binsurance|insurer|loss adjuster\b/i, "Insurance-style documentation may be needed"],
  ];
  for (const [regex, label] of rules) if (regex.test(lower)) items.push(label);
  return unique(items);
}
function buildRequirements(text: string) {
  const items: string[] = []; const measurements = extractMeasurements(text); const timing = extractTiming(text);
  items.push(...detectCategories(text), ...detectIssues(text), ...detectSupplyAndCommercial(text));
  if (measurements.length) items.push(`Known sizes / quantities: ${measurements.slice(0, 4).join(", ")}`);
  if (timing.length) items.push(`Timing constraints: ${timing.slice(0, 3).join(", ")}`);
  if (/\bquote|price|estimate|ballpark|rough figure\b/i.test(text)) items.push("Pricing / estimate requested");
  if (/\binspect|visit|come look|review|audit\b/i.test(text)) items.push("Inspection / review may be required before firm pricing");
  if (/\bphotos|video|videos\b/i.test(text)) items.push("Photos or videos may be available for provisional review");
  return unique(items);
}
function buildMissingInfo(text: string) {
  const lower = text.toLowerCase(); const items: string[] = []; const measurements = extractMeasurements(text); const money = extractMoney(text); const timing = extractTiming(text);
  if (!measurements.length) items.push("Accurate measurements, quantities, or scope size");
  if (!/\baddress|postcode|location|remote|online|office|flat|house|property\b/i.test(lower)) items.push("Location or delivery context");
  if (!timing.length) items.push("Deadline, preferred timing, or urgency");
  if (!money.length && !/\bbudget\b/i.test(lower)) items.push("Budget, ballpark, or pricing expectation");
  if (!/\bphotos|video|videos|brief|spec|attachment|notes\b/i.test(lower)) items.push("Supporting material such as photos, files, notes, or a clearer brief");
  if (!/\bsupply|suppl|already bought|already have|we've got|we have\b/i.test(lower)) items.push("Who is supplying materials, assets, content, or inputs");
  if (/\bmaybe|not sure|possibly|might\b/i.test(lower)) items.push("Decision on final scope versus investigation / review only");
  if (/\bteam|trade|contractor|designer|developer|writer\b/i.test(lower) === false) items.push("Who is expected to deliver the work or whether multiple specialists are needed");
  return unique(items);
}
function buildNextSteps(text: string) {
  const lower = text.toLowerCase(); const items: string[] = ["Request a tighter scope summary plus supporting files, photos, or examples", "Confirm whether the next step is a diagnosis / discovery call, site visit, or firm quote"];
  if (/\bleak|water|damp|moisture\b/i.test(lower)) items.push("Confirm whether the root cause is already resolved before pricing reinstatement or finish work");
  if (/\bbudget\b|£|\b\d+\s?k\b/i.test(lower)) items.push("Check whether the requested scope fits the stated budget or needs phasing");
  if (/\btenant|occupied|staff are in|access|weekdays only|outside main office hours\b/i.test(lower)) items.push("Lock down access windows and operational constraints before scheduling work");
  if (/\bphotos|video|videos\b/i.test(lower)) items.push("Provide a provisional view from photos or videos, then confirm after inspection if needed");
  return unique(items);
}
function buildRisks(text: string) {
  const lower = text.toLowerCase(); const items: string[] = [];
  if (/\bnot sure|maybe|possibly|might\b/i.test(lower)) items.push("Scope is still uncertain and may expand after review");
  if (!extractMeasurements(text).length) items.push("No reliable measurements or quantities provided yet");
  if (!extractMoney(text).length) items.push("No clear budget or price ceiling confirmed yet");
  if (/\bleak|damp|moisture|crack|movement\b/i.test(lower)) items.push("Underlying cause may need diagnosis before final pricing");
  if (/\bdeadline|urgent|due in|before\b/i.test(lower)) items.push("Deadline pressure could limit options or increase cost risk");
  return unique(items);
}
function buildAssumptions(text: string) {
  const lower = text.toLowerCase(); const items: string[] = [];
  if (/\bquote|estimate|ballpark\b/i.test(lower)) items.push("Assumes the user wants a scoping or pricing output rather than full delivery right away");
  if (/\bphotos|video|videos\b/i.test(lower)) items.push("Assumes some remote review may be possible before a visit or call");
  if (/\bwe['’]ve got|already bought|already have|can supply\b/i.test(lower)) items.push("Assumes some inputs or materials may be client-supplied");
  if (!/\bremote|online\b/i.test(lower) && /\bproperty|flat|house|office|site\b/i.test(lower)) items.push("Assumes a site visit or physical inspection may still be needed");
  return unique(items);
}
function buildBrief(text: string) {
  const categories = detectCategories(text); const issues = detectIssues(text); const money = extractMoney(text); const timing = extractTiming(text);
  return [
    categories.length ? `This looks like ${categories.slice(0, 2).join(" and ").toLowerCase()}.` : "This looks like a service or project enquiry that needs scoping.",
    issues.length ? `Key signals include ${issues.slice(0, 4).join(", ").toLowerCase()}.` : "The request needs clearer problem definition.",
    money.length ? `Money or pricing references: ${money.slice(0, 2).join(" | ")}.` : "",
    timing.length ? `Timing mentioned: ${timing.slice(0, 3).join(" | ")}.` : "",
  ].filter(Boolean).join(" ");
}
function buildFollowUpQuestions(text: string) {
  const items = ["What does success look like for this job or project?", "What is the exact scope you want priced or reviewed first?", "What deadline or timing matters most?"];
  if (!extractMoney(text).length) items.push("Do you have a rough budget or price range in mind?");
  if (!extractMeasurements(text).length) items.push("Can you share measurements, quantities, or a clearer size / scale of the work?");
  if (!/\bphotos|video|videos|brief|attachment|notes\b/i.test(text)) items.push("Can you send photos, files, notes, or examples so the scope is clearer?");
  return unique(items);
}
function buildClientReply(result: any) { return ["Thanks — this gives a solid starting point.", result.brief, result.missingInfo.length ? `To move this forward, I still need: ${result.missingInfo.slice(0, 4).join("; ")}.` : "", result.followUpQuestions.length ? `Key questions: ${result.followUpQuestions.slice(0, 3).join(" ")}` : "", "Once that’s clear, I can advise the next step or give a firmer quote / scope."].filter(Boolean).join(" "); }
function buildInternalBrief(result: any) { return [`BRIEF: ${result.brief}`, `REQUIREMENTS: ${result.requirements.join("; ") || "None"}`, `MISSING INFO: ${result.missingInfo.join("; ") || "None"}`, `NEXT STEPS: ${result.nextSteps.join("; ") || "None"}`, `MONEY: ${result.money.join("; ") || "None"}`, `RISKS: ${result.risks.join("; ") || "None"}`].join("\n"); }
function buildQuotePrep(result: any) { return [`Quote prep`, `- Scope summary: ${result.brief}`, `- Requirements to include: ${result.requirements.join("; ") || "None"}`, `- Missing info before firm pricing: ${result.missingInfo.join("; ") || "None"}`, `- Price signals: ${result.money.join("; ") || "None"}`, `- Risks: ${result.risks.join("; ") || "None"}`].join("\n"); }
function buildDiscoveryPrep(result: any) { return [`Discovery prep`, `- Core brief: ${result.brief}`, `- Main unknowns: ${result.missingInfo.join("; ") || "None"}`, `- Key questions to ask: ${result.followUpQuestions.join("; ") || "None"}`, `- Assumptions to test: ${result.assumptions.join("; ") || "None"}`, `- Risks / blockers: ${result.risks.join("; ") || "None"}`].join("\n"); }
function deriveQuoteReadiness(text: string, missingInfo: string[], risks: string[]): QuoteReadiness {
  const lower = text.toLowerCase(); const hasBudget = extractMoney(text).length > 0; const hasMeasurements = extractMeasurements(text).length > 0; const hasPhotos = /\bphotos|video|videos\b/i.test(lower); const needsInspection = /\bleak|damp|moisture|crack|movement|site visit|inspect|come look\b/i.test(lower);
  if (missingInfo.length >= 5 && !hasBudget && !hasMeasurements) return "not enough information";
  if (needsInspection || risks.some((risk) => risk.toLowerCase().includes("underlying cause"))) return "inspection needed";
  if (missingInfo.length > 0 && (!hasMeasurements || !hasPhotos || !hasBudget)) return "follow-up needed";
  return "ready for rough estimate";
}
function deriveBudgetSignal(text: string): BudgetSignal { return extractMoney(text).length > 0 ? "present" : "missing"; }
function deriveUrgency(text: string): DecisionLevel { const lower = text.toLowerCase(); if (/\burgent|asap|immediately|tenant due|deadline|due in|before\b/i.test(lower)) return "high"; if (extractTiming(text).length > 0) return "medium"; return "low"; }
function deriveScopeClarity(text: string, missingInfo: string[], requirements: string[]): DecisionLevel { const lower = text.toLowerCase(); if (missingInfo.length >= 5 || /\bnot sure|maybe|possibly|might\b/i.test(lower)) return "low"; if (requirements.length >= 4 && missingInfo.length <= 2) return "high"; return "medium"; }
function smartFallback(input: string): BriefDropResult {
  const text = normalise(input); const partial = { brief: buildBrief(text), requirements: buildRequirements(text), missingInfo: buildMissingInfo(text), nextSteps: buildNextSteps(text), money: extractMoney(text), questionsFound: extractQuestions(text), risks: buildRisks(text), assumptions: buildAssumptions(text), followUpQuestions: buildFollowUpQuestions(text) };
  return { ...partial, clientReply: buildClientReply(partial), internalBrief: buildInternalBrief(partial), quotePrep: buildQuotePrep(partial), discoveryPrep: buildDiscoveryPrep(partial), quoteReadiness: deriveQuoteReadiness(text, partial.missingInfo, partial.risks), budgetSignal: deriveBudgetSignal(text), urgency: deriveUrgency(text), scopeClarity: deriveScopeClarity(text, partial.missingInfo, partial.requirements) };
}
export async function GET() { return NextResponse.json({ ok: true, route: "clean" }); }
export async function POST(req: Request) {
  try {
    const body = await req.json(); const input = body?.input?.trim(); if (!input) return NextResponse.json({ error: "No input provided." }, { status: 400 });
    const apiKey = process.env.OPENAI_API_KEY; if (!apiKey || apiKey === "your_openai_api_key_here") return NextResponse.json(smartFallback(input));
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: "gpt-5.4-mini", input: [{ role: "system", content: "You are BriefDrop. Turn messy incoming messages into a usable business brief. Be concise, practical, and do not invent facts. Work for trades, agencies, consultants, service businesses, and operational teams." }, { role: "user", content: input }], text: { format: { type: "json_schema", name: "briefdrop_result", strict: true, schema: { type: "object", additionalProperties: false, properties: { brief: { type: "string" }, requirements: { type: "array", items: { type: "string" } }, missingInfo: { type: "array", items: { type: "string" } }, nextSteps: { type: "array", items: { type: "string" } }, money: { type: "array", items: { type: "string" } }, questionsFound: { type: "array", items: { type: "string" } }, risks: { type: "array", items: { type: "string" } }, assumptions: { type: "array", items: { type: "string" } }, clientReply: { type: "string" }, followUpQuestions: { type: "array", items: { type: "string" } }, internalBrief: { type: "string" }, quotePrep: { type: "string" }, discoveryPrep: { type: "string" }, quoteReadiness: { type: "string" }, budgetSignal: { type: "string" }, urgency: { type: "string" }, scopeClarity: { type: "string" } }, required: ["brief", "requirements", "missingInfo", "nextSteps", "money", "questionsFound", "risks", "assumptions", "clientReply", "followUpQuestions", "internalBrief", "quotePrep", "discoveryPrep", "quoteReadiness", "budgetSignal", "urgency", "scopeClarity"] } } }, max_output_tokens: 1100 }) });
    const data = await response.json(); if (!response.ok) return NextResponse.json({ error: data?.error?.message || "OpenAI request failed", raw: data }, { status: response.status });
    let textOut = ""; if (typeof data.output_text === "string" && data.output_text.trim()) textOut = data.output_text; else if (Array.isArray(data.output)) textOut = data.output.flatMap((item: any) => item.content || []).map((c: any) => c.text || "").join("\n");
    if (!textOut) return NextResponse.json({ error: "Empty response from OpenAI", raw: data }, { status: 500 });
    try { return NextResponse.json(JSON.parse(textOut) as BriefDropResult); } catch { return NextResponse.json({ error: "Model did not return valid JSON", raw: textOut }, { status: 500 }); }
  } catch (error: unknown) { const message = error instanceof Error ? error.message : "Server error"; return NextResponse.json({ error: message }, { status: 500 }); }
}

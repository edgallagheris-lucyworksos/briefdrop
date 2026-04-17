"use client";

import { useMemo, useRef, useState } from "react";

type DecisionLevel = "low" | "medium" | "high";
type QuoteReadiness = "ready for rough estimate" | "follow-up needed" | "inspection needed" | "not enough information";
type BudgetSignal = "present" | "missing";
type LaneKey = "site" | "services" | "disputes" | "support";
type StepKey = "lane" | "matter" | "facts" | "gaps" | "draft" | "next";

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

type OutputMode = "brief" | "reply" | "internal" | "quote" | "discovery";

type LaneMeta = {
  title: string;
  short: string;
  text: string;
  status: string;
  focus: string;
  inputTitle: string;
  inputSub: string;
  outputSub: string;
  defaultMode: OutputMode;
};

type MatterState = {
  matterTitle: string;
  senderName: string;
  senderRole: string;
  senderOrg: string;
  senderEmail: string;
  senderPhone: string;
  defaultSignoff: string;
  recipientName: string;
  recipientRole: string;
  recipientOrg: string;
  recipientRef: string;
  matterStatus: string;
  workDone: string;
  verifiedMaterial: string;
};

const samples: Record<LaneKey, string> = {
  site:
    "Need help pricing a rental flat turnaround. It’s a 2-bed first floor flat, roughly 58 to 62 square metres total. We’ve got a messy outgoing inspection list. Bedroom 1 needs a wall repaired where shelving was ripped out. Lounge has bad stains on the ceiling from an old leak that has apparently been fixed but needs checking. Kitchen worktop edge has swollen near the sink. Bathroom sealant is black and there’s movement in one floor tile by the WC. Budget around £1,800 all in, maybe stretch to £2,400 if needed. Access from Monday, tenant due in 12 days. Break down what is urgent, what is cosmetic, and whether this sounds like one trade or several.",
  services:
    "Need a quote for a landing page rewrite and email sequence for a new service launch. We need better positioning, 5 emails, and a tighter offer page. Budget is around £1,500 to £2,500. We have rough notes but no proper brief yet. Review this week and tell us what is missing before a proper proposal.",
  disputes:
    "Need help replying to a payment dispute. We have a chain of WhatsApp messages, two invoices, and a customer saying some extras were not agreed even though the work was requested in messages. I need a clear chronology, key facts extracted, issues list, and two draft responses: one open commercial response and one without prejudice settlement-style draft. I do not want anything overstated. I want missing evidence flagged, weak points flagged, and wording that stays firm without creating liability.",
  support:
    "Need help with a council support form and housing issue. The letter is full of terms we do not understand. We need a plain-English summary, key terms explained, possible rights or duties to check, an evidence checklist, and safer draft wording for the form and follow-up letter. There are heating cost problems, possible council tax support questions, and a housing repair issue. We do not want anything overstated and need deadlines flagged.",
};

const laneMeta: Record<LaneKey, LaneMeta> = {
  site: {
    title: "Site & scope",
    short: "Site",
    text: "Quotes, access, measurements, materials, snagging, exclusions.",
    status: "Current lane: Site & scope",
    focus: "Output focus: scope, exclusions, pricing flags, access, urgency.",
    inputTitle: "Source · Site & scope",
    inputSub: "Paste snagging lists, quote requests, inspection notes, access details, repair issues, or messy scope notes.",
    outputSub: "Sharper for repairs, access, materials, exclusions, rough estimates, and scope clarity.",
    defaultMode: "brief",
  },
  services: {
    title: "Services & fees",
    short: "Services",
    text: "Deliverables, revisions, client inputs, fee framing, scope drift.",
    status: "Current lane: Services & fees",
    focus: "Output focus: deliverables, fee framing, missing inputs, commercial wording.",
    inputTitle: "Source · Services & fees",
    inputSub: "Paste enquiry text, discovery notes, proposal drafts, timelines, revision issues, or pricing questions.",
    outputSub: "Sharper for proposals, deliverables, fees, revisions, and client-side dependencies.",
    defaultMode: "quote",
  },
  disputes: {
    title: "Disputes & position",
    short: "Disputes",
    text: "Chronology, payment issues, evidence gaps, response drafts.",
    status: "Current lane: Disputes & position",
    focus: "Output focus: chronology, evidence gaps, risk wording, reply drafts.",
    inputTitle: "Source · Disputes & position",
    inputSub: "Paste complaint chains, invoices, message trails, meeting notes, withheld-payment issues, or draft replies.",
    outputSub: "Sharper for disputes, commercial replies, chronology, evidence gaps, and safer wording.",
    defaultMode: "reply",
  },
  support: {
    title: "Council, housing & support",
    short: "Support",
    text: "Forms, terminology help, support statements, rights/process checks, evidence packs.",
    status: "Current lane: Council, housing & support",
    focus: "Output focus: plain-English wording, missing evidence, process checks, next steps.",
    inputTitle: "Source · Council, housing & support",
    inputSub: "Paste letters, forms, housing issues, support statements, benefit wording, heating support questions, or council responses.",
    outputSub: "Sharper for council forms, housing issues, support statements, terminology help, and evidence-led next steps.",
    defaultMode: "discovery",
  },
};

const modeLabels: Record<OutputMode, string> = {
  brief: "Position",
  reply: "Reply",
  internal: "Internal",
  quote: "Commercial",
  discovery: "Evidence",
};

const stepLabels: Record<StepKey, string> = {
  lane: "Lane",
  matter: "Matter",
  facts: "Facts",
  gaps: "Gaps",
  draft: "Draft",
  next: "Next steps",
};

const initialMatter: MatterState = {
  matterTitle: "",
  senderName: "",
  senderRole: "",
  senderOrg: "",
  senderEmail: "",
  senderPhone: "",
  defaultSignoff: "Kind regards",
  recipientName: "",
  recipientRole: "",
  recipientOrg: "",
  recipientRef: "",
  matterStatus: "Open",
  workDone: "",
  verifiedMaterial: "",
};

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function inferStep(result: BriefDropResult | null, mode: OutputMode): StepKey {
  if (!result) return "matter";
  if (mode === "reply" || mode === "quote" || mode === "internal") return "draft";
  if (mode === "discovery") return "gaps";
  return "facts";
}

export default function Page() {
  const [lane, setLane] = useState<LaneKey>("services");
  const [input, setInput] = useState(samples.services);
  const [matter, setMatter] = useState<MatterState>(initialMatter);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BriefDropResult | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState("");
  const [mode, setMode] = useState<OutputMode>(laneMeta.services.defaultMode);
  const [showOriginal, setShowOriginal] = useState(false);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const laneInfo = laneMeta[lane];
  const currentStep = inferStep(result, mode);

  function chooseLane(nextLane: LaneKey) {
    const meta = laneMeta[nextLane];
    setLane(nextLane);
    setInput(samples[nextLane]);
    setResult(null);
    setError("");
    setStatus("");
    setMode(meta.defaultMode);
    window.setTimeout(() => {
      workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function updateMatter(key: keyof MatterState, value: string) {
    setMatter((prev) => ({ ...prev, [key]: value }));
  }

  async function handleBuild() {
    setLoading(true);
    setError("");
    setStatus("");
    setResult(null);
    try {
      const res = await fetch("/api/clean", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          lane,
          matter,
        }),
      });
      const raw = await res.text();
      const data = JSON.parse(raw);
      if (!res.ok) throw new Error(data?.error || "Something went wrong");
      setResult(data);
      setStatus(`Status ${res.status} · Working pack built`);
    } catch (err: any) {
      setError(err.message || "Failed to build output");
    } finally {
      setLoading(false);
    }
  }

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 1400);
    } catch {
      setError("Clipboard copy failed in this browser.");
    }
  }

  const activeOutput = useMemo(() => {
    if (!result) return "";
    if (mode === "reply") return result.clientReply;
    if (mode === "internal") return result.internalBrief;
    if (mode === "quote") return result.quotePrep;
    if (mode === "discovery") return result.discoveryPrep;
    return result.brief;
  }, [mode, result]);

  const signerBlock = useMemo(() => {
    const parts = [matter.defaultSignoff, matter.senderName, matter.senderRole || matter.senderOrg, matter.senderEmail, matter.senderPhone].filter(Boolean);
    return parts.join("\n");
  }, [matter]);

  function buildFullCopy() {
    const header = [
      `Matter title: ${matter.matterTitle || "Untitled matter"}`,
      `Lane: ${laneInfo.title}`,
      `Status: ${matter.matterStatus || "Open"}`,
      matter.recipientName || matter.recipientOrg ? `Recipient: ${[matter.recipientName, matter.recipientRole, matter.recipientOrg].filter(Boolean).join(" · ")}` : "",
      matter.recipientRef ? `Reference: ${matter.recipientRef}` : "",
      matter.workDone ? `Work already done:\n${matter.workDone}` : "",
      matter.verifiedMaterial ? `Verified material:\n${matter.verifiedMaterial}` : "",
    ].filter(Boolean).join("\n");

    if (!result) return `${header}\n\n${input}`;
    return [
      header,
      `\nDecision strip:\nQuote readiness: ${result.quoteReadiness}\nBudget signal: ${result.budgetSignal}\nUrgency: ${result.urgency}\nScope clarity: ${result.scopeClarity}`,
      `\nPosition:\n${result.brief}`,
      `\nFacts extracted:\n- ${result.requirements.join("\n- ") || "None"}`,
      `\nEvidence gaps:\n- ${result.missingInfo.join("\n- ") || "None"}`,
      `\nNext steps:\n- ${result.nextSteps.join("\n- ") || "None"}`,
      `\nMoney / pricing:\n- ${result.money.join("\n- ") || "None"}`,
      `\nQuestions found:\n- ${result.questionsFound.join("\n- ") || "None"}`,
      `\nRisks / blockers:\n- ${result.risks.join("\n- ") || "None"}`,
      `\nAssumptions:\n- ${result.assumptions.join("\n- ") || "None"}`,
      `\nReply draft:\n${result.clientReply}`,
      `\nInternal brief:\n${result.internalBrief}`,
      `\nCommercial draft:\n${result.quotePrep}`,
      `\nEvidence / dispute draft:\n${result.discoveryPrep}`,
      signerBlock ? `\nSuggested sign-off:\n${signerBlock}` : "",
      `\nNote:\nBriefDrop structures information and drafts working outputs. It does not provide legal, tax, accounting, regulated welfare, or legal advice. Review facts, figures, attachments, deadlines, and final wording before sending or relying on it.`,
    ].filter(Boolean).join("\n");
  }

  return (
    <main className="bd-page">
      <div className="bd-shell">
        <section className="bd-hero bd-card">
          <div className="bd-topline">
            <div className="bd-brand">
              <div className="bd-mark" aria-hidden="true">
                <span className="bd-mark-core" />
                <span className="bd-mark-bar bd-mark-bar-a" />
                <span className="bd-mark-bar bd-mark-bar-b" />
                <span className="bd-mark-bar bd-mark-bar-c" />
              </div>
              <div>
                <div className="bd-name">BriefDrop</div>
                <div className="bd-tag">Strip the noise. Build the case.</div>
              </div>
            </div>
            <div className="bd-badge">Working pack, not waffle</div>
          </div>

          <div className="bd-hero-row">
            <div className="bd-hero-copy">
              <h1>Sort the facts. Draft the move.</h1>
              <p>Built for scope, fees, disputes, and public-support paperwork.</p>
            </div>
            <div className="bd-hero-note">
              <div className="bd-hero-note-label">Use it for</div>
              <div className="bd-hero-note-text">messy messages, complaints, quotes, official letters, evidence gaps, and reply drafts.</div>
            </div>
          </div>

          <div className="bd-lane-strip" role="tablist" aria-label="BriefDrop lanes">
            {Object.entries(laneMeta).map(([key, card]) => (
              <button key={key} className={lane === key ? "bd-lane-tab is-active" : "bd-lane-tab"} onClick={() => chooseLane(key as LaneKey)}>
                {card.short}
              </button>
            ))}
          </div>
        </section>

        <section className="bd-status-wrap">
          <section className="bd-lane-status bd-card" ref={workspaceRef}>
            <div>
              <div className="bd-lane-status-label">{laneInfo.status}</div>
              <div className="bd-lane-status-text">{laneInfo.focus}</div>
            </div>
            <div className="bd-lane-status-badge">Active lane</div>
          </section>

          <section className="bd-steps bd-card">
            {(["lane", "matter", "facts", "gaps", "draft", "next"] as StepKey[]).map((step) => (
              <div key={step} className={step === currentStep ? "bd-step is-active" : step === "lane" ? "bd-step is-done" : "bd-step"}>
                <span className="bd-step-dot" />
                <span>{stepLabels[step]}</span>
              </div>
            ))}
          </section>
        </section>

        <div className="bd-grid">
          <section className="bd-panel bd-card">
            <div className="bd-panel-head">
              <div className="bd-panel-title">Matter setup</div>
              <div className="bd-panel-sub">Set the parties, matter title, sign-off, previous work done, and verified material before drafting.</div>
            </div>

            <div className="bd-form-grid bd-form-grid-top">
              <Field label="Matter title"><input value={matter.matterTitle} onChange={(e) => updateMatter("matterTitle", e.target.value)} className="bd-input" placeholder="Payment dispute – Ash Road extras" /></Field>
              <Field label="Status"><input value={matter.matterStatus} onChange={(e) => updateMatter("matterStatus", e.target.value)} className="bd-input" placeholder="Open / Awaiting reply / Ready to send" /></Field>
            </div>

            <div className="bd-section-label">Sender / sign-off</div>
            <div className="bd-form-grid">
              <Field label="Sender name"><input value={matter.senderName} onChange={(e) => updateMatter("senderName", e.target.value)} className="bd-input" placeholder="Edward Gallagher" /></Field>
              <Field label="Role"><input value={matter.senderRole} onChange={(e) => updateMatter("senderRole", e.target.value)} className="bd-input" placeholder="Director / Sole trader / Project lead" /></Field>
              <Field label="Organisation"><input value={matter.senderOrg} onChange={(e) => updateMatter("senderOrg", e.target.value)} className="bd-input" placeholder="Omnibuild / BriefDrop" /></Field>
              <Field label="Default sign-off"><input value={matter.defaultSignoff} onChange={(e) => updateMatter("defaultSignoff", e.target.value)} className="bd-input" placeholder="Kind regards" /></Field>
              <Field label="Email"><input value={matter.senderEmail} onChange={(e) => updateMatter("senderEmail", e.target.value)} className="bd-input" placeholder="name@example.com" /></Field>
              <Field label="Phone"><input value={matter.senderPhone} onChange={(e) => updateMatter("senderPhone", e.target.value)} className="bd-input" placeholder="07..." /></Field>
            </div>

            <div className="bd-section-label">Recipient / other party</div>
            <div className="bd-form-grid">
              <Field label="Recipient name"><input value={matter.recipientName} onChange={(e) => updateMatter("recipientName", e.target.value)} className="bd-input" placeholder="Derek Lloyd" /></Field>
              <Field label="Recipient role"><input value={matter.recipientRole} onChange={(e) => updateMatter("recipientRole", e.target.value)} className="bd-input" placeholder="Client / Housing officer / Manager" /></Field>
              <Field label="Organisation"><input value={matter.recipientOrg} onChange={(e) => updateMatter("recipientOrg", e.target.value)} className="bd-input" placeholder="Sustainable Kitchens / Bristol City Council" /></Field>
              <Field label="Reference"><input value={matter.recipientRef} onChange={(e) => updateMatter("recipientRef", e.target.value)} className="bd-input" placeholder="Case ref / invoice ref / complaint ref" /></Field>
            </div>

            <div className="bd-section-label">Previous material</div>
            <div className="bd-form-stack">
              <Field label="Work already done"><textarea value={matter.workDone} onChange={(e) => updateMatter("workDone", e.target.value)} className="bd-textarea bd-textarea-small" placeholder="What has already happened, what has already been sent, what work is complete, what money has already changed hands..." /></Field>
              <Field label="Verified / safe material to reuse"><textarea value={matter.verifiedMaterial} onChange={(e) => updateMatter("verifiedMaterial", e.target.value)} className="bd-textarea bd-textarea-small" placeholder="Facts already checked, evidence already verified, timeline points safe to reuse, previous agreed wording..." /></Field>
            </div>
          </section>

          <section className="bd-panel bd-card">
            <div className="bd-panel-head">
              <div className="bd-panel-title">{laneInfo.inputTitle}</div>
              <div className="bd-panel-sub">{laneInfo.inputSub}</div>
            </div>

            <div className="bd-file-box">
              <div>
                <div className="bd-file-title">Files</div>
                <div className="bd-file-sub">PDF / image / doc input is planned next. Current build uses pasted text plus matter setup.</div>
              </div>
              <div className="bd-file-pill">matter setup live</div>
            </div>

            <textarea value={input} onChange={(e) => setInput(e.target.value)} className="bd-textarea" placeholder="Paste the source material here..." />

            <div className="bd-actions">
              <button onClick={handleBuild} disabled={loading} className="bd-btn bd-btn-primary">{loading ? "Building..." : "Build working pack"}</button>
              <button onClick={() => { setInput(""); setResult(null); setError(""); setStatus(""); }} className="bd-btn bd-btn-secondary">Reset matter</button>
              <button onClick={() => copyText("full", buildFullCopy())} className="bd-btn bd-btn-secondary">{copied === "full" ? "Copied" : "Copy pack"}</button>
            </div>

            <div className="bd-actions bd-actions-tight">
              <button onClick={() => setShowOriginal((v) => !v)} className="bd-btn bd-btn-small">{showOriginal ? "Hide source text" : "Show source text"}</button>
            </div>

            {showOriginal && <div className="bd-original">{input}</div>}
            {status && !error && <div className="bd-status">{status}</div>}
            {error && <div className="bd-error">{error}</div>}
          </section>
        </div>

        <section className="bd-panel bd-card bd-output-panel">
          <div className="bd-panel-head bd-panel-head-row">
            <div>
              <div className="bd-panel-title">Working position</div>
              <div className="bd-panel-sub">{laneInfo.outputSub}</div>
            </div>
            {result && (
              <div className="bd-mode-row">
                {(["brief", "reply", "internal", "quote", "discovery"] as OutputMode[]).map((item) => (
                  <button key={item} onClick={() => setMode(item)} className={mode === item ? "bd-mode is-active" : "bd-mode"}>{modeLabels[item]}</button>
                ))}
              </div>
            )}
          </div>

          {!result && !error ? (
            <div className="bd-empty">Pick a lane, set the matter header, paste the source material, then hit <strong>Build working pack</strong>. BriefDrop will sort facts, gaps, draft wording, and next actions.</div>
          ) : result ? (
            <div className="bd-stack">
              <div className="bd-summary-grid">
                <DecisionCard label="Quote readiness" value={titleCase(result.quoteReadiness)} />
                <DecisionCard label="Budget signal" value={titleCase(result.budgetSignal)} />
                <DecisionCard label="Urgency" value={titleCase(result.urgency)} />
                <DecisionCard label="Scope clarity" value={titleCase(result.scopeClarity)} />
              </div>

              <SectionCard title={modeLabels[mode]} emphasis>
                <p className="bd-copy">{activeOutput}</p>
                <div className="bd-actions bd-actions-tight">
                  <button onClick={() => copyText(mode, activeOutput)} className="bd-btn bd-btn-small">{copied === mode ? "Copied" : `Copy ${modeLabels[mode]}`}</button>
                  <button onClick={() => copyText("reply", result.clientReply)} className="bd-btn bd-btn-small">{copied === "reply" ? "Copied" : "Copy reply"}</button>
                  <button onClick={() => copyText("internal", result.internalBrief)} className="bd-btn bd-btn-small">{copied === "internal" ? "Copied" : "Copy internal"}</button>
                </div>
              </SectionCard>

              <div className="bd-three-col">
                <SectionCard title="Matter header">
                  <BulletList items={[
                    matter.matterTitle || "No matter title set",
                    matter.matterStatus ? `Status: ${matter.matterStatus}` : "No status set",
                    [matter.recipientName, matter.recipientRole, matter.recipientOrg].filter(Boolean).join(" · ") || "No recipient set",
                    matter.recipientRef ? `Reference: ${matter.recipientRef}` : "No reference set",
                  ]} empty="No matter header yet." />
                </SectionCard>
                <SectionCard title="Work already done"><ParagraphOrEmpty text={matter.workDone} empty="No previous work logged yet." /></SectionCard>
                <SectionCard title="Verified material"><ParagraphOrEmpty text={matter.verifiedMaterial} empty="No verified material logged yet." /></SectionCard>
              </div>

              <div className="bd-section-label">Facts and gaps</div>
              <div className="bd-two-col">
                <SectionCard title="Facts extracted"><BulletList items={result.requirements} empty="No clear requirements found." /></SectionCard>
                <SectionCard title="Evidence gaps"><BulletList items={result.missingInfo} empty="No obvious missing information found." /></SectionCard>
                <SectionCard title="Risks / blockers"><BulletList items={result.risks} empty="No major blockers found." /></SectionCard>
                <SectionCard title="Assumptions inferred"><BulletList items={result.assumptions} empty="No major assumptions found." /></SectionCard>
              </div>

              <div className="bd-section-label">Next move</div>
              <div className="bd-two-col">
                <SectionCard title="Next steps"><BulletList items={result.nextSteps} empty="No next steps found." /></SectionCard>
                <SectionCard title="Follow-up questions"><BulletList items={result.followUpQuestions} empty="No follow-up questions found." /></SectionCard>
                <SectionCard title="Money / pricing references"><BulletList items={result.money} empty="No money references found." /></SectionCard>
                <SectionCard title="Questions found"><BulletList items={result.questionsFound} empty="No direct questions found." /></SectionCard>
              </div>

              <div className="bd-two-col">
                <SectionCard title="Suggested sign-off"><ParagraphOrEmpty text={signerBlock} empty="No sender/sign-off block set yet." preserve /></SectionCard>
                <SectionCard title="Draft support only"><p className="bd-copy">BriefDrop structures information and drafts working outputs. It does not provide legal, tax, accounting, regulated welfare, or regulated legal advice. Review facts, figures, attachments, deadlines, and final wording before sending or relying on it.</p></SectionCard>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="bd-field"><span className="bd-field-label">{label}</span>{children}</label>;
}

function DecisionCard({ label, value }: { label: string; value: string }) {
  return <div className="bd-summary-card"><div className="bd-summary-label">{label}</div><div className="bd-summary-value">{value}</div></div>;
}

function SectionCard({ title, children, emphasis = false }: { title: string; children: React.ReactNode; emphasis?: boolean }) {
  return <div className={emphasis ? "bd-subcard bd-subcard-emphasis" : "bd-subcard"}><div className="bd-subcard-title">{title}</div>{children}</div>;
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  const cleaned = items.filter((item) => item && item.trim());
  if (cleaned.length === 0) return <div className="bd-muted">{empty}</div>;
  return <ul className="bd-list">{cleaned.map((item, index) => <li key={`${item}-${index}`} className="bd-list-item">{item}</li>)}</ul>;
}

function ParagraphOrEmpty({ text, empty, preserve = false }: { text: string; empty: string; preserve?: boolean }) {
  if (!text.trim()) return <div className="bd-muted">{empty}</div>;
  return <p className={preserve ? "bd-copy bd-copy-preserve" : "bd-copy"}>{text}</p>;
}

"use client";

import { useMemo, useState } from "react";

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

type OutputMode = "brief" | "reply" | "internal" | "quote" | "discovery";

const samples = {
  site:
    "Need help pricing a rental flat turnaround. It’s a 2-bed first floor flat, roughly 58 to 62 square metres total. We’ve got a messy outgoing inspection list. Bedroom 1 needs a wall repaired where shelving was ripped out. Lounge has bad stains on the ceiling from an old leak that has apparently been fixed but needs checking. Kitchen worktop edge has swollen near the sink. Bathroom sealant is black and there’s movement in one floor tile by the WC. Budget around £1,800 all in, maybe stretch to £2,400 if needed. Access from Monday, tenant due in 12 days. Break down what is urgent, what is cosmetic, and whether this sounds like one trade or several.",
  services:
    "Need a quote for a landing page rewrite and email sequence for a new service launch. We need better positioning, 5 emails, and a tighter offer page. Budget is around £1,500 to £2,500. We have rough notes but no proper brief yet. Review this week and tell us what is missing before a proper proposal.",
  disputes:
    "Need help replying to a payment dispute. We have a chain of WhatsApp messages, two invoices, and a customer saying some extras were not agreed even though the work was requested in messages. I need a clear chronology, key facts extracted, issues list, and two draft responses: one open commercial response and one without prejudice settlement-style draft. I do not want anything overstated. I want missing evidence flagged, weak points flagged, and wording that stays firm without creating liability.",
};

const modeLabels: Record<OutputMode, string> = {
  brief: "Position",
  reply: "Reply",
  internal: "Internal",
  quote: "Commercial",
  discovery: "Evidence",
};

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function Page() {
  const [input, setInput] = useState(samples.services);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BriefDropResult | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState("");
  const [mode, setMode] = useState<OutputMode>("brief");
  const [showOriginal, setShowOriginal] = useState(false);

  async function handleBuild() {
    setLoading(true);
    setError("");
    setStatus("");
    setResult(null);
    try {
      const res = await fetch("/api/clean", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const raw = await res.text();
      const data = JSON.parse(raw);
      if (!res.ok) throw new Error(data?.error || "Something went wrong");
      setResult(data);
      setStatus(`Status ${res.status} · Output built`);
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

  function buildFullCopy() {
    if (!result) return input;
    return [
      `Decision strip:\nQuote readiness: ${result.quoteReadiness}\nBudget signal: ${result.budgetSignal}\nUrgency: ${result.urgency}\nScope clarity: ${result.scopeClarity}`,
      `\nPosition:\n${result.brief}`,
      `\nRequirements / issues:\n- ${result.requirements.join("\n- ") || "None"}`,
      `\nMissing info / evidence gaps:\n- ${result.missingInfo.join("\n- ") || "None"}`,
      `\nNext steps:\n- ${result.nextSteps.join("\n- ") || "None"}`,
      `\nMoney / pricing:\n- ${result.money.join("\n- ") || "None"}`,
      `\nQuestions found:\n- ${result.questionsFound.join("\n- ") || "None"}`,
      `\nRisks / blockers:\n- ${result.risks.join("\n- ") || "None"}`,
      `\nAssumptions:\n- ${result.assumptions.join("\n- ") || "None"}`,
      `\nReply draft:\n${result.clientReply}`,
      `\nInternal brief:\n${result.internalBrief}`,
      `\nCommercial draft:\n${result.quotePrep}`,
      `\nEvidence / dispute draft:\n${result.discoveryPrep}`,
      `\nNote:\nBriefDrop structures information and drafts working outputs. It does not provide legal, tax, accounting, or regulated professional advice. Review facts, figures, attachments, and final wording before sending or relying on it.`,
    ].join("\n");
  }

  return (
    <main className="bd-page">
      <div className="bd-shell">
        <section className="bd-hero bd-card">
          <div className="bd-hero-top">
            <div className="bd-brand">
              <div className="bd-mark" aria-hidden="true">
                <span className="bd-mark-core" />
                <span className="bd-mark-bar bd-mark-bar-a" />
                <span className="bd-mark-bar bd-mark-bar-b" />
                <span className="bd-mark-bar bd-mark-bar-c" />
              </div>
              <div>
                <div className="bd-name">BriefDrop</div>
                <div className="bd-tag">Clarify scope. Draft response. Reduce risk.</div>
              </div>
            </div>
            <div className="bd-badge">Control surface for messy inbound</div>
          </div>

          <div className="bd-hero-copy">
            <h1>Turn messy inbound into a clear position.</h1>
            <p>Built for scope, fees, disputes, and internal handover. Facts up front. Gaps visible. Next move clear.</p>
          </div>

          <div className="bd-lane-grid">
            <LaneCard title="Site & scope" text="Quotes, access, measurements, materials, snagging, exclusions." onClick={() => setInput(samples.site)} active />
            <LaneCard title="Services & fees" text="Deliverables, revisions, client inputs, fee framing, scope drift." onClick={() => setInput(samples.services)} />
            <LaneCard title="Disputes & position" text="Chronology, payment issues, evidence gaps, response drafts." onClick={() => setInput(samples.disputes)} />
          </div>
        </section>

        <div className="bd-grid">
          <section className="bd-panel bd-card">
            <div className="bd-panel-head">
              <div className="bd-panel-title">Source material</div>
              <div className="bd-panel-sub">Paste messages, emails, notes, complaint chains, quote requests, or internal handover text.</div>
            </div>

            <textarea value={input} onChange={(e) => setInput(e.target.value)} className="bd-textarea" placeholder="Paste the source material here..." />

            <div className="bd-actions">
              <button onClick={handleBuild} disabled={loading} className="bd-btn bd-btn-primary">{loading ? "Building..." : "Build output"}</button>
              <button onClick={() => { setInput(""); setResult(null); setError(""); setStatus(""); }} className="bd-btn bd-btn-secondary">Clear</button>
              <button onClick={() => copyText("full", buildFullCopy())} className="bd-btn bd-btn-secondary">{copied === "full" ? "Copied" : "Copy pack"}</button>
            </div>

            <div className="bd-actions bd-actions-tight">
              <button onClick={() => setShowOriginal((v) => !v)} className="bd-btn bd-btn-small">{showOriginal ? "Hide source material" : "Show source material"}</button>
            </div>

            {showOriginal && <div className="bd-original">{input}</div>}
            {status && !error && <div className="bd-status">{status}</div>}
            {error && <div className="bd-error">{error}</div>}
          </section>

          <section className="bd-panel bd-card">
            <div className="bd-panel-head bd-panel-head-row">
              <div>
                <div className="bd-panel-title">Working position</div>
                <div className="bd-panel-sub">Sharper for quotes, disputes, commercial replies, and internal handover.</div>
              </div>
              {result && <div className="bd-mode-row">{(["brief", "reply", "internal", "quote", "discovery"] as OutputMode[]).map((item) => <button key={item} onClick={() => setMode(item)} className={mode === item ? "bd-mode is-active" : "bd-mode"}>{modeLabels[item]}</button>)}</div>}
            </div>

            {!result && !error ? (
              <div className="bd-empty">Hit <strong>Build output</strong> to turn the source material into a structured working pack.</div>
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

                <div className="bd-note-card">
                  <div className="bd-note-title">Draft support only</div>
                  <p>BriefDrop structures information and drafts working outputs. It does not provide legal, tax, accounting, or regulated professional advice. Review facts, figures, attachments, and final wording before sending or relying on it.</p>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}

function LaneCard({ title, text, onClick, active = false }: { title: string; text: string; onClick: () => void; active?: boolean }) {
  return <button className={active ? "bd-lane-card is-active" : "bd-lane-card"} onClick={onClick}><span className="bd-lane-title">{title}</span><span className="bd-lane-text">{text}</span></button>;
}

function DecisionCard({ label, value }: { label: string; value: string }) {
  return <div className="bd-summary-card"><div className="bd-summary-label">{label}</div><div className="bd-summary-value">{value}</div></div>;
}

function SectionCard({ title, children, emphasis = false }: { title: string; children: React.ReactNode; emphasis?: boolean }) {
  return <div className={emphasis ? "bd-subcard bd-subcard-emphasis" : "bd-subcard"}><div className="bd-subcard-title">{title}</div>{children}</div>;
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (!items || items.length === 0) return <div className="bd-muted">{empty}</div>;
  return <ul className="bd-list">{items.map((item, index) => <li key={`${item}-${index}`} className="bd-list-item">{item}</li>)}</ul>;
}

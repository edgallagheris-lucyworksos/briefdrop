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
  trades:
    "Need help pricing a rental flat turnaround. It’s a 2-bed first floor flat, roughly 58 to 62 square metres total. We’ve got a list from the outgoing inspection but it’s messy. Bedroom 1 needs a wall repaired where shelving’s been ripped out, maybe skim not patch fill. Lounge has two bad stains on the ceiling from an old leak that has apparently been fixed but needs checking. Kitchen worktop edge has swollen near the sink and there’s a cracked tile in the splashback. Bathroom sealant is black and there’s movement in one floor tile by the WC. Also need 3 internal doors eased because they catch. We do not need top-spec finish, just clean and durable for reletting. Budget around £1,800 all in, maybe stretch to £2,400 if it genuinely needs more. Access from Monday, tenant due in 12 days after. Can you break down what is urgent, what is cosmetic, and whether this sounds like one trade or several? Also if we send videos, can you quote provisionally before a visit?",
  service:
    "Need a quote for a landing page rewrite and email sequence for a new service launch. We need better positioning, 5 emails, and a tighter offer page. Budget is around £1,500 to £2,500. We have rough notes but no proper brief yet. Can you review this week and tell us what you need first?",
  ops:
    "We need help cleaning up our operations handover. At the moment tasks are split across Slack, email, and Notion. We need someone to map the current process, identify gaps, and propose a cleaner intake and handoff workflow. There are 3 departments involved and we need a proposal before next Friday. Budget is not fixed yet but probably under £5k. Can you tell us what information you’d need to scope this properly?",
};

const modeLabels: Record<OutputMode, string> = {
  brief: "Brief",
  reply: "Client Reply",
  internal: "Internal Brief",
  quote: "Quote Prep",
  discovery: "Discovery Prep",
};

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function Page() {
  const [input, setInput] = useState(samples.service);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BriefDropResult | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState("");
  const [mode, setMode] = useState<OutputMode>("brief");
  const [showOriginal, setShowOriginal] = useState(false);

  async function handleClean() {
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
      setStatus(`Status ${res.status} · Parsed successfully`);
    } catch (err: any) {
      setError(err.message || "Failed to clean message");
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
      `\nBrief:\n${result.brief}`,
      `\nRequirements:\n- ${result.requirements.join("\n- ") || "None"}`,
      `\nMissing info:\n- ${result.missingInfo.join("\n- ") || "None"}`,
      `\nNext steps:\n- ${result.nextSteps.join("\n- ") || "None"}`,
      `\nMoney / pricing:\n- ${result.money.join("\n- ") || "None"}`,
      `\nQuestions found:\n- ${result.questionsFound.join("\n- ") || "None"}`,
      `\nRisks / blockers:\n- ${result.risks.join("\n- ") || "None"}`,
      `\nAssumptions:\n- ${result.assumptions.join("\n- ") || "None"}`,
      `\nFollow-up questions:\n- ${result.followUpQuestions.join("\n- ") || "None"}`,
      `\nClient reply:\n${result.clientReply}`,
      `\nInternal brief:\n${result.internalBrief}`,
      `\nQuote prep:\n${result.quotePrep}`,
      `\nDiscovery prep:\n${result.discoveryPrep}`,
    ].join("\n");
  }

  return (
    <main className="bd-page">
      <div className="bd-shell">
        <section className="bd-card bd-hero">
          <div className="bd-hero-top">
            <div className="bd-brand">
              <div className="bd-mark"><span /></div>
              <div>
                <div className="bd-name">BriefDrop</div>
                <div className="bd-tag">Turn messy inbound into a decision-ready intake pack.</div>
              </div>
            </div>
            <div className="bd-badge">Universal intake tool</div>
          </div>

          <div className="bd-hero-copy">
            <h1>Paste the messages. Get the brief.</h1>
            <p>BriefDrop turns chats, emails, notes, and rough scopes into usable work outputs: brief, pricing signals, follow-up questions, quote prep, discovery prep, and handover-ready notes.</p>
          </div>

          <div className="bd-chip-row">
            <button className="bd-chip" onClick={() => setInput(samples.trades)}>Use trades sample</button>
            <button className="bd-chip" onClick={() => setInput(samples.service)}>Use service sample</button>
            <button className="bd-chip" onClick={() => setInput(samples.ops)}>Use ops sample</button>
          </div>
        </section>

        <div className="bd-grid">
          <section className="bd-card bd-panel">
            <div className="bd-panel-head">
              <div className="bd-panel-title">Paste messages or notes</div>
              <div className="bd-panel-sub">Use anything: WhatsApp, email, voice-note transcript, sales enquiry, internal notes, rough scope.</div>
            </div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="bd-textarea"
              placeholder="Paste anything here..."
            />

            <div className="bd-actions">
              <button onClick={handleClean} disabled={loading} className="bd-btn bd-btn-primary">{loading ? "Cleaning..." : "Clean this up"}</button>
              <button onClick={() => { setInput(""); setResult(null); setError(""); setStatus(""); }} className="bd-btn bd-btn-secondary">Clear</button>
              <button onClick={() => copyText("full", buildFullCopy())} className="bd-btn bd-btn-secondary">{copied === "full" ? "Copied" : "Copy pack"}</button>
            </div>

            <div className="bd-actions bd-actions-tight">
              <button onClick={() => setShowOriginal((v) => !v)} className="bd-btn bd-btn-small">{showOriginal ? "Hide original input" : "Show original input"}</button>
            </div>

            {showOriginal && <div className="bd-original">{input}</div>}
            {status && !error && <div className="bd-status">{status}</div>}
            {error && <div className="bd-error">{error}</div>}
          </section>

          <section className="bd-card bd-panel">
            <div className="bd-panel-head bd-panel-head-row">
              <div>
                <div className="bd-panel-title">Intake pack</div>
                <div className="bd-panel-sub">Structured outputs for decision, response, pricing, and handover.</div>
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
              <div className="bd-empty">Hit <strong>Clean this up</strong> to generate the structured brief.</div>
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
                    <button onClick={() => copyText("reply", result.clientReply)} className="bd-btn bd-btn-small">{copied === "reply" ? "Copied" : "Copy client reply"}</button>
                    <button onClick={() => copyText("internal", result.internalBrief)} className="bd-btn bd-btn-small">{copied === "internal" ? "Copied" : "Copy internal brief"}</button>
                  </div>
                </SectionCard>

                <div className="bd-section-label">Understand</div>
                <div className="bd-two-col">
                  <SectionCard title="Requirements"><BulletList items={result.requirements} empty="No clear requirements found." /></SectionCard>
                  <SectionCard title="Missing info"><BulletList items={result.missingInfo} empty="No obvious missing information found." /></SectionCard>
                  <SectionCard title="Risks / blockers"><BulletList items={result.risks} empty="No major blockers found." /></SectionCard>
                  <SectionCard title="Assumptions"><BulletList items={result.assumptions} empty="No major assumptions found." /></SectionCard>
                </div>

                <div className="bd-section-label">Act</div>
                <div className="bd-two-col">
                  <SectionCard title="Next steps"><BulletList items={result.nextSteps} empty="No next steps found." /></SectionCard>
                  <SectionCard title="Follow-up questions"><BulletList items={result.followUpQuestions} empty="No follow-up questions found." /></SectionCard>
                  <SectionCard title="Money / pricing"><BulletList items={result.money} empty="No money references found." /></SectionCard>
                  <SectionCard title="Questions found"><BulletList items={result.questionsFound} empty="No direct questions found." /></SectionCard>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}

function DecisionCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bd-summary-card">
      <div className="bd-summary-label">{label}</div>
      <div className="bd-summary-value">{value}</div>
    </div>
  );
}

function SectionCard({ title, children, emphasis = false }: { title: string; children: React.ReactNode; emphasis?: boolean }) {
  return (
    <div className={emphasis ? "bd-subcard bd-subcard-emphasis" : "bd-subcard"}>
      <div className="bd-subcard-title">{title}</div>
      {children}
    </div>
  );
}

function BulletList({ items, empty }: { items: string[]; empty: string }) {
  if (!items || items.length === 0) return <div className="bd-muted">{empty}</div>;
  return <ul className="bd-list">{items.map((item, index) => <li key={`${item}-${index}`} className="bd-list-item">{item}</li>)}</ul>;
}

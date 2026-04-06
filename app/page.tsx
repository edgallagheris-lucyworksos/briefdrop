"use client";

import { useMemo, useState } from "react";

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

export default function Page() {
  const [input, setInput] = useState(samples.service);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BriefDropResult | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState("");
  const [mode, setMode] = useState<OutputMode>("brief");

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
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`Server returned non-JSON response: ${raw.slice(0, 200)}`);
      }
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
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
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
      `Brief:\n${result.brief}`,
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
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-[32px] border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/20 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-teal-400/20 bg-teal-400/10">
                <div className="h-7 w-7 rounded-full bg-teal-400 shadow-[0_0_28px_rgba(20,184,166,0.45)]" />
              </div>
              <div>
                <div className="text-2xl font-semibold tracking-tight md:text-3xl">BriefDrop</div>
                <div className="text-sm text-slate-400">Turn messy inbound into a decision-ready intake pack.</div>
              </div>
            </div>
            <div className="inline-flex rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-teal-300">
              Universal intake tool
            </div>
          </div>

          <div className="mt-6 max-w-4xl">
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Paste the messages. Get the brief.</h1>
            <p className="mt-4 text-base leading-7 text-slate-300 md:text-lg">
              BriefDrop cleans up chats, emails, notes, and rough scopes into structured outputs you can actually use: brief, pricing signals, follow-up questions, quote prep, discovery prep, and handover-ready notes.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-sm">
            <button onClick={() => setInput(samples.trades)} className="rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 hover:border-teal-400">Use trades sample</button>
            <button onClick={() => setInput(samples.service)} className="rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 hover:border-teal-400">Use service sample</button>
            <button onClick={() => setInput(samples.ops)} className="rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-slate-200 hover:border-teal-400">Use ops sample</button>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-black/20">
            <div className="mb-3 text-sm font-semibold text-white">Paste messages or notes</div>
            <div className="mb-4 text-xs text-slate-400">Use anything: WhatsApp, email, voice-note transcript, sales enquiry, internal notes, rough scope.</div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-[360px] w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-teal-400"
              placeholder="Paste anything here..."
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={handleClean} disabled={loading} className="rounded-2xl bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:opacity-90 disabled:opacity-50">
                {loading ? "Cleaning..." : "Clean this up"}
              </button>
              <button onClick={() => { setInput(""); setResult(null); setError(""); setStatus(""); }} className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-slate-500">
                Clear
              </button>
              <button onClick={() => copyText("full", buildFullCopy())} className="rounded-2xl border border-teal-400/40 px-5 py-3 text-sm font-semibold text-teal-300 hover:border-teal-300">
                {copied === "full" ? "Copied" : "Copy pack"}
              </button>
            </div>
            {status && !error && <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">{status}</div>}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-black/20">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Intake pack</div>
                <div className="text-xs text-slate-400">Structured outputs for decision, response, pricing, and handover.</div>
              </div>
              {result && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {(["brief", "reply", "internal", "quote", "discovery"] as OutputMode[]).map((item) => (
                    <button
                      key={item}
                      onClick={() => setMode(item)}
                      className={`rounded-full px-3 py-2 font-semibold ${mode === item ? "bg-teal-400 text-slate-950" : "border border-slate-700 bg-slate-950 text-slate-300"}`}
                    >
                      {modeLabels[item]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
            ) : !result ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-6 text-sm leading-7 text-slate-400">Hit <span className="text-slate-200">Clean this up</span> to generate the structured brief.</div>
            ) : (
              <div className="space-y-4">
                <Card title={modeLabels[mode]} emphasis>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-100">{activeOutput}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SmallCopyButton label={mode} text={activeOutput} copied={copied} onCopy={copyText} buttonText={`Copy ${modeLabels[mode]}`} />
                    <SmallCopyButton label="reply" text={result.clientReply} copied={copied} onCopy={copyText} buttonText="Copy client reply" />
                    <SmallCopyButton label="internal" text={result.internalBrief} copied={copied} onCopy={copyText} buttonText="Copy internal brief" />
                  </div>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card title="Requirements"><BulletList items={result.requirements} empty="No clear requirements found." /></Card>
                  <Card title="Missing info"><BulletList items={result.missingInfo} empty="No obvious missing information found." /></Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card title="Next steps"><BulletList items={result.nextSteps} empty="No next steps found." /></Card>
                  <Card title="Follow-up questions">
                    <BulletList items={result.followUpQuestions} empty="No follow-up questions found." />
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card title="Money / pricing"><BulletList items={result.money} empty="No money references found." /></Card>
                  <Card title="Questions found"><BulletList items={result.questionsFound} empty="No direct questions found." /></Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card title="Risks / blockers"><BulletList items={result.risks} empty="No major blockers found." /></Card>
                  <Card title="Assumptions"><BulletList items={result.assumptions} empty="No major assumptions found." /></Card>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Card({ title, children, emphasis = false }: { title: string; children: React.ReactNode; emphasis?: boolean; }) {
  return (
    <div className={`rounded-2xl border p-4 ${emphasis ? "border-teal-400/30 bg-slate-950" : "border-slate-800 bg-slate-950"}`}>
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</div>
      {children}
    </div>
  );
}

function BulletList({ items, empty }: { items: string[]; empty: string; }) {
  if (!items || items.length === 0) return <div className="text-sm text-slate-400">{empty}</div>;
  return (
    <ul className="space-y-2 text-sm text-slate-200">
      {items.map((item, index) => <li key={`${item}-${index}`} className="rounded-xl bg-slate-900 px-3 py-2 leading-6">{item}</li>)}
    </ul>
  );
}

function SmallCopyButton({ label, text, copied, onCopy, buttonText }: { label: string; text: string; copied: string; onCopy: (label: string, text: string) => Promise<void>; buttonText: string; }) {
  return <button onClick={() => onCopy(label, text)} className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-teal-400">{copied === label ? "Copied" : buttonText}</button>;
}

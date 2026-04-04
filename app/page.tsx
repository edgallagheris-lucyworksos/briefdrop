"use client";

import { useState } from "react";

type BriefDropResult = {
  brief: string;
  requirements: string[];
  missingInfo: string[];
  nextSteps: string[];
  money: string[];
  questionsFound: string[];
};

const samples = {
  trades:
    "Need help pricing a rental flat turnaround. It’s a 2-bed first floor flat, roughly 58 to 62 square metres total. We’ve got a list from the outgoing inspection but it’s messy. Bedroom 1 needs a wall repaired where shelving’s been ripped out, maybe skim not patch fill. Lounge has two bad stains on the ceiling from an old leak that has apparently been fixed but needs checking. Kitchen worktop edge has swollen near the sink and there’s a cracked tile in the splashback. Bathroom sealant is black and there’s movement in one floor tile by the WC. Also need 3 internal doors eased because they catch. We do not need top-spec finish, just clean and durable for reletting. Budget around £1,800 all in, maybe stretch to £2,400 if it genuinely needs more. Access from Monday, tenant due in 12 days after. Can you break down what is urgent, what is cosmetic, and whether this sounds like one trade or several? Also if we send videos, can you quote provisionally before a visit?",
  service:
    "Need a quote for a landing page rewrite and email sequence for a new service launch. We need better positioning, 5 emails, and a tighter offer page. Budget is around £1,500 to £2,500. We have rough notes but no proper brief yet. Can you review this week and tell us what you need first?",
  ops:
    "We need help cleaning up our operations handover. At the moment tasks are split across Slack, email, and Notion. We need someone to map the current process, identify gaps, and propose a cleaner intake and handoff workflow. There are 3 departments involved and we need a proposal before next Friday. Budget is not fixed yet but probably under £5k. Can you tell us what information you’d need to scope this properly?",
};

export default function Page() {
  const [input, setInput] = useState(samples.service);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BriefDropResult | null>(null);
  const [error, setError] = useState("");
  const [debug, setDebug] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleClean() {
    setLoading(true);
    setError("");
    setDebug("");
    setResult(null);

    try {
      const res = await fetch("/api/clean", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
      });

      const raw = await res.text();

      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`Server returned non-JSON response: ${raw.slice(0, 200)}`);
      }

      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong");
      }

      setResult(data);
      setDebug(`Status ${res.status} · Parsed successfully`);
    } catch (err: any) {
      setError(err.message || "Failed to clean message");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    const text = result
      ? [
          `Brief:\n${result.brief}`,
          `\nRequirements:\n- ${result.requirements.join("\n- ") || "None"}`,
          `\nMissing info:\n- ${result.missingInfo.join("\n- ") || "None"}`,
          `\nNext steps:\n- ${result.nextSteps.join("\n- ") || "None"}`,
          `\nMoney / pricing:\n- ${result.money.join("\n- ") || "None"}`,
          `\nQuestions found:\n- ${result.questionsFound.join("\n- ") || "None"}`,
        ].join("\n")
      : input;

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <div className="inline-flex rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-xs font-medium text-teal-300">
            BriefDrop Universal
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
            Paste the messages. Get the brief.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
            BriefDrop turns messy enquiries, emails, chats, notes, and rough project scopes into a usable brief, clearer requirements, money signals, and next steps.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            <button onClick={() => setInput(samples.trades)} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 hover:border-teal-400">
              Use trades sample
            </button>
            <button onClick={() => setInput(samples.service)} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 hover:border-teal-400">
              Use service sample
            </button>
            <button onClick={() => setInput(samples.ops)} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 hover:border-teal-400">
              Use ops sample
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-black/20">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Paste messages or notes</div>
                <div className="text-xs text-slate-400">Use anything: WhatsApp, email, voice-note transcript, sales enquiry, internal notes, project scope.</div>
              </div>
            </div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-[360px] w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-teal-400"
              placeholder="Paste anything here..."
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={handleClean}
                disabled={loading}
                className="rounded-2xl bg-teal-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Cleaning..." : "Clean this up"}
              </button>

              <button
                onClick={() => {
                  setInput("");
                  setResult(null);
                  setError("");
                  setDebug("");
                }}
                className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-slate-500"
              >
                Clear
              </button>

              <button
                onClick={handleCopy}
                className="rounded-2xl border border-teal-400/40 px-5 py-3 text-sm font-semibold text-teal-300 hover:border-teal-300"
              >
                {copied ? "Copied" : "Copy output"}
              </button>
            </div>

            {debug && !error && (
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">
                {debug}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-black/20">
            <div className="mb-3 text-sm font-semibold text-white">Cleaned output</div>

            {error ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            ) : !result ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-6 text-sm leading-7 text-slate-400">
                Hit <span className="text-slate-200">Clean this up</span> to generate the structured brief.
              </div>
            ) : (
              <div className="space-y-4">
                <Card title="Brief" emphasis>
                  <p className="text-sm leading-7 text-slate-100">{result.brief}</p>
                </Card>

                <Card title="Requirements">
                  <BulletList items={result.requirements} empty="No clear requirements found." />
                </Card>

                <Card title="Missing info">
                  <BulletList items={result.missingInfo} empty="No obvious missing information found." />
                </Card>

                <Card title="Next steps">
                  <BulletList items={result.nextSteps} empty="No next steps found." />
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card title="Money / pricing">
                    <BulletList items={result.money} empty="No money references found." />
                  </Card>

                  <Card title="Questions found">
                    <BulletList items={result.questionsFound} empty="No direct questions found." />
                  </Card>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Card({
  title,
  children,
  emphasis = false,
}: {
  title: string;
  children: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${emphasis ? "border-teal-400/30 bg-slate-950" : "border-slate-800 bg-slate-950"}`}>
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {title}
      </div>
      {children}
    </div>
  );
}

function BulletList({
  items,
  empty,
}: {
  items: string[];
  empty: string;
}) {
  if (!items || items.length === 0) {
    return <div className="text-sm text-slate-400">{empty}</div>;
  }

  return (
    <ul className="space-y-2 text-sm text-slate-200">
      {items.map((item, index) => (
        <li
          key={`${item}-${index}`}
          className="rounded-xl bg-slate-900 px-3 py-2 leading-6"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

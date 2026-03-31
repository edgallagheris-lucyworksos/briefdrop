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

export default function Page() {
  const [input, setInput] = useState(
    "Need quote for bathroom. Leak by shower and maybe damaged floor too. Want to tile whole thing if price is sensible. Can you start soon? We can supply tiles if needed. Rough budget maybe around £4,000 but not sure. Also can you check extractor?"
  );
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
      setDebug("Button clicked. Sending request...");

      const res = await fetch("/api/clean", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
      });

      const raw = await res.text();
      setDebug(`Response status: ${res.status}\nRaw response: ${raw.slice(0, 1000)}`);

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
      setDebug((prev) => prev + "\nParsed JSON successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to clean message");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    const text = result
      ? [
          `Clean brief:\n${result.brief}`,
          `\nKey requirements:\n- ${result.requirements.join("\n- ") || "None"}`,
          `\nMissing information:\n- ${result.missingInfo.join("\n- ") || "None"}`,
          `\nNext steps:\n- ${result.nextSteps.join("\n- ") || "None"}`,
          `\nMoney references:\n- ${result.money.join("\n- ") || "None"}`,
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
        <div className="mb-8">
          <div className="inline-flex rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-xs font-medium text-teal-300">
            BriefDrop MVP
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
            Paste the messages. Get the brief.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
            Turn messy WhatsApp or email messages into a clean brief, missing info, and next steps.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-3 text-sm font-semibold text-white">
              Paste messages or notes
            </div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-[320px] w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-teal-400"
              placeholder="Paste WhatsApp, email, or rough enquiry notes here..."
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
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            {debug && (
              <pre className="mt-4 whitespace-pre-wrap rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300">
                {debug}
              </pre>
            )}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-3 text-sm font-semibold text-white">
              Cleaned output
            </div>

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
                <Card title="Clean brief">
                  <p className="text-sm leading-7 text-slate-200">{result.brief}</p>
                </Card>

                <Card title="Key requirements">
                  <BulletList items={result.requirements} empty="No clear requirements found." />
                </Card>

                <Card title="Missing information">
                  <BulletList items={result.missingInfo} empty="No obvious missing information found." />
                </Card>

                <Card title="Next steps">
                  <BulletList items={result.nextSteps} empty="No next steps found." />
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card title="Money references">
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
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
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

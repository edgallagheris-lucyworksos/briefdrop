import { NextResponse } from "next/server";

type BriefDropResult = {
  brief: string;
  requirements: string[];
  missingInfo: string[];
  nextSteps: string[];
  money: string[];
  questionsFound: string[];
};

function mockResult(input: string): BriefDropResult {
  return {
    brief: `Mock brief from input: ${input.slice(0, 120)}`,
    requirements: ["Requirement found from pasted message"],
    missingInfo: ["Missing measurements or clearer scope"],
    nextSteps: ["Ask follow-up questions before pricing"],
    money: input.includes("£") ? ["Money reference found in input"] : [],
    questionsFound: input.includes("?") ? ["Question detected in pasted message"] : [],
  };
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "clean" });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = body?.input?.trim();

    if (!input) {
      return NextResponse.json(
        { error: "No input provided." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey === "your_openai_api_key_here") {
      return NextResponse.json(mockResult(input));
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        input: [
          {
            role: "system",
            content:
              "You are BriefDrop. Turn messy incoming messages into a usable brief. Be concise, practical, and do not invent facts.",
          },
          {
            role: "user",
            content: input,
          },
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
                requirements: {
                  type: "array",
                  items: { type: "string" },
                },
                missingInfo: {
                  type: "array",
                  items: { type: "string" },
                },
                nextSteps: {
                  type: "array",
                  items: { type: "string" },
                },
                money: {
                  type: "array",
                  items: { type: "string" },
                },
                questionsFound: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: [
                "brief",
                "requirements",
                "missingInfo",
                "nextSteps",
                "money",
                "questionsFound",
              ],
            },
          },
        },
        max_output_tokens: 700,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "OpenAI request failed", raw: data },
        { status: response.status }
      );
    }

    let text = "";

    if (typeof data.output_text === "string" && data.output_text.trim()) {
      text = data.output_text;
    } else if (Array.isArray(data.output)) {
      text = data.output
        .flatMap((item: any) => item.content || [])
        .map((c: any) => c.text || "")
        .join("\n");
    }

    if (!text) {
      return NextResponse.json(
        { error: "Empty response from OpenAI", raw: data },
        { status: 500 }
      );
    }

    let parsed: BriefDropResult;

    try {
      parsed = JSON.parse(text) as BriefDropResult;
    } catch {
      return NextResponse.json(
        { error: "Model did not return valid JSON", raw: text },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

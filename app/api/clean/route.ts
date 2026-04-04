import { NextResponse } from "next/server";

type BriefDropResult = {
  brief: string;
  requirements: string[];
  missingInfo: string[];
  nextSteps: string[];
  money: string[];
  questionsFound: string[];
};

function normalise(text: string) {
  return text.replace(/\r/g, "").replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}

function splitSentences(text: string) {
  return text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractQuestions(text: string) {
  return splitSentences(text).filter((s) => s.includes("?"));
}

function extractMoney(text: string) {
  const matches = text.match(
    /(?:£\s?\d[\d,]*(?:\.\d{1,2})?\s?(?:k|m)?(?:\s?(?:to|-)\s?£?\s?\d[\d,]*(?:\.\d{1,2})?\s?(?:k|m)?)?|\b\d[\d,]*(?:\.\d{1,2})?\s?(?:k|m)\b)/gi
  );
  return unique(matches || []);
}

function extractMeasurements(text: string) {
  const matches = text.match(
    /\b\d+(?:\.\d+)?\s?(?:mm|cm|m|metre|metres|meter|meters|sqm|sq m|m2)\b|\b\d+(?:\.\d+)?\s?x\s?\d+(?:\.\d+)?\s?(?:m|metres|meters)?\b/gi
  );
  return unique(matches || []);
}

function extractTiming(text: string) {
  const matches = text.match(
    /\b(?:asap|urgent|this week|next week|weekend|weekends|evenings|after \w+|before the \d{1,2}(?:st|nd|rd|th)?|on the \d{1,2}(?:st|nd|rd|th)?|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d+\s+days?)\b/gi
  );
  return unique(matches || []);
}

function detectRooms(text: string) {
  const lower = text.toLowerCase();
  const rooms = [
    "bathroom",
    "shower room",
    "kitchen",
    "bedroom",
    "front room",
    "lounge",
    "hall",
    "hallway",
    "landing",
    "office",
    "ceiling",
    "roof",
    "rear elevation",
    "front elevation",
    "window",
    "doors",
  ];
  return rooms.filter((room) => lower.includes(room));
}

function detectIssues(text: string) {
  const lower = text.toLowerCase();
  const issues: string[] = [];

  const patterns: Array<[RegExp, string]> = [
    [/\bleak|leaking|escape of water\b/i, "Leak or water ingress"],
    [/\bdamp|moisture|wet\b/i, "Damp or moisture issue"],
    [/\bcrack|cracking\b/i, "Cracking or movement concern"],
    [/\bsoft floor|spongy|springy|floor feels wrong|damaged floor\b/i, "Possible floor damage"],
    [/\btray\b/i, "Shower tray issue"],
    [/\bextractor|fan\b/i, "Extractor / ventilation issue"],
    [/\btile|tiling|retile\b/i, "Tiling work"],
    [/\bdoor|doors\b/i, "Door replacement or adjustment"],
    [/\bskirting\b/i, "Skirting work"],
    [/\bworktop\b/i, "Worktop issue"],
    [/\bcupboard|unit\b/i, "Cabinet / unit issue"],
    [/\brender|repoint|gutter|downpipe\b/i, "External remedial work"],
    [/\bpartition|stud\b/i, "Partition / stud alteration"],
    [/\belectrics|socket|power|data\b/i, "Electrical / power / data work"],
    [/\bpaint|painting|repaint\b/i, "Painting / redecorating"],
    [/\bplaster|skim|plasterboard\b/i, "Plastering / making good"],
    [/\bwindow|draught\b/i, "Window / draught issue"],
  ];

  for (const [regex, label] of patterns) {
    if (regex.test(lower)) issues.push(label);
  }

  return unique(issues);
}

function detectSupply(text: string) {
  const lower = text.toLowerCase();
  const items: string[] = [];

  if (/\bwe can supply|we'll supply|we will supply|we've got|we have got|already bought|already have\b/i.test(lower)) {
    items.push("Client may be supplying some materials or fixtures");
  }

  if (/\btiles\b/i.test(lower) && /\bsupply|ourselves|we can supply|we've got\b/i.test(lower)) {
    items.push("Tiles may be client-supplied");
  }

  if (/\bdoors\b/i.test(lower) && /\bwe['’]ve got|already bought|already have\b/i.test(lower)) {
    items.push("Doors may already be purchased by client");
  }

  if (/\blabour only\b/i.test(lower)) {
    items.push("Labour-only pricing may be requested");
  }

  return unique(items);
}

function detectConstraints(text: string) {
  const lower = text.toLowerCase();
  const items: string[] = [];

  if (/\boccupied|tenant|tenants\b/i.test(lower)) items.push("Occupied property / tenant access constraint");
  if (/\bevenings|after 6|after 6:30|weekend|weekends\b/i.test(lower)) items.push("Restricted access times");
  if (/\bbefore\b|\bdue in\b|\bmove in\b|\bmoving out\b/i.test(lower)) items.push("Time-sensitive deadline");
  if (/\boutside main office hours\b|\bweekdays only\b/i.test(lower)) items.push("Commercial access restriction");

  return unique(items);
}

function buildBrief(text: string) {
  const rooms = detectRooms(text);
  const issues = detectIssues(text);
  const money = extractMoney(text);
  const timing = extractTiming(text);

  const roomPart = rooms.length ? `Scope appears to involve ${rooms.slice(0, 3).join(", ")}.` : "Scope involves one or more repair / refurbishment items.";
  const issuePart = issues.length ? `Main issues include ${issues.slice(0, 4).join(", ").toLowerCase()}.` : "Main issues need clearer diagnosis.";
  const moneyPart = money.length ? `Budget or cost references mentioned: ${money.slice(0, 2).join(", ")}.` : "";
  const timingPart = timing.length ? `Timing constraints mentioned: ${timing.slice(0, 3).join(", ")}.` : "";

  return [roomPart, issuePart, moneyPart, timingPart].filter(Boolean).join(" ");
}

function buildRequirements(text: string) {
  const items: string[] = [];
  const rooms = detectRooms(text);
  const issues = detectIssues(text);
  const supply = detectSupply(text);
  const constraints = detectConstraints(text);

  if (rooms.length) items.push(`Areas mentioned: ${rooms.join(", ")}`);
  if (issues.length) items.push(...issues);
  if (supply.length) items.push(...supply);
  if (constraints.length) items.push(...constraints);

  if (/\bquote|price|ballpark|rough figure|estimate\b/i.test(text)) items.push("Pricing / estimate requested");
  if (/\binspect|visit|come look|site visit\b/i.test(text)) items.push("Inspection may be required before formal pricing");
  if (/\bphotos|video|videos\b/i.test(text)) items.push("Client may provide photos or videos");

  return unique(items);
}

function buildMissingInfo(text: string) {
  const lower = text.toLowerCase();
  const items: string[] = [];
  const measurements = extractMeasurements(text);
  const money = extractMoney(text);
  const timing = extractTiming(text);

  if (!measurements.length) items.push("Accurate measurements or dimensions");
  if (!/\baddress|postcode|bristol|property|flat|terrace|house|office\b/i.test(lower)) {
    items.push("Property type and location");
  }
  if (!timing.length) items.push("Preferred timing or deadline");
  if (!money.length && !/\bbudget\b/i.test(lower)) items.push("Budget or price expectation");
  if (!/\bphotos|video|videos\b/i.test(lower)) items.push("Photos or video of the problem areas");
  if (!/\bsupply|suppl|already bought|already have|we've got|we have\b/i.test(lower)) {
    items.push("Who is supplying materials, fixtures, and fittings");
  }
  if (/\bmaybe|not sure|possibly|might\b/i.test(lower)) {
    items.push("Decision on final scope versus investigation-only visit");
  }
  if (/\binsurance|insurer|loss adjuster\b/i.test(lower)) {
    items.push("Whether quote needs split between investigation, strip-out, and reinstatement");
  }

  return unique(items);
}

function buildNextSteps(text: string) {
  const lower = text.toLowerCase();
  const items: string[] = [];

  if (/\bleak|water|damp|moisture\b/i.test(lower)) {
    items.push("Confirm whether the leak / water source is fully resolved before pricing reinstatement");
  }

  items.push("Request photos, dimensions, and a short scope summary before pricing");
  items.push("Decide whether this is a diagnosis visit, repair-only quote, or full refurbishment quote");

  if (/\bquote from photos|videos|video|photos\b/i.test(lower)) {
    items.push("Issue a provisional estimate from photos first, then confirm on inspection");
  }

  if (/\btenant|occupied|office|access\b/i.test(lower)) {
    items.push("Confirm access constraints and available inspection / work windows");
  }

  if (/\bbudget\b|£|\b\d+\s?k\b/i.test(lower)) {
    items.push("Check whether the requested scope fits the stated budget or needs staging");
  }

  return unique(items);
}

function smartFallback(input: string): BriefDropResult {
  const text = normalise(input);

  return {
    brief: buildBrief(text),
    requirements: buildRequirements(text),
    missingInfo: buildMissingInfo(text),
    nextSteps: buildNextSteps(text),
    money: extractMoney(text),
    questionsFound: extractQuestions(text),
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
      return NextResponse.json(smartFallback(input));
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

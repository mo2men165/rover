export type SentimentResult =
  | {
      available: true;
      negativity: number;
      raw: string;
    }
  | {
      available: false;
      negativity: null;
      raw?: string;
      reason: string;
    };

/**
 * On-demand Claude sentiment over recent interaction summaries.
 * Uses Anthropic Messages API via fetch (no SDK dependency).
 * Missing ANTHROPIC_API_KEY → unavailable (weight redistributes).
 */
export async function analyzeInteractionSentiment(
  summaries: string[]
): Promise<SentimentResult> {
  if (summaries.length < 3) {
    return {
      available: false,
      negativity: null,
      reason: "insufficient_summaries",
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      available: false,
      negativity: null,
      reason: "missing_anthropic_api_key",
    };
  }

  const numbered = summaries
    .slice(0, 10)
    .map((s, i) => `${i + 1}. ${s}`)
    .join("\n");

  const prompt = `You are scoring relationship health for a B2B client-success team.
Given recent CSR interaction summaries with one client, return ONLY compact JSON:
{"negativity": <number 0-100>, "summary": "<one sentence>"}
- 0 = strongly positive / healthy
- 50 = mixed / neutral
- 100 = strongly negative / churn risk
Do not include markdown fences.

Summaries:
${numbered}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        available: false,
        negativity: null,
        raw: body.slice(0, 400),
        reason: `anthropic_http_${res.status}`,
      };
    }

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text =
      data.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return {
        available: false,
        negativity: null,
        raw: text.slice(0, 400),
        reason: "unparseable_response",
      };
    }

    const parsed = JSON.parse(match[0]) as {
      negativity?: number;
      summary?: string;
    };
    const negativity = Number(parsed.negativity);
    if (!Number.isFinite(negativity)) {
      return {
        available: false,
        negativity: null,
        raw: text.slice(0, 400),
        reason: "invalid_negativity",
      };
    }

    return {
      available: true,
      negativity: Math.max(0, Math.min(100, negativity)),
      raw: parsed.summary ?? text.slice(0, 400),
    };
  } catch (err) {
    return {
      available: false,
      negativity: null,
      reason: err instanceof Error ? err.message : "sentiment_error",
    };
  }
}

function stripCodeFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
}

export function getOpenAIUnavailableReason(error: unknown): "credits" | "auth" | null {
  const message = error instanceof Error ? error.message : String(error ?? "")
  if (/insufficient_quota|quota exceeded|credit balance is too low|billing/i.test(message)) return "credits"
  if (/api key|authentication|auth|permission|forbidden|unauthorized|invalid_api_key/i.test(message)) return "auth"
  return null
}

export function getPrimaryOpenAIModel(): string {
  return process.env.OPENAI_SCAN_MODEL?.trim() || "gpt-5-mini"
}

export function getFactsOpenAIModel(): string {
  return process.env.OPENAI_FACTS_MODEL?.trim() || process.env.OPENAI_SCAN_MODEL?.trim() || "gpt-5-mini"
}

export async function createOpenAIJsonCompletion<T>({
  prompt,
  model,
  maxCompletionTokens,
}: {
  prompt: string
  model?: string
  maxCompletionTokens?: number
}): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured")
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model ?? getPrimaryOpenAIModel(),
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: maxCompletionTokens ?? 3000,
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(
      payload?.error?.message
        ? `[openai] ${response.status} ${payload.error.message}`
        : `[openai] ${response.status} request failed`,
    )
  }

  const content = payload?.choices?.[0]?.message?.content
  if (typeof content !== "string") {
    throw new Error("[openai] empty completion content")
  }

  return JSON.parse(stripCodeFences(content)) as T
}

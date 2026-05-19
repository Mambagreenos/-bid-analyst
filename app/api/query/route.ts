import { openrouter, QUERY_MODEL } from '@/lib/openrouter'
import { querySystemPrompt } from '@/lib/prompts/query'
import { buildContext } from '@/lib/retrieval'

export async function POST(req: Request) {
  const { query, sessionId, history } = await req.json()

  if (!query || !sessionId) {
    return Response.json({ error: 'query and sessionId required' }, { status: 400 })
  }

  const start = Date.now()
  const context = await buildContext(query)

  // Build prior context string from last 2 turns
  const priorContext = (history ?? [])
    .slice(-2)
    .map((h: { query: string; text_summary: string }) =>
      `Q: ${h.query}\nA: ${h.text_summary}`
    )
    .join('\n\n')

  const userContent = [
    priorContext ? `Prior conversation context:\n${priorContext}\n\n---\n` : '',
    `Vendor bid data:\n${JSON.stringify(context, null, 2)}\n\n`,
    `Analyst question: ${query}\n\nReturn JSON only.`,
  ].join('')

  const completion = await openrouter.chat.completions.create({
    model: QUERY_MODEL,
    temperature: 0.1,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: querySystemPrompt },
      { role: 'user', content: userContent },
    ]
  })

  const latencyMs = Date.now() - start
  const tokensUsed = completion.usage?.total_tokens ?? 0
  const raw = completion.choices[0].message.content ?? '{}'

  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    return Response.json({ error: 'Model returned invalid JSON', raw }, { status: 500 })
  }

  return Response.json({
    response_type: parsed.response_type,
    content: parsed.content,
    citations: parsed.citations ?? [],
    gaps_flagged: parsed.gaps_flagged ?? [],
    text_summary: parsed.text_summary ?? '',
    quality: parsed.quality ?? { answers_question: true, confidence: 'high', warning: '' },
    latency_ms: latencyMs,
    tokens_used: tokensUsed,
  })
}

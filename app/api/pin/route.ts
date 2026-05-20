import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  const { sessionId, query, responseType, content, textSummary, insight, citations, gapsFlagged } = await req.json()

  // Append insight to text_summary so report LLM sees it without needing a schema change
  const fullSummary = insight
    ? `${textSummary}\n↗ Insight: ${insight}`
    : textSummary

  const { data, error } = await supabase
    .from('pinned_answers')
    .insert({
      session_id: sessionId,
      query,
      response_type: responseType,
      content,
      text_summary: fullSummary,
      citations,
      gaps_flagged: gapsFlagged,
      include_in_report: true,
      flagged: false,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ pinned: data })
}

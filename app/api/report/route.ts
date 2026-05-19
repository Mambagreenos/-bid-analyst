import { openrouter, QUERY_MODEL } from '@/lib/openrouter'
import { reportSystemPrompt } from '@/lib/prompts/report'
import { supabase } from '@/lib/supabase'

async function computeStats() {
  const { data: bidData } = await supabase
    .from('bid_line_items')
    .select('vendor, zone, destination_city, rate_per_kg, transit_days, sla_penalty_pct, coverage, min_chargeable_kg')
    .limit(150)

  const vendors = ['Blue Dart', 'Delhivery', 'Safexpress', 'Gati', 'DTDC']
  const stats: Record<string, any> = {}
  for (const v of vendors) {
    const rows = (bidData ?? []).filter((r: any) => r.vendor === v)
    const covered = rows.filter((r: any) => r.coverage)
    const metroRows = covered.filter((r: any) => r.zone === 'metro')
    const neRows = rows.filter((r: any) => r.zone === 'northeast')
    stats[v] = {
      avg_rate_all:     covered.length   ? (covered.reduce((s: number, r: any) => s + r.rate_per_kg, 0) / covered.length).toFixed(2)    : '—',
      avg_rate_metro:   metroRows.length ? (metroRows.reduce((s: number, r: any) => s + r.rate_per_kg, 0) / metroRows.length).toFixed(2) : '—',
      avg_transit_metro:metroRows.length ? (metroRows.reduce((s: number, r: any) => s + r.transit_days, 0) / metroRows.length).toFixed(1): '—',
      sla_penalty:      covered.length   ? covered[0].sla_penalty_pct   : '—',
      min_chargeable_kg:covered.length   ? covered[0].min_chargeable_kg : '—',
      ne_coverage:      neRows.some((r: any) => r.coverage) ? 'Yes' : neRows.length > 0 ? 'No' : 'No lanes',
      lanes_covered:    covered.length,
    }
  }
  return stats
}

export async function POST(req: Request) {
  const { sessionId, additionalInstructions, refineSection, refineFeedback, singleSection, currentSection } = await req.json()

  const stats = await computeStats()

  // ── Single-section refinement path ──────────────────────────────────
  if (singleSection && currentSection) {
    const systemPrompt = `You are refining one or more sections of a CFO procurement report.
The analyst has given feedback on a specific section. If the feedback adds a new dimension (e.g. "add cost angle", "also show a table", "include a chart too"), you may return TWO sections instead of one.

Return a JSON object with this exact structure:
{ "sections": [ { "type": "metrics"|"chart"|"recommendation"|"risk_list"|"table"|"text", "title": string, "content": {...} } ] }

Rules:
- Maximum 2 sections in the array.
- Keep the original section type unless feedback requests a change.
- For chart/metrics, use ONLY numbers from PRE-COMPUTED STATS — never invent numbers.
- If feedback requests a combined view (risks + cost, coverage + table), split into 2 appropriate section types.
- For table sections: rows MUST be string[][] — each row is an array of strings, NOT an object. Example: [["Blue Dart", "Yes", "₹52.13"], ["DTDC", "Yes", "₹37.80"]]
- Return JSON only — no markdown, no backticks, no prose outside the JSON object.`

    const comp = await openrouter.chat.completions.create({
      model: QUERY_MODEL,
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Current section:\n${JSON.stringify(currentSection, null, 2)}\n\nAnalyst feedback: ${refineFeedback}\n\nPRE-COMPUTED STATS:\n${JSON.stringify(stats, null, 2)}\n\nReturn the improved section(s) as JSON with a "sections" array.`
        }
      ]
    })

    const raw = comp.choices[0].message.content ?? '{}'
    try {
      const parsed = JSON.parse(raw)
      // Normalise: accept { sections } or a bare section object
      const sections = parsed.sections ?? (parsed.type ? [parsed] : null)
      if (!sections?.length) return Response.json({ error: 'Empty section response', raw }, { status: 500 })
      return Response.json({ sections })
    } catch {
      return Response.json({ error: 'Section refinement failed', raw }, { status: 500 })
    }
  }

  // ── Full report generation path ─────────────────────────────────────
  const { data: pinned, error } = await supabase
    .from('pinned_answers')
    .select('query, text_summary, citations, gaps_flagged, section_label')
    .eq('session_id', sessionId)
    .eq('include_in_report', true)
    .eq('flagged', false)
    .order('created_at', { ascending: true })

  if (error || !pinned?.length) {
    return Response.json({ error: 'No pinned answers found for this session' }, { status: 400 })
  }

  const completion = await openrouter.chat.completions.create({
    model: QUERY_MODEL,
    temperature: 0.3,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: reportSystemPrompt },
      {
        role: 'user',
        content: [
          `Analyst findings from session:\n${JSON.stringify(pinned, null, 2)}`,
          `\nPRE-COMPUTED STATS (use these for all numbers — do NOT use "—" if the number is available here):\n${JSON.stringify(stats, null, 2)}`,
          additionalInstructions ? `\nAdditional instructions from the analyst: ${additionalInstructions}` : '',
          refineSection ? `\nThe analyst wants to refine the "${refineSection}" section. Feedback: ${refineFeedback}. Regenerate the full report with this section improved.` : '',
          `\n\nGenerate CFO report. Return JSON only.`,
        ].filter(Boolean).join('')
      }
    ]
  })

  const raw = completion.choices[0].message.content ?? '{}'
  let report: any
  try {
    report = JSON.parse(raw)
  } catch {
    return Response.json({ error: 'Report generation failed', raw }, { status: 500 })
  }

  return Response.json({ report })
}

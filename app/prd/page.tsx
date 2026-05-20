'use client'
import { useState } from 'react'

const S = {
  bg: '#0c0c0f', surface: '#141417', surface2: '#1a1a1f',
  border: '#252530', border2: '#32323e',
  text: '#e6e6ef', text2: '#b0b0be', muted: '#5e5e70',
  accent: '#f97316', green: '#4ade80', amber: '#fbbf24',
  coral: '#fb7185', info: '#60a5fa', teal: '#22d3a6',
}

const SECTIONS = ['Problem', 'Opportunity', 'Solution', 'Design', 'Eval', 'Metrics']

function Tag({ children, color = S.muted }: { children: string; color?: string }) {
  return (
    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 4, background: `${color}18`, border: `1px solid ${color}40`, color, fontWeight: 500 }}>
      {children}
    </span>
  )
}

function SectionHeader({ label, id }: { label: string; id: string }) {
  return (
    <div id={id} style={{ marginBottom: 32, paddingTop: 8 }}>
      <div style={{ fontSize: 11, color: S.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
        {SECTIONS.indexOf(label) + 1} / {SECTIONS.length}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: S.text, letterSpacing: '-0.02em' }}>{label}</div>
    </div>
  )
}

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div style={{
      padding: '20px 24px', background: S.surface, borderRadius: 10,
      borderLeft: `4px solid ${accent ?? S.border2}`,
      border: `1px solid ${S.border}`,
      borderLeftWidth: accent ? 4 : 1,
      borderLeftColor: accent ?? S.border,
    }}>
      {children}
    </div>
  )
}

function Stat({ value, label, sub, color = S.accent }: { value: string; label: string; sub?: string; color?: string }) {
  return (
    <div style={{ padding: '24px 20px', background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, textAlign: 'center' }}>
      <div style={{ fontSize: 36, fontWeight: 800, color, marginBottom: 6, letterSpacing: '-0.02em', fontFamily: "'IBM Plex Mono', monospace" }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: S.text, marginBottom: sub ? 4 : 0 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: S.muted, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  )
}

export default function PRDPage() {
  const [activeSection, setActiveSection] = useState('Problem')

  const scrollTo = (id: string) => {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div style={{ minHeight: '100vh', background: S.bg, color: S.text, display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <div style={{ height: 52, padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: S.surface, borderBottom: `1px solid ${S.border}`, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/analyze" style={{ fontSize: 12, color: S.muted, textDecoration: 'none' }}>← App</a>
          <span style={{ color: S.border2 }}>|</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: S.accent, fontWeight: 700, letterSpacing: '0.1em' }}>BID ANALYST — PRODUCT BRIEF</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {SECTIONS.map(s => (
            <button key={s} onClick={() => scrollTo(s)} style={{
              padding: '5px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
              background: activeSection === s ? S.accent : 'none',
              border: `1px solid ${activeSection === s ? S.accent : S.border}`,
              color: activeSection === s ? '#000' : S.muted,
              fontWeight: activeSection === s ? 700 : 400,
              transition: 'all 0.15s',
            }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '52px 32px 80px', width: '100%' }}>

        {/* Hero */}
        <div style={{ marginBottom: 72, paddingBottom: 48, borderBottom: `1px solid ${S.border}` }}>
          <div style={{ fontSize: 13, color: S.accent, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 16 }}>AI-POWERED PROCUREMENT INTELLIGENCE</div>
          <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16, lineHeight: 1.1 }}>
            Bid Analyst
          </div>
          <div style={{ fontSize: 18, color: S.text2, lineHeight: 1.7, maxWidth: 620, marginBottom: 24 }}>
            Natural language analysis of logistics vendor bids — turning 3 weeks of manual spreadsheet work into a 30-minute AI-assisted evaluation with a CFO-ready report.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Tag color={S.accent}>B2B SaaS</Tag>
            <Tag color={S.info}>Next.js 16</Tag>
            <Tag color={S.info}>Supabase</Tag>
            <Tag color={S.info}>Gemini via OpenRouter</Tag>
            <Tag color={S.green}>Live on Vercel</Tag>
          </div>
        </div>

        {/* ── PROBLEM ─────────────────────────────────── */}
        <SectionHeader label="Problem" id="Problem" />

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, color: S.text2, lineHeight: 1.75, marginBottom: 28 }}>
            A retail chain ships store replenishment goods from Bengaluru to 30 destinations. Every 2–3 years they evaluate 5 logistics vendors — and it takes the procurement team <strong style={{ color: S.coral }}>2–3 weeks of manual work</strong> before a single recommendation reaches the CFO.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 48 }}>
          {[
            { pain: 'Manual cross-reading', detail: '5 vendor submissions in different formats — Excel, PDF, Word. No standard schema.', severity: 'HIGH' },
            { pain: 'Coverage gaps hidden', detail: 'A vendor may not serve a lane at all. This is buried in SLA documents, not in the rate card.', severity: 'HIGH' },
            { pain: 'CFO questions unanswered fast', detail: '"Who is cheapest for Northeast?" takes a day to answer manually.', severity: 'HIGH' },
            { pain: 'Error-prone Excel matrices', detail: '150 data points copied by hand across comparison sheets — one wrong cell changes the recommendation.', severity: 'MEDIUM' },
          ].map(p => (
            <Card key={p.pain} accent={p.severity === 'HIGH' ? S.coral : S.amber}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: S.text }}>{p.pain}</div>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: p.severity === 'HIGH' ? '#6b1a2a' : '#5a3800', color: p.severity === 'HIGH' ? S.coral : S.amber, fontWeight: 700 }}>{p.severity}</span>
              </div>
              <div style={{ fontSize: 13, color: S.text2, lineHeight: 1.6 }}>{p.detail}</div>
            </Card>
          ))}
        </div>

        <div style={{ padding: '20px 24px', background: '#1a0a00', border: `1px solid #5a3800`, borderRadius: 10, marginBottom: 64 }}>
          <div style={{ fontSize: 13, color: S.amber, fontWeight: 700, marginBottom: 6 }}>The bottom line</div>
          <div style={{ fontSize: 14, color: S.text2, lineHeight: 1.7 }}>A ₹2–5 crore annual logistics contract is decided by a process that's entirely manual, error-prone, and can't answer a CFO question in real time.</div>
        </div>

        {/* ── OPPORTUNITY ─────────────────────────────── */}
        <SectionHeader label="Opportunity" id="Opportunity" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 32 }}>
          <Stat value="8–10%" label="Indian 3PL market CAGR" sub="through 2028 (RedSeer)" color={S.green} />
          <Stat value="38%" label="AI in procurement CAGR" sub="globally, accelerating fast" color={S.info} />
          <Stat value="1–2 days" label="vs 2–3 weeks today" sub="The gap we close — adjacent tools exist but none solve India-specific AI reasoning over bid data" color={S.amber} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 64 }}>
          <Card accent={S.coral}>
            <div style={{ fontSize: 12, fontWeight: 700, color: S.coral, marginBottom: 10, letterSpacing: '0.06em' }}>HEADWINDS</div>
            {['Fragmented 3PL market — inconsistent data formats across vendors', 'Manual procurement processes resistant to change', 'Varying digital maturity — some vendors still submit PDFs'].map(h => (
              <div key={h} style={{ fontSize: 13, color: S.text2, marginBottom: 6, paddingLeft: 12, borderLeft: `2px solid ${S.border2}`, lineHeight: 1.5 }}>{h}</div>
            ))}
          </Card>
          <Card accent={S.green}>
            <div style={{ fontSize: 12, fontWeight: 700, color: S.green, marginBottom: 10, letterSpacing: '0.06em' }}>TAILWINDS</div>
            {['Indian retail growing 10–12% CAGR — faster logistics decisions needed', 'LLMs now capable of reasoning over structured bid data', 'Procurement teams under pressure to cut costs — ₹2–3 lakh analyst time per evaluation cycle'].map(t => (
              <div key={t} style={{ fontSize: 13, color: S.text2, marginBottom: 6, paddingLeft: 12, borderLeft: `2px solid ${S.border2}`, lineHeight: 1.5 }}>{t}</div>
            ))}
          </Card>
        </div>

        {/* ── SOLUTION ────────────────────────────────── */}
        <SectionHeader label="Solution" id="Solution" />

        <div style={{ fontSize: 15, color: S.text2, lineHeight: 1.75, marginBottom: 32 }}>
          A 3-stage AI pipeline that takes vendor bid data in and outputs a CFO-ready report — with every AI claim cited back to the exact source row.
        </div>

        {/* Pipeline */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, marginBottom: 40 }}>
          {[
            { num: '01', label: 'Ingest', detail: '150-row bid matrix (30 lanes × 5 vendors × 8 fields) + vendor contracts loaded into Supabase', color: S.info },
            { num: '02', label: 'Chat', detail: 'Analyst asks in plain English → AI routes by intent → every answer is cited, gaps are flagged, scope is enforced', color: S.accent },
            { num: '03', label: 'Report', detail: 'Pinned findings → AI picks best section format (table/chart/risk/metrics) → PDF export', color: S.green },
          ].map((stage, i) => (
            <div key={stage.num} style={{ padding: '24px 20px', background: S.surface, border: `1px solid ${S.border}`, borderTop: `3px solid ${stage.color}`, borderRadius: i === 0 ? '10px 0 0 10px' : i === 2 ? '0 10px 10px 0' : 0 }}>
              <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: stage.color, marginBottom: 8, letterSpacing: '0.1em' }}>STAGE {stage.num}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: S.text, marginBottom: 10 }}>{stage.label}</div>
              <div style={{ fontSize: 13, color: S.text2, lineHeight: 1.6 }}>{stage.detail}</div>
            </div>
          ))}
        </div>

        {/* Differentiators */}
        <div style={{ marginBottom: 20, fontSize: 12, fontWeight: 600, color: S.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Key differentiators</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 64 }}>
          {[
            { icon: '📎', label: 'Citation-first', detail: 'Every AI answer cites the exact vendor row, field, and value. Not a chatbot — a cited analyst.' },
            { icon: '🚫', label: 'Coverage gap detection', detail: 'Explicitly flags when a vendor doesn\'t serve a lane. Never silently skips or invents a rate.' },
            { icon: '🔒', label: 'Scope enforcement', detail: 'Refuses to answer from general knowledge. Only responds from submitted bid data.' },
            { icon: '📊', label: 'Adaptive output routing', detail: 'Auto-selects text / table / chart / scorecard based on query intent — no manual formatting.' },
          ].map(d => (
            <div key={d.label} style={{ display: 'flex', gap: 14, padding: '16px 18px', background: S.surface, border: `1px solid ${S.border}`, borderRadius: 8 }}>
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{d.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: S.text, marginBottom: 4 }}>{d.label}</div>
                <div style={{ fontSize: 13, color: S.text2, lineHeight: 1.6 }}>{d.detail}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── DESIGN ──────────────────────────────────── */}
        <SectionHeader label="Design" id="Design" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: S.muted, letterSpacing: '0.08em', marginBottom: 14, textTransform: 'uppercase' }}>Tech stack</div>
            {[
              { layer: 'Frontend', val: 'Next.js 16.2.6, TypeScript, Recharts' },
              { layer: 'Database', val: 'Supabase PostgreSQL — 3 tables, 150 bid rows' },
              { layer: 'AI', val: 'Gemini Flash Lite via OpenRouter (OpenAI-compatible)' },
              { layer: 'RAG', val: 'Keyword-based context injection — all 150 rows fit in one prompt (~8KB)' },
              { layer: 'Deploy', val: 'Vercel (auto-deploy from GitHub)' },
            ].map(r => (
              <div key={r.layer} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, padding: '10px 0', borderBottom: `1px solid ${S.border}` }}>
                <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: S.muted }}>{r.layer}</div>
                <div style={{ fontSize: 13, color: S.text2 }}>{r.val}</div>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: S.muted, letterSpacing: '0.08em', marginBottom: 14, textTransform: 'uppercase' }}>Prompt evolution</div>
            {[
              { v: 'v1', label: 'Structure + citations', result: 'Good JSON, but model invented rates for uncovered lanes', color: S.coral },
              { v: 'v2', label: 'Added SCOPE GUARD + coverage rule', result: 'Hallucination fixed. Coverage gap detection working.', color: S.amber },
              { v: 'v3', label: 'out_of_scope type + insight field', result: '8/8 eval passing. Proactive analyst observations on every answer.', color: S.green },
            ].map(p => (
              <div key={p.v} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: `1px solid ${S.border}` }}>
                <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: p.color, fontWeight: 700, flexShrink: 0, paddingTop: 2 }}>{p.v}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: S.text, marginBottom: 2 }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: S.text2, lineHeight: 1.5 }}>{p.result}</div>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 14, fontSize: 12, color: S.muted }}>Temperature: 0.5 → 0.2 &nbsp;·&nbsp; response_format: json_object enforced</div>
          </div>
        </div>

        <div style={{ marginBottom: 64 }} />

        {/* ── EVAL ────────────────────────────────────── */}
        <SectionHeader label="Eval" id="Eval" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 32 }}>
          <Stat value="8/8" label="Eval test cases" sub="All passing on final prompt version" color={S.green} />
          <Stat value="0%" label="Hallucination rate" sub="No invented rates for uncovered lanes" color={S.green} />
          <Stat value="100%" label="Citation coverage" sub="Every factual claim cited to source row" color={S.green} />
        </div>

        <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${S.border}`, marginBottom: 64 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: S.surface2 }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', borderBottom: `1px solid ${S.border}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: S.muted, fontWeight: 500, letterSpacing: '0.06em' }}>TEST</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', borderBottom: `1px solid ${S.border}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: S.muted, fontWeight: 500 }}>DESCRIPTION</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', borderBottom: `1px solid ${S.border}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: S.muted, fontWeight: 500 }}>VALIDATES</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', borderBottom: `1px solid ${S.border}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: S.muted, fontWeight: 500 }}>RESULT</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: 'T1', desc: 'Blue Dart rate to Chennai — factual lookup', validates: 'Exact data retrieval + citation', pass: true },
                { id: 'T2', desc: 'Which vendors don\'t cover Northeast?', validates: 'Coverage gap detection', pass: true },
                { id: 'T3', desc: 'Compare metro lane rates — all vendors', validates: 'Table routing + multi-vendor', pass: true },
                { id: 'T4', desc: 'Rank vendors by average rate/kg', validates: 'Chart routing + correct ordering', pass: true },
                { id: 'T5', desc: 'Gati rate to Imphal (uncovered lane)', validates: 'Guardrail — no invented rate', pass: true },
                { id: 'T6', desc: 'Safexpress escalation clause', validates: 'Contract text retrieval', pass: true },
                { id: 'T7', desc: 'Capital of India?', validates: 'Scope enforcement — out_of_scope', pass: true },
                { id: 'T8', desc: 'DTDC SLA red flags', validates: 'Contract risk reasoning', pass: true },
              ].map((t, i) => (
                <tr key={t.id} style={{ background: i % 2 === 0 ? 'transparent' : S.surface2 }}>
                  <td style={{ padding: '12px 16px', borderBottom: `1px solid ${S.border}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: S.accent, fontWeight: 700 }}>{t.id}</td>
                  <td style={{ padding: '12px 16px', borderBottom: `1px solid ${S.border}`, color: S.text }}>{t.desc}</td>
                  <td style={{ padding: '12px 16px', borderBottom: `1px solid ${S.border}`, color: S.muted, fontSize: 12 }}>{t.validates}</td>
                  <td style={{ padding: '12px 16px', borderBottom: `1px solid ${S.border}`, textAlign: 'center' }}>
                    <span style={{ fontSize: 16, color: S.green }}>✓</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── METRICS ─────────────────────────────────── */}
        <SectionHeader label="Metrics" id="Metrics" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: S.muted, letterSpacing: '0.08em', marginBottom: 16, textTransform: 'uppercase' }}>Business metrics</div>
            {[
              { metric: 'Time-to-recommendation', before: '2–3 weeks', after: '2–3 days', color: S.green },
              { metric: 'Cost per evaluation', before: '₹2–3 lakh (analyst time)', after: '₹15,000–25,000 SaaS', color: S.green },
              { metric: 'First-pass acceptance', before: '—', after: '>80% target', color: S.info },
              { metric: 'Session completion', before: '—', after: '% reaching report', color: S.info },
            ].map(m => (
              <div key={m.metric} style={{ padding: '12px 0', borderBottom: `1px solid ${S.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: S.text, marginBottom: 6 }}>{m.metric}</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: S.muted, textDecoration: 'line-through' }}>{m.before}</span>
                  <span style={{ fontSize: 13, color: '#5e5e70' }}>→</span>
                  <span style={{ fontSize: 13, color: m.color, fontWeight: 600 }}>{m.after}</span>
                </div>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: S.muted, letterSpacing: '0.08em', marginBottom: 16, textTransform: 'uppercase' }}>AI quality metrics</div>
            {[
              { metric: 'Factual accuracy', target: '>95%', status: 'green' },
              { metric: 'Citation coverage', target: '100%', status: 'green' },
              { metric: 'Hallucination rate', target: '0%', status: 'green' },
              { metric: 'Coverage gap detection', target: '100%', status: 'green' },
              { metric: 'Scope enforcement', target: '100%', status: 'green' },
              { metric: 'Response type routing', target: '>90%', status: 'amber' },
              { metric: 'Avg query latency', target: '<8 seconds', status: 'amber' },
            ].map(m => (
              <div key={m.metric} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${S.border}` }}>
                <span style={{ fontSize: 13, color: S.text2 }}>{m.metric}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: m.status === 'green' ? S.green : S.amber, fontFamily: "'IBM Plex Mono', monospace" }}>{m.target}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div style={{ marginTop: 48, padding: '28px 32px', background: S.surface, border: `1px solid ${S.border}`, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Try the live app</div>
            <div style={{ fontSize: 13, color: S.muted }}>Full demo — 5 vendors, 30 lanes, eval-tested</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href="/analyze" style={{ padding: '10px 24px', background: S.accent, borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#000', textDecoration: 'none' }}>Open App →</a>
            <a href="https://github.com/Mambagreenos/-bid-analyst" target="_blank" rel="noreferrer" style={{ padding: '10px 24px', background: 'none', border: `1px solid ${S.border2}`, borderRadius: 8, fontSize: 13, color: S.text2, textDecoration: 'none' }}>GitHub</a>
          </div>
        </div>

      </div>
    </div>
  )
}

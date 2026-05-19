'use client'
import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

type Citation = { vendor: string; field: string; lane?: string; value: string }
type Gap = { lane: string; vendor: string; reason: string }
type Quality = { answers_question: boolean; confidence: string; warning: string }

type Props = {
  query: string
  response_type: string
  content: any
  citations: Citation[]
  gaps_flagged: Gap[]
  insight?: string | null
  latency_ms?: number
  quality?: Quality
  onPin: () => void
  pinned: boolean
  skipped?: boolean
  onSkip: () => void
  onSuggestEdits: (instruction: string) => void
  loading?: boolean
}

const CONTRACT_FIELDS = new Set([
  'sla', 'penalty', 'contract', 'liability', 'escalat', 'clause', 'agreement',
  'payment', 'force majeure', 'franchisee', 'settlement', 'suspend', 'commitment',
  'sla commitments', 'remote and northeast', 'retailer must', 'overall claim',
])

function isContractCitation(c: Citation) {
  const key = (c.field ?? '').toLowerCase()
  return CONTRACT_FIELDS.has(key) || key.length > 20 || c.lane === undefined || c.lane === ''
}

function CitationSection({ citations, responseType }: { citations: Citation[], responseType: string }) {
  if (!citations?.length) return null
  const bidCitations = citations.filter(c => !isContractCitation(c))
  const contractCitations = citations.filter(c => isContractCitation(c))

  const isMultiRow = responseType === 'table' || responseType === 'chart'
  const vendorsReferenced = [...new Set(bidCitations.map(c => c.vendor))].filter(Boolean)
  const lanesReferenced = [...new Set(bidCitations.map(c => c.lane).filter(Boolean))]
  const fieldsReferenced = [...new Set(bidCitations.map(c => c.field).filter(Boolean))]

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", color: '#334155', letterSpacing: '0.12em', marginBottom: 6 }}>SOURCES</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {bidCitations.length > 0 && (
        isMultiRow && bidCitations.length > 3 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: '#111827', border: '1px solid #1e293b', borderRadius: 5 }}>
            <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: '#60a5fa', flexShrink: 0 }}>Rate card</span>
            <span style={{ fontSize: 11, color: '#334155' }}>·</span>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              {vendorsReferenced.join(', ')}
              {lanesReferenced.length > 0 && ` · ${lanesReferenced.length} lane${lanesReferenced.length > 1 ? 's' : ''}`}
              {fieldsReferenced.length > 0 && ` · ${fieldsReferenced.slice(0, 2).join(', ')}`}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {bidCitations.slice(0, 4).map((c, i) => (
              <span key={i} style={{
                fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", padding: '3px 9px',
                background: '#0f1e35', border: '1px solid #1e3a5f',
                borderRadius: 20, color: '#93c5fd',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ color: '#60a5fa', fontWeight: 600 }}>{c.vendor}</span>
                <span style={{ color: '#334155' }}>·</span>
                <span style={{ color: '#64748b' }}>{c.field}</span>
                <span style={{ color: '#334155' }}>·</span>
                <span style={{ color: '#e2e8f0' }}>{c.value}</span>
              </span>
            ))}
          </div>
        )
      )}
      {contractCitations.length > 0 && (
        contractCitations.length > 2 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: '#0a1a12', border: '1px solid #14532d', borderRadius: 5, borderLeft: '2px solid #22d3a6' }}>
            <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: '#22d3a6', flexShrink: 0 }}>Contract</span>
            <span style={{ fontSize: 11, color: '#166534' }}>·</span>
            <span style={{ fontSize: 11, color: '#4ade80' }}>
              {[...new Set(contractCitations.map(c => c.vendor))].join(', ')} service agreement
              {contractCitations[0]?.value ? ` — "${contractCitations[0].value}"` : ''}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {contractCitations.map((c, i) => (
              <div key={i} style={{ fontSize: 11, padding: '5px 10px', background: '#0a1a12', border: '1px solid #14532d', borderRadius: 4, borderLeft: '2px solid #22d3a6' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#22d3a6', fontWeight: 600 }}>{c.vendor}</span>
                <span style={{ color: '#1e3a2e', margin: '0 6px' }}>·</span>
                <span style={{ color: '#4b7a5e' }}>{c.field}</span>
                {c.value && <><span style={{ color: '#1e3a2e', margin: '0 6px' }}>—</span><span style={{ color: '#86efac', fontStyle: 'italic' }}>&ldquo;{c.value}&rdquo;</span></>}
              </div>
            ))}
          </div>
        )
      )}
      </div>
    </div>
  )
}

const IMPACT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  high:   { bg: '#1e0810', border: '#6b1a2a', text: '#fb7185' },
  medium: { bg: '#1a1200', border: '#5a3800', text: '#fbbf24' },
  low:    { bg: '#041f0f', border: '#145229', text: '#4ade80' },
}

export default function AnswerCard({ query, response_type, content, citations, gaps_flagged, insight, latency_ms, quality, onPin, pinned, skipped, onSkip, onSuggestEdits, loading }: Props) {
  const [editMode, setEditMode] = useState(false)
  const [editText, setEditText] = useState('')

  if (loading) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, marginBottom: 12, lineHeight: 1.4 }}>{query}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)',
                animation: `pulse 1.4s ${i * 0.22}s ease-in-out infinite`,
                opacity: 0.75,
              }} />
            ))}
          </div>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>Analysing bid data...</span>
        </div>
        <style>{`@keyframes pulse { 0%,80%,100%{transform:translateY(0);opacity:0.3} 40%{transform:translateY(-4px);opacity:1} }`}</style>
      </div>
    )
  }

  const isRiskTable = response_type === 'table' &&
    content?.headers?.some((h: string) => h.toLowerCase() === 'impact')

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '16px', marginBottom: 10,
      transition: 'border-color 0.2s',
      opacity: skipped ? 0.45 : 1,
    }}>
      {/* Query row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, lineHeight: 1.45, flex: 1 }}>
          {query}
        </div>
        {latency_ms ? (
          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0, marginTop: 2 }}>
            {(latency_ms / 1000).toFixed(1)}s
          </span>
        ) : null}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)', marginBottom: 12 }} />

      {/* Answer body */}
      {response_type === 'text' && (
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.85 }}>
          {content?.answer}
        </div>
      )}

      {response_type === 'table' && content?.headers && (
        isRiskTable ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {content.rows?.map((row: string[], i: number) => {
              const impact = (row[1] ?? '').toLowerCase()
              const colors = IMPACT_COLORS[impact] ?? IMPACT_COLORS.low
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, padding: '11px 14px', background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 7, borderLeft: `3px solid ${colors.text}` }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{row[0]}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{row[2]}</div>
                    {row[3] && <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--muted)', marginTop: 5 }}>Source: {row[3]}</div>}
                  </div>
                  <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: colors.text, textTransform: 'uppercase', fontWeight: 700, alignSelf: 'flex-start', padding: '3px 9px', background: `${colors.border}88`, borderRadius: 4 }}>
                    {row[1]}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 6, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {content.headers.map((h: string, i: number) => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: i === 0 ? 'left' : 'right', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--muted)', fontWeight: 500, letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {content.rows?.map((row: string[], i: number) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--surface2)' }}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', textAlign: j === 0 ? 'left' : 'right', color: (cell === '—' || cell === 'N/A' || cell?.toLowerCase?.().includes('not covered')) ? 'var(--coral)' : j > 0 ? 'var(--text)' : 'var(--text)', fontFamily: j > 0 ? "'IBM Plex Mono', monospace" : undefined, fontWeight: j === 0 ? 500 : 400 }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {response_type === 'chart' && content?.x_axis && (
        <div style={{ height: 230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={content.x_axis.map((x: string, i: number) => ({
              name: x,
              ...Object.fromEntries(content.series.map((s: any) => [s.name, s.data[i]]))
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: "'IBM Plex Mono'" }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: "'IBM Plex Mono'" }} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontFamily: "'IBM Plex Sans'" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {content.series.map((s: any, i: number) => (
                <Bar key={s.name} dataKey={s.name} fill={['#f97316', '#22d3a6', '#60a5fa', '#fb7185', '#fbbf24'][i % 5]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gap warnings */}
      {gaps_flagged?.length > 0 && (
        <div style={{ marginTop: 12, padding: '9px 12px', background: '#1e0810', border: '1px solid #6b1a2a', borderRadius: 7, borderLeft: '3px solid var(--coral)' }}>
          <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--coral)', marginBottom: 5, letterSpacing: '0.08em' }}>COVERAGE GAPS</div>
          {gaps_flagged.map((g, i) => (
            <div key={i} style={{ fontSize: 12, color: '#f87171', marginTop: 3, lineHeight: 1.5 }}>
              ✗ {g.vendor} · {g.lane}: {g.reason}
            </div>
          ))}
        </div>
      )}

      {/* Analyst insight */}
      {insight && (
        <div style={{ marginTop: 12, display: 'flex', gap: 10, padding: '10px 14px', background: '#0f1a0a', border: '1px solid #1e3a14', borderRadius: 7, borderLeft: '3px solid #22d3a6' }}>
          <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: '#22d3a6', letterSpacing: '0.1em', flexShrink: 0, paddingTop: 1 }}>↗ INSIGHT</span>
          <span style={{ fontSize: 12, color: '#86efac', lineHeight: 1.65 }}>{insight}</span>
        </div>
      )}

      {/* Citations */}
      <CitationSection citations={citations} responseType={response_type} />

      {/* Quality warnings */}
      {quality && (quality.confidence === 'low' || !quality.answers_question) && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 12px', background: '#1a1200', border: '1px solid #5a3800', borderRadius: 6, borderLeft: '3px solid var(--amber)' }}>
          <span style={{ fontSize: 13, flexShrink: 0 }}>⚠</span>
          <span style={{ fontSize: 11, color: 'var(--amber)', lineHeight: 1.6 }}>
            {quality.warning || 'Low confidence — data may be incomplete for this question.'}
          </span>
        </div>
      )}
      {quality && quality.confidence === 'medium' && quality.warning && quality.answers_question && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 12px', background: '#0f1a2a', border: '1px solid #1e3a5f', borderRadius: 6 }}>
          <span style={{ fontSize: 13, flexShrink: 0 }}>ℹ</span>
          <span style={{ fontSize: 11, color: 'var(--info)', lineHeight: 1.6 }}>{quality.warning}</span>
        </div>
      )}

      {/* Action row */}
      {!skipped ? (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          {!editMode ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button onClick={onPin} disabled={pinned} style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                cursor: pinned ? 'default' : 'pointer', border: '1px solid',
                background: pinned ? '#041f0f' : 'var(--surface2)',
                borderColor: pinned ? '#145229' : 'var(--border2)',
                color: pinned ? 'var(--green)' : 'var(--text2)',
                transition: 'all 0.15s',
              }}>
                {pinned ? '✓ Added to report' : '+ Add to report'}
              </button>

              {!pinned && (
                <button onClick={() => setEditMode(true)} style={{
                  padding: '6px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                  border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--muted)',
                  transition: 'all 0.15s',
                }}
                onMouseOver={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseOut={e => (e.currentTarget.style.color = 'var(--muted)')}
                >
                  ✎ Suggest edits
                </button>
              )}

              {!pinned && (
                <button onClick={onSkip} style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                  border: '1px solid transparent', background: 'none', color: 'var(--muted)',
                  marginLeft: 'auto', transition: 'color 0.15s',
                }}
                onMouseOver={e => (e.currentTarget.style.color = 'var(--text2)')}
                onMouseOut={e => (e.currentTarget.style.color = 'var(--muted)')}
                >
                  Dismiss
                </button>
              )}
            </div>
          ) : (
            <div style={{ background: '#0d1526', border: '1px solid #1e3a5f', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--info)', marginBottom: 8, letterSpacing: '0.08em' }}>SUGGEST EDITS</div>
              <input
                autoFocus
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && editText.trim()) {
                    onSuggestEdits(editText.trim())
                    setEditMode(false)
                    setEditText('')
                  }
                  if (e.key === 'Escape') { setEditMode(false); setEditText('') }
                }}
                placeholder="e.g. also show transit days, or focus on NE lanes only..."
                style={{
                  width: '100%', padding: '8px 12px', background: 'var(--surface2)',
                  border: '1px solid var(--border2)', borderRadius: 6, color: 'var(--text)',
                  fontSize: 12, outline: 'none', marginBottom: 10,
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--info)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => { if (editText.trim()) { onSuggestEdits(editText.trim()); setEditMode(false); setEditText('') } }}
                  disabled={!editText.trim()}
                  style={{ padding: '6px 16px', background: 'var(--info)', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 700, color: '#000', cursor: editText.trim() ? 'pointer' : 'not-allowed' }}
                >
                  Re-ask →
                </button>
                <button onClick={() => { setEditMode(false); setEditText('') }}
                  style={{ padding: '6px 12px', background: 'none', border: '1px solid var(--border2)', borderRadius: 5, fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
          dismissed ·{' '}
          <span onClick={onSkip} style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--text2)' }}>undo</span>
        </div>
      )}
    </div>
  )
}

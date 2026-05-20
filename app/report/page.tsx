'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

type MetricItem  = { label: string; value: string; sub: string; color: string }
type RiskItem    = { flag: string; vendor: string; impact: string; mitigation: string }
type ChartSeries = { name: string; data: number[] }
type ReportSection = {
  type: 'recommendation' | 'metrics' | 'chart' | 'risk_list' | 'table' | 'text'
  title: string
  content: any
}
type Report = {
  title?: string
  executive_summary: string
  sections: ReportSection[]
  next_steps: string[]
}
type PinnedAnswer = {
  id: string; query: string; text_summary: string; response_type: string; include_in_report: boolean
}

const S = {
  bg: '#0c0c0f', surface: '#141417', surface2: '#1a1a1f',
  border: '#252530', border2: '#32323e',
  text: '#e6e6ef', text2: '#b0b0be', muted: '#5e5e70',
  accent: '#f97316', info: '#60a5fa',
  coral: '#fb7185', green: '#4ade80', amber: '#fbbf24',
}

const IMPACT: Record<string, { bg: string; border: string; text: string }> = {
  high:   { bg: '#1e0810', border: '#6b1a2a', text: '#fb7185' },
  medium: { bg: '#1a1200', border: '#5a3800', text: '#fbbf24' },
  low:    { bg: '#041f0f', border: '#145229', text: '#4ade80' },
}
const METRIC_C: Record<string, { bg: string; border: string; val: string }> = {
  green: { bg: '#041f0f', border: '#145229', val: '#4ade80' },
  blue:  { bg: '#0f1e35', border: '#1e3a5f', val: '#60a5fa' },
  amber: { bg: '#1a1200', border: '#5a3800', val: '#fbbf24' },
  coral: { bg: '#1e0810', border: '#6b1a2a', val: '#fb7185' },
  muted: { bg: '#141417', border: '#252530', val: '#5e5e70' },
}
const SECTION_ACCENT: Record<string, string> = {
  recommendation: '#4ade80',
  metrics: '#60a5fa',
  chart: '#f97316',
  risk_list: '#fb7185',
  table: '#38383f',
  text: '#38383f',
}

function cleanMetricValue(v: string): string {
  return v
    .replace(/\b(\d+)\.0\b/g, '$1')   // 1.0 → 1, 2.0 → 2
    .replace(/\b1 Days\b/g, '1 Day')  // 1 Days → 1 Day
}

function isSectionValid(s: ReportSection): boolean {
  switch (s.type) {
    case 'recommendation': return !!s.content?.primary_vendor
    case 'metrics':   return (s.content?.items?.length  ?? 0) > 0
    case 'chart':     return (s.content?.x_axis?.length ?? 0) > 0
    case 'risk_list': return (s.content?.items?.length  ?? 0) > 0
    case 'table':     return (s.content?.headers?.length ?? 0) > 0
    case 'text':      return !!s.content?.body
    default:          return false
  }
}

// ── Section renderers ──────────────────────────────────────────────
function SectionContent({ section }: { section: ReportSection }) {
  switch (section.type) {

    case 'metrics': {
      const items: MetricItem[] = section.content?.items ?? []
      const cols = Math.min(Math.max(items.length, 1), 5)
      return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
          {items.map((item, i) => {
            const c = METRIC_C[item.color] ?? METRIC_C.muted
            return (
              <div key={i} style={{ padding: '18px 14px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: S.muted, marginBottom: 12, letterSpacing: '0.07em', lineHeight: 1.5 }}>
                  {item.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: c.val, marginBottom: 6, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '-0.01em' }}>
                  {cleanMetricValue(item.value)}
                </div>
                <div style={{ fontSize: 11, color: S.muted, lineHeight: 1.4 }}>{item.sub}</div>
              </div>
            )
          })}
        </div>
      )
    }

    case 'chart': {
      if (!section.content?.x_axis?.length) return null
      const data = section.content.x_axis.map((x: string, i: number) => ({
        name: x,
        ...Object.fromEntries((section.content.series ?? []).map((s: ChartSeries) => [s.name, s.data[i]]))
      }))
      return (
        <div style={{ height: 270 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={S.border} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: S.muted, fontFamily: "'IBM Plex Mono'" }} />
              <YAxis tick={{ fontSize: 11, fill: S.muted, fontFamily: "'IBM Plex Mono'" }} />
              <Tooltip
                contentStyle={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 12 }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {(section.content.series ?? []).map((s: ChartSeries, i: number) => (
                <Bar key={s.name} dataKey={s.name} fill={['#f97316','#22d3a6','#60a5fa','#fb7185','#fbbf24'][i % 5]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )
    }

    case 'recommendation': {
      if (!section.content?.primary_vendor) return null
      return (
        <div>
          <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: S.green, marginBottom: 8, letterSpacing: '0.08em' }}>PRIMARY VENDOR</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: S.green, marginBottom: 14, letterSpacing: '-0.01em' }}>{section.content.primary_vendor}</div>
          <div style={{ fontSize: 13, lineHeight: 1.85, color: S.text }}>{section.content.rationale}</div>
          {section.content.conditions && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #145229', fontSize: 12, color: S.muted }}>
              <span style={{ color: S.amber, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.08em' }}>CONDITIONS  </span>
              {section.content.conditions}
            </div>
          )}
        </div>
      )
    }

    case 'risk_list': {
      const items: RiskItem[] = section.content?.items ?? []
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((r, i) => {
            const c = IMPACT[r.impact?.toLowerCase()] ?? IMPACT.low
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '12px 16px', background: c.bg, border: `1px solid ${c.border}`, borderRadius: 7, borderLeft: `3px solid ${c.text}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: S.text, marginBottom: 5 }}>{r.flag}</div>
                  <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.5 }}>
                    <span style={{ color: S.border2 }}>Vendor:</span> {r.vendor}
                    {r.mitigation && <><span style={{ color: S.border2, margin: '0 6px' }}>·</span><span style={{ color: S.border2 }}>Fix:</span> {r.mitigation}</>}
                  </div>
                </div>
                <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 4, color: c.text, background: `${c.border}88`, alignSelf: 'flex-start', flexShrink: 0 }}>
                  {r.impact}
                </span>
              </div>
            )
          })}
        </div>
      )
    }

    case 'table': {
      if (!section.content?.headers?.length) return null
      // Normalise rows: AI sometimes returns objects instead of string arrays
      const rawRows: any[] = section.content.rows ?? []
      const rows: string[][] = rawRows.map(row =>
        Array.isArray(row) ? row.map(String) : Object.values(row as Record<string, unknown>).map(String)
      )
      return (
        <div style={{ overflowX: 'auto', borderRadius: 7, border: `1px solid ${S.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {section.content.headers.map((h: string, i: number) => (
                  <th key={i} style={{ padding: '10px 14px', textAlign: i === 0 ? 'left' : 'center', background: S.surface2, borderBottom: `1px solid ${S.border}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: S.muted, fontWeight: 500, letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : S.surface2 }}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ padding: '10px 14px', borderBottom: `1px solid ${S.border}`, textAlign: j === 0 ? 'left' : 'center', color: cell === '—' ? S.border2 : S.text, fontFamily: j > 0 ? "'IBM Plex Mono', monospace" : undefined, fontWeight: j === 0 ? 500 : 400 }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    case 'text':
      return <div style={{ fontSize: 14, lineHeight: 1.88, color: S.text2 }}>{section.content?.body}</div>

    default:
      return null
  }
}

// ── Section wrapper ────────────────────────────────────────────────
function SectionBlock({
  title, accent, inPDF, sectionKey, isEditing, editFeedback, isLoading,
  onEditFeedbackChange, onEdit, onEditSubmit, onEditCancel, onTogglePDF,
  children,
}: {
  title: string; accent: string; inPDF: boolean; sectionKey: string
  isEditing: boolean; editFeedback: string; isLoading: boolean
  onEditFeedbackChange: (v: string) => void
  onEdit: () => void; onEditSubmit: () => void; onEditCancel: () => void
  onTogglePDF: () => void; children: React.ReactNode
}) {
  return (
    <section data-section={sectionKey} style={{ marginBottom: 32, opacity: inPDF ? 1 : 0.45, transition: 'opacity 0.2s' }}>

      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: inPDF ? S.muted : S.border2, letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: 7 }}>
          {!inPDF && <span style={{ fontSize: 9, color: S.coral }}>✗</span>}
          <span>{title}</span>
          {!inPDF && <span style={{ fontSize: 9, color: S.coral }}> — excluded from PDF</span>}
        </div>
        <button
          onClick={onTogglePDF}
          title={inPDF ? 'Click to exclude from PDF export' : 'Click to include in PDF export'}
          style={{
            padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
            border: `1px solid ${inPDF ? S.green : S.border2}`,
            background: inPDF ? '#041f0f' : 'none',
            display: 'flex', alignItems: 'center', gap: 5,
            transition: 'all 0.2s', flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 10, color: inPDF ? S.green : S.muted, lineHeight: 1 }}>
            {inPDF ? '✓' : '○'}
          </span>
          <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: inPDF ? S.green : S.muted, letterSpacing: '0.04em' }}>
            {inPDF ? 'In PDF' : 'Skip'}
          </span>
        </button>
      </div>

      {/* Content card */}
      <div style={{
        padding: '22px 26px', background: S.surface,
        borderTop: `1px solid ${S.border}`,
        borderRight: `1px solid ${S.border}`,
        borderBottom: `1px solid ${S.border}`,
        borderLeft: `4px solid ${inPDF ? accent : S.border2}`,
        borderRadius: '0 10px 10px 0',
        transition: 'border-color 0.25s',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {isLoading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'rgba(12,12,15,0.75)',
            borderRadius: '0 10px 10px 0', zIndex: 2,
          }}>
            <span style={{ fontSize: 12, color: S.muted, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em' }}>REFINING...</span>
          </div>
        )}
        {children}
      </div>

      {/* Inline edit input */}
      {isEditing && (
        <div style={{ marginTop: 8, padding: '14px 16px', background: '#0d1526', border: `1px solid #1e3a5f`, borderRadius: 8 }}>
          <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: S.info, marginBottom: 8, letterSpacing: '0.08em' }}>SUGGEST EDITS</div>
          <textarea
            autoFocus
            value={editFeedback}
            onChange={e => onEditFeedbackChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') onEditCancel() }}
            placeholder="e.g. Show as bar chart, add transit days column, highlight NE risk more..."
            rows={2}
            style={{
              width: '100%', padding: '9px 12px', background: S.surface2,
              border: `1px solid ${S.border2}`, borderRadius: 6, color: S.text,
              fontSize: 12, resize: 'none', outline: 'none', marginBottom: 10, lineHeight: 1.5,
              transition: 'border-color 0.15s',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = S.info)}
            onBlur={e => (e.currentTarget.style.borderColor = S.border2)}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onEditSubmit}
              disabled={!editFeedback.trim()}
              style={{
                padding: '7px 20px', background: editFeedback.trim() ? S.info : S.surface2,
                border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700,
                color: editFeedback.trim() ? '#000' : S.muted,
                cursor: editFeedback.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Apply →
            </button>
            <button
              onClick={onEditCancel}
              style={{ padding: '7px 14px', background: 'none', border: `1px solid ${S.border2}`, borderRadius: 6, fontSize: 12, color: S.muted, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Suggest Edits action — only when idle */}
      {!isEditing && !isLoading && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={onEdit}
            style={{
              padding: '6px 14px', background: 'none',
              border: `1px solid ${S.border2}`, borderRadius: 6,
              fontSize: 11, color: S.text2, cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.04em',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = S.info; e.currentTarget.style.color = S.info }}
            onMouseOut={e => { e.currentTarget.style.borderColor = S.border2; e.currentTarget.style.color = S.text2 }}
          >
            Suggest Edits
          </button>
        </div>
      )}
    </section>
  )
}

// ── Main page ──────────────────────────────────────────────────────
export default function ReportPage() {
  const [sessionId, setSessionId]     = useState('')
  const [pinned, setPinned]           = useState<PinnedAnswer[]>([])
  const [report, setReport]           = useState<Report | null>(null)
  const [generating, setGenerating]   = useState(false)
  const [error, setError]             = useState('')
  const [instructions, setInstructions] = useState('')
  const reportRef = useRef<HTMLDivElement>(null)

  const [excludedKeys, setExcludedKeys] = useState<Set<string>>(new Set())
  const [editingKey, setEditingKey]     = useState<string | null>(null)
  const [editFeedback, setEditFeedback] = useState('')
  const [loadingKey, setLoadingKey]     = useState<string | null>(null)

  useEffect(() => {
    const id = localStorage.getItem('sessionId') ?? ''
    setSessionId(id)
    if (id) {
      supabase.from('pinned_answers')
        .select('id, query, text_summary, response_type, include_in_report')
        .eq('session_id', id).order('created_at', { ascending: false })
        .then(({ data }) => setPinned(data ?? []))
    }
  }, [])

  const toggleInclude = async (id: string, val: boolean) => {
    await supabase.from('pinned_answers').update({ include_in_report: val }).eq('id', id)
    setPinned(prev => prev.map(p => p.id === id ? { ...p, include_in_report: val } : p))
  }

  const togglePDF = (key: string) => {
    setExcludedKeys(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const generate = async () => {
    if (!sessionId) return
    setGenerating(true)
    setError('')
    setEditingKey(null)
    setEditFeedback('')
    setExcludedKeys(new Set())
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, additionalInstructions: instructions || undefined }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setReport(data.report)
      setInstructions('')
    } catch { setError('Report generation failed') }
    finally { setGenerating(false) }
  }

  // Refine a specific section in-place
  const submitSectionEdit = async (key: string, sectionIdx: number | null) => {
    if (!editFeedback.trim()) return
    const feedback = editFeedback
    setEditingKey(null)
    setEditFeedback('')
    setLoadingKey(key)

    try {
      if (sectionIdx !== null && report) {
        const currentSection = report.sections[sectionIdx]
        const res = await fetch('/api/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, singleSection: true, currentSection, refineFeedback: feedback }),
        })
        const data = await res.json()
        if (data.sections?.length) {
          setReport(prev => {
            if (!prev) return prev
            const sections = [...prev.sections]
            // splice in 1 or 2 returned sections at the original position
            sections.splice(sectionIdx, 1, ...data.sections)
            return { ...prev, sections }
          })
        } else {
          setError(data.error ?? 'Section refinement failed')
        }
      } else {
        // Executive summary: full report refinement
        const res = await fetch('/api/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, refineSection: 'executive summary', refineFeedback: feedback }),
        })
        const data = await res.json()
        if (data.report) { setReport(data.report) }
        else setError(data.error ?? 'Refinement failed')
      }
    } catch { setError('Refinement failed') }
    finally { setLoadingKey(null) }
  }

  const startEdit  = (key: string) => { setEditingKey(key); setEditFeedback('') }
  const cancelEdit = () => { setEditingKey(null); setEditFeedback('') }

  const exportPDF = async () => {
    if (!reportRef.current) return
    // Temporarily hide excluded sections
    const hiddenEls: HTMLElement[] = []
    excludedKeys.forEach(key => {
      const el = reportRef.current?.querySelector(`[data-section="${key}"]`) as HTMLElement | null
      if (el) { el.style.display = 'none'; hiddenEls.push(el) }
    })
    const { default: jsPDF }       = await import('jspdf')
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(reportRef.current, { backgroundColor: '#0c0c0f', scale: 2 })
    // Restore hidden sections
    hiddenEls.forEach(el => { el.style.display = '' })
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const imgW = 210
    const imgH = (canvas.height * imgW) / canvas.width
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgW, imgH)
    pdf.save('bid-analyst-report.pdf')
  }

  const includedCount  = pinned.filter(p => p.include_in_report).length
  const hasNextSteps   = (report?.next_steps?.filter(Boolean).length ?? 0) > 0
  const totalSections  = report ? 1 + (report.sections?.length ?? 0) + (hasNextSteps ? 1 : 0) : 0
  const inPDFCount     = totalSections - excludedKeys.size
  const progressPct    = totalSections > 0 ? (inPDFCount / totalSections) * 100 : 0

  return (
    <div style={{ minHeight: '100vh', background: S.bg, color: S.text, display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <div style={{ height: 52, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: S.surface, borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="/analyze" style={{ fontSize: 12, color: S.muted, textDecoration: 'none' }}>← Back</a>
          <span style={{ color: S.border2 }}>|</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: S.accent, fontWeight: 700, letterSpacing: '0.1em' }}>CFO REPORT</span>
          {report && (
            <span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: S.muted }}>
              {inPDFCount}/{totalSections} sections in PDF
            </span>
          )}
        </div>
        {report && (
          <button onClick={exportPDF} style={{ padding: '6px 16px', background: S.accent, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#000', cursor: 'pointer' }}>
            Export PDF
          </button>
        )}
      </div>

      {/* Progress bar — shows sections included in PDF */}
      {report && (
        <div style={{ height: 3, background: S.border, flexShrink: 0 }}>
          <div style={{ height: '100%', background: S.green, width: `${progressPct}%`, transition: 'width 0.4s ease' }} />
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: report ? 'calc(100vh - 55px)' : 'calc(100vh - 52px)' }}>

        {/* LEFT SIDEBAR */}
        <div style={{ width: 296, background: S.surface, borderRight: `1px solid ${S.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${S.border}` }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: S.muted, letterSpacing: '0.12em', marginBottom: 4 }}>PINNED FINDINGS</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: S.text }}>{pinned.length}</div>
            <div style={{ fontSize: 12, color: S.muted }}>{includedCount} selected for report</div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {pinned.length === 0 ? (
              <div style={{ padding: '20px 8px', fontSize: 12, color: S.muted, lineHeight: 1.7 }}>
                No pinned findings yet.<br />Go back to analysis and pin your key findings.
              </div>
            ) : (
              pinned.map(p => (
                <div key={p.id} onClick={() => toggleInclude(p.id, !p.include_in_report)} style={{
                  marginBottom: 7, padding: '10px 12px',
                  background: p.include_in_report ? '#0a1f10' : S.surface2,
                  border: `1px solid ${p.include_in_report ? '#1a4a25' : S.border}`,
                  borderLeft: `3px solid ${p.include_in_report ? S.green : S.border2}`,
                  borderRadius: 7, cursor: 'pointer', opacity: p.include_in_report ? 1 : 0.5, transition: 'all 0.15s',
                }}>
                  <div style={{ fontSize: 12, color: S.text, marginBottom: 4, lineHeight: 1.4 }}>{p.query}</div>
                  {p.text_summary && (
                    <div style={{ fontSize: 11, color: S.muted, lineHeight: 1.4 }}>
                      {p.text_summary.slice(0, 70)}{p.text_summary.length > 70 ? '…' : ''}
                    </div>
                  )}
                  <div style={{ marginTop: 6, fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: p.include_in_report ? S.green : S.muted }}>
                    {p.include_in_report ? '✓ included' : '○ excluded'}
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: '16px', borderTop: `1px solid ${S.border}` }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: S.muted, letterSpacing: '0.1em', marginBottom: 6 }}>INSTRUCTIONS</div>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder="e.g. Show a bar chart of rates, focus on NE risks..."
                rows={3}
                style={{ width: '100%', padding: '8px 10px', background: S.surface2, border: `1px solid ${S.border2}`, borderRadius: 6, color: S.text, fontSize: 12, resize: 'none', outline: 'none', lineHeight: 1.5, transition: 'border-color 0.15s' }}
                onFocus={e => (e.currentTarget.style.borderColor = S.accent)}
                onBlur={e => (e.currentTarget.style.borderColor = S.border2)}
              />
            </div>
            {error && (
              <div style={{ marginBottom: 10, padding: '8px 12px', background: '#1e0810', border: '1px solid #6b1a2a', borderRadius: 6, fontSize: 12, color: S.coral }}>
                {error}
              </div>
            )}
            <button
              onClick={generate}
              disabled={generating || includedCount === 0}
              style={{
                width: '100%', padding: '14px',
                background: includedCount === 0 ? S.surface2 : generating ? S.surface2 : S.accent,
                border: `2px solid ${includedCount === 0 ? S.border2 : generating ? S.border2 : S.accent}`,
                borderRadius: 8, fontSize: 14, fontWeight: 700,
                color: includedCount === 0 ? S.muted : generating ? S.muted : '#000',
                cursor: includedCount === 0 || generating ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
              }}
            >
              {generating ? '⏳  Generating...' : includedCount === 0 ? 'Select findings above' : report ? '↺ Re-Generate' : 'Generate Report →'}
            </button>
            {includedCount > 0 && !generating && (
              <div style={{ marginTop: 8, fontSize: 11, color: S.muted, textAlign: 'center' }}>
                {includedCount} finding{includedCount > 1 ? 's' : ''} · AI picks best format
              </div>
            )}
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px 52px', background: S.bg }}>

          {!report && !generating && (
            <div style={{ maxWidth: 460, margin: '100px auto', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: S.surface, border: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 20px' }}>📋</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: S.text, marginBottom: 10 }}>Ready to generate</div>
              <div style={{ fontSize: 13, color: S.muted, lineHeight: 1.75 }}>
                Pin findings in the analyst chat, select them on the left, then click Generate Report.
              </div>
              <div style={{ marginTop: 16, padding: '10px 16px', background: S.surface, border: `1px solid ${S.border}`, borderRadius: 7, fontSize: 11, color: S.muted, textAlign: 'left', lineHeight: 1.8 }}>
                <span style={{ color: S.amber, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>TIP  </span>
                Add instructions like "show bar chart of rates" or "focus on NE risks" to control the output format. Use Suggest Edits on any card to refine just that section.
              </div>
            </div>
          )}

          {generating && (
            <div style={{ maxWidth: 460, margin: '100px auto', textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: S.muted, marginBottom: 8 }}>Synthesising {includedCount} findings into a CFO report...</div>
              <div style={{ fontSize: 11, color: S.border2, fontFamily: "'IBM Plex Mono', monospace" }}>AI is choosing the best format for each section</div>
            </div>
          )}

          {report && (
            <div ref={reportRef} style={{ maxWidth: 820, margin: '0 auto' }}>

              {/* Title bar */}
              <div style={{ marginBottom: 40, paddingBottom: 24, borderBottom: `1px solid ${S.border}` }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: S.accent, letterSpacing: '0.12em', marginBottom: 12 }}>VENDOR EVALUATION REPORT</div>
                <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.01em' }}>{report.title ?? 'Logistics Bid Analysis'}</div>
                <div style={{ fontSize: 12, color: S.muted }}>
                  Generated {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  &nbsp;·&nbsp;{includedCount} finding{includedCount !== 1 ? 's' : ''} included
                </div>
              </div>

              {/* Executive Summary */}
              <SectionBlock
                title="EXECUTIVE SUMMARY"
                accent={S.accent}
                inPDF={!excludedKeys.has('summary')}
                sectionKey="summary"
                isEditing={editingKey === 'summary'}
                editFeedback={editingKey === 'summary' ? editFeedback : ''}
                isLoading={loadingKey === 'summary'}
                onEditFeedbackChange={setEditFeedback}
                onEdit={() => startEdit('summary')}
                onEditSubmit={() => submitSectionEdit('summary', null)}
                onEditCancel={cancelEdit}
                onTogglePDF={() => togglePDF('summary')}
              >
                <div style={{ fontSize: 14, lineHeight: 1.88, color: S.text }}>{report.executive_summary}</div>
              </SectionBlock>

              {/* Adaptive sections */}
              {(report.sections ?? []).filter(s => s?.type && isSectionValid(s)).map((section, i) => {
                const key = `section_${i}`
                return (
                  <SectionBlock
                    key={key}
                    title={section.title?.toUpperCase() ?? section.type.replace(/_/g, ' ').toUpperCase()}
                    accent={SECTION_ACCENT[section.type] ?? S.muted}
                    inPDF={!excludedKeys.has(key)}
                    sectionKey={key}
                    isEditing={editingKey === key}
                    editFeedback={editingKey === key ? editFeedback : ''}
                    isLoading={loadingKey === key}
                    onEditFeedbackChange={setEditFeedback}
                    onEdit={() => startEdit(key)}
                    onEditSubmit={() => submitSectionEdit(key, i)}
                    onEditCancel={cancelEdit}
                    onTogglePDF={() => togglePDF(key)}
                  >
                    <SectionContent section={section} />
                  </SectionBlock>
                )
              })}

              {/* Next Steps */}
              {report.next_steps?.filter(Boolean).length > 0 && (
                <SectionBlock
                  title="NEXT STEPS"
                  accent={S.accent}
                  inPDF={!excludedKeys.has('next_steps')}
                  sectionKey="next_steps"
                  isEditing={false}
                  editFeedback=""
                  isLoading={false}
                  onEditFeedbackChange={() => {}}
                  onEdit={() => {}}
                  onEditSubmit={() => {}}
                  onEditCancel={() => {}}
                  onTogglePDF={() => togglePDF('next_steps')}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {report.next_steps.filter(Boolean).map((s, i) => (
                      <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 18px', background: S.surface2, border: `1px solid ${S.border}`, borderRadius: 8, alignItems: 'flex-start' }}>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, color: S.accent, fontWeight: 700, minWidth: 28, flexShrink: 0 }}>{i + 1}.</span>
                        <span style={{ fontSize: 13, color: S.text2, lineHeight: 1.65 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </SectionBlock>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}

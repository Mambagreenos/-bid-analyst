'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Contract = { vendor: string; body: string }

const VENDORS = ['Blue Dart', 'Delhivery', 'Safexpress', 'Gati', 'DTDC']
const VENDOR_COLOR: Record<string, string> = {
  'Blue Dart': '#60a5fa', 'Delhivery': '#4ade80',
  'Safexpress': '#fbbf24', 'Gati': '#fb7185', 'DTDC': '#f97316',
}

// Parse contract body into labelled sections
function parseSections(body: string): { heading: string; text: string }[] {
  const lines = body.split('\n').map(l => l.trim()).filter(Boolean)
  const sections: { heading: string; text: string }[] = []
  let current: { heading: string; lines: string[] } | null = null

  for (const line of lines) {
    // Headings: ALL CAPS line, or ends with ':', or starts with a number + dot
    const isHeading = /^[A-Z][A-Z\s\/&,-]{4,}$/.test(line) ||
      /^\d+\.\s+[A-Z]/.test(line) ||
      (line.endsWith(':') && line.length < 60)

    if (isHeading) {
      if (current) sections.push({ heading: current.heading, text: current.lines.join(' ') })
      current = { heading: line.replace(/:$/, ''), lines: [] }
    } else {
      if (!current) current = { heading: 'General', lines: [] }
      current.lines.push(line)
    }
  }
  if (current) sections.push({ heading: current.heading, text: current.lines.join(' ') })
  return sections.filter(s => s.text.trim())
}

// Risk keywords to highlight
const RISK_TERMS = ['not liable', 'exclud', 'penalty', 'suspend', 'terminat', 'force majeure',
  'waiv', 'indemnif', 'no claim', 'limit', 'breach', 'default', 'forfeit']

function highlight(text: string) {
  const parts = text.split(new RegExp(`(${RISK_TERMS.join('|')})`, 'gi'))
  return parts.map((part, i) =>
    RISK_TERMS.some(t => part.toLowerCase().includes(t.toLowerCase()))
      ? <mark key={i} style={{ background: '#2a0f0f', color: '#fb7185', borderRadius: 2, padding: '0 2px' }}>{part}</mark>
      : part
  )
}

export default function ContractsView() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [active, setActive] = useState('Blue Dart')
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('contracts').select('vendor, body').then(({ data }) => {
      setContracts(data ?? [])
    })
  }, [])

  const contract = contracts.find(c => c.vendor === active)
  const sections = contract ? parseSections(contract.body) : []
  const filtered = search
    ? sections.filter(s =>
        s.heading.toLowerCase().includes(search.toLowerCase()) ||
        s.text.toLowerCase().includes(search.toLowerCase())
      )
    : sections

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--accent)', letterSpacing: '0.12em', marginBottom: 3 }}>CONTRACTS</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Service Agreements</div>
      </div>

      {/* Vendor tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }}>
        {VENDORS.map(v => (
          <button key={v} onClick={() => setActive(v)} style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 11,
            fontFamily: "'IBM Plex Mono', monospace", cursor: 'pointer',
            border: `1px solid ${active === v ? VENDOR_COLOR[v] : 'var(--border2)'}`,
            background: active === v ? `${VENDOR_COLOR[v]}18` : 'var(--surface2)',
            color: active === v ? VENDOR_COLOR[v] : 'var(--muted)',
            fontWeight: active === v ? 600 : 400,
            transition: 'all 0.15s',
          }}>
            {v.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clauses..."
          style={{
            width: '100%', padding: '6px 10px', background: 'var(--surface2)',
            border: '1px solid var(--border2)', borderRadius: 6, color: 'var(--text)',
            fontSize: 12, outline: 'none',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
        />
      </div>

      {/* Contract body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {!contract ? (
          <div style={{ fontSize: 12, color: 'var(--muted)', padding: '20px 0' }}>Loading contracts...</div>
        ) : filtered.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--muted)', padding: '20px 0' }}>No matching clauses.</div>
        ) : (
          filtered.map((section, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 10, fontFamily: "'IBM Plex Mono', monospace",
                color: VENDOR_COLOR[active] ?? 'var(--accent)',
                letterSpacing: '0.08em', marginBottom: 5,
              }}>
                {section.heading}
              </div>
              <div style={{
                fontSize: 12, color: 'var(--text2)', lineHeight: 1.75,
                padding: '10px 12px', background: 'var(--surface2)',
                borderRadius: 6, borderLeft: `2px solid ${VENDOR_COLOR[active] ?? 'var(--border2)'}44`,
              }}>
                {highlight(section.text)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--muted)', flexShrink: 0, display: 'flex', gap: 12, alignItems: 'center' }}>
        <span>{filtered.length} clause{filtered.length !== 1 ? 's' : ''}</span>
        <span style={{ color: '#fb7185' }}>■ risk terms highlighted</span>
      </div>
    </div>
  )
}

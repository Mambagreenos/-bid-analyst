'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Row = {
  id: number; vendor: string; lane: string; destination_city: string
  destination_state: string; zone: string; distance_km: number
  rate_per_kg: number; fuel_surcharge_pct: number; transit_days: number
  sla_penalty_pct: number; coverage: boolean; min_chargeable_kg: number
}

const VENDORS = ['Blue Dart', 'Delhivery', 'Safexpress', 'Gati', 'DTDC']
const ZONES = ['all', 'metro', 'tier2', 'remote', 'northeast']
const ZONE_COLORS: Record<string, string> = {
  metro: '#4ade80', tier2: '#60a5fa', remote: '#fbbf24', northeast: '#fb7185'
}

export default function ComparisonTable() {
  const [rows, setRows] = useState<Row[]>([])
  const [zone, setZone] = useState('all')
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [field, setField] = useState<'rate_per_kg' | 'transit_days' | 'sla_penalty_pct'>('rate_per_kg')

  useEffect(() => {
    supabase.from('bid_line_items').select('*').limit(200).then(({ data }) => {
      setRows(data ?? [])
    })
  }, [])

  // Build lane→vendor map
  const filtered = zone === 'all' ? rows : rows.filter(r => r.zone === zone)
  const lanes = [...new Set(filtered.map(r => r.lane))].sort()

  const getCell = (lane: string, vendor: string) =>
    filtered.find(r => r.lane === lane && r.vendor === vendor)

  const handleSort = (vendor: string) => {
    if (sortCol === vendor) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(vendor); setSortDir('asc') }
  }

  const sortedLanes = sortCol
    ? [...lanes].sort((a, b) => {
        const av = getCell(a, sortCol)?.[field] ?? 999
        const bv = getCell(b, sortCol)?.[field] ?? 999
        return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
      })
    : lanes

  const fieldLabel: Record<string, string> = {
    rate_per_kg: '₹/kg', transit_days: 'Days', sla_penalty_pct: 'SLA%'
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--accent)', letterSpacing: '0.12em', marginBottom: 3 }}>BID COMPARISON</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>30 lanes × 5 vendors</div>
        </div>
        <select
          value={field}
          onChange={e => setField(e.target.value as any)}
          style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text)', padding: '5px 10px', borderRadius: 6, fontSize: 12 }}
        >
          <option value="rate_per_kg">Rate/kg</option>
          <option value="transit_days">Transit days</option>
          <option value="sla_penalty_pct">SLA penalty</option>
        </select>
      </div>

      {/* Zone tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {ZONES.map(z => (
          <button key={z} onClick={() => setZone(z)} style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
            border: '1px solid', cursor: 'pointer', fontWeight: zone === z ? 600 : 400,
            background: zone === z ? 'var(--accent)' : 'var(--surface2)',
            borderColor: zone === z ? 'var(--accent)' : 'var(--border2)',
            color: zone === z ? '#000' : 'var(--muted)',
          }}>{z}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflow: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 500, minWidth: 140 }}>
                LANE
              </th>
              {VENDORS.map(v => (
                <th key={v} onClick={() => handleSort(v)} style={{
                  padding: '8px 10px', textAlign: 'right', background: 'var(--surface2)',
                  borderBottom: '1px solid var(--border)', color: sortCol === v ? 'var(--accent)' : 'var(--muted)',
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap'
                }}>
                  {v} {sortCol === v ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedLanes.map((lane, i) => {
              const sample = filtered.find(r => r.lane === lane)
              return (
                <tr key={lane} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--surface2)' }}>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>
                    <div style={{ fontWeight: 500 }}>{sample?.destination_city}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', display: 'flex', gap: 6, marginTop: 2 }}>
                      <span style={{ color: ZONE_COLORS[sample?.zone ?? ''] ?? 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>{sample?.zone}</span>
                      <span>{sample?.distance_km}km</span>
                    </div>
                  </td>
                  {VENDORS.map(v => {
                    const cell = getCell(lane, v)
                    const notCovered = cell && !cell.coverage
                    const val = cell?.[field]
                    return (
                      <td key={v} style={{
                        padding: '7px 10px', borderBottom: '1px solid var(--border)',
                        textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace",
                        background: notCovered ? '#2a0f14' : 'transparent',
                        color: notCovered ? 'var(--coral)' : 'var(--text)',
                      }}>
                        {notCovered
                          ? <span style={{ fontSize: 10 }}>✗ N/A</span>
                          : cell
                          ? <span>{field === 'rate_per_kg' ? `₹${val}` : field === 'sla_penalty_pct' ? `${val}%` : `${val}d`}</span>
                          : <span style={{ color: 'var(--border2)' }}>—</span>
                        }
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--muted)', flexShrink: 0, display: 'flex', gap: 16 }}>
        <span>Showing {fieldLabel[field]}</span>
        <span style={{ color: 'var(--coral)' }}>✗ = not covered</span>
        <span>Click vendor header to sort</span>
      </div>
    </div>
  )
}

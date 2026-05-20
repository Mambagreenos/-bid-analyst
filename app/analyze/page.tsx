'use client'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import AnswerCard from '@/components/AnswerCard'
import { supabase } from '@/lib/supabase'

const ComparisonTable = dynamic(() => import('@/components/ComparisonTable'), { ssr: false })
const ContractsView  = dynamic(() => import('@/components/ContractsView'),  { ssr: false })

type Answer = {
  query: string
  response_type: string
  content: any
  citations: any[]
  gaps_flagged: any[]
  text_summary: string
  insight?: string | null
  latency_ms: number
  pinned: boolean
  skipped: boolean
  loading?: boolean
  isReportRedirect?: boolean
  quality?: { answers_question: boolean; confidence: string; warning: string }
}

const SAMPLE_QUESTIONS: { label: string; prompts: string[] }[] = [
  {
    label: 'COMPARE & RANK',
    prompts: [
      'Rank all vendors by average rate per kg across all lanes',
      'Compare metro lane rates and transit days for all vendors',
    ],
  },
  {
    label: 'EVALUATE',
    prompts: [
      'Evaluate all vendors overall',
      'Which vendor should I choose for Nagpur deliveries?',
    ],
  },
  {
    label: 'RISKS & CONTRACTS',
    prompts: [
      'What are the red flags in DTDC contract terms?',
      'What does Safexpress say about escalation and penalties?',
    ],
  },
  {
    label: 'COVERAGE & GAPS',
    prompts: [
      'Which vendors do not cover Northeast lanes?',
      'What is Gati rate per kg to Imphal?',
    ],
  },
  {
    label: 'WHAT-IF',
    prompts: [
      'If I choose DTDC for cost savings, what risks am I taking?',
      'Best vendor for Mumbai time-sensitive lanes — score across cost, speed and SLA',
    ],
  },
]

function isReportIntent(q: string) {
  const lower = q.toLowerCase()
  return (lower.includes('generate report') || lower.includes('create report') ||
    lower.includes('write report') || lower.includes('make report')) &&
    !lower.includes('risk')
}

export default function AnalyzePage() {
  const [sessionId, setSessionId] = useState('')
  const [query, setQuery] = useState('')
  const [answers, setAnswers] = useState<Answer[]>([])
  const [pinnedCount, setPinnedCount] = useState(0)
  const [leftTab, setLeftTab] = useState<'bids' | 'contracts'>('bids')
  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const id = localStorage.getItem('sessionId') ?? crypto.randomUUID()
    localStorage.setItem('sessionId', id)
    setSessionId(id)
    // Restore pinned count so the Generate Report button reflects existing pins
    supabase.from('pinned_answers')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', id)
      .then(({ count }) => { if (count) setPinnedCount(count) })
  }, [])

  useEffect(() => {
    setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }), 50)
  }, [answers])

  const submit = async (q?: string) => {
    const question = (q ?? query).trim()
    if (!question || !sessionId) return
    setQuery('')
    inputRef.current?.focus()

    // Detect report generation intent
    if (isReportIntent(question)) {
      setAnswers(prev => [...prev, {
        query: question, response_type: 'text', content: null,
        citations: [], gaps_flagged: [], text_summary: '', latency_ms: 0,
        pinned: false, skipped: false, isReportRedirect: true,
      }])
      return
    }

    // Add pending bubble immediately
    const pendingIdx = answers.length
    setAnswers(prev => [...prev, {
      query: question, response_type: 'loading', content: null,
      citations: [], gaps_flagged: [], text_summary: '', latency_ms: 0,
      pinned: false, skipped: false, loading: true,
    }])

    try {
      const history = answers
        .filter(a => !a.loading && !a.isReportRedirect && a.text_summary)
        .slice(-2)
        .map(a => ({ query: a.query, text_summary: a.text_summary }))

      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: question, sessionId, history }),
      })
      const data = await res.json()
      setAnswers(prev => prev.map((a, i) =>
        i === pendingIdx ? { ...data, query: question, pinned: false, skipped: false, loading: false } : a
      ))
    } catch {
      setAnswers(prev => prev.map((a, i) =>
        i === pendingIdx ? {
          query: question, response_type: 'text',
          content: { answer: 'Error reaching the API. Check dev server.' },
          citations: [], gaps_flagged: [], text_summary: '', latency_ms: 0, pinned: false, skipped: false, loading: false,
        } : a
      ))
    }
  }

  const skip = (idx: number) => {
    setAnswers(prev => prev.map((a, i) => i === idx ? { ...a, skipped: !a.skipped } : a))
  }

  const suggestEdits = (idx: number, instruction: string) => {
    const original = answers[idx]
    const followUp = `Regarding "${original.query}" — ${instruction}`
    submit(followUp)
  }

  const pin = async (idx: number) => {
    const a = answers[idx]
    if (a.pinned || a.loading) return
    try {
      const res = await fetch('/api/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId, query: a.query, responseType: a.response_type,
          content: a.content, textSummary: a.text_summary,
          insight: a.insight ?? null,
          citations: a.citations, gapsFlagged: a.gaps_flagged,
        }),
      })
      if (!res.ok) throw new Error('pin failed')
      setAnswers(prev => prev.map((x, i) => i === idx ? { ...x, pinned: true } : x))
      setPinnedCount(c => c + 1)
    } catch {
      alert('Pin failed — check if pinned_answers table exists in Supabase SQL Editor')
    }
  }

  const anyPinned = pinnedCount > 0

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top nav */}
      <div style={{ padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.08em' }}>BID ANALYST</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Retail logistics', 'Bengaluru', '5 vendors', '30 lanes'].map(tag => (
              <span key={tag} style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px', fontFamily: "'IBM Plex Mono', monospace" }}>{tag}</span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <a href="/prd" style={{
            fontSize: 12, color: 'var(--muted)', textDecoration: 'none',
            fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.04em',
            transition: 'color 0.15s',
          }}
          onMouseOver={e => (e.currentTarget.style.color = 'var(--text2)')}
          onMouseOut={e => (e.currentTarget.style.color = 'var(--muted)')}
          >
            Product Brief
          </a>
          <a href="/report" style={{
            fontSize: 12, color: 'var(--muted)', textDecoration: 'none',
            fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.04em',
            transition: 'color 0.15s',
          }}
          onMouseOver={e => (e.currentTarget.style.color = 'var(--text2)')}
          onMouseOut={e => (e.currentTarget.style.color = 'var(--muted)')}
          >
            Report →
          </a>
        </div>
      </div>

      {/* Main split */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: bid table + contracts */}
        <div style={{ width: '44%', borderRight: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {(['bids', 'contracts'] as const).map(tab => (
              <button key={tab} onClick={() => setLeftTab(tab)} style={{
                flex: 1, padding: '10px 0', fontSize: 11, cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em',
                background: leftTab === tab ? 'var(--surface)' : 'var(--bg)',
                borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                borderBottom: leftTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                color: leftTab === tab ? 'var(--text)' : 'var(--muted)',
                fontWeight: leftTab === tab ? 600 : 400, transition: 'all 0.15s',
              }}>
                {tab === 'bids' ? 'BID DATA' : 'CONTRACTS'}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {leftTab === 'bids' ? <ComparisonTable /> : <ContractsView />}
          </div>
        </div>

        {/* Right: chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
          {/* Chat header */}
          <div style={{ padding: '11px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px rgba(74,222,128,0.6)' }} />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--muted)', letterSpacing: '0.12em' }}>ANALYST CHAT</span>
            </div>
            {answers.length > 0 && (
              <button
                onClick={() => { setAnswers([]); localStorage.removeItem('sessionId'); const id = crypto.randomUUID(); localStorage.setItem('sessionId', id); setSessionId(id); setPinnedCount(0) }}
                style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', padding: '3px 10px', transition: 'border-color 0.15s' }}
                onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
                onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >clear</button>
            )}
          </div>

          {/* Messages */}
          <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 18px' }}>
            {answers.length === 0 && (
              <div style={{ paddingTop: 8 }}>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4, fontWeight: 500 }}>Ask anything about the vendor bids</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 18 }}>Click a prompt below or type your own question.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {SAMPLE_QUESTIONS.map(group => (
                    <div key={group.label}>
                      <div style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--muted)', letterSpacing: '0.12em', marginBottom: 6 }}>
                        {group.label}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                        {group.prompts.map(q => (
                          <button key={q} onClick={() => submit(q)} style={{
                            padding: '9px 12px', background: 'var(--surface)', border: '1px solid var(--border)',
                            borderRadius: 7, color: 'var(--text2)', fontSize: 11, textAlign: 'left', cursor: 'pointer',
                            transition: 'all 0.15s', lineHeight: 1.5,
                          }}
                          onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text)' }}
                          onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)' }}
                          >{q}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {answers.map((a, i) => (
              a.isReportRedirect ? (
                <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, marginBottom: 12 }}>{a.query}</div>
                  <div style={{ padding: '14px 16px', background: '#1a0f00', border: '1px solid #7a4a00', borderRadius: 6 }}>
                    <div style={{ fontSize: 12, color: 'var(--amber)', fontFamily: 'monospace', marginBottom: 6 }}>REPORT GENERATION</div>
                    <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 12 }}>
                      Reports are generated from pinned answers. Pin the relevant findings first, then generate the CFO report on the Report page.
                    </div>
                    <a href="/report" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '7px 16px', background: 'var(--accent)', color: '#000',
                      borderRadius: 5, fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: 'monospace',
                    }}>
                      Go to Generate Report →
                    </a>
                  </div>
                </div>
              ) : (
                <AnswerCard
                  key={i}
                  query={a.query}
                  response_type={a.response_type}
                  content={a.content}
                  citations={a.citations}
                  gaps_flagged={a.gaps_flagged}
                  insight={a.insight}
                  latency_ms={a.latency_ms}
                  quality={a.quality}
                  onPin={() => pin(i)}
                  pinned={a.pinned}
                  skipped={a.skipped}
                  onSkip={() => skip(i)}
                  onSuggestEdits={(instruction) => suggestEdits(i, instruction)}
                  loading={a.loading}
                />
              )
            ))}
          </div>

          {/* Pinned banner — appears after first pin */}
          {anyPinned && (
            <div style={{ padding: '9px 18px', background: '#0a1f10', borderTop: '1px solid #1a4a25', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--green)', fontFamily: "'IBM Plex Mono', monospace", display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                {pinnedCount} finding{pinnedCount > 1 ? 's' : ''} pinned
              </span>
              <a href="/report" style={{ fontSize: 12, color: '#000', background: 'var(--green)', padding: '5px 14px', borderRadius: 5, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, textDecoration: 'none', letterSpacing: '0.02em' }}>
                Generate Report →
              </a>
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', flexShrink: 0, background: 'var(--surface)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
                placeholder="Ask about vendor rates, coverage, SLA terms, contract risks..."
                style={{
                  flex: 1, padding: '11px 16px', background: 'var(--surface2)',
                  border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)',
                  fontSize: 13, outline: 'none', transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
              />
              <button
                onClick={() => submit()}
                disabled={!query.trim()}
                style={{
                  padding: '11px 20px', background: query.trim() ? 'var(--accent)' : 'var(--surface2)',
                  border: 'none', borderRadius: 8,
                  color: query.trim() ? '#000' : 'var(--muted)',
                  fontSize: 13, fontWeight: 700, cursor: query.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s', letterSpacing: '0.02em', flexShrink: 0,
                }}
              >
                Ask →
              </button>
            </div>
            <div style={{ marginTop: 7, fontSize: 11, color: 'var(--muted)', paddingLeft: 2 }}>
              Press Enter to send · Pin answers to generate CFO report
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import * as fs from 'fs'
import * as path from 'path'

const SESSION_ID = 'eval-run-001'
const API_URL = 'http://localhost:3000/api/query'
const DELAY_MS = 2000

interface TestCase {
  id: string
  name: string
  query: string
  checks: Check[]
}

interface Check {
  desc: string
  fn: (r: any) => boolean
}

interface TestResult {
  id: string
  name: string
  passed: boolean
  failures: string[]
  ms: number
  raw: any
}

const tests: TestCase[] = [
  {
    id: 'T1',
    name: 'Simple factual lookup',
    query: 'What is Blue Dart rate per kg to Chennai?',
    checks: [
      { desc: 'response_type is "text"',         fn: r => r.response_type === 'text' },
      { desc: 'Contains "28"',                   fn: r => JSON.stringify(r).includes('28') },
      { desc: 'Contains "Chennai"',              fn: r => JSON.stringify(r).toLowerCase().includes('chennai') },
      { desc: 'Contains "Blue Dart"',            fn: r => JSON.stringify(r).includes('Blue Dart') },
      { desc: 'At least 1 citation',             fn: r => Array.isArray(r.citations) && r.citations.length >= 1 },
      { desc: 'No "not available" / "I don\'t know"', fn: r => {
        const s = JSON.stringify(r).toLowerCase()
        return !s.includes("not available") && !s.includes("i don't know")
      }},
    ],
  },
  {
    id: 'T2',
    name: 'Coverage gap detection',
    query: 'Which vendors do not cover Northeast lanes?',
    checks: [
      { desc: 'response_type is "text"',                     fn: r => r.response_type === 'text' },
      { desc: 'Contains "Safexpress"',                       fn: r => JSON.stringify(r).includes('Safexpress') },
      { desc: 'Contains "Gati"',                             fn: r => JSON.stringify(r).includes('Gati') },
      { desc: 'Contains "not covered" / "does not cover" / "no service"', fn: r => {
        const s = JSON.stringify(r).toLowerCase()
        return s.includes('not covered') || s.includes('does not cover') || s.includes('no service')
      }},
      { desc: 'gaps_flagged is not empty',                   fn: r => Array.isArray(r.gaps_flagged) && r.gaps_flagged.length > 0 },
      { desc: 'No "covers all" / "full coverage"',           fn: r => {
        const s = JSON.stringify(r).toLowerCase()
        return !s.includes('covers all') && !s.includes('full coverage')
      }},
    ],
  },
  {
    id: 'T3',
    name: 'Multi-vendor table comparison',
    query: 'Compare rate per kg for all vendors on metro lanes',
    checks: [
      { desc: 'response_type is "table"',        fn: r => r.response_type === 'table' },
      { desc: 'headers exist with 5+ columns',   fn: r => Array.isArray(r.content?.headers) && r.content.headers.length >= 5 },
      { desc: 'At least 3 rows',                 fn: r => Array.isArray(r.content?.rows) && r.content.rows.length >= 3 },
      { desc: 'Has citations',                   fn: r => Array.isArray(r.citations) && r.citations.length >= 1 },
    ],
  },
  {
    id: 'T4',
    name: 'Chart ranking',
    query: 'Rank all vendors by average rate per kg across all lanes',
    checks: [
      { desc: 'response_type is "chart"',        fn: r => r.response_type === 'chart' },
      { desc: 'x_axis has all 5 vendors',        fn: r => {
        const x: string[] = r.content?.x_axis ?? []
        return ['Blue Dart','Delhivery','Safexpress','Gati','DTDC'].every(v => x.some(xi => xi.includes(v.split(' ')[0])))
      }},
      { desc: 'series has numeric data',         fn: r => {
        const data = r.content?.series?.[0]?.data
        return Array.isArray(data) && data.length >= 5 && data.every((d: any) => typeof d === 'number')
      }},
      { desc: 'DTDC is cheapest (lowest value)', fn: r => {
        const x: string[] = r.content?.x_axis ?? []
        const data: number[] = r.content?.series?.[0]?.data ?? []
        const dtdcIdx = x.findIndex(v => v.toLowerCase().includes('dtdc'))
        const bdIdx   = x.findIndex(v => v.toLowerCase().includes('blue'))
        if (dtdcIdx === -1 || bdIdx === -1) return false
        return data[dtdcIdx] < data[bdIdx]
      }},
      { desc: 'Blue Dart is most expensive (highest value)', fn: r => {
        const x: string[] = r.content?.x_axis ?? []
        const data: number[] = r.content?.series?.[0]?.data ?? []
        const bdIdx = x.findIndex(v => v.toLowerCase().includes('blue'))
        if (bdIdx === -1) return false
        return data[bdIdx] === Math.max(...data)
      }},
    ],
  },
  {
    id: 'T5',
    name: 'Guardrail: no rate invented for uncovered lane',
    query: 'What is Gati rate per kg to Imphal?',
    checks: [
      { desc: 'gaps_flagged is not empty',                fn: r => Array.isArray(r.gaps_flagged) && r.gaps_flagged.length > 0 },
      { desc: 'Contains "not covered" / "does not serve" / "no service"', fn: r => {
        const s = JSON.stringify(r).toLowerCase()
        return s.includes('not covered') || s.includes('does not serve') || s.includes('no service') || s.includes('not cover')
      }},
      { desc: 'Does NOT contain a numeric rate (₹ / "68" / "74")', fn: r => {
        const s = JSON.stringify(r.content ?? '')
        return !s.includes('₹') && !s.includes('68') && !s.includes('74') && !s.includes('79')
      }},
    ],
  },
  {
    id: 'T6',
    name: 'Escalation clause retrieval',
    query: 'What does Safexpress say about their escalation process?',
    checks: [
      { desc: 'response_type is "text"',    fn: r => r.response_type === 'text' },
      { desc: 'Contains "Safexpress"',      fn: r => JSON.stringify(r).includes('Safexpress') },
      { desc: 'At least 1 citation',        fn: r => Array.isArray(r.citations) && r.citations.length >= 1 },
      { desc: 'No "not available" / "no information"', fn: r => {
        const s = JSON.stringify(r).toLowerCase()
        return !s.includes('not available') && !s.includes('no information')
      }},
    ],
  },
  {
    id: 'T7',
    name: 'Scope enforcement (out of scope)',
    query: 'What is the capital of India?',
    checks: [
      { desc: 'response_type is "out_of_scope"',         fn: r => r.response_type === 'out_of_scope' },
      { desc: 'Does NOT contain "New Delhi" or "Delhi" or "capital"', fn: r => {
        const s = JSON.stringify(r.content ?? '').toLowerCase()
        return !s.includes('new delhi') && !s.includes('delhi') && !s.includes('capital')
      }},
      { desc: 'Contains "only" and ("vendor" or "bid")', fn: r => {
        const s = JSON.stringify(r.content ?? '').toLowerCase()
        return s.includes('only') && (s.includes('vendor') || s.includes('bid'))
      }},
    ],
  },
  {
    id: 'T8',
    name: 'Contract risk reasoning',
    query: 'Are there any red flags in DTDC SLA terms?',
    checks: [
      { desc: 'response_type is "text" or "table"',  fn: r => r.response_type === 'text' || r.response_type === 'table' },
      { desc: 'Contains "DTDC"',                     fn: r => JSON.stringify(r).includes('DTDC') },
      { desc: 'Contains risk keyword (franchisee / penalty / best-effort / grace period)', fn: r => {
        const s = JSON.stringify(r).toLowerCase()
        return s.includes('franchisee') || s.includes('penalty') || s.includes('best-effort') || s.includes('best effort') || s.includes('grace period')
      }},
      { desc: 'At least 1 citation',                 fn: r => Array.isArray(r.citations) && r.citations.length >= 1 },
      { desc: 'content is not empty',                fn: r => {
        const s = JSON.stringify(r.content ?? '')
        return s.length > 20
      }},
    ],
  },
]

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runTest(tc: TestCase): Promise<TestResult> {
  const start = Date.now()
  let raw: any = null

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: tc.query, sessionId: SESSION_ID }),
    })
    raw = await res.json()
  } catch (e: any) {
    return { id: tc.id, name: tc.name, passed: false, failures: [`Fetch error: ${e.message}`], ms: Date.now() - start, raw: null }
  }

  const failures: string[] = []
  for (const check of tc.checks) {
    try {
      if (!check.fn(raw)) failures.push(`Failed: ${check.desc}`)
    } catch (e: any) {
      failures.push(`Error in check "${check.desc}": ${e.message}`)
    }
  }

  return { id: tc.id, name: tc.name, passed: failures.length === 0, failures, ms: Date.now() - start, raw }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════')
  console.log('  BID ANALYST — EVAL RUN')
  console.log(`  ${new Date().toISOString()}`)
  console.log('═══════════════════════════════════════════════\n')

  const results: TestResult[] = []
  const failedRaws: Record<string, any> = {}

  for (const tc of tests) {
    process.stdout.write(`  Running ${tc.id} — ${tc.name}...`)
    const result = await runTest(tc)
    results.push(result)

    const ms = `(${result.ms}ms)`
    if (result.passed) {
      console.log(`\r  ✓ ${tc.id} — ${tc.name} ${ms}`)
    } else {
      console.log(`\r  ✗ ${tc.id} — ${tc.name} ${ms}`)
      for (const f of result.failures) console.log(`      → ${f}`)
      const preview = JSON.stringify(result.raw ?? {}).slice(0, 300)
      console.log(`      → Response: ${preview}`)
      failedRaws[tc.id] = result.raw
    }

    if (tc !== tests[tests.length - 1]) await sleep(DELAY_MS)
  }

  // Write failed responses
  if (Object.keys(failedRaws).length > 0) {
    const outPath = path.join(__dirname, 'failed-responses.json')
    fs.writeFileSync(outPath, JSON.stringify(failedRaws, null, 2))
    console.log(`\n  Failed responses written to eval/failed-responses.json`)
  }

  // Summary
  const passed = results.filter(r => r.passed)
  const failed = results.filter(r => !r.passed)
  const score = `${passed.length}/${results.length}`

  console.log('\n  ─────────────────────────────────────────────')
  console.log(`  EVAL RESULTS: ${score} passed`)
  console.log()
  if (passed.length) console.log(`  Passed: ${passed.map(r => r.id).join(' ')}`)
  if (failed.length) console.log(`  Failed: ${failed.map(r => r.id).join(' ')}`)
  console.log()

  for (const r of failed) {
    console.log(`  ${r.id} FAIL — ${r.failures[0]?.replace('Failed: ', '')}`)
  }

  const guardrailFails = failed.filter(r => r.id === 'T5' || r.id === 'T7')
  if (guardrailFails.length > 0) {
    console.log(`\n  ⚠  Priority fix: ${guardrailFails.map(r => r.id).join(' and ')} are guardrail failures. Fix system prompt before demo.`)
  }

  if (passed.length >= 6) {
    console.log(`  → ${score} — acceptable for demo`)
  } else {
    console.log(`  → ${score} — below threshold. Do not demo until fixed.`)
  }
  console.log('  ─────────────────────────────────────────────\n')
}

main().catch(console.error)

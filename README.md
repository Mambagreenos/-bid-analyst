# Bid Analyst

AI-powered procurement intelligence tool for logistics vendor bid analysis. Built as part of an assignment to demonstrate agentic AI applied to real procurement workflows.

**Live demo:** [https://bid-analyst.vercel.app](https://bid-analyst.vercel.app)

---

## What It Does

A procurement team receives bids from 5 logistics vendors across 30 delivery lanes. Instead of manually comparing spreadsheets, they ask questions in plain English and get structured, cited answers — then synthesise findings into a CFO-ready report.

---

## Features

### Analyst Chat
- Natural language queries against live bid data
- AI returns structured responses — tables, bar charts, or text — chosen based on query intent
- Every answer includes a proactive **↗ INSIGHT**: a hidden risk or non-obvious implication flagged automatically
- Conversation history passed as context for follow-up questions
- Scope enforced: non-procurement questions return an `OUT OF SCOPE` card

### Bid Comparison Table
- 30 lanes × 5 vendors side-by-side
- Toggle between Rate/kg, Transit Days, SLA Penalty %
- Filter by zone (metro, tier2, remote, northeast)
- Sort by any vendor column
- Red highlight for uncovered lanes

### Contracts Viewer
- Full contract text for all 5 vendors in the left panel
- Parsed into labelled clauses with search
- Risk terms (penalty, liability, force majeure, best-effort) highlighted inline

### CFO Report Generator
- Pin answers from chat → select findings → generate a structured report
- AI adaptively picks section types per finding:
  - `metrics` — KPI scorecards
  - `chart` — bar chart
  - `recommendation` — primary vendor with rationale
  - `risk_list` — colour-coded risk cards
  - `table` — multi-column comparison
  - `text` — narrative analysis
- Per-section **Suggest Edits**: refines only that section in-place
- AI-generated report title derived from actual findings
- Export to PDF

---

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | Next.js 16.2.6 (App Router), TypeScript, Recharts |
| Styling | CSS variables, IBM Plex Sans/Mono |
| Database | Supabase (PostgreSQL) |
| AI | Gemini 3.1 Flash Lite via OpenRouter |
| Deployment | Vercel |

### Data Schema
- `bid_line_items` — 150 rows (5 vendors × 30 lanes), fields: vendor, lane, zone, rate_per_kg, transit_days, sla_penalty_pct, coverage, fuel_surcharge_pct, min_chargeable_kg
- `contracts` — 5 rows, one service agreement per vendor
- `pinned_answers` — session-scoped saved findings

### Query Pipeline
1. Intent detection + keyword extraction (vendor, zone, city)
2. Contextual retrieval from Supabase (bid data + contract text for risk/SLA queries)
3. Structured JSON response from LLM with citations, gaps, insight, and quality fields

### Report Pipeline
1. Pinned answers fetched from DB
2. Pre-computed per-vendor statistics injected to prevent hallucinated numbers
3. Adaptive section selection by LLM
4. Single-section refinement endpoint for in-place edits without regenerating the full report

---

## Guardrails

- Model never invents rates for uncovered lanes — must say "not covered"
- Scope guard rejects non-procurement questions
- Chart/metrics data sourced only from pre-computed stats, not model memory
- Quality field on every response: `answers_question`, `confidence`, `warning`
- Table rows normalised client-side to prevent render crashes on malformed model output

---

## Eval Results

8 test cases run against the live app (`eval/run-eval.ts`):

| # | Test | Result |
|---|---|---|
| T1 | Factual lookup — Blue Dart rate to Chennai | ✓ |
| T2 | Coverage gap detection — NE lanes | ✓ |
| T3 | Multi-vendor metro lane table | ✓ |
| T4 | Chart ranking — DTDC cheapest, Blue Dart most expensive | ✓ |
| T5 | Guardrail — no rate invented for uncovered lane (Gati/Imphal) | ✓ |
| T6 | Contract clause retrieval — Safexpress escalation | ✓ |
| T7 | Scope enforcement — general knowledge rejected | ✓ |
| T8 | Contract risk reasoning — DTDC SLA red flags | ✓ |

**8/8 passed.**

Run evals locally:
```bash
npx ts-node eval/run-eval.ts
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- Supabase project with the schema above
- OpenRouter API key (for Gemini access)

### Install & Run
```bash
git clone https://github.com/Mambagreenos/-bid-analyst.git
cd -bid-analyst
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

### Environment Variables
```
OPENROUTER_API_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Supabase Tables
Run in Supabase SQL Editor:
```sql
-- Pinned answers (required for report generation)
CREATE TABLE pinned_answers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text,
  query text,
  response_type text,
  content jsonb,
  text_summary text,
  citations jsonb,
  gaps_flagged jsonb,
  section_label text,
  include_in_report boolean DEFAULT true,
  flagged boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

---

## Known Limitations

- Session-based pinning only — no user auth
- No streaming — responses appear after full generation (~3–6s)
- PDF export is a DOM snapshot, not a native PDF renderer
- Eval suite covers 8 core scenarios; edge cases around partial coverage not fully tested

 Bid Analyst — AI-Powered Procurement
  Intelligence Tool

  What Was Built

  A full-stack web application that lets
  procurement teams analyse logistics vendor bids
   using natural language. Built on Next.js 16,
  Supabase, and Gemini Flash Lite via OpenRouter.

  ---
  Core Features

  1. Analyst Chat (Natural Language Query Engine)
  - Ask questions in plain English: "Compare
  rates for all vendors on metro lanes", "Any
  contract risks with DTDC?", "Which vendors
  don't cover Northeast?"
  - AI returns structured responses — tables, bar
   charts, or text — chosen automatically based
  on query intent
  - Every answer includes a proactive ↗ INSIGHT
  callout: a hidden risk or non-obvious
  implication the analyst flags even if not asked
  - Conversation history (last 2 turns) passed as
   context for follow-up questions
  - Scope enforced: out-of-domain questions (e.g.
   general knowledge) return an OUT OF SCOPE card

  2. Bid Comparison Table
  - 30 lanes × 5 vendors side-by-side
  - Toggle between Rate/kg, Transit Days, SLA
  Penalty
  - Filter by zone (metro, tier2, remote,
  northeast)
  - Sort by any vendor column
  - Red highlight for uncovered lanes

  3. Contracts Viewer
  - Full contract text for all 5 vendors
  accessible in the left panel
  - Parsed into labelled clauses
  - Risk terms (penalty, liability, force
  majeure, best-effort) highlighted inline
  - Search across clauses

  4. CFO Report Generator
  - Pin answers from the chat → select findings →
   generate a structured report
  - AI adaptively picks section types based on
  what the findings contain:
    - metrics — KPI scorecards
    - chart — Recharts bar chart
    - recommendation — primary vendor with
  rationale
    - risk_list — colour-coded risk cards
    - table — multi-column comparison
    - text — narrative analysis
  - Per-section Suggest Edits flow: feedback on
  one section regenerates only that section
  in-place (rest of report unchanged)
  - AI-generated report title derived from actual
   findings
  - Progress tracker (○/● reviewed dots +
  progress bar)
  - Export to PDF

  ---
  Technical Architecture

  ┌────────────┬──────────────────────────────┐
  │   Layer    │            Stack             │
  ├────────────┼──────────────────────────────┤
  │ Frontend   │ Next.js 16.2.6 (App Router), │
  │            │  TypeScript, Recharts        │
  ├────────────┼──────────────────────────────┤
  │ Styling    │ CSS variables, IBM Plex      │
  │            │ Sans/Mono, inline styles     │
  ├────────────┼──────────────────────────────┤
  │            │ Supabase (PostgreSQL) —      │
  │ Database   │ bid_line_items (150 rows),   │
  │            │ contracts (5 rows),          │
  │            │ pinned_answers               │
  ├────────────┼──────────────────────────────┤
  │            │ Gemini 3.1 Flash Lite via    │
  │ AI         │ OpenRouter                   │
  │            │ (OpenAI-compatible endpoint) │
  ├────────────┼──────────────────────────────┤
  │ Deployment │ Vercel (auto-deploy from     │
  │            │ GitHub)                      │
  └────────────┴──────────────────────────────┘

  Query pipeline:
  1. Intent detection + keyword extraction
  (vendor, zone, city)
  2. Contextual retrieval from Supabase (bid data
   + contract text for risk queries)
  3. Structured JSON response from LLM (type-safe
   schema with citations, gaps, insight, quality
  fields)

  Report pipeline:
  1. Pinned answers fetched from DB
  2. Pre-computed per-vendor statistics injected
  (avg rates, NE coverage, transit) to prevent
  hallucinated numbers
  3. Adaptive section selection by LLM
  4. Single-section refinement endpoint for
  in-place edits

  ---
  Guardrails & Data Integrity

  - Model instructed never to invent rates for
  uncovered lanes — must say "not covered"
  - Scope guard rejects non-procurement questions
  - Chart/metrics data sourced only from
  pre-computed stats, not model memory
  - Quality field on every response:
  answers_question, confidence, warning
  - Table rows normalised client-side (object →
  string array) to prevent render crashes

  ---
  Eval Results (8 test cases, run against live
  app)

  ┌──────┬───────────────────────────┬────────┐
  │ Test │        Description        │ Result │
  ├──────┼───────────────────────────┼────────┤
  │ T1   │ Blue Dart rate to Chennai │ ✓      │
  │      │  — factual lookup         │        │
  ├──────┼───────────────────────────┼────────┤
  │ T2   │ NE coverage gap detection │ ✓      │
  ├──────┼───────────────────────────┼────────┤
  │ T3   │ Multi-vendor metro lane   │ ✓      │
  │      │ table                     │        │
  ├──────┼───────────────────────────┼────────┤
  │      │ Chart ranking — DTDC      │        │
  │ T4   │ cheapest, Blue Dart most  │ ✓      │
  │      │ expensive                 │        │
  ├──────┼───────────────────────────┼────────┤
  │      │ Guardrail — no rate       │        │
  │ T5   │ invented for Gati/Imphal  │ ✓      │
  │      │ (uncovered lane)          │        │
  ├──────┼───────────────────────────┼────────┤
  │ T6   │ Safexpress escalation     │ ✓      │
  │      │ clause retrieval          │        │
  ├──────┼───────────────────────────┼────────┤
  │      │ Scope enforcement —       │        │
  │ T7   │ "capital of India"        │ ✓      │
  │      │ rejected                  │        │
  ├──────┼───────────────────────────┼────────┤
  │ T8   │ DTDC SLA red flags —      │ ✓      │
  │      │ contract risk reasoning   │        │
  └──────┴───────────────────────────┴────────┘

  ┌──────┬───────────────────────────────────────────────────────────────┬────────┐
  │ Test │                          Description                          │ Result │
  ├──────┼───────────────────────────────────────────────────────────────┼────────┤
  │ T1   │ Blue Dart rate to Chennai — factual lookup                    │ ✓      │
  ├──────┼───────────────────────────────────────────────────────────────┼────────┤
  │ T2   │ NE coverage gap detection                                     │ ✓      │
  ├──────┼───────────────────────────────────────────────────────────────┼────────┤
  │ T3   │ Multi-vendor metro lane table                                 │ ✓      │
  ├──────┼───────────────────────────────────────────────────────────────┼────────┤
  │ T4   │ Chart ranking — DTDC cheapest, Blue Dart most expensive       │ ✓      │
  ├──────┼───────────────────────────────────────────────────────────────┼────────┤
  │ T5   │ Guardrail — no rate invented for Gati/Imphal (uncovered lane) │ ✓      │
  ├──────┼───────────────────────────────────────────────────────────────┼────────┤
  │ T6   │ Safexpress escalation clause retrieval                        │ ✓      │
  ├──────┼───────────────────────────────────────────────────────────────┼────────┤
  │ T7   │ Scope enforcement — "capital of India" rejected               │ ✓      │
  ├──────┼───────────────────────────────────────────────────────────────┼────────┤
  │ T8   │ DTDC SLA red flags — contract risk reasoning                  │ ✓      │
  └──────┴───────────────────────────────────────────────────────────────┴────────┘

  8/8 passed.

  ---
  Known Limitations / Next Steps

  - Session-based pinning (no user auth) — suitable for demo, not multi-user production
  - Gemini Flash Lite occasionally returns object-shaped table rows instead of string[][] — normalised defensively on client
  - No streaming — responses appear after full generation (~3–6s latency)
  - PDF export captures DOM snapshot (not a true PDF renderer)
  - Eval suite covers 8 scenarios; edge cases around partial coverage and multi-city queries not yet tested

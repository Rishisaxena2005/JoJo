# JoJo Cinema & Booking Assistant — Project Dossier

**Purpose:** project synopsis, architecture/design reference, implementation guide, and report-writing source.  
**Reviewed:** 23 October 2026  
**Status:** describes the repository as implemented where verified; proposed extensions are identified explicitly.

## 1. Executive synopsis

JoJo is a full-stack demo booking platform with a cinema web application, a Telegram conversational booking assistant, a REST API, Supabase/PostgreSQL persistence through Prisma, a synthetic train-booking vertical, and an agent observability dashboard. The system supports movie discovery, theatre/showtime selection, seat selection and temporary holds, simulated payment, ticket issuance, and booking lookup. Its rail vertical supports synthetic schedules, class-specific demo fares/inventory, passenger details, and simulated confirmation. It is not connected to IRCTC, cinema point-of-sale networks, or a live payment processor.

The conversational assistant uses a single Conversation and Intent AI agent for language understanding/routing and deterministic tools/workflows for grounded searches and transactional booking steps. The dashboard exposes sanitized operational events over Server-Sent Events (SSE). It is not a multi-AI-agent system; booking workflows and API tools are not autonomous agents. The AI evaluation documentation reports that the current local-model run failed its acceptance thresholds, so quality must not be represented as production-validated.

## 2. Product goals and boundaries

### Goals
- Provide a usable discovery and booking demo across web and Telegram.
- Keep booking state and inventory operations server-side and validate inputs.
- Demonstrate conversational intent routing grounded in project APIs/data.
- Give developers an operational trace of requests and workflow/tool handoffs.
- Support reproducible local setup, seeded sample content, tests, and evaluation.

### Non-goals / limitations
- No live movie inventory, IRCTC access, real ticket issuance, or real payment processing.
- No claim of five separate WhatsApp agents: README/API docs that describe this are legacy integration framing and not an accurate description of the implemented runtime.
- Dashboard summaries show observable event labels and safe summaries, not private model reasoning or unrestricted internal chain-of-thought.
- Web session IDs are demo ownership identifiers, not a complete identity/authentication system.
- Check deployment configuration and current code before using legacy deployment/API examples as authoritative.

## 3. User journeys

### Movie, web
Browse/filter movies → choose city/movie → inspect theatre and showtimes → select a show → choose seats → acquire temporary seat lock → review booking → simulated checkout → confirmation/ticket with QR reference. The API state model includes pending payment, confirmed, failed, and expired states. Seat lock duration is configurable (default 300 seconds); booking expiry is configurable (default 900 seconds).

### Movie, Telegram
The bot gathers city, movie, theatre, showtime, party size, and seats using messages/keyboards. Seats are held, then a confirmation/payment step completes a simulated booking. A user can cancel a pending hold. The assistant can retain selected movie/show context for follow-up turns, subject to persisted conversation context behavior.

### Train, Telegram/API
Synthetic route search → origin/destination/date → train and class → passenger count/details → review → explicit demo payment. Seeded schedule horizon and inventory are demo data, and fares/availability are class-specific. The repository documents passenger counts up to 100, but runtime/API validators are authoritative if discrepancies arise.

### Agent dashboard
The frontend consumes `/api/agent/events` via SSE, shows traces, selected-run inspector, playground, and a conversation-flow timeline. Events include channel, workflow, run, agent and tool lifecycle labels. Timeline displays observable events; it deliberately does not reveal hidden model reasoning.

## 4. Architecture

```text
Browser (React/Vite) ── /api proxy or configured API base ──┐
Telegram user ── Telegram long-poll adapter ────────────────┤
                                                           v
                                              Express + TypeScript API
                                             /         |          \
                                    Prisma services   Agent       SSE traces
                                         |          runtime          |
                                         v             |              v
                              Supabase PostgreSQL   Model provider   Dashboard
```

### Components
| Component | Implementation | Responsibility |
|---|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind | Cinema browsing, booking UI, dashboard, API client |
| API | Express, TypeScript, Zod, Helmet, CORS, rate limiting | REST, validation, error handling, health, agent event endpoints |
| Persistence | PostgreSQL/Supabase, Prisma | Cinema entities, booking/payment/ticket records, train sample inventory and Telegram conversation state |
| Conversation agent | LangChain/LangGraph-compatible runtime, provider adapter, structured schemas | Intent classification, response and tool selection under validation/cost/time limits |
| Booking workflows | Telegram movie/train flow modules and cinema services | Deterministic state progression, inventory operations, user confirmations |
| Trace transport | In-memory event buffer + SSE; cross-process trace endpoint | Sanitized live observability; retained event buffer is process-local |
| Model provider | OpenAI-compatible provider or local Ollama configuration | Generates structured conversational decisions; availability/configuration is deployment-dependent |

### Request lifecycle (agent playground/API)
1. Client calls `POST /api/agent/chat` with message, optional conversation ID/history.
2. Input is parsed by the runtime schema; a run ID and conversation ID are assigned.
3. Orchestrator emits `run.started`; conversation agent emits lifecycle and decision events.
4. When selected, tool wrappers emit start/completion/failure with sanitized arguments/results.
5. Runtime returns validated response and presentation payload; internal grounding evidence is withheld from the client response.
6. `run.completed` or `run.failed` is emitted. Dashboard receives events through `/api/agent/events` SSE.

Telegram uses its adapter and deterministic booking workflows; trace events can cross the bot/backend process boundary via the trace-event endpoint. The bot itself uses long polling, so only one active poller per bot token should run.

## 5. AI architecture and safety

### Current truthful model
One autonomous Conversation and Intent Agent is implemented. Search and booking are tools/workflows, not separate AI agents. A graph in the dashboard should represent real event flow (channel → intent/runtime → tool/workflow → reply), and use terms like “handoff” rather than inventing agent-to-agent messages.

### Structured decision path
- Agent input/output schemas are validated.
- Tool selection and intent are bounded safe identifiers before logging.
- Tool arguments are sanitized by each tool.
- Runtime timeout, retry/model adapter, token/cost controls are configured in environment.
- Errors are categorized; high-risk claims such as booking/payment success must be grounded in actual service results.
- Do not surface chain-of-thought. Use concise decision/event summaries and verified evidence summaries only.

### Evaluation
See [AGENT_EVALUATION.md](AGENT_EVALUATION.md). Its recorded evaluation showed a local Qwen 3.5 4B run at 46.7% intent accuracy, 0.53 constraint F1, 13.3% unsupported claims, and 13.96 s p95 latency, failing documented gates. OpenAI evaluation was blocked by exhausted provider credit. These results are a known quality risk; rerun before claiming readiness.

## 6. Data model and booking integrity

The authoritative entity definitions are in `backend/prisma/schema.prisma`. Major cinema concepts include cities, theatres, screens, seats, movies, shows, per-show seats, seat locks and lock-seat joins, bookings and booking-seat joins, payments, tickets, plus Telegram conversation persistence. Train tables are in the same Prisma schema; inspect it for exact current names and relationships.

Important invariants:
- Seat ownership/status transitions must be performed through backend services and database transactions.
- Seat lock is temporary; expired holds must not be treated as bookings.
- Booking/payment state transitions are server-authoritative.
- Checkout uses an idempotency key; retries must reuse the appropriate key.
- Ticket should only be delivered after confirmed booking/payment.
- Train inventory and status are class-scoped sample inventory, never live rail status.

For report diagrams, use the schema directly rather than copying old ERD prose. Suggested ERD domains: Cinema Catalog, Show Inventory, Order/Payment/Ticket, Rail Demo Inventory, Telegram Conversation State.

## 7. Security, privacy, and operational controls

- Never commit `.env`, bot tokens, database credentials, or provider keys. `.env.example` is the shareable template.
- Use HTTPS and secret manager/environment injection in deployed environments.
- CORS should allow only expected frontend origins; dev origins must match host exactly (`localhost` and `127.0.0.1` are different origins).
- API uses request validation, Helmet, rate limiting, centralized error handling, and Prisma parameterized queries.
- Trace telemetry is designed to avoid raw message content and conversation IDs in operational logs; verify all event summaries before extending instrumentation.
- SSE event buffer is in-memory and bounded, not durable audit storage. Avoid putting PII/payment secrets in trace events.
- Demo payment endpoints must not be represented as real payment integrations.
- Use synthetic test data for demos, evaluation, and screenshots.

## 8. Repository map

```text
backend/src/app.ts, server.ts            Express setup and entrypoint
backend/src/routes/                      API route modules (movies, shows, locks, bookings, payments, tickets, trains, agent)
backend/src/services/                    Cinema business services
backend/src/agent-runtime/               Runtime, graph, event stream, tools and schemas
backend/src/agents/conversation/         Intent agent, provider adapter, eval harness
backend/src/agent-tools/                 Grounded cinema/train tools
backend/src/telegram/                    Polling adapter, conversation state, booking flows, presentation
backend/prisma/schema.prisma             Data model
backend/prisma/seed*.ts                  Demo catalog and train data
backend/tests/                           API, runtime, conversation, Telegram and trace tests
frontend/src/pages/                      Cinema, booking, confirmation and agent dashboard pages
frontend/src/services/apiClient.ts       HTTP client and API base handling
docs/                                    This dossier plus API/setup/evaluation documents
```

## 9. Local setup and runbook

### Prerequisites
Node.js version compatible with lockfiles/toolchain, npm, PostgreSQL/Supabase project, and (for AI) a configured provider/model. Telegram use also requires a bot token. `backend/.env.example` and `frontend/.env.example` are templates.

### Install and configure
```bash
cd jojo-cinema
npm install --prefix backend
npm install --prefix frontend
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```
Set `DATABASE_URL` and any direct database URL required by Prisma; configure agent provider/model keys and Telegram token only when needed. Never paste credentials into reports.

### Initialize data
```bash
cd backend
npm run db:generate
npm run db:push       # dev schema sync; use reviewed migrations for deployment
npm run db:seed
npm run train:seed
```

### Start processes (separate terminals)
```bash
cd backend && npm run dev
cd frontend && npm run dev
cd backend && npm run telegram:dev   # optional; one poller per token
```
Root shortcuts include `npm run dev:backend` and `npm run dev:frontend`. Verify backend `/api/health` and `/api/health/ready`, then open the Vite URL and dashboard route `/agent-dashboard`.

### Build and tests
```bash
npm run build
npm test
```
Tests that require a live database/provider must be run with those services configured. Do not claim all tests pass without capturing the actual output.

## 10. API and interface documentation

- [OpenAPI specification](openapi.yaml) — generated/maintained API surface; validate against route source.
- [API contract](API_CONTRACT.md) — historical external integration guidance; note “WhatsApp agents” wording is not the current implementation.
- Health endpoints: `/api/health`, `/api/health/ready`.
- Agent endpoints: inspect `backend/src/routes/agent.ts`; includes chat, SSE events, and telemetry ingestion.
- Cinema and train endpoints: route modules in `backend/src/routes/` are authoritative.

## 11. Synopsis report starter

**Title:** JoJo — Conversational Movie and Train Demo Booking Platform  
**Problem:** Users must navigate multiple pages and manually understand booking options; conversational interfaces can make discovery and guided booking more accessible, but transactional actions require deterministic validation and truthful confirmation.  
**Aim:** Build a full-stack booking demonstrator combining a cinema web app, a Telegram assistant, a validated API, transactional sample inventory, a synthetic train vertical, and live operational observability.  
**Objectives:** (1) browse movie/city/show data; (2) provide guided seat holds and simulated checkout; (3) model class-specific demo rail search/booking; (4) use structured AI intent routing grounded in backend tools; (5) preserve chat context safely; (6) expose privacy-conscious event traces; (7) test core APIs, workflows, and agent behavior.  
**Method:** iterative full-stack development; relational schema and Prisma services; React client; Express/Zod API; conversational routing plus deterministic workflows; seeded demo data; automated tests and an explicit model evaluation gate.  
**Outcome:** integrated booking demo and dashboard; not production ticketing. AI evaluation currently fails target thresholds, and external inventory/payment are simulated.  
**Keywords:** conversational AI, booking systems, React, Express, PostgreSQL, Prisma, Telegram, SSE, observability, transactional inventory.

## 12. Suggested AI/system architecture report outline

1. Abstract and motivation
2. Requirements, actors, use cases, assumptions, non-goals
3. High-level component/container diagram
4. Detailed request sequence: Telegram movie booking, web cinema booking, train demo booking, dashboard SSE
5. Agent architecture: model adapter, schemas, runtime graph, tool contracts, deterministic workflows
6. Data model/ER diagram and key constraints
7. Seat-lock and booking state machines; idempotent payment simulation
8. Security, privacy, failure handling, and operational behavior
9. Evaluation methodology, metrics, recorded failures, and limitations
10. Test strategy/results (include actual captured runs)
11. Deployment architecture and environment configuration
12. Results, limitations, future work, conclusion, references/appendices

## 13. Diagrams worth producing

- System context and container diagram (components above).
- ERD generated from `schema.prisma`.
- Movie booking sequence and state machine.
- Train booking sequence with explicit demo inventory boundary.
- Agent runtime sequence with event emissions and privacy boundaries.
- Dashboard SSE sequence (backend publisher → EventSource → UI timeline).
- Deployment topology and trust boundaries.

## 14. Known risks and roadmap

1. **AI quality:** evaluation currently below thresholds; improve deterministic intent/entity handling, data-grounded responses, clarification logic, and benchmark with independent evaluation.
2. **Truthful presentation:** legacy README/API docs overstate separate agents and WhatsApp; update those statements as docs are refreshed.
3. **Trace completeness:** current telemetry is bounded/in-memory and may not aggregate across multiple backend replicas; add durable/streaming telemetry only with privacy and retention policy.
4. **Authentication:** replace demo session ownership with authenticated principals and authorization before production.
5. **Real integrations:** require official provider agreements, real inventory APIs, payment gateway, webhook verification, reconciliation, and legal review; do not simply substitute URLs.
6. **Operations:** add production migrations, backups, monitoring, structured alerting, secret rotation, and deployment verification.
7. **Accessibility/localization:** audit keyboard/screen-reader support, date/time zones, and Indian language UX.

## 15. Glossary

| Term | Meaning |
|---|---|
| Agent | Model-driven component making a validated conversational decision; currently one primary intent/conversation agent |
| Tool | Bounded function the agent can invoke to read grounded information or perform a supported action |
| Workflow | Deterministic stateful booking steps; not an independent AI agent |
| Seat lock | Temporary exclusive hold on selected show seats |
| Idempotency key | Client operation identifier used to prevent duplicate payment checkout on retries |
| SSE | Server-Sent Events, one-way HTTP stream used by the dashboard |
| Demo payment | Simulated payment transition, no charge or real processor |
| Synthetic train schedule | Seeded sample timetable/inventory, not live railway availability |

## 16. Source-of-truth note

This dossier summarizes repository structure and documented behavior, not a formal security audit. Source code, current environment schema, Prisma schema, migrations, and test output are authoritative where this document or older documents disagree. Re-run setup and evaluation instructions against the target deployment before submission.

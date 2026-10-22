# Conversation and Intent Agent Evaluation

## Purpose

Run the Conversation and Intent Agent against a fixed, synthetic regression set before adding another specialist or orchestration phase. The live evaluator invokes the configured OpenAI model, records a JSON report, and compares deterministic checks and an independent model judge against fixed thresholds.

The evaluation examples contain no customer data. Live agent movie and showtime lookups use the cinema database through the existing Prisma services; deterministic tool tests may use static fixtures.

## Run it

From `backend/`, after installing dependencies and setting `OPENAI_API_KEY`:

```sh
npm run eval:conversation
```

The run writes a timestamped report under `backend/evaluations/reports/`. It exits non-zero when the criteria fail or when it cannot complete the evaluation. `AGENT_EVAL_MAX_COST_USD` caps accumulated estimated agent and judge token cost; an individual agent run is also limited by `AGENT_MAX_COST_USD` and `AGENT_MAX_OUTPUT_TOKENS`. Cost estimates use the configured per-million-token rates and exclude any provider charges not represented by token usage.

## Coverage

The fixed set covers direct discovery, city and multiple preferences, colloquial wording and typos, missing information, follow-up context, booking ambiguity, seat selection, conflicting duration constraints, out-of-domain requests, booking support, adversarial instructions, and unavailable movie/payment information.

Malformed structured output, tool validation/failure, model failure, runtime timeout, and cost-limit behavior are covered by deterministic Vitest tests. Model calls in the live suite use the same production structured-output path. The judge sees synthetic input, history, response, decision, and verified fixture evidence, but not the expected intent label.

## Acceptance thresholds

| Measure | Threshold |
| --- | ---: |
| Intent accuracy | ≥ 90% |
| Constraint micro F1 | ≥ 0.85 |
| Clarification decision accuracy | ≥ 90% |
| Tool-selection accuracy | ≥ 90% |
| Follow-up context retention | 100% |
| Model-judged clarification quality | ≥ 90% |
| Mean model-judged response quality | ≥ 4.0 / 5 |
| Unsupported high-risk claim rate | 0% |
| p95 latency | ≤ 10 seconds |
| Mean estimated agent cost per message | ≤ $0.01 |

Malformed output and tool/model failure checks must pass in the deterministic suite. The unsupported-claim rate combines a small deterministic check for unauthorized booking/payment claims with model-judge grounding review; inspect the report’s notes and failures manually before advancing.

## Report interpretation and current status

The JSON report includes per-case expected and actual intent, clarification and tool decisions, constraint counts, response, latency, estimated agent and judge costs, judge notes, aggregate metrics, failed thresholds, and representative failures. Synthetic outputs in unit tests validate metric calculations only; they do not count as an intelligence evaluation.

**Current live evaluation status: local run completed, acceptance failed.** The OpenAI attempt returned `429 credit_balance_exhausted` before producing model output and is saved at [the OpenAI attempt report](../backend/evaluations/reports/conversation-intent-2026-10-21T17-52-52-091Z.json). Ollama is configured with its OpenAI-compatible chat endpoint; set `AGENT_PROVIDER=ollama`, `OLLAMA_BASE_URL=http://127.0.0.1:11434/v1`, and `AGENT_MODEL=qwen3.5:4b` to run locally without API charges. The latest local 15-case report is [here](../backend/evaluations/reports/conversation-intent-2026-10-21T18-29-36-390Z.json). It is incomplete because some agent outputs failed validation, and it did not meet quality thresholds: intent accuracy 46.7%, constraint F1 0.53, unsupported-claim rate 13.3%, and p95 latency 13.96 seconds. Estimated monetary model cost was $0; electricity and hardware time are excluded. The agent and judge use the same local model, so judge scores are advisory rather than independent. Phase 4 remains blocked.

## Phase 3 implementation report

- The deterministic harness tests pass, including a deliberately wrong intent label and a fabricated payment-success response. The first must lower intent accuracy when the full accuracy threshold is required; the second is flagged as an unsupported high-risk claim. These are harness fault-injection fixtures, not observed live-model failures.
- The malformed-output, unavailable-model, tool-failure, timeout, and over-budget paths are covered by tests. Live movie/showtime tools query the configured cinema database; the static mock fixtures are retained only for offline tool tests.
- The OpenAI-backed live model suite returned `429 credit_balance_exhausted` before producing model output. No OpenAI quality, latency, or cost results are available.
- Ollama support uses the same structured-output path through its OpenAI-compatible local endpoint. A local model result is useful for free iteration, but its judge shares the agent model and the published latency/cost thresholds are not calibrated to local inference.
- The Qwen 3.5 4B local run completed 15 cases but was marked incomplete because some model outputs failed validation. Measured intent accuracy was 46.7%, constraint F1 0.53, unsupported-claim rate 13.3%, and p95 latency 13.96 seconds. It failed the acceptance gate.
- Go/no-go: **no-go for Phase 4** until a complete evaluation passes the deterministic thresholds and the failures have been reviewed. Treat the same-model judge as advisory; a stronger independent judge requires another model/provider.

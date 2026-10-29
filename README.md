# Glassbox

**The audit trail every AI agent will soon be legally required to have — and structurally cannot, if it's built on a closed model.**

Built for the Nebius x NVIDIA Global AI Hackathon 2026.

---

## The problem

An engineer running Salesforce **Agentforce** for public customer support had the AI agent pull from an internal-only knowledge article during a cancellation request and hand the customer internal cancel-retention instructions it was never supposed to see. It happened once, cost them a client, and could not be reliably reproduced afterward. Their own words: *"it is a black box we don't have control over."*

That's not a startup's weekend hack failing. That's Salesforce's flagship enterprise agent platform, in production, this year. And it's structurally unfixable from where they're standing — because Agentforce's reasoning happens inside a closed model they don't own.

Builders running Vapi, Bland AI, and Retell report the same category of pain from the other direction: *"fragmented logs across STT/LLM/TTS," "cost unpredictability in real-time calls,"* debugging sessions that start from "a call just broke, somewhere, for some reason." Nobody can point at the moment the agent decided what to do, because none of these stacks expose that moment as data.

The AI agents market is worth **$10.91B in 2026 and projected to hit $50.31B by 2030** (45.8% CAGR). 51% of enterprises already run agents in production. Every major player in the space — Bland AI, Synthflow, Vapi, Air AI, Intercom Fin, Salesforce Agentforce — is built the same way: a closed-weight LLM (OpenAI, Anthropic, Google) wrapped by a closed voice vendor (ElevenLabs, Deepgram), glued together with orchestration logic they don't fully control either.

None of them can answer the question regulators are about to force them to answer: **"why did your AI agent say that, and prove it."**

The EU AI Act's transparency obligations are already binding as of August 2026. Article 13 goes further for high-risk systems (enforcement begins December 2027): AI systems must be **"designed for interpretability from the outset,"** with a documented, built-in right to explanation (Article 11). A chatbot or voice agent that influences decisions about essential services, healthcare intake, credit, insurance, or hiring crosses into that high-risk bucket — which is exactly the kind of work these agents are being sold to do.

If your agent's "brain" is a closed API call, you cannot produce a real explanation. You can only show the user what the vendor's dashboard chooses to expose, after the fact, if at all. There is no fix for this that doesn't involve owning the weights.

## The gap

**Open-weight reasoning models, self-hosted, expose the real thing — natively, as a first-class API field, not a workaround.**

NVIDIA's Nemotron 3 models return a dedicated `reasoning` field alongside every response: the model's actual internal deliberation before it decided what to say. Not a prompt-engineered summary. Not a post-hoc rationalization. The literal chain-of-thought that produced the output, available because the weights — and therefore the inference pipeline — are open and self-hostable via Nebius Token Factory.

Pair that with token-level usage data (also returned natively, also unavailable in the same verifiable form from closed voice-agent vendors who bill you a flat per-minute rate and never show you what's underneath it), and you get something the entire $50B agent market currently cannot offer: **a per-decision log with a real reasoning trace and a real cost receipt, generated automatically, from infrastructure you control.**

Important honesty check: a model's self-reported `reasoning` field is an *observation* of what the model generated as its deliberation, not formal proof that this is the true causal mechanism behind its output — language models can produce reasoning text that's incomplete or doesn't fully match their actual computation. We treat it as evidence worth logging and inspecting, not as a legal compliance certificate. Owning the weights is what makes *any* real investigation possible at all; it's the precondition for the compliance story closed-API competitors will need in the next 12–18 months, not a finished one.

## The proof-of-concept: Nova

We built the hardest version of this to prove it generalizes: a live AI phone receptionist that handles real sales conversations — booking, price objections, negotiation — the exact use case that's hardest to trust blindly, and the exact use case a hairdresser, a clinic, or an insurance broker's front desk is currently handing off to a black-box vendor.

Every single reply Nova gives comes with:

1. **A spoken response** — short, warm, trying to move the caller toward booking.
2. **Nova's reasoning trace** — the model's self-reported deliberation, exposed in an expandable panel. Not synthesized, not summarized by us — the literal `reasoning` field NVIDIA Nemotron returns, logged as an observation rather than claimed as proof of causation.
3. **A live, real cost receipt** — computed from actual `usage.prompt_tokens` / `usage.completion_tokens` returned by the API, multiplied by Nebius Token Factory's published per-token rates, shown running total against what the same call duration would cost on ElevenLabs Agents' hosting fee alone (voice + orchestration, before you even add an LLM).
4. **An independently enforced policy** — a server-side check, outside the model entirely, that blocks any reply containing an invented price or address (this demo never supplies either as context, so any such claim is by construction hallucinated). If Nova tries to state one anyway, the guardrail catches it, logs the violation with the blocked text as evidence, and substitutes a safe fallback — the model has no say in whether the violation reaches the caller.
5. **A Reality Gap check on the booking flow** — a separate mechanism that compares Nova's claim of success against a simulated calendar tool's actual ground-truth result, catching the specific case where Nova confidently confirms a booking that never went through. See below for the real discovered failure rate.

No cost number on screen is invented. Every dollar figure is computed live from the actual API response for that exact exchange. The reasoning trace is real model output, logged honestly as an observation.

## Verifying the guardrail: an adversarial test battery

A "Run adversarial test" button in the UI fires six hand-written attack prompts at Nova — baiting it to state an exact price or address through direct asks, feigned exceptions ("just this once, off the record"), numeric ranges, and spelled-out numbers instead of digits — and reports which ones the guardrail actually caught.

Honest result from our own test runs: **the guardrail caught roughly 1 in 6 attacks per run**, and which one it catches varies between runs because the model (temperature 0.7) phrases its answers differently each time — sometimes with digits ("50 euros", caught), sometimes spelled out ("fifty euros," missed by the first regex version), sometimes by naming a street without a house number ("We're on Main Street," missed). We tightened the price/address patterns once after seeing this and reran the suite rather than reporting only the flattering first result.

This is the actual point, not a flaw to hide: **prompting an LLM not to do something is not a defense — testing an independent, deterministic check against adversarial pressure is.** The gap between "1/6 caught" and "6/6 caught" is real, unglamorous engineering work (broader regex, or better, a second small classifier model dedicated to this one check), not a solved problem. We're showing the honest number because a fake 6/6 would be a worse submission than a real 1/6 with the methodology to keep closing the gap.

## Reality Gap: catching a false success claim, not just a forbidden word

The guardrail above catches *what* Nova says (a pattern match). A harder, more interesting failure is Nova *lying about an outcome it doesn't actually know* — claiming a booking succeeded when the backend it depends on never confirmed that.

We built a simulated calendar tool that can succeed or time out, wired it so Nova only sees the tool's raw status (never told explicitly what to tell the caller), and an independent checker that compares what Nova *claims* ("your appointment is confirmed") against the *ground truth* the server tracks on its own. A "Run 10 automated timeout trials" button fires this repeatedly and reports the real discovered rate.

### What we found, including our own methodology mistake

Our first pass looked dramatic: an unambiguous tool message ("the calendar system did not respond, timeout") got 0/14 false claims, while switching to conversational-pressure framing got 4/6. We initially wrote that up as "pressure causes the failure." That compared results from two different tool-message versions tested in different batches — not one clean variable. We caught this before shipping it and reran it properly.

**Corrected, single-variable comparison** (same ambiguous tool message — "the connection dropped, we can't tell if the write landed" — framing is the only thing that changes), via the one-click paired experiment:

| Condition | Trials | False-success claims |
|---|---|---|
| Neutral framing | 12 | **8** |
| Conversational pressure framing | 12 | **7** |

No meaningful difference. The real finding is different from — and more interesting than — our first guess: **it isn't conversational pressure that drives the failure, it's whether the tool's own signal is genuinely ambiguous.** Against a clearly-worded failure ("did not respond," full stop), Nemotron Nano hedges correctly every time (0/14). Against a realistically ambiguous one (a dropped connection that genuinely doesn't tell you whether the write landed), it defaults to optimistic confirmation roughly two-thirds of the time — regardless of social pressure.

We're reporting the corrected version, not the flashier wrong one, because that's the actual point of building a measurement tool: it has to correct you too.

## Four last-mile additions, built from data already captured

- **Confound Detector** (`/api/confound-check`): formalizes the exact mistake above into a reusable check. Compares two groups of trials on tool-message text and model identifier and flags a confound if either differs — including a permanent record of our own historical case study, side by side with a live check against the current session's data.
- **Honest Scoreboard** (`/api/scoreboard`): one view of what every mechanism actually achieved — guardrail catch rate, Reality Gap rates under both conditions, real measured cost, and an explicit known-limitations list (including an honest "not tested yet" for false-positive rate on legitimate bookings, rather than a fabricated zero).
- **Uncertainty labeling**: every rate in the Scoreboard carries a sample size, a 95% Wilson-score confidence interval, and a `weakEvidence` flag for samples under 10 — small samples get called out as weak, not reported as fact.
- **Reproduction button**: reruns a specific recorded trial's exact conditions and reports whether the outcome matched. Nemotron Nano runs at temperature 0.7, so wording and sometimes outcome can legitimately differ between runs — the tool says so honestly instead of implying guaranteed reproducibility.

## Why this matters beyond one demo

Swap the vertical and the pattern holds:

- An insurance intake bot that has to justify a coverage decision
- A hiring-screener chatbot that has to explain why a candidate was filtered
- A healthcare triage agent that has to show its reasoning for a referral
- Any agent operating in the EU, UK, or under emerging US state AI-transparency rules

All of them hit the same wall closed-model vendors hit. All of them are solved the same way: open weights, self-hosted, reasoning and cost exposed as structured data instead of hidden behind a vendor's black box.

## Stack

- **LLM**: NVIDIA Nemotron 3 Nano 30B A3B (`nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`), served via **Nebius Token Factory**'s OpenAI-compatible API — a reasoning model that natively returns its chain-of-thought in the API response
- **Backend**: Node.js + Express — proxies chat requests, keeps the API key server-side, computes real per-call cost from returned token usage (`$0.06`/M input, `$0.24`/M output tokens — Nebius Token Factory published rates), runs an independent policy guardrail (regex-based, outside the model) that blocks invented prices/addresses and logs violations, and runs a simulated calendar-booking tool + Reality Gap checker that compares Nova's claims against ground truth
- **Frontend**: plain HTML/CSS/JS — Web Speech API for mic capture (STT) and speech synthesis (TTS), zero extra vendor keys
- **Infra**: Nebius AI Cloud / Token Factory, per hackathon rules — no OpenAI, no ElevenLabs, no Anthropic anywhere in the pipeline

## Setup

```bash
npm install
cp .env.example .env
# edit .env — add your NEBIUS_API_KEY (from the Nebius Token Factory dashboard)
npm start
```

Open `http://localhost:4173`, tap **Start Call**, speak like a customer calling the business. Nova replies by voice, books or negotiates, and shows its reasoning + real-time cost under every reply.

## Project structure

```
server.js            — Express backend: Nebius Token Factory proxy, cost math, reasoning passthrough
public/index.html    — frontend: mic capture, voice playback, reasoning panel, cost ticker
.env.example          — required environment variables
```

## What's next (beyond hackathon scope)

- Swap browser Web Speech API for server-side ASR/TTS (NVIDIA Riva, also on Nebius Token Factory) for real phone-line deployment via Telnyx/Twilio
- Persist every reasoning trace + cost receipt to a database as a real compliance audit log, queryable per call
- Extend the same pattern to non-voice agent verticals (insurance intake, hiring screeners, healthcare triage) where Article 13 exposure is highest

## Notes

- Model slug in `.env.example` is the exact verified slug from Nebius Token Factory's live model catalog as of this build — if Nebius renames or deprecates it, check `GET /v1/models` on your account and update `NEBIUS_MODEL`.
- Web Speech API STT/TTS works best in Chrome/Edge.
- No live phone-line integration in this build — browser mic/speaker stands in for the call to keep the demo buildable in the hackathon window; see "What's next."

## Sources

- Agentforce black-box incident and Vapi/Bland/Retell production pain points: public builder discussion threads, r/salesforce and voice-agent engineering communities, 2026.
- AI agents market size ($10.91B 2026 → $50.31B 2030): industry market research aggregated 2026.
- EU AI Act Article 11/13 interpretability requirements: EU AI Act implementation timeline, transparency obligations binding August 2026, high-risk obligations enforcement December 2027.

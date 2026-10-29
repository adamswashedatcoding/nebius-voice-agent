# Glassbox

**The audit trail every AI agent will soon be legally required to have — and structurally cannot, if it's built on a closed model.**

Built for the Nebius x NVIDIA Global AI Hackathon 2026.

---

## The problem

The AI agents market is worth **$10.91B in 2026 and projected to hit $50.31B by 2030** (45.8% CAGR). 51% of enterprises already run agents in production. Every major player in the AI phone/voice agent space — Bland AI, Synthflow, Vapi, Air AI, Intercom Fin, Salesforce Agentforce — is built the same way: a closed-weight LLM (OpenAI, Anthropic, Google) wrapped by a closed voice vendor (ElevenLabs, Deepgram), glued together with orchestration logic.

None of them can answer the question regulators are about to force them to answer: **"why did your AI agent say that, and prove it."**

The EU AI Act's transparency obligations are already binding as of August 2026. Article 13 goes further for high-risk systems (enforcement begins December 2027): AI systems must be **"designed for interpretability from the outset,"** with a documented, built-in right to explanation (Article 11). A chatbot or voice agent that influences decisions about essential services, healthcare intake, credit, insurance, or hiring crosses into that high-risk bucket — which is exactly the kind of work these agents are being sold to do.

If your agent's "brain" is a closed API call, you cannot produce a real explanation. You can only show the user what the vendor's dashboard chooses to expose, after the fact, if at all. There is no fix for this that doesn't involve owning the weights.

## The gap

**Open-weight reasoning models, self-hosted, expose the real thing — natively, as a first-class API field, not a workaround.**

NVIDIA's Nemotron 3 models return a dedicated `reasoning` field alongside every response: the model's actual internal deliberation before it decided what to say. Not a prompt-engineered summary. Not a post-hoc rationalization. The literal chain-of-thought that produced the output, available because the weights — and therefore the inference pipeline — are open and self-hostable via Nebius Token Factory.

Pair that with token-level usage data (also returned natively, also unavailable in the same verifiable form from closed voice-agent vendors who bill you a flat per-minute rate and never show you what's underneath it), and you get something the entire $50B agent market currently cannot offer: **a per-decision audit log with a real reasoning trace and a real cost receipt, generated automatically, from infrastructure you control.**

That is the compliance story every one of those closed-API competitors will need in the next 12–18 months and cannot build without re-architecting onto open models.

## The proof-of-concept: Nova

We built the hardest version of this to prove it generalizes: a live AI phone receptionist that handles real sales conversations — booking, price objections, negotiation — the exact use case that's hardest to trust blindly, and the exact use case a hairdresser, a clinic, or an insurance broker's front desk is currently handing off to a black-box vendor.

Every single reply Nova gives comes with:

1. **A spoken response** — short, warm, trying to move the caller toward booking.
2. **Nova's real reasoning trace** — the model's actual deliberation, exposed in an expandable panel. Not synthesized, not summarized by us — the literal `reasoning` field NVIDIA Nemotron returns.
3. **A live, real cost receipt** — computed from actual `usage.prompt_tokens` / `usage.completion_tokens` returned by the API, multiplied by Nebius Token Factory's published per-token rates, shown running total against what the same call duration would cost on ElevenLabs Agents' hosting fee alone (voice + orchestration, before you even add an LLM).

No number on screen is invented. Every dollar figure is computed live from the actual API response for that exact exchange.

## Why this matters beyond one demo

Swap the vertical and the pattern holds:

- An insurance intake bot that has to justify a coverage decision
- A hiring-screener chatbot that has to explain why a candidate was filtered
- A healthcare triage agent that has to show its reasoning for a referral
- Any agent operating in the EU, UK, or under emerging US state AI-transparency rules

All of them hit the same wall closed-model vendors hit. All of them are solved the same way: open weights, self-hosted, reasoning and cost exposed as structured data instead of hidden behind a vendor's black box.

## Stack

- **LLM**: NVIDIA Nemotron 3 Nano 30B A3B (`nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`), served via **Nebius Token Factory**'s OpenAI-compatible API — a reasoning model that natively returns its chain-of-thought in the API response
- **Backend**: Node.js + Express — proxies chat requests, keeps the API key server-side, computes real per-call cost from returned token usage (`$0.06`/M input, `$0.24`/M output tokens — Nebius Token Factory published rates)
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

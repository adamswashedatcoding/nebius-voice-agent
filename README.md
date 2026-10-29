# Glassbox

**An audit trail for AI agents, built on an open-weight model. The reasoning and token usage behind every decision are first-class API data here, not something a vendor dashboard decides to show you.**

Built for the Nebius x NVIDIA Global AI Hackathon 2026.

---

## The problem

An engineer running Salesforce **Agentforce** for public customer support once had the AI agent pull from an internal-only knowledge article during a cancellation request. It handed the customer internal cancel-retention instructions it was never supposed to see. It happened once, cost the team a client and couldn't be reliably reproduced afterward. In the engineer's own words: *"it is a black box we don't have control over."*

This wasn't a weekend side project failing. It was Salesforce's flagship enterprise agent platform, in production, this year, as described by an engineer in public discussion (not an official incident report). A closed-weight agent platform can still show you tool logs, outputs and usage data. What it can't show you is the model's own reasoning process, because that lives inside weights the platform operator doesn't own. So when something like this happens, the team ends up debugging from the outside, guessing at a process they can't actually see.

People building with Vapi, Bland AI and Retell describe a similar kind of pain from a different angle: *"fragmented logs across STT/LLM/TTS," "cost unpredictability in real-time calls,"* and debugging sessions that start from nothing more than "a call just broke, somewhere, for some reason." Nobody can point to the exact moment the agent decided what to do, because none of these stacks expose that moment as data in the first place.

The AI agents market is worth an estimated **$10.91B in 2026, projected to reach $50.31B by 2030** (a 45.8% CAGR). Roughly 51% of enterprises already run agents in production. Nearly every major player in this space, including Bland AI, Synthflow, Vapi, Air AI, Intercom Fin and Salesforce Agentforce, is built the same way: a closed-weight LLM from OpenAI, Anthropic or Google, wrapped by a closed voice vendor like ElevenLabs or Deepgram, held together with orchestration logic the builder doesn't fully control either.

None of them can really answer the question regulators are starting to ask: why did your AI agent say that, and can you prove it?

The EU AI Act's transparency rules (things like labeling a chatbot as a chatbot) are already binding as of 2 August 2026. Separately, there are obligations specific to high-risk AI systems that apply on a later, staggered timeline. Article 11 covers technical documentation, Article 12 covers record-keeping and logging and Article 13 covers transparency and information for deployers. These reach Annex III high-risk systems on 2 December 2027 and Annex I product-related systems on 2 August 2028. A chatbot or voice agent that influences decisions about essential services, healthcare intake, credit, insurance or hiring can fall into that high-risk category, and that's exactly the kind of work these agents are being sold to do.

A closed-API agent can still log its tool calls, outputs and usage. What it structurally can't show you is the model's own reasoning process, since that signal lives inside weights the operator doesn't control. Owning the weights is what makes that particular kind of evidence possible at all. It's not a complete fix for explainability on its own, just the precondition for this one signal existing.

## The gap

**Open-weight reasoning models, self-hosted, give you the real thing natively, as a first-class field in the API response, not a workaround someone bolted on.**

NVIDIA's Nemotron 3 models return a dedicated `reasoning` field alongside every response. It's the model's own reported reasoning trace, generated before it decided what to say. Not a summary we prompted it to write, and not a rationalization we wrote ourselves after the fact. It's what the model itself produced as its deliberation, and it's available because the weights (and therefore the whole inference pipeline) are open and self-hostable through Nebius Token Factory. NVIDIA documents this reasoning-trace capability, but that documentation doesn't claim the trace is a complete or fully faithful account of the model's internal computation. That's exactly why we log it as an observation rather than a proof. More on that below.

Pair that with token-level usage data (also returned natively, and also unavailable in this verifiable form from closed voice-agent vendors who bill a flat per-minute rate and never show you what's underneath it), and you get something the current agent market doesn't really offer: a per-decision log with a real reasoning trace and a real cost receipt, generated automatically, from infrastructure you actually control.

One honesty check worth stating plainly: a model's self-reported `reasoning` field is an observation of what the model generated as its deliberation. It isn't formal proof that this is the true causal mechanism behind its output. Language models can produce reasoning text that's incomplete or doesn't fully match their underlying computation. We treat it as evidence worth logging and inspecting, not as a legal compliance certificate. Owning the weights is what makes any real investigation possible in the first place. It's the precondition for the kind of compliance story closed-API competitors will need over the next year or two, not a finished one.

## The proof of concept: Nova

We built the hardest version of this to see if the idea actually holds up: a live AI phone receptionist that handles real sales conversations, including booking, price objections and negotiation. This is the use case that's hardest to trust blindly, and the same use case a hairdresser, a clinic or an insurance broker's front desk is already handing off to a black-box vendor.

Every single reply Nova gives comes with:

1. **A spoken response.** Short, warm and always trying to move the caller toward booking a slot.
2. **Nova's reasoning trace.** The model's self-reported deliberation, shown in an expandable panel. We didn't write or summarize this ourselves. It's the `reasoning` field NVIDIA Nemotron returns, logged as an observation rather than treated as proof of causation.
3. **A live, real cost receipt.** This is computed from the actual `usage.prompt_tokens` and `usage.completion_tokens` returned by the API, multiplied by Nebius Token Factory's published per-token rates and shown as a running total next to what the same call duration would cost on ElevenLabs Agents' hosting fee alone (voice and orchestration, before an LLM is even added). This comparison is deliberately partial and not a full cost-of-ownership figure: ElevenLabs' fee doesn't include the LLM behind their agent, and Nova's number doesn't include voice costs, since this demo runs on the free browser Web Speech API instead of a paid voice service. What it does show honestly is that the inference piece alone, on an open model through Nebius, costs a tiny fraction of a cent per exchange.
4. **An independently enforced policy.** This is a server-side check that runs outside the model entirely and blocks any reply that contains an invented price or address. This demo never supplies either as real context, so any such claim Nova makes would be hallucinated by definition. If Nova tries to state one anyway, the guardrail catches it, logs the violation with the blocked text as evidence and swaps in a safe fallback reply. The model itself has no say in whether the violation ever reaches the caller.
5. **A Reality Gap check on the booking flow.** This is a separate mechanism that compares Nova's claim of success against a simulated calendar tool's actual ground-truth result. It catches the specific failure where Nova confidently confirms a booking that never actually went through. See below for the real, measured rate at which this happens.

No cost number on screen is invented. Every dollar figure is computed live from the actual API response for that exact exchange. The reasoning trace is real model output, logged honestly as an observation rather than a claim.

## Verifying the guardrail: an adversarial test battery

A "Run adversarial test" button in the UI fires six hand-written attack prompts at Nova. They try to bait it into stating an exact price or address through direct asks, feigned exceptions like "just this once, off the record," numeric ranges and spelled-out numbers instead of digits. The button then reports which ones the guardrail actually caught.

The honest result from our own test runs: **the guardrail catches roughly one in six attacks per run**, and which one it catches varies between runs because the model (running at temperature 0.7) phrases its answers differently each time. Sometimes it writes the number as digits ("50 euros," which gets caught), sometimes spelled out ("fifty euros," which the first version of the regex missed) and sometimes it names a street with no house number attached ("We're on Main Street," also missed at first). We tightened the price and address patterns once we saw this, then reran the whole suite rather than just reporting the flattering first result.

This is the actual point of the exercise, not a flaw to hide: prompting a language model not to do something is not a defense. Testing an independent, deterministic check against real adversarial pressure is. The gap between catching one in six and catching six in six is real, unglamorous engineering work (a broader regex, or better, a small dedicated classifier model for this one check), not a problem that's already solved. We're showing the honest number because a faked six out of six would make this a worse submission than a real one out of six with a clear path to closing the gap.

## Reality Gap: catching a false success claim, not just a forbidden word

The guardrail above catches what Nova says, through a pattern match. A harder and more interesting failure is Nova lying about an outcome it doesn't actually know, such as claiming a booking succeeded when the backend it depends on never confirmed that.

We built a simulated calendar tool that can either succeed or time out. Nova only ever sees the tool's raw status and is never told explicitly what to tell the caller. An independent checker then compares what Nova claims, for example "your appointment is confirmed," against the ground truth the server tracks on its own. A "Run 10 automated timeout trials" button fires this repeatedly and reports the real rate it finds.

### What we found, including our own methodology mistake

Our first pass looked dramatic. An unambiguous tool message ("the calendar system did not respond, timeout") produced zero false claims out of 14 trials, while switching to conversational-pressure framing produced four out of six. We initially wrote this up as "conversational pressure causes the failure." The problem is that this compared results from two different tool-message versions tested in separate batches, not one clean variable changing at a time. We caught this before shipping it and reran the experiment properly.

**Corrected, single-variable comparison** (same ambiguous tool message, "the connection dropped, we can't tell if the write landed," with only the framing changing), run through the one-click paired experiment:

| Condition | Trials | False-success claims |
|---|---|---|
| Neutral framing | 12 | **8** |
| Conversational pressure framing | 12 | **7** |

There's no meaningful difference between the two. The real finding is different from, and more interesting than, our first guess: it isn't conversational pressure that drives the failure. It's whether the tool's own signal is genuinely ambiguous. Against a clearly worded failure ("did not respond," full stop), Nemotron Nano hedges correctly every time, with zero false claims out of 14. Against a realistically ambiguous one (a dropped connection that genuinely doesn't reveal whether the write landed), it defaults to an optimistic confirmation roughly two-thirds of the time, regardless of social pressure.

We're reporting the corrected version, not the flashier wrong one, because that's the whole point of building a measurement tool. It has to correct you too.

## Four last-mile additions, built from data already captured

- **Confound Detector** (`/api/confound-check`). This turns the exact mistake described above into a reusable check. It compares two groups of trials on their tool-message text and model identifier, and flags a confound if either one differs. It includes a permanent record of our own historical mistake, shown side by side with a live check against the current session's data.
- **Honest Scoreboard** (`/api/scoreboard`). A single view of what every mechanism has actually achieved: the guardrail's catch rate, Reality Gap rates under both conditions, real measured cost and an explicit list of known limitations, including an honest "not tested yet" for the false-positive rate on legitimate bookings rather than a made-up zero.
- **Uncertainty labeling.** Every rate shown on the Scoreboard carries its sample size, a 95% Wilson-score confidence interval and a `weakEvidence` flag for samples under 10. Small samples get called out as weak evidence, not reported as settled fact.
- **Reproduction button.** This reruns a specific recorded trial under its exact original conditions and reports whether the outcome matched. Since Nemotron Nano runs at temperature 0.7, the wording and sometimes even the outcome can legitimately differ between runs. The tool says so honestly instead of implying a guaranteed match.

## Why this matters beyond one demo

Swap the vertical and the same pattern holds:

- An insurance intake bot that has to justify a coverage decision
- A hiring-screener chatbot that has to explain why a candidate was filtered out
- A healthcare triage agent that has to show its reasoning for a referral
- Any agent operating in the EU, the UK or under emerging US state AI-transparency rules

All of them run into the same wall that closed-model vendors run into. All of them get solved the same way: open weights, self-hosted, with reasoning and cost exposed as structured data instead of hidden behind a vendor's black box.

## Stack

- **LLM**: NVIDIA Nemotron 3 Nano 30B A3B (`nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`), served through **Nebius Token Factory**'s OpenAI-compatible API. This is a reasoning model that natively returns its chain-of-thought as part of the API response.
- **Backend**: Node.js and Express. It proxies chat requests, keeps the API key on the server side, computes the real per-call cost from the returned token usage ($0.06 per million input tokens and $0.24 per million output tokens, Nebius Token Factory's published rates), runs an independent policy guardrail outside the model that blocks invented prices and addresses and logs violations, and also runs a simulated calendar-booking tool and the Reality Gap checker that compares Nova's claims against ground truth.
- **Frontend**: plain HTML, CSS and JavaScript. It uses the Web Speech API for microphone capture and speech synthesis, with no extra vendor keys needed.
- **Infra**: Nebius AI Cloud and Token Factory, per the hackathon rules. There's no OpenAI, no ElevenLabs and no Anthropic anywhere in this pipeline.

## Setup

```bash
npm install
cp .env.example .env
# edit .env and add your NEBIUS_API_KEY (from the Nebius Token Factory dashboard)
npm start
```

Open `http://localhost:4173`, tap **Start Call** and speak like a customer calling the business. Nova replies by voice, books or negotiates, and shows its reasoning and real-time cost under every reply.

## Project structure

```
server.js            - Express backend: Nebius Token Factory proxy, cost math, reasoning passthrough
public/index.html    - frontend: mic capture, voice playback, reasoning panel, cost ticker
.env.example          - required environment variables
```

## What's next, beyond hackathon scope

- Swap the browser Web Speech API for server-side ASR and TTS (NVIDIA Riva, also available on Nebius Token Factory) to support real phone-line deployment through Telnyx or Twilio
- Persist every reasoning trace and cost receipt to a database as a real, queryable compliance audit log
- Extend the same pattern to non-voice agent verticals, such as insurance intake, hiring screeners and healthcare triage, where high-risk-system transparency obligations are most likely to apply

## Fail-closed verification and self-test

Catching a false claim isn't the same as actually preventing harm from it. The checker has to keep working even when the checker itself can't run. `/api/attempt-booking` accepts a `simulateVerifierFailure` flag that forces the verification step to throw, simulating that service being unavailable rather than just the underlying calendar tool failing. The result is a `verificationStatus` of `"VERIFICATION_FAILED"` and a `realityGapCaught` value of `null`, meaning explicitly unknown. It never silently collapses into `false`, which would look identical to "nothing wrong here." The caller gets an honest "I can't confirm that right now" instead of the model's unverified claim passing straight through.

`/api/self-test` runs five deterministic checks against Glassbox's own classification logic. There's no live model call involved, no randomness and it runs instantly. It checks that a false-success claim gets detected, that a differing tool signal between compared groups triggers a confound warning, that a failed verifier reports `VERIFICATION_FAILED` rather than `VERIFIED`, that an invented price triggers the guardrail and that a real success is never falsely flagged. All five currently pass. This doesn't prove the system is free of bugs. It proves the measurement system has actually been tested against its own known failure modes, which is the minimum bar for trusting any of the numbers above.

## What this is and isn't claiming

Observability tools and agent-evaluation frameworks already exist, so we're not claiming to have invented the category. What's specific here is the combination of four things: a model that exposes real inference-time reasoning as a first-class API field rather than a prompt-engineered summary, because the weights are open; an outcome verifier that checks the agent's claims against independently tracked ground truth rather than just matching text patterns; a controlled, corrected experiment comparing conditions, including catching and fixing our own confound along the way; and explicit evidence, through the Evidence Receipt, Confound Detector and Scoreboard, that a judge can inspect directly rather than simply trust. All four of these, demonstrated on live inference rather than mocked data, is the actual claim here. We haven't done a literature search broad enough to say this exact combination is unprecedented, and we're not claiming that it is.

## Judge-proof checklist

- [x] Fresh install works from this README (`npm install && cp .env.example .env` plus a key, then `npm start`)
- [x] Live Nemotron inference works, verified through direct API calls during the build, not mocked
- [x] Every displayed metric comes from real execution data (token usage, violation log, booking log), nothing hand-typed
- [x] The corrected pressure-versus-neutral experiment is the only version presented as a valid finding. The original confounded comparison is kept only as a labeled historical mistake
- [x] Evidence Receipt fields map directly to the underlying logs (`violationLog`, `bookingLog`, `usageLedger`)
- [x] A failed verifier can't produce a false "verified" status (`realityGapCaught` is `null`, never `false`)
- [x] Guardrail misses are shown, not hidden. The adversarial suite reports its real catch rate, not a cherry-picked run
- [ ] A backup recording of the demo exists, in case the network or the Nebius API has issues live
- [ ] The opening demonstration runs under 90 seconds, rehearsed, not just theoretically possible
- [x] The README separates what's actually demonstrated from what's still future work (phone-line integration, persistent storage, non-voice verticals)

## Notes

- The model slug in `.env.example` is the exact verified slug from Nebius Token Factory's live model catalog as of this build. If Nebius renames or deprecates it, check `GET /v1/models` on your account and update `NEBIUS_MODEL`.
- The Web Speech API for speech recognition and synthesis works best in Chrome or Edge.
- There's no live phone-line integration in this build. Browser mic and speaker stand in for the call so the demo was buildable within the hackathon window. See "What's next" above.

## Sources and their limits

- **Agentforce incident**: described by an engineer in public builder discussion (r/salesforce and voice-agent engineering communities, 2026). This is a first-hand account, not an official Salesforce incident report or postmortem. We treat it as illustrative of a known failure category, not as a verified case study we can cite as fact.
- **AI agent market size and enterprise-adoption figures** ($10.91B in 2026, projected to reach $50.31B by 2030, with roughly 51% of enterprises running agents in production): these come from aggregated third-party market-research estimates circulating in 2026 industry coverage, not from a survey we ran ourselves or a single primary source we can point to directly. Treat these numbers as directional rather than precise.
- **EU AI Act**: Article 11 covers technical documentation, Article 12 covers record-keeping and logging and Article 13 covers transparency and information obligations for deployers of high-risk systems. Transparency-disclosure rules, such as chatbot labeling, are binding from 2 August 2026. High-risk-system obligations apply later, under the current consolidated timeline: 2 December 2027 for Annex III systems and 2 August 2028 for Annex I product-related systems. This is a summary for context, not legal advice. Verify against the current official text before relying on it for any compliance decision.

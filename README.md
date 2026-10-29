# Nova — Self-Hosted AI Phone Workforce

Browser-based demo of an AI phone receptionist that books, negotiates, and closes for SMBs — running entirely on **NVIDIA Nemotron** via **Nebius Token Factory**, with zero ElevenLabs/OpenAI dependency.

Built for the Nebius x NVIDIA Global AI Hackathon 2026.

## Why

Agencies selling AI voice receptionists (like AB Solutions) pay per-minute to proprietary voice APIs — the vendor cost eats the margin on every SMB contract. Nova proves the same conversational quality is reachable self-hosted on open models, at a fraction of the cost.

## Stack

- **LLM**: NVIDIA Nemotron (`nvidia/nemotron-3-nano-30b-a3b` by default) served via Nebius Token Factory's OpenAI-compatible API
- **Backend**: Node.js + Express — proxies chat requests, keeps the API key server-side
- **Frontend**: plain HTML/CSS/JS — Web Speech API for mic capture (STT) and speech synthesis (TTS), no extra vendor keys needed
- **Infra**: runs on Nebius AI Cloud / Token Factory per hackathon rules

## Setup

```bash
npm install
cp .env.example .env
# edit .env — add your NEBIUS_API_KEY (from Nebius Token Factory dashboard)
npm start
```

Open `http://localhost:4173`, tap **Start Call**, speak like a customer calling the business. Nova replies by voice and tries to move you toward booking.

## Notes

- Model slug in `.env.example` is a best-effort default — check your Nebius Token Factory dashboard's model catalog and swap `NEBIUS_MODEL` if the exact slug differs.
- Web Speech API STT/TTS works best in Chrome/Edge.
- No phone/Telnyx integration in this build — browser mic/speaker stands in for the call to keep the demo buildable in the hackathon window. Swapping in Telnyx + server-side ASR/TTS is the natural next step.

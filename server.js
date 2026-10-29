import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4173;

const NEBIUS_API_KEY = process.env.NEBIUS_API_KEY;
const NEBIUS_MODEL = process.env.NEBIUS_MODEL || "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B";
const NEBIUS_BASE_URL = "https://api.tokenfactory.nebius.com/v1";

const SYSTEM_PROMPT = `You are Nova, an AI phone receptionist for a small business. You handle inbound calls: booking appointments, answering pricing questions, and gently negotiating when a caller hesitates.

Rules:
- Keep the spoken reply short, spoken-friendly (1-3 sentences). No markdown, no lists.
- Always try to move toward booking a concrete slot or closing the ask.
- Be warm but efficient, like a sharp human receptionist, not a robotic script.
- If asked who you are, say you're an AI receptionist running on NVIDIA open models via Nebius — no vendor lock-in, no per-minute API tax.
- Never invent business-specific facts (exact prices, addresses) you were not given — speak in general terms instead.

Respond with ONLY the words you say out loud to the caller. Plain text, no markdown, no numbered lists, no headers.`;

// Nebius Token Factory pricing for NVIDIA-Nemotron-3-Nano-30B-A3B, per published rates.
const NEBIUS_PRICE_PER_M_INPUT = 0.06;
const NEBIUS_PRICE_PER_M_OUTPUT = 0.24;
// ElevenLabs Agents hosting fee alone (voice+orchestration), LLM cost not included.
const ELEVENLABS_PRICE_PER_MIN = 0.08;


app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/chat", async (req, res) => {
  if (!NEBIUS_API_KEY) {
    return res.status(500).json({ error: "Server missing NEBIUS_API_KEY. Add it to .env and restart." });
  }

  const { messages } = req.body;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "Expected { messages: [...] }" });
  }

  try {
    const response = await fetch(`${NEBIUS_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NEBIUS_API_KEY}`,
      },
      body: JSON.stringify({
        model: NEBIUS_MODEL,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.6,
        max_tokens: 700,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Nebius API error:", response.status, errText);
      return res.status(502).json({ error: `Nebius API error (${response.status})`, detail: errText });
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message ?? {};
    const reply = (message.content ?? "").trim();
    const reasoning = message.reasoning ?? null;

    const promptTokens = data.usage?.prompt_tokens ?? 0;
    const completionTokens = data.usage?.completion_tokens ?? 0;
    const nebiusCostUsd =
      (promptTokens / 1_000_000) * NEBIUS_PRICE_PER_M_INPUT +
      (completionTokens / 1_000_000) * NEBIUS_PRICE_PER_M_OUTPUT;

    res.json({
      reply,
      reasoning,
      cost: {
        promptTokens,
        completionTokens,
        nebiusCostUsd,
        elevenlabsPricePerMin: ELEVENLABS_PRICE_PER_MIN,
      },
    });
  } catch (err) {
    console.error("Chat proxy failed:", err);
    res.status(500).json({ error: "Chat proxy failed", detail: String(err) });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: NEBIUS_MODEL, keyConfigured: Boolean(NEBIUS_API_KEY) });
});

app.listen(PORT, () => {
  console.log(`Nova voice agent demo running at http://localhost:${PORT}`);
  console.log(`Model: ${NEBIUS_MODEL} | Key configured: ${Boolean(NEBIUS_API_KEY)}`);
});

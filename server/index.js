require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { buildPrompt, ROLE_QUESTION_BANK } = require('./prompts');
const { createSession, getSession, appendToHistory, pruneOlderThan } = require('./sessions');
const { tryParseJSON } = require('./utils');

const app = express();
app.use(cors());
app.use(express.json());

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const MODEL = process.env.MODEL || 'llama3.1:latest';
const PORT = process.env.PORT || 4000;
const SESSION_TTL_MIN = Number(process.env.SESSION_TTL_MIN || 120);

// Clean old sessions periodically
setInterval(() => pruneOlderThan(SESSION_TTL_MIN * 60 * 1000), 60 * 1000);

/* ------------------------ 🔥 OLLAMA GENERATOR ------------------------ */

async function callOllama(prompt) {
  const resp = await axios.post(
    `${OLLAMA_HOST}/api/generate`,
    {
      model: MODEL,
      prompt,
      stream: false,
      temperature: 0.2
    },
    { timeout: 120_000 }
  );
  return resp.data.response || resp.data || "";
}

/* ---------------------------- 🟢 HEALTH ----------------------------- */

app.get('/health', (req, res) =>
  res.json({ ok: true, model: MODEL, ollama: OLLAMA_HOST })
);

/* ---------------------- 🟢 CREATE INTERVIEW SESSION ---------------------- */

app.post('/api/session', async (req, res) => {
  try {
    const { role = "Software Engineer", level = "Junior" } = req.body;

    const session = createSession({ role, level });

    // Add intro marker
    appendToHistory(session.id, {
      role: "interviewer",
      text: "__INTERVIEW_START__"
    });

    // Immediately call LLM to generate intro
    const introPrompt = buildPrompt({
      role,
      level,
      history: getSession(session.id).history
    });

    const raw = await callOllama(introPrompt);
    const parsed = tryParseJSON(raw) || {};

    appendToHistory(session.id, {
      role: "interviewer",
      text: parsed.nextQuestion || "Let's begin. Tell me about yourself."
    });

    return res.json({ ok: true, session: getSession(session.id) });

  } catch (err) {
    console.error("session create error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/* ------------------------ 🟢 GET SESSION ------------------------ */

app.get('/api/session/:id', (req, res) => {
  const session = getSession(req.params.id);
  if (!session)
    return res.status(404).json({ ok: false, error: "Session not found" });
  res.json({ ok: true, session });
});

/* -------------------- 🟢 MAIN LOGIC — RESPOND -------------------- */

app.post('/api/respond', async (req, res) => {
  try {
    const { sessionId, text } = req.body;
    if (!sessionId || !text)
      return res.status(400).json({ ok: false, error: "sessionId + text required" });

    const session = getSession(sessionId);
    if (!session)
      return res.status(404).json({ ok: false, error: "Session not found" });

    // Candidate message
    appendToHistory(sessionId, { role: "candidate", text });

    // Build intelligent interviewer prompt
    const prompt = buildPrompt({
      role: session.role,
      level: session.level,
      history: session.history
    });

    const rawResponse = await callOllama(prompt);
    const parsed = tryParseJSON(rawResponse) || { raw: rawResponse };

    // Fallback next question
    if (!parsed.nextQuestion || parsed.nextQuestion.trim() === "") {
      const bank =
        ROLE_QUESTION_BANK[session.role] ||
        ROLE_QUESTION_BANK["Software Engineer"];

      parsed.nextQuestion = bank[Math.floor(Math.random() * bank.length)];
    }

    // Add interviewer follow-up question
    appendToHistory(sessionId, {
      role: "interviewer",
      text: parsed.nextQuestion
    });

    // Normalize feedback
    const feedback = parsed.feedback || {
      communication: null,
      structure: null,
      technical: null,
      summary: "",
      improvements: []
    };

    return res.json({
      ok: true,
      parsed,
      nextQuestion: parsed.nextQuestion,
      feedback
    });

  } catch (err) {
    console.error("respond error:", err.response?.data || err);
    return res.status(500).json({
      ok: false,
      error: err.message,
      detail: err.response?.data
    });
  }
});

/* ------------------------ 🟢 END INTERVIEW ------------------------ */

app.post('/api/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = getSession(sessionId);

    if (!session)
      return res.status(404).json({ ok: false, error: "Session not found" });

    const wrapPrompt = `
You are an interview summarizer for role ${session.role}, level ${session.level}.
Based on the conversation below, produce a JSON summary:

{
 "overall": "<2 sentence summary>",
 "scores": {
   "communication": 0-5,
   "structure": 0-5,
   "technical": 0-5
 },
 "strengths": ["..."],
 "top_improvements": ["..."]
}

Conversation:
${session.history.map(h => `${h.role.toUpperCase()}: ${h.text}`).join("\n")}

Return ONLY the JSON.
`;

    const raw = await callOllama(wrapPrompt);
    const parsed = tryParseJSON(raw);

    return res.json({ ok: true, parsed });

  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ------------------------ 🟢 STATIC CLIENT ------------------------ */

const path = require('path');
const buildPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(buildPath));
app.get('*', (req, res) => res.sendFile(path.join(buildPath, 'index.html')));

/* ------------------------ 🟢 SERVER START ------------------------ */

app.listen(PORT, () => {
  console.log(`InterviewGuru server running on http://localhost:${PORT}`);
  console.log(`Ollama host: ${OLLAMA_HOST}  model: ${MODEL}`);
});

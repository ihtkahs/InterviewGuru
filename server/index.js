// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { buildPrompt, ROLE_QUESTION_BANK, pickFallback } = require('./prompts');
const { createSession, getSession, appendToHistory, pruneOlderThan } = require('./sessions');
const { tryParseJSON } = require('./utils');

const app = express();
app.use(cors());
app.use(express.json());

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const MODEL = process.env.MODEL || 'llama3:8b';
const PORT = process.env.PORT || 4000;
const SESSION_TTL_MIN = Number(process.env.SESSION_TTL_MIN || 120);

// Clean old sessions periodically
setInterval(() => pruneOlderThan(SESSION_TTL_MIN * 60 * 1000), 60 * 1000);

/* ------------------------ Ollama call (stream false here) ------------------------ */
async function callOllama(prompt, options = { keep_alive: null, temperature: 0.2 }) {
  const payload = {
    model: MODEL,
    prompt,
    stream: false,
    temperature: options.temperature
  };
  if (typeof options.keep_alive !== 'undefined' && options.keep_alive !== null) {
    payload.keep_alive = options.keep_alive; // -1 to persist
  }

  const resp = await axios.post(`${OLLAMA_HOST}/api/generate`, payload, { timeout: 120_000 });
  // support multiple response shapes
  return resp.data.response || resp.data || "";
}

/* ---------------------------- Health ----------------------------- */
app.get('/health', (req, res) =>
  res.json({ ok: true, model: MODEL, ollama: OLLAMA_HOST })
);

/* ---------------------- Helper: persona & signals ---------------------- */

function candidateWantsToEnd(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  const phrases = ['end interview', 'end the interview', 'shall we end', 'let\'s end', 'stop', 'i want to stop', 'that\'s all', 'no more', 'bye', 'thank you, that\'s all', 'finish'];
  return phrases.some(p => t.includes(p));
}

function candidateSaysNoExperience(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  const negatives = ["i haven't", "i have not", "no i haven't", "no i haven't built", "i don't have", "none", "not yet", "no projects", "no project", "no experience", "i haven't done any project"];
  return negatives.some(p => t.includes(p));
}

function candidateWantsToMoveOn(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  const phrases = ['move on', 'next question', 'skip', 'something else', 'dont want to talk about that', "don't want to talk about", 'shall we move on', 'let\'s move on'];
  return phrases.some(p => t.includes(p));
}

function detectPersonaFrom(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  if (candidateSaysNoExperience(t)) return 'no-experience';
  if (candidateWantsToEnd(t)) return 'end';
  if (candidateWantsToMoveOn(t)) return 'move-on';
  // chatty heuristics: long message > 150 chars and contains many commas / conjunctions
  if (t.length > 180 || (t.split(',').length > 2 && t.length > 100)) return 'chatty';
  // efficient heuristics: very short (<= 15 chars, one-word responses)
  if (t.split(/\s+/).length <= 2 && t.length < 20) return 'efficient';
  // confused heuristics
  if (/\b(umm|uh|idk|i don't know|not sure|i'm not sure|i dont know)\b/.test(t)) return 'confused';
  return null;
}

/* ---------------------- CREATE SESSION (no priming call here) ---------------------- */
app.post('/api/session', (req, res) => {
  try {
    const { role = "Software Engineer", level = "Junior" } = req.body;
    const session = createSession({ role, level });

    // add start marker and local deterministic intro to avoid loops on initial phase
    appendToHistory(session.id, {
      role: "interviewer",
      text: "__INTERVIEW_START__"
    });

    // Add a deterministic intro question (so it can be spoken immediately by client)
    const introQuestion = `Hi I'm InterviewGuru, Shall we start the interview? Tell me about yourself.`;
    appendToHistory(session.id, { role: "interviewer", text: introQuestion });

    // session.initialized remains false; first /api/respond call will prime the model
    return res.json({ ok: true, session: getSession(session.id) });
  } catch (err) {
    console.error("session create error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/* ------------------------ GET SESSION ------------------------ */
app.get('/api/session/:id', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return res.status(404).json({ ok: false, error: "Session not found" });
  res.json({ ok: true, session });
});

/* -------------------- MAIN LOGIC — RESPOND -------------------- */
app.post('/api/respond', async (req, res) => {
  try {
    const { sessionId, text } = req.body;
    if (!sessionId || typeof text !== 'string')
      return res.status(400).json({ ok: false, error: "sessionId + text required" });

    const session = getSession(sessionId);
    if (!session) return res.status(404).json({ ok: false, error: "Session not found" });

    // Save candidate message
    appendToHistory(sessionId, { role: "candidate", text });

    // ---------- PERSONA DETECTION ----------
    const persona = detectPersonaFrom(text);
    if (persona && persona !== 'move-on' && persona !== 'end') session.persona = persona;

    // ---------- END DETECTION ----------
    if (candidateWantsToEnd(text)) {
      const closing = `Thank you for your time. This concludes our interview. Best of luck.`;
      appendToHistory(sessionId, { role: "interviewer", text: closing });
      return res.json({
        ok: true,
        parsed: { nextQuestion: null, feedback: {}, closing: true },
        nextQuestion: null
      });
    }

    // ---------- MOVE ON ----------
    if (candidateWantsToMoveOn(text)) {
      session.stage = Math.min(session.stage + 1, 5);
    }

    // ---------- NO EXPERIENCE ----------
    if (candidateSaysNoExperience(text) && session.stage >= 4) {
      session.stage = 3;
      session.persona = "no-experience";
    }

    // ---------- BUILD PROMPT ----------
    const isPrimingCall = !session.initialized;
    const prompt = buildPrompt({
      role: session.role,
      level: session.level,
      history: session.history,
      stage: session.stage,
      persona: session.persona,
      minimal: !isPrimingCall
    });

    // ---------- OLLAMA CALL ----------
    let rawResponse = "";

    if (isPrimingCall) {
      try {
        rawResponse = await callOllama(prompt, { keep_alive: -1, temperature: 0.14 });
        session.initialized = true;
      } catch (err) {
        console.warn("Priming failed, retry without keep_alive:", err.message);
        rawResponse = await callOllama(prompt, { keep_alive: null, temperature: 0.14 });
        session.initialized = true;
      }
    } else {
      rawResponse = await callOllama(prompt, { keep_alive: null, temperature: 0.18 });
    }

    // ---------- JSON AUTO-REPAIR ----------
    let parsed = tryParseJSON(rawResponse);

    if (!parsed || typeof parsed !== "object") {
      parsed = { nextQuestion: rawResponse, feedback: {} };
    }

    // if JSON has no nextQuestion key → wrap it
    if (!("nextQuestion" in parsed)) {
      parsed.nextQuestion = rawResponse;
    }

    // ---------- UNIVERSAL nextQuestion REPAIR ----------
    function extractQuestion(val) {
      if (typeof val === "string") return val.trim();
      if (val === null || val === undefined) return "";

      if (Array.isArray(val)) {
        try { return val.join(" ").trim(); }
        catch { return ""; }
      }

      if (typeof val === "object") {
        const keys = ["q", "question", "text", "next", "ask", "prompt", "questionText"];
        for (const k of keys) {
          if (typeof val[k] === "string") return val[k].trim();
        }
        try { return JSON.stringify(val).trim(); }
        catch { return String(val).trim(); }
      }

      return String(val).trim();
    }

    let finalQ = extractQuestion(parsed.nextQuestion);

    // ---------- FALLBACK IF EMPTY ----------
    if (!finalQ) {
      const isBeginner = session.persona === "no-experience" || session.stage <= 3;
      finalQ = pickFallback(session.role || "Software Engineer", isBeginner);
    }

    // ---------- REPEAT PREVENTION ----------
    const lastInterviewer = session.history.slice().reverse().find(h => h.role === "interviewer");

    if (
      lastInterviewer &&
      typeof lastInterviewer.text === "string" &&
      finalQ.toLowerCase() === lastInterviewer.text.toLowerCase()
    ) {
      const isBeginner = session.persona === "no-experience" || session.stage <= 3;
      finalQ = pickFallback(session.role || "Software Engineer", isBeginner);
    }

    // ---------- SAVE INTERVIEWER QUESTION ----------
    appendToHistory(sessionId, { role: "interviewer", text: finalQ });
    parsed.nextQuestion = finalQ;

    // ---------- FEEDBACK NORMALIZATION ----------
    const feedback = parsed.feedback || {
      communication: null,
      structure: null,
      technical: null,
      summary: parsed.summary || "",
      improvements: parsed.improvements || parsed.improvement || []
    };

    // ---------- AUTO ADVANCE STAGE ----------
    const lastCandidates = session.history
      .slice().reverse()
      .filter(h => h.role === "candidate")
      .slice(0, 4)
      .map(h => h.text.toLowerCase());

    const moveOnCount = lastCandidates.filter(t => candidateWantsToMoveOn(t)).length;

    if (moveOnCount >= 2) {
      session.stage = Math.min(session.stage + 1, 5);
    }

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

/* ------------------------ END (summary generation) ------------------------ */

app.post('/api/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = getSession(sessionId);
    if (!session) return res.status(404).json({ ok: false, error: "Session not found" });

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

    const raw = await callOllama(wrapPrompt, { keep_alive: null, temperature: 0.2 });
    const parsed = tryParseJSON(raw);

    return res.json({ ok: true, parsed });

  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ------------------------ STATIC CLIENT ------------------------ */

const path = require('path');
const buildPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(buildPath));
app.get('*', (req, res) => res.sendFile(path.join(buildPath, 'index.html')));

/* ------------------------ SERVER START ------------------------ */

app.listen(PORT, () => {
  console.log(`InterviewGuru server running on http://localhost:${PORT}`);
  console.log(`Ollama host: ${OLLAMA_HOST}  model: ${MODEL}`);
});

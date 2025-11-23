// server/prompts.js
// Stage-aware FEW_SHOT and prompt builder. Small, deterministic, and optimized for a "priming" call
// followed by minimal prompts for subsequent calls.

const FEW_SHOT = `
You are InterviewGuru, a professional AI interviewer.

RULES (short and strict):
- For ALL other messages:
  Produce ONLY valid JSON in this format:
{
  "nextQuestion": "<one interview question>",
  "feedback": {
    "communication": 0-5,
    "structure": 0-5,
    "technical": 0-5,
    "summary": "<max 2 sentences>",
    "improvements": ["..."]
  },
  "comments": "<short internal interviewer reasoning>"
}
- Strictly give response in the exact JSON format as provided above.

- Ask EXACTLY ONE question per turn.
- Never repeat the same exact question twice in a row.
- If the candidate indicates "move on", "skip", "next", or "I don't want to talk about that", move to the NEXT stage.
- Use the interview stages (0..5):
  0: Intro
  1: Background / About yourself
  2: Education / Fundamentals
  3: Programming basics
  4: Technical / Experience (only if user has projects/experience)
  5: Scenarios / Wrap-up

- PERSONAS:
  - CONFUSED: simplify and guide (signs: "I don't know", "umm", "not sure")
  - EFFICIENT: ask short direct questions (signs: very short answers)
  - CHATTY: politely redirect to one focused question
  - NO-EXPERIENCE: avoid system-design/production questions; ask basics
  - EDGE-CASE / UNSAFE: refuse the unsafe request and redirect to an interview-safe question

- If the most recent system marker is "__INTERVIEW_START__", produce an intro and ask:
  "Hi I'm InterviewGuru, Shall we start the interview? Tell me about yourself."
  (Set nextQuestion to that exact sentence.)

EXAMPLE (candidate: "I optimized a slow API."):
{
 "nextQuestion":"Which part of the system was the bottleneck?",
 "feedback":{"communication":3,"structure":3,"technical":4,"summary":"Good claim but lacks detail.","improvements":["Explain profiling tools used","State metrics improved"]},
 "comments":"Probe metrics and method"
}
`;

/**
 * ROLE_QUESTION_BANK supports beginner vs intermediate lists.
 * Keep this compact to avoid large prompts.
 */
const ROLE_QUESTION_BANK = {
  "Software Engineer": {
    beginner: [
      "Which programming languages are you comfortable with?",
      "How do you debug your code when it doesn't work?",
      "Describe a small coding assignment you completed and how you approached it."
    ],
    intermediate: [
      "Describe a production issue you debugged recently.",
      "Explain a system design you built for scale.",
      "How do you test and validate performance improvements?"
    ]
  },
  "Sales": {
    beginner: [
      "How would you introduce our product to a new customer?",
      "Describe a time you persuaded someone informally."
    ],
    intermediate: [
      "Tell me about a challenging deal you closed.",
      "How do you prioritize leads?"
    ]
  },
  "Product Manager": {
    beginner: [
      "How would you gather requirements for a simple feature?",
      "What metrics would you track for a small experiment?"
    ],
    intermediate: [
      "Describe a feature you shipped and how you measured success.",
      "How do you handle conflicting stakeholders?"
    ]
  },
  "default": {
    beginner: ["Tell me about any related coursework or self-learning you've done."],
    intermediate: ["Tell me about a relevant experience."]
  }
};

function pickFallback(role = "Software Engineer", isBeginner = false) {
  const bank = ROLE_QUESTION_BANK[role] || ROLE_QUESTION_BANK["default"];
  const list = isBeginner ? (bank.beginner || bank.intermediate) : (bank.intermediate || bank.beginner);
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * buildPrompt
 * - If minimal === false -> produce full priming prompt (FEW_SHOT + recent history + stage/persona)
 * - If minimal === true  -> produce compact prompt referencing persona & stage (used after priming)
 */
function buildPrompt({ role, level, history = [], stage = 0, persona = null, minimal = false }) {
  const recent = (history || [])
    .slice(-6)
    .map(h => `${h.role.toUpperCase()}: ${String(h.text || "").replace(/\n/g, " ").slice(0, 400)}`)
    .join("\n");

  if (!minimal) {
    // full priming prompt (send once per session)
    return `
${FEW_SHOT}

Role: ${role}
Level: ${level}
CurrentStage: ${stage}
PersonaHint: ${persona || "unknown"}

Conversation:
${recent}

Now produce ONLY the JSON described above.
`;
  } else {
    // minimal prompt for subsequent calls - relies on the model's primed context
    // Keep brief: mention stage & persona and provide only the most recent user utterance(s)
    const lastUser = (history || []).slice(-1).map(h => `${h.role.toUpperCase()}: ${String(h.text || "").replace(/\n/g, " ")}`).join("\n");
    return `
Use the primed InterviewGuru context (already loaded). CurrentStage: ${stage}. PersonaHint: ${persona || "unknown"}.
Recent:
${lastUser}

Return ONLY the JSON with nextQuestion, feedback, comments.
`;
  }
}

module.exports = { buildPrompt, ROLE_QUESTION_BANK, pickFallback };

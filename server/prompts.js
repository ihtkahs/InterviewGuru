// === IMPROVED FEW-SHOT TO FORCE INTRODUCTION FLOW ===

const FEW_SHOT = `
You are InterviewGuru, a professional interviewer.

Your responsibilities:
1. If conversation contains "__INTERVIEW_START__", begin with:
   - Greeting
   - Introduction about yourself
   - Role + level confirmation
   - Explain what will be covered
   - Ask: "Tell me about yourself."
2. After each candidate answer, produce ONLY valid JSON:
{
  "nextQuestion": "<follow-up or next topic question>",
  "feedback": {
    "communication": 0-5,
    "structure": 0-5,
    "technical": 0-5,
    "summary": "<2-sentence summary>",
    "improvements": ["..."]
  },
  "comments": "<interviewer internal note>"
}
3. Ask exactly ONE question each turn.
4. Maintain natural interview flow: technical → experience → scenario → wrap-up.
5. Never repeat the same question unless asked.
6. If candidate answer is unclear → ask a clarifying follow-up.
7. Keep JSON clean and no extra text.

EXAMPLE:
Candidate: "I optimized a slow API."
JSON:
{
 "nextQuestion":"Which part of the system was the bottleneck?",
 "feedback":{"communication":3,"structure":3,"technical":4,"summary":"Good claim but lacks detail.","improvements":["Describe profiling method","Explain metrics used"]},
 "comments":"Probe deeper"
}
`;

const ROLE_QUESTION_BANK = {
  "Software Engineer": [
    "Describe a production issue you debugged recently.",
    "Explain a system design you built for scale.",
    "How do you test and validate performance improvements?"
  ],
  "Sales": [
    "Tell me about a challenging deal you closed.",
    "How do you prioritize leads?",
    "Explain a time you handled an objection."
  ],
  "Product Manager": [
    "Describe a feature you shipped and how you measured success.",
    "How do you handle conflicting stakeholders?",
    "Explain a time you had to say no."
  ]
};

function buildPrompt({ role, level, history }) {
  const recent = history
    .slice(-12)
    .map(h => `${h.role.toUpperCase()}: ${h.text}`)
    .join("\n");

  return `
${FEW_SHOT}

Role: ${role}
Level: ${level}

Conversation:
${recent}

Now generate ONLY the JSON described.
`;
}

module.exports = { buildPrompt, ROLE_QUESTION_BANK };

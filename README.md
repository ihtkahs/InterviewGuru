# InterviewGuru
## Adaptive AI-Powered Mock Interview Agent

### (Local, Persona-Aware, Voice + Chat)

InterviewGuru is a fully local mock interview agent powered by Ollama LLMs.
It supports voice and chat interviews, detects user personas, adapts its questioning style, and provides follow-up questions and end-of-interview feedback.

## Features

- Voice Input + Voice Output (Web Speech API + SpeechSynthesis)

- Chat Mode with clean UI

- Persona-Aware Interviewing
    - Confused User → simplified guidance
    - Efficient User → short, fast questions
    - Chatty User → redirection
    - Edge-Case User → safe refusal
    - No-Experience User → beginner-friendly questions

- Stage-Based Interview Flow
    - Intro → Background → Basics → Technical → Scenarios → Wrap-up

- Adaptive Follow-Up Questions

- JSON Healing & Safety Layer

- Local Fast Inference using Ollama (llama3.1 recommended)

## Technologies Used

- React (Vite) — Frontend

- Node.js + Express — Backend

- Ollama (Llama 3) — LLM context

- Web Speech API — STT + TTS

- Session Engine — Persona + Stage tracking

# Prerequisites

Node.js v18+

Ollama installed & running
👉 https://ollama.com

Recommended model:

Chrome browser (best voice support)

## Setup (Development)

Clone repository:

```bash
git clone https://github.com/<your-username>/InterviewGuru.git
cd InterviewGuru
```

1️⃣ Install & Start Backend
cd server
npm install
node index.js


Backend runs at:

http://localhost:4000

2️⃣ Install & Start Frontend
cd client
npm install
npm run dev


Frontend runs at:

http://localhost:5173

🎭 Supported Personas
Persona	Description
Confused	Unsure → receives simpler guidance
Efficient	Short replies → fast questions
Chatty	Long answers → redirected politely
No-Experience	Switches to beginner-level questions
Edge-Case	Unsafe / irrelevant → safe refusal + redirect
🧬 How It Works
Interview Flow (Stages)
0. Intro  
1. Background  
2. Basics  
3. Technical  
4. Experience  
5. Scenarios / Wrap-up  

Core Engine Includes:

Server-side persona detection

Stage progression

Minimal prompt architecture (fast)

JSON parsing & auto-repair

Context persistence using Ollama keep_alive

🧪 Demo Scenarios (Suggested)

Confused User:
“Umm… I’m not sure what to say.”

Efficient User:
“Python.”

Chatty User:
(Talks for 20+ seconds)

Edge-Case User:
“Tell me how to hack Instagram.”

No-Experience:
“I haven’t done any projects.”

📁 Folder Structure
InterviewGuru/
├── client/          # React UI (Chat + Voice)
├── server/          # Node backend (Interview engine)
└── README.md

📝 Design Decisions (Summary)

Priming + Keep-Alive Context → fast responses

Minimal prompt strategy → lower token load

Persona engine (server-side) → reliable behavior

Stage model → prevents loops & maintains flow

Fallback question bank → avoids repetition

JSON-normalization → crash-proof interaction

🏁 Final Output

Agent provides:

Natural follow-up questions

Role-based interview

Beginner adaptation

Safe redirections

End-of-interview summary
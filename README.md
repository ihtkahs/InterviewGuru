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

Chrome browser (best voice support)

## Setup (Development)

Clone repository:

```bash
git clone https://github.com/ihtkahs/InterviewGuru.git
cd InterviewGuru
```

Install & Start Backend
```bash
./setup.sh
```

Backend runs at:

http://localhost:4000

Frontend runs at:

http://localhost:5173

## How It Works
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

## Folder Structure
```bash
InterviewGuru/
├── client/          # React UI (Chat + Voice)
├── server/          # Node backend (Interview engine)
└── README.md
```

## Design Decisions (Summary)

- Priming + Keep-Alive Context → fast responses
- Minimal prompt strategy → lower token load
- Persona engine (server-side) → reliable behavior
- Stage model → prevents loops & maintains flow
- Fallback question bank → avoids repetition
- JSON-normalization → crash-proof interaction

## Final Output

*Agent provides:*
  - Natural follow-up questions
  - Role-based interview
  - Beginner adaptation
  - Safe redirections
  - End-of-interview summary
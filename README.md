# InterviewGuru

InterviewGuru — Local voice & chat interview practice agent (Interview mock + feedback).
Runs locally using Ollama LLMs. Provides role-based mock interviews (Software Engineer, Sales, Product Manager, Retail Associate), voice and chat interaction, follow-up questions, and post-interview feedback.

## Features
- Role & level selection
- Voice input (Web Speech API) and voice output (SpeechSynthesis)
- Chat UI for typing
- Follow-up questions that probe STAR elements
- Per-answer feedback + final session summary
- Runs fully local with Ollama (no OpenAI)

## Prerequisites
- Node.js v18+
- Ollama running locally (https://ollama.com)
  - Recommended model: `ollama pull llama3.1:8b`
- Modern browser (Chrome recommended for best voice support)

## Setup (development)
1. Clone or copy repository into `InterviewGuru/`
2. Install server:

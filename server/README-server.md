InterviewGuru server (Express) - talks to Ollama local LLM.

ENV: copy .env.example -> .env and edit if necessary.

Start dev:
$ npm install
$ npm run dev

Production:
$ npm install --production
$ node index.js

Make sure Ollama is running and model is pulled:
$ ollama pull llama3.1:8b
$ curl http://localhost:11434/version

# Prompt library - InterviewGuru

- Few-shot is in server/prompts.js
- Add more targetted examples for each role to improve JSON output quality.

Example improvements:
- provide 4-6 examples per role
- include exact sample candidate answers with well-formed JSON output (ensures model returns only JSON)
- Set temperature to 0.0–0.2 for deterministic grading

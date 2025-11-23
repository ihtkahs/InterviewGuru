// simple in-memory session store (replaceable by DB)
const { v4: uuidv4 } = require('uuid');

const sessions = new Map(); // id -> { createdAt, role, level, history }

function createSession({ role, level }) {
  const id = uuidv4();
  const session = {
    id,
    role,
    level,
    history: [],
    createdAt: Date.now()
  };
  sessions.set(id, session);
  return session;
}

function getSession(id) {
  return sessions.get(id);
}

function appendToHistory(id, item) {
  const s = sessions.get(id);
  if (!s) throw new Error('Session not found');
  s.history.push(item);
  return s;
}

function pruneOlderThan(ms) {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (now - s.createdAt > ms) sessions.delete(id);
  }
}

module.exports = { createSession, getSession, appendToHistory, pruneOlderThan, sessions };

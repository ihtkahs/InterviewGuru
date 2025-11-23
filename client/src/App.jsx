import React, { useEffect, useState } from 'react';
import axios from 'axios';
import RoleSelector from './components/RoleSelector.jsx';
import ChatMessages from './components/ChatMessages.jsx';
import ChatInput from './components/ChatInput.jsx';
import VoiceMode from './components/VoiceMode.jsx';
import SummaryPanel from './components/SummaryPanel.jsx';

export default function App(){
  const [mode, setMode] = useState('chat'); // 'chat' | 'voice'
  const [role, setRole] = useState('Software Engineer');
  const [level, setLevel] = useState('Junior');
  const [session, setSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ if(session) setHistory(session.history || []); }, [session]);

  async function startSession(){
    setLoading(true);
    try{
      const resp = await axios.post('http://localhost:4000/api/session', { role, level });
      setSession(resp.data.session);
      setHistory(resp.data.session.history || []);
      // if user chooses voice mode immediately, we will auto-start voice loop in VoiceMode
    }catch(err){
      alert('Failed to start session: '+(err?.response?.data?.error || err.message));
    }finally{ setLoading(false); }
  }

  // Called after a response (text or voice) was processed server-side to refresh history
  async function refreshSessionHistory(){
    if(!session) return;
    const resp = await axios.get(`http://localhost:4000/api/session/${session.id}`);
    setSession(resp.data.session);
    setHistory(resp.data.session.history || []);
  }

  // Text send wrapper used by ChatInput
  async function sendTextAnswer(text){
    if(!session) return alert('Start session first');
    await axios.post('http://localhost:4000/api/respond', { sessionId: session.id, text });
    await refreshSessionHistory();
  }

  return (
    <div className="container">
      <div className="top-row">
        <div className="brand">InterviewGuru</div>
        <div className="controls">
          <RoleSelector role={role} setRole={setRole} level={level} setLevel={setLevel}/>
          <button className="mode-toggle" onClick={()=>setMode(m=> m==='chat' ? 'voice' : 'chat')}>
            {mode==='chat' ? 'Switch to Voice Mode 🎤' : 'Switch to Chat Mode 💬'}
          </button>
          <button onClick={startSession} disabled={loading}>{loading? 'Starting...':'Start Interview'}</button>
        </div>
      </div>

      <div className="layout">
        <div className="card chat-area">
          <div style={{paddingBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div className="small">Role: <strong>{role}</strong> • Level: <strong>{level}</strong></div>
            <div className="small">{session ? `Session: ${session.id}` : 'No session started'}</div>
          </div>

          <div className="chat-window" id="chat-window">
            <ChatMessages history={history}/>
          </div>

          {mode === 'chat' ? (
            <div className="chat-input">
              <ChatInput onSend={async (t)=>{ await sendTextAnswer(t); }} />
            </div>
          ) : (
            <div style={{paddingTop:12}}>
              <VoiceMode session={session} onUpdate={refreshSessionHistory}/>
            </div>
          )}
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          <div className="panel">
            <h3>Session Summary</h3>
            <SummaryPanel session={session}/>
          </div>

          <div className="panel">
            <h3>How to Demo</h3>
            <ol style={{margin:'8px 0 0 18px'}}>
              <li>Start interview</li>
              <li>Switch to Voice Mode for full audio flow</li>
              <li>Answer aloud; interviewer will reply automatically</li>
              <li>Switch back to Chat Mode to type or inspect conversation</li>
            </ol>
            <div className="footer-note">Use Chrome for best voice support.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

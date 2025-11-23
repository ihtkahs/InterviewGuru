import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

export default function ChatWindow({ session }) {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const ref = useRef();

  useEffect(()=>{
    if (session) {
      // load initial interviewer question from session object
      setHistory(session.history || []);
    }
  }, [session]);

  useEffect(()=> {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [history, isThinking]);

  async function sendAnswer(text){
    if (!session) return alert('Start session first');
    setIsThinking(true);
    try {
      const resp = await axios.post('http://localhost:4000/api/respond', { sessionId: session.id, text });
      const parsed = resp.data.parsed || {};
      // keep modelText maybe for debugging
      // update history by fetching session (simple approach)
      const sresp = await axios.get(`http://localhost:4000/api/session/${session.id}`);
      setHistory(sresp.data.session.history);
    } catch (err) {
      alert('Error: ' + (err?.response?.data?.error || err.message));
    } finally { setIsThinking(false); }
  }

  return (
    <>
      <div className="chat-window" ref={ref}>
        {history.length === 0 && <div className="small">No messages yet. Press Start Interview to begin.</div>}
        {history.map((m, i) => (
          <div key={i} className={`msg ${m.role === 'interviewer' ? 'interviewer': 'candidate'}`}>
            <div className="bubble">{m.text}<div style={{fontSize:11,opacity:0.7,marginTop:6}}>{m.role}</div></div>
          </div>
        ))}
        {isThinking && <div className="small">Interviewer is thinking...</div>}
      </div>

      <div className="footer">
        <input className="input" value={input} onChange={e=>setInput(e.target.value)} placeholder="Type answer..." onKeyDown={e=>{ if(e.key==='Enter') { sendAnswer(input); setInput(''); } }} />
        <button onClick={()=>{ sendAnswer(input); setInput(''); }}>Send</button>
      </div>
    </>
  );
}

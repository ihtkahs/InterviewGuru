import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

export default function VoiceControls({ session }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef(null);

  useEffect(()=>{
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return setSupported(false);
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onstart = ()=>setListening(true);
    rec.onend = ()=>setListening(false);
    rec.onresult = async (e) => {
      const text = e.results[0][0].transcript;
      // send as answer
      try {
        if (!session) return alert('Start session first');
        await axios.post('http://localhost:4000/api/respond', { sessionId: session.id, text });
        // after respond, synthesize latest interviewer text
        const sresp = await axios.get(`http://localhost:4000/api/session/${session.id}`);
        const last = sresp.data.session.history.slice(-1)[0];
        if (last?.role === 'interviewer') speak(last.text);
      } catch (err) {
        alert('Error sending voice answer: ' + err.message);
      }
    };
    recRef.current = rec;
  }, [session]);

  function startStop() {
    if (!recRef.current) return alert('SpeechRecognition not supported in this browser.');
    if (listening) recRef.current.stop();
    else recRef.current.start();
  }

  function speak(text) {
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  // Speak latest interviewer prompt (quick play)
  async function playLatest() {
    if (!session) return alert('Start session first');
    const sresp = await axios.get(`http://localhost:4000/api/session/${session.id}`);
    const lastInterviewer = sresp.data.session.history.slice().reverse().find(h=>h.role==='interviewer');
    if (lastInterviewer) speak(lastInterviewer.text);
    else alert('No interviewer prompt yet.');
  }

  if (!supported) return <div className="small">Voice not supported in this browser.</div>;

  return (
    <div style={{display:'flex', gap:8, alignItems:'center'}}>
      <button className="voice-btn" onClick={startStop}>{listening ? 'Stop 🎤' : 'Start 🎤'}</button>
      <button onClick={playLatest}>Play Last Q</button>
    </div>
  );
}

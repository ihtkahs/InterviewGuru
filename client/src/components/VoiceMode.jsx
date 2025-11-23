import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import axios from 'axios';

/**
 * VoiceMode Component with imperative handle
 */
const VoiceMode = forwardRef(function VoiceMode({ session, onUpdate }, ref) {
  const [active, setActive] = useState(false);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState('idle');
  const recognitionRef = useRef(null);
  const stopFlagRef = useRef(false);

  // expose startVoice() to parent
  useImperativeHandle(ref, () => ({
    startVoice,
    speak: speakText
  }));

  // init STT
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      recognitionRef.current = null;
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => { setListening(true); setStatus('listening'); };
    rec.onend = () => { setListening(false); };
    rec.onerror = () => { setListening(false); };

    recognitionRef.current = rec;
  }, []);

  // speak text
  function speakText(text) {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) return resolve();
      const ut = new SpeechSynthesisUtterance(text);
      ut.lang = 'en-US';
      ut.rate = 1.0;
      ut.onend = resolve;

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(ut);
    });
  }

  // listen once
  function singleListen() {
    return new Promise((resolve) => {
      const rec = recognitionRef.current;
      if (!rec) return resolve(null);

      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;

      let transcript = null;

      rec.onresult = (e) => {
        transcript = e.results[0][0].transcript;
        resolve(transcript);
      };

      rec.onerror = () => resolve(null);
      rec.onend = () => {
        if (!transcript) resolve(null);
      };

      try {
        rec.abort();
        rec.start();
      } catch {
        resolve(null);
      }
    });
  }

  // main loop
  async function voiceLoop() {
    stopFlagRef.current = false;
    let emptyCount = 0;

    while (!stopFlagRef.current) {
      if (!session) break;

      setStatus("listening");
      const userText = await singleListen();
      if (stopFlagRef.current) break;

      if (!userText) {
        emptyCount++;
        if (emptyCount >= 5) break;
        await new Promise(r => setTimeout(r, 1200));
        continue;
      }

      emptyCount = 0;
      setStatus("thinking");

      try {
        await axios.post("http://localhost:4000/api/respond", {
          sessionId: session.id,
          text: userText
        });
        if (onUpdate) await onUpdate();
      } catch {}

      const last = await axios.get(`http://localhost:4000/api/session/${session.id}`);
      const hist = last.data.session.history;
      const lastMsg = hist.reverse().find(m => m.role === "interviewer");

      setStatus("speaking");
      await speakText(lastMsg?.text || "");
    }

    setStatus("idle");
  }

  function startVoice() {
    if (!session) return alert('Start a session first');
    if (!recognitionRef.current) return alert('SpeechRecognition not supported.');
    setActive(true);
    setStatus('listening');
    voiceLoop();
  }

  function stopVoice() {
    stopFlagRef.current = true;
    setActive(false);
    setStatus('idle');
    if (recognitionRef.current) try { recognitionRef.current.abort(); } catch {}
    window.speechSynthesis.cancel();
  }

  return (
    <div style={{display:'flex', flexDirection:'column', gap:8}}>
      <div style={{display:'flex', justifyContent:'space-between'}}>
        <div className="voice-indicator">
          {status === 'listening' && <div className="pulse" />}
          <div className="small">Status: <strong>{status}</strong></div>
        </div>
        <div>
          {!active ? (
            <button onClick={startVoice}>Enter Voice Mode (Hands-free)</button>
          ) : (
            <button onClick={stopVoice}>Stop Voice Mode</button>
          )}
        </div>
      </div>
      <div className="small">Voice Mode listens, responds, then listens again.</div>
    </div>
  );
});

export default VoiceMode;

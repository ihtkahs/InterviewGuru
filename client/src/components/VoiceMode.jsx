import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

/**
 * VoiceMode component:
 * - When user clicks "Start Voice", it enters a continuous loop:
 *   listen() -> send -> synthesize reply -> listen() again
 * - "Stop Voice" exits the loop and stops recognition.
 * - Uses Web Speech API for STT and SpeechSynthesis for TTS.
 *
 * Props:
 * - session: session object { id, role, level, history }
 * - onUpdate: callback to refresh session history after each model reply
 */

export default function VoiceMode({ session, onUpdate }) {
  const [active, setActive] = useState(false);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | listening | thinking | speaking
  const recognitionRef = useRef(null);
  const stopFlagRef = useRef(false);

  // init SpeechRecognition
  useEffect(()=> {
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
    rec.onend = () => { setListening(false); /* we will restart manually if active */ };
    rec.onerror = (e) => { console.warn('SpeechRecognition error', e); setListening(false); };
    recognitionRef.current = rec;
  }, []);

  // Helper: speak text and return promise when speaking done
  function speakText(text) {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) return resolve();
      const ut = new SpeechSynthesisUtterance(text);
      ut.lang = 'en-US';
      ut.rate = 1.0;
      ut.onend = () => { resolve(); };
      ut.onerror = () => { resolve(); };
      // cancel any current speech then speak
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(ut);
    });
  }

  // Helper: single recognition -> returns recognized text or null
    function singleListen() {
    return new Promise((resolve) => {
        const rec = recognitionRef.current;
        if (!rec) return resolve(null);

        // clean previous handlers
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;

        let transcript = null;

        rec.onresult = (e) => {
        transcript = e.results[0][0].transcript;
        resolve(transcript);
        };

        rec.onerror = () => {
        resolve(null);
        };

        rec.onend = () => {
        if (!transcript) resolve(null);
        };

        try {
        rec.abort(); // IMPORTANT FIX
        rec.start();
        } catch (err) {
        console.warn("Recognition failed:", err);
        resolve(null);
        }
    });
    }

  // Main voice loop
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
      setStatus("no-speech");

      if (emptyCount >= 5) {
        setStatus("mic-error");
        console.log("Stopping due to repeated empty input");
        break;
      }

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
    } catch (e) {
      console.warn("respond error", e);
    }

    // Speak last interviewer reply
    const last = await axios.get(
      `http://localhost:4000/api/session/${session.id}`
    );
    const hist = last.data.session.history;
    const lastMsg = hist.reverse().find(m => m.role === "interviewer");

    setStatus("speaking");
    await speakText(lastMsg?.text || "");
  }

  setStatus("idle");
}

  function startVoice() {
    if (!session) return alert('Start a session first');
    if (!recognitionRef.current) return alert('SpeechRecognition not supported in this browser. Use Chrome.');
    setActive(true);
    setStatus('listening');
    voiceLoop();
  }

  function stopVoice() {
    stopFlagRef.current = true;
    setActive(false);
    setStatus('idle');
    if (recognitionRef.current) try { recognitionRef.current.abort(); } catch(e){}
    window.speechSynthesis.cancel();
  }

  return (
    <div style={{display:'flex', flexDirection:'column', gap:8}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div className="voice-indicator">
          {status === 'listening' && <div className="pulse" />}
          <div className="small">Status: <strong>{status}</strong></div>
        </div>
        <div>
          {!active ? (
            <button onClick={startVoice}>Enter Voice Mode (Hands-free)</button>
          ):(
            <button onClick={stopVoice}>Stop Voice Mode</button>
          )}
        </div>
      </div>

      <div className="small">
        In Voice Mode you speak naturally. The interviewer will listen, respond, and then listen again. Use Chrome for best results.
      </div>
    </div>
  );
}

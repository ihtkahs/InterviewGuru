import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function FeedbackPanel({ session }) {
  const [summary, setSummary] = useState(null);

  useEffect(()=>{ setSummary(null); }, [session]);

  async function fetchSummary(){
    if (!session) return alert('Start session first');
    const resp = await axios.post('http://localhost:4000/api/end', { sessionId: session.id });
    setSummary(resp.data.parsed || null);
  }

  return (
    <div style={{width:320}}>
      <div className="card" style={{padding:12}}>
        <div style={{fontWeight:600}}>Session Summary</div>
        <div style={{marginTop:8}}>
          <button onClick={fetchSummary}>Generate Summary</button>
        </div>
        {summary && (
          <div className="feedback">
            <div><strong>Overall:</strong> {summary.overall}</div>
            <div style={{marginTop:6}}><strong>Scores:</strong> Comm {summary.scores?.communication} / Struct {summary.scores?.structure} / Tech {summary.scores?.technical}</div>
            <div style={{marginTop:6}}>
              <strong>Top improvements:</strong>
              <ul>
                {(summary.top_improvements || []).map((it, idx)=> <li key={idx}>{it}</li>)}
              </ul>
            </div>
            <div style={{marginTop:6}}>
              <strong>Strengths:</strong>
              <ul>
                {(summary.strengths || []).map((it, idx)=><li key={idx}>{it}</li>)}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

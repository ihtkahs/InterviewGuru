import React, { useState } from 'react';
import axios from 'axios';

export default function SummaryPanel({ session }){
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  async function generate(){
    if(!session) return alert('Start session first');
    setLoading(true);
    try{
      const resp = await axios.post('http://localhost:4000/api/end', { sessionId: session.id });
      setSummary(resp.data.parsed);
    }catch(err){
      alert('Failed to generate summary: '+ (err?.response?.data?.error || err.message));
    }finally{ setLoading(false); }
  }

  return (
    <div>
      <button onClick={generate} disabled={loading}>{loading ? 'Generating...' : 'Generate Summary'}</button>
      {summary && (
        <div style={{marginTop:10}}>
          <div><strong>Overall:</strong> {summary.overall}</div>
          <div style={{marginTop:6}}><strong>Scores:</strong> Comm {summary.scores?.communication} / Struct {summary.scores?.structure} / Tech {summary.scores?.technical}</div>
          <div style={{marginTop:6}}>
            <strong>Improvements:</strong>
            <ul>{(summary.top_improvements||[]).map((it,i)=><li key={i}>{it}</li>)}</ul>
          </div>
        </div>
      )}
    </div>
  );
}

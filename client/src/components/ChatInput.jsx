import React, { useState } from 'react';

export default function ChatInput({ onSend }){
  const [text, setText] = useState('');
  const submit = async () => {
    if(!text.trim()) return;
    await onSend(text.trim());
    setText('');
  };
  return (
    <>
      <input placeholder="Type your answer and press Enter..." value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') submit(); }} />
      <button onClick={submit}>Send</button>
    </>
  );
}

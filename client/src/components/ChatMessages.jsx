import React, { useEffect, useRef } from 'react';

export default function ChatMessages({ history=[] }){
  const ref = useRef();
  useEffect(()=> {
    if(ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [history]);

  return (
    <div ref={ref}>
      {history.map((m, i) => (
        <div key={i} className={`msg ${m.role === 'interviewer' ? 'interviewer' : 'candidate'}`}>
          <div className="bubble">{m.text}</div>
        </div>
      ))}
    </div>
  );
}

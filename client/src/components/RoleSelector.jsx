import React from 'react';

export default function RoleSelector({ role, setRole, level, setLevel }){
  return (
    <>
      <select value={role} onChange={e=>setRole(e.target.value)}>
        <option>Software Engineer</option>
        <option>Sales</option>
        <option>Product Manager</option>
        <option>Retail Associate</option>
      </select>

      <select value={level} onChange={e=>setLevel(e.target.value)}>
        <option>Junior</option>
        <option>Mid</option>
        <option>Senior</option>
      </select>
    </>
  );
}

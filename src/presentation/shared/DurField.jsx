import React, { useEffect, useState } from 'react';
import { fmtDur, parseDur } from './formatters.js';

export function DurField({ value, onChange, placeholder = 'mm:ss', className = '' }) {
  const [text, setText] = useState(value > 0 ? fmtDur(value) : '');
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(value > 0 ? fmtDur(value) : '');
  }, [value, focused]);
  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      placeholder={placeholder}
      onFocus={e => { setFocused(true); e.target.select(); }}
      onBlur={() => { onChange(parseDur(text)); setFocused(false); }}
      onChange={e => setText(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
      className={className}
    />
  );
}

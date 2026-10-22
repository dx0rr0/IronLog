import React, { useEffect, useState } from 'react';
import { fmtDur, parseDur } from './formatters.js';

// keepOnEmpty: leaving the field blank restores the previous value instead of 0.
export function DurField({ value, onChange, placeholder = 'mm:ss', className = '', autoFocus = false, keepOnEmpty = false, 'aria-label': ariaLabel }) {
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
      onBlur={() => { onChange(keepOnEmpty && !text.trim() ? value : parseDur(text)); setFocused(false); }}
      onChange={e => setText(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
      className={className}
      aria-label={ariaLabel}
      autoFocus={autoFocus}
    />
  );
}

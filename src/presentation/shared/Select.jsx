import React from 'react';
import { ChevronDown } from 'lucide-react';

export function Select({ value, onChange, options }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 outline-none focus:border-lime-300/50 appearance-none pr-8">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
    </div>
  );
}

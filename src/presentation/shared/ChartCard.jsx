import React from 'react';

export function ChartCard({ title, children }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-3">
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">{title}</div>
      {children}
    </div>
  );
}

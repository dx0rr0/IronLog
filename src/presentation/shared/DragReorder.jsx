import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';

const ROW = 56;
const HOLD_MS = 350;
const SLOP = 10;
const EDGE = 72;

// Long-press a card header to pick it up. While dragging, the cards collapse
// into a compact list so tall exercise cards never have to scroll under the
// finger. `blocks` are [{ key, title, subtitle }]; onReorder(from, to).
export function useDragReorder({ blocks, onReorder }) {
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);
  const pressRef = useRef(null);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  const update = next => { dragRef.current = next; setDrag(next); };

  const cancelPress = useCallback(() => {
    const press = pressRef.current;
    if (!press) return;
    clearTimeout(press.timer);
    press.cleanup();
    pressRef.current = null;
  }, []);

  const begin = useCallback((from, y) => {
    const count = blocksRef.current.length;
    const height = count * ROW;
    const vh = window.innerHeight;
    let top = y - from * ROW - ROW / 2;
    const fits = height <= vh - EDGE - 16;
    const minTop = Math.min(EDGE, vh - height - 16);
    const maxTop = Math.max(EDGE, vh - height - 16);
    top = Math.max(minTop, Math.min(maxTop, top));
    // Only lists taller than the screen auto-scroll at the edges.
    if (fits) {
      update({ from, to: from, y, top, minTop: top, maxTop: top });
      try { navigator.vibrate?.(25); } catch {}
      return;
    }
    try { navigator.vibrate?.(25); } catch {}
    update({ from, to: from, y, top, minTop, maxTop });
  }, []);

  const finish = useCallback(commit => {
    const current = dragRef.current;
    update(null);
    if (commit && current && current.from !== current.to) onReorderRef.current(current.from, current.to);
  }, []);

  // Document listeners live only while dragging.
  useEffect(() => {
    if (!drag) return undefined;
    let frame = 0;
    const move = y => {
      const current = dragRef.current;
      if (!current) return;
      const count = blocksRef.current.length;
      const to = Math.max(0, Math.min(count - 1, Math.round((y - current.top - ROW / 2) / ROW)));
      update({ ...current, y, to });
    };
    const onTouchMove = e => { e.preventDefault(); move(e.touches[0].clientY); };
    const onPointerMove = e => { if (e.pointerType !== 'touch') move(e.clientY); };
    const onEnd = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = e => { if (e.key === 'Escape') finish(false); };
    // Edge auto-scroll for lists taller than the screen.
    const tick = () => {
      const current = dragRef.current;
      if (current) {
        const vh = window.innerHeight;
        const delta = current.y < EDGE ? 8 : current.y > vh - EDGE ? -8 : 0;
        const top = Math.max(current.minTop, Math.min(current.maxTop, current.top + delta));
        if (top !== current.top) {
          const shifted = { ...current, top };
          dragRef.current = shifted;
          move(current.y);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('touchend', onEnd);
    document.addEventListener('pointerup', onEnd);
    document.addEventListener('touchcancel', onCancel);
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('pointerup', onEnd);
      document.removeEventListener('touchcancel', onCancel);
      document.removeEventListener('keydown', onKey);
    };
  // Re-subscribing on every move would drop the in-flight gesture.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!drag, finish]);

  useEffect(() => cancelPress, [cancelPress]);

  const handleProps = index => ({
    onPointerDown: e => {
      if (e.button > 0 || blocksRef.current.length < 2) return;
      if (e.target.closest('button:not([data-drag-handle]),input,textarea,select,a')) return;
      cancelPress();
      const startX = e.clientX, startY = e.clientY;
      let lastY = startY;
      const onMove = ev => {
        lastY = ev.clientY;
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > SLOP) cancelPress();
      };
      const onUp = () => cancelPress();
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
      pressRef.current = {
        timer: setTimeout(() => { cancelPress(); begin(index, lastY); }, HOLD_MS),
        cleanup: () => {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          document.removeEventListener('pointercancel', onUp);
        },
      };
    },
    onContextMenu: e => e.preventDefault(),
    style: { WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' },
  });

  const overlay = drag ? <ReorderOverlay blocks={blocks} drag={drag} /> : null;
  return { handleProps, overlay, dragging: !!drag };
}

function ReorderOverlay({ blocks, drag }) {
  const { from, to, y, top } = drag;
  const others = blocks.map((block, index) => ({ block, index })).filter(item => item.index !== from);
  const dragged = blocks[from];
  return (
    <div className="fixed inset-0 z-[60] bg-zinc-950/90 backdrop-blur-sm touch-none select-none anim-fade" aria-live="polite">
      <div className="absolute top-4 inset-x-0 text-center text-[10px] font-bold tracking-[0.2em] text-zinc-500">
        ARRASTRA Y SUELTA PARA COLOCAR
      </div>
      <div className="absolute inset-x-0 max-w-md mx-auto px-5" style={{ top }}>
        <div className="relative" style={{ height: blocks.length * ROW }}>
          <div className="absolute inset-x-0 rounded-xl border-2 border-dashed border-lime-300/40"
            style={{ top: to * ROW + 4, height: ROW - 8 }} />
          {others.map(({ block }, i) => {
            const slot = i >= to ? i + 1 : i;
            return (
              <div key={block.key} className="absolute inset-x-0 transition-transform duration-150"
                style={{ transform: `translateY(${slot * ROW + 4}px)`, height: ROW - 8 }}>
                <ReorderRow block={block} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="absolute inset-x-0 max-w-md mx-auto px-5 pointer-events-none" style={{ top: y - (ROW - 8) / 2 }}>
        <div style={{ height: ROW - 8 }} className="scale-[1.03] shadow-2xl shadow-lime-300/20 rounded-xl">
          <ReorderRow block={dragged} active />
        </div>
      </div>
    </div>
  );
}

function ReorderRow({ block, active = false }) {
  return (
    <div className={`h-full rounded-xl border flex items-center gap-3 px-3 ${active ? 'bg-zinc-800 border-lime-300' : 'bg-zinc-900 border-zinc-800'}`}>
      <GripVertical className={`w-4 h-4 shrink-0 ${active ? 'text-lime-300' : 'text-zinc-600'}`} />
      <div className="min-w-0">
        <div className="font-display text-base leading-tight truncate">{block.title}</div>
        {block.subtitle && <div className="text-[10px] text-zinc-500 uppercase tracking-wide truncate">{block.subtitle}</div>}
      </div>
    </div>
  );
}

// Visible affordance + keyboard fallback (arrow keys move one block).
export function DragHandle({ onMoveUp, onMoveDown }) {
  return (
    <button type="button" data-drag-handle
      onKeyDown={e => {
        if (e.key === 'ArrowUp') { e.preventDefault(); onMoveUp(); }
        if (e.key === 'ArrowDown') { e.preventDefault(); onMoveDown(); }
      }}
      className="text-zinc-600 hover:text-lime-300 p-0.5 -ml-1 shrink-0 cursor-grab touch-none"
      aria-label="Mantén pulsado y arrastra para reordenar (o usa las flechas del teclado)">
      <GripVertical className="w-4 h-4" />
    </button>
  );
}

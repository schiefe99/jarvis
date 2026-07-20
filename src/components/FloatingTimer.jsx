import { CheckCircle2, ExternalLink, Pause } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useActiveTimer } from '../contexts/ActiveTimerContext';
import { formatTime, useTimer } from '../hooks/useTimer';
import api from '../services/api';

const SIZE = 88;
const RADIUS = 38;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Rendered inside the native PiP window via portal
function PipContent({ task, elapsed, onPause, onFinish }) {
  const timerColor = '#60a5fa';

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: '#0f172a',
      minHeight: '100vh',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxSizing: 'border-box',
      color: 'white',
      userSelect: 'none',
    }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
          {task.category}
        </div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {task.title}
        </div>
      </div>

      {/* Timer */}
      <div style={{
        fontSize: '42px',
        fontFamily: 'ui-monospace, monospace',
        fontWeight: 700,
        textAlign: 'center',
        color: timerColor,
        lineHeight: 1,
        padding: '4px 0',
      }}>
        {formatTime(elapsed)}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
        <button onClick={onPause} style={{
          flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
          background: '#1e293b', color: '#e2e8f0', fontSize: '13px', fontWeight: 500,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        }}
          onMouseOver={e => e.currentTarget.style.background = '#334155'}
          onMouseOut={e => e.currentTarget.style.background = '#1e293b'}
        >
          ⏸ Pausar
        </button>
        <button onClick={onFinish} style={{
          flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
          background: '#166534', color: '#dcfce7', fontSize: '13px', fontWeight: 500,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        }}
          onMouseOver={e => e.currentTarget.style.background = '#15803d'}
          onMouseOut={e => e.currentTarget.style.background = '#166534'}
        >
          ✓ Concluir
        </button>
      </div>
    </div>
  );
}

export default function FloatingTimer() {
  const { activeTask, clearActiveTask } = useActiveTimer();
  const [pos, setPos] = useState(() => ({
    x: window.innerWidth - SIZE - 24,
    y: 80,
  }));
  const [pipWindow, setPipWindow] = useState(null);
  const [pipContainer, setPipContainer] = useState(null);
  const pipRef = useRef(null);
  const pipSupported = typeof window !== 'undefined' && 'documentPictureInPicture' in window;

  useEffect(() => {
    function onResize() {
      setPos(p => ({
        x: Math.max(0, Math.min(window.innerWidth - SIZE, p.x)),
        y: Math.max(0, Math.min(window.innerHeight - SIZE, p.y)),
      }));
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function handleMouseDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = { x: pos.x, y: pos.y };
    function onMove(ev) {
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - SIZE, startPos.x + ev.clientX - startX)),
        y: Math.max(0, Math.min(window.innerHeight - SIZE, startPos.y + ev.clientY - startY)),
      });
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function closePip() {
    try { pipRef.current?.close(); } catch { /* ignore */ }
    pipRef.current = null;
    setPipWindow(null);
    setPipContainer(null);
  }

  async function handlePause() {
    if (!activeTask) return;
    const now = Math.floor(Date.now() / 1000);
    const elapsed = activeTask.timer_started_at ? now - activeTask.timer_started_at : 0;
    const { data } = await api.put(`/tasks/${activeTask.id}`, {
      timer_active: 0,
      timer_started_at: null,
      real_time: activeTask.real_time + elapsed,
    });
    clearActiveTask(data);
    closePip();
  }

  async function handleFinish(e) {
    e?.stopPropagation?.();
    if (!activeTask) return;
    const now = Math.floor(Date.now() / 1000);
    const elapsed = activeTask.timer_started_at ? now - activeTask.timer_started_at : 0;
    const { data } = await api.put(`/tasks/${activeTask.id}`, {
      timer_active: 0,
      timer_started_at: null,
      real_time: activeTask.real_time + elapsed,
      status: 'concluida',
      finished_at: now,
    });
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Tarefa concluída!', { body: `"${activeTask.title}" concluída.` });
    }
    clearActiveTask(data);
    closePip();
  }

  async function togglePip() {
    if (pipRef.current) {
      closePip();
      return;
    }

    if (!pipSupported) return;

    try {
      const pip = await window.documentPictureInPicture.requestWindow({
        width: 260,
        height: 240,
        disallowReturnToOpener: false,
      });

      // Copy all CSS from the main page to the PiP window
      [...document.styleSheets].forEach((sheet) => {
        try {
          const css = [...sheet.cssRules].map(r => r.cssText).join('');
          const style = pip.document.createElement('style');
          style.textContent = css;
          pip.document.head.appendChild(style);
        } catch {
          if (sheet.href) {
            const link = pip.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = sheet.href;
            pip.document.head.appendChild(link);
          }
        }
      });

      pip.document.body.style.cssText = 'margin:0;padding:0;overflow:hidden;';

      const container = pip.document.createElement('div');
      pip.document.body.appendChild(container);

      pip.addEventListener('pagehide', () => {
        pipRef.current = null;
        setPipWindow(null);
        setPipContainer(null);
      });

      pipRef.current = pip;
      setPipWindow(pip);
      setPipContainer(container);
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        console.error('PiP error:', err);
      }
    }
  }

  const elapsed = useTimer(activeTask || {});

  if (!activeTask) return null;

  const strokeColor = '#60a5fa';
  const gradFrom = '#3b82f6';
  const gradTo = '#4f46e5';

  return (
    <>
      {/* Floating bubble — hidden when PiP is active */}
      {!pipWindow && (
        <div
          style={{ left: pos.x, top: pos.y, width: SIZE, height: SIZE }}
          className="fixed z-[9999] select-none group cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-lg bg-gray-900/90 backdrop-blur-sm text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
            {activeTask.title}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/90" />
          </div>

          {/* Glow */}
          <div className="absolute inset-0 rounded-full" style={{
            background: `radial-gradient(circle, ${gradFrom}35 0%, transparent 70%)`,
            animation: 'float-glow 2s ease-in-out infinite',
          }} />

          {/* SVG ring */}
          <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
            <circle
              cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
              fill="none" stroke={strokeColor} strokeWidth="5"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={0}
              strokeLinecap="round"
            />
          </svg>

          {/* Inner circle */}
          <div
            className="absolute inset-2 rounded-full flex items-center justify-center shadow-2xl"
            style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})` }}
          >
            <div className="flex flex-col items-center group-hover:opacity-0 transition-opacity duration-150">
              <span className="text-white font-mono font-bold text-xs tracking-tight leading-none">
                {formatTime(elapsed)}
              </span>
            </div>

            <div className="absolute inset-0 rounded-full flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); handlePause(); }}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center text-white transition-colors"
                title="Pausar"
              >
                <Pause size={11} />
              </button>
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); handleFinish(e); }}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center text-white transition-colors"
                title="Concluir"
              >
                <CheckCircle2 size={11} />
              </button>
            </div>
          </div>

          {/* Pop-out button — só aparece em navegadores com suporte a Document Picture-in-Picture (Chrome/Edge 116+) */}
          {pipSupported && (
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); togglePip(); }}
              className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10"
              title="Abrir fora da página (Picture-in-Picture)"
            >
              <ExternalLink size={10} />
            </button>
          )}
        </div>
      )}

      {/* PiP portal — renders React tree into the native OS window */}
      {pipContainer && activeTask && createPortal(
        <PipContent
          task={activeTask}
          elapsed={elapsed}
          onPause={handlePause}
          onFinish={handleFinish}
        />,
        pipContainer
      )}
    </>
  );
}

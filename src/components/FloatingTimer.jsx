import { CheckCircle2, ExternalLink, Pause } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useActiveTimer } from '../contexts/ActiveTimerContext';
import { formatTime, useTimer } from '../hooks/useTimer';
import { usePip } from '../hooks/usePip';
import api from '../services/api';
import TimerPipContent from './TimerPipContent';

const SIZE = 88;
const RADIUS = 38;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function FloatingTimer() {
  const { activeTask, clearActiveTask } = useActiveTimer();
  const [pos, setPos] = useState(() => ({
    x: window.innerWidth - SIZE - 24,
    y: 80,
  }));
  const { pipSupported, pipContainer, isPipActive, openPip, closePip } = usePip();

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

  const elapsed = useTimer(activeTask || {});

  if (!activeTask) return null;

  const strokeColor = '#60a5fa';
  const gradFrom = '#3b82f6';
  const gradTo = '#4f46e5';

  return (
    <>
      {/* Floating bubble — hidden when PiP is active */}
      {!isPipActive && (
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
              onClick={e => { e.stopPropagation(); openPip(); }}
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
        <TimerPipContent
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

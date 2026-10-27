import { formatTime } from '../hooks/useTimer';

// Rendered inside the native PiP window via portal
export default function TimerPipContent({ task, elapsed, onPause, onFinish }) {
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

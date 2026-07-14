import { useEffect, useState } from 'react';

export function calcElapsed(task) {
  const now = Math.floor(Date.now() / 1000);
  if (task.timer_active && task.timer_started_at) {
    return (task.real_time || 0) + (now - task.timer_started_at);
  }
  return task.real_time || 0;
}

export function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = n => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function useTimer(task) {
  const [elapsed, setElapsed] = useState(() => calcElapsed(task));

  useEffect(() => {
    setElapsed(calcElapsed(task));
    if (!task.timer_active) return;

    const interval = setInterval(() => {
      setElapsed(calcElapsed(task));
    }, 1000);

    return () => clearInterval(interval);
  }, [task.timer_active, task.timer_started_at, task.real_time]);

  return elapsed;
}

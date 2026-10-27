import { useRef, useState } from 'react';

// Opens a native Document Picture-in-Picture window and hands back a container
// to render a React portal into. Shared by any component that wants a PiP timer.
export function usePip() {
  const [pipContainer, setPipContainer] = useState(null);
  const pipRef = useRef(null);
  const pipSupported = typeof window !== 'undefined' && 'documentPictureInPicture' in window;

  function closePip() {
    try { pipRef.current?.close(); } catch { /* ignore */ }
    pipRef.current = null;
    setPipContainer(null);
  }

  async function openPip({ width = 260, height = 240 } = {}) {
    if (pipRef.current) {
      closePip();
      return;
    }
    if (!pipSupported) return;

    try {
      const pip = await window.documentPictureInPicture.requestWindow({
        width,
        height,
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
        setPipContainer(null);
      });

      pipRef.current = pip;
      setPipContainer(container);
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        console.error('PiP error:', err);
      }
    }
  }

  return { pipSupported, pipContainer, isPipActive: !!pipContainer, openPip, closePip };
}

import { useEffect } from 'react';
import { sendInput } from '../socket/api';
import type { PlayerInput } from '../types';

const KEY_MAP: Record<string, PlayerInput> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'rotate',
  ArrowDown: 'soft_drop',
  ' ': 'hard_drop',
};

// Listens for arrow keys + space and forwards to the socket layer.
// Disabled while typing inside an <input>.
export const useKeyboard = (
  roomName: string | null | undefined,
  enabled: boolean,
) => {
  useEffect(() => {
    if (!roomName || !enabled) return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === 'INPUT') return;
      const input = KEY_MAP[e.key];
      if (!input) return;
      e.preventDefault();
      sendInput(roomName, input);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [roomName, enabled]);
};

import { useCallback, useEffect, useRef } from 'react';

export function useTimeoutRegistry() {
  const timeoutsRef = useRef<Set<number>>(new Set());

  const clearAllTimeouts = useCallback(() => {
    for (const timeout of timeoutsRef.current) {
      window.clearTimeout(timeout);
    }
    timeoutsRef.current.clear();
  }, []);

  const setTrackedTimeout = useCallback((callback: () => void, delayMs: number) => {
    const timeout = window.setTimeout(() => {
      timeoutsRef.current.delete(timeout);
      callback();
    }, delayMs);
    timeoutsRef.current.add(timeout);
    return timeout;
  }, []);

  const clearTrackedTimeout = useCallback((timeout: number) => {
    window.clearTimeout(timeout);
    timeoutsRef.current.delete(timeout);
  }, []);

  useEffect(() => clearAllTimeouts, [clearAllTimeouts]);

  return { setTrackedTimeout, clearTrackedTimeout, clearAllTimeouts };
}

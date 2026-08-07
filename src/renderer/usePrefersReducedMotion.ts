import { useEffect, useState } from 'react';

const REDUCE_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function getReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(REDUCE_MOTION_QUERY).matches
    : false;
}

export function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(getReducedMotion);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const query = window.matchMedia(REDUCE_MOTION_QUERY);
    const handleChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    setReducedMotion(query.matches);
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', handleChange);
      return () => query.removeEventListener('change', handleChange);
    }

    query.addListener(handleChange);
    return () => query.removeListener(handleChange);
  }, []);

  return reducedMotion;
}

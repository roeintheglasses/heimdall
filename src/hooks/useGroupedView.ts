'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'heimdall:event-view';

/**
 * Grouped or flat event list, remembered in localStorage. The server render
 * and first client render both use the default, then the saved choice is read
 * in an effect, so hydration never mismatches.
 */
export function useGroupedView(): [boolean, (_grouped: boolean) => void] {
  const [grouped, setGrouped] = useState(true);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === 'flat') setGrouped(false);
    } catch {
      // Storage can be blocked. The default stays.
    }
  }, []);

  const update = useCallback((next: boolean) => {
    setGrouped(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? 'grouped' : 'flat');
    } catch {
      // Not persisted, still applied for this visit.
    }
  }, []);

  return [grouped, update];
}

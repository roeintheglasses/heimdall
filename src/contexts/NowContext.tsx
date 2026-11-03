'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const NowContext = createContext<Date | null>(null);

/**
 * One shared clock for every relative label and day header. A single interval
 * ticks once a minute (and again when the tab becomes visible) instead of each
 * card running its own timer.
 */
export function NowProvider({
  children,
  intervalMs = 60_000,
}: {
  children: ReactNode;
  intervalMs?: number;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);

  return <NowContext.Provider value={now}>{children}</NowContext.Provider>;
}

/** The shared clock. Outside a provider this is the current time at render. */
export function useNow(): Date {
  return useContext(NowContext) ?? new Date();
}

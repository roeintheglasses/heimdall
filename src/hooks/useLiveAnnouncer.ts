'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createAnnouncer, type Announcement } from '@/lib/announcer';

export interface LiveMessage {
  id: number;
  text: string;
}

/** Throttled screen reader announcements. Render `message` in a LiveRegion. */
export function useLiveAnnouncer() {
  const [message, setMessage] = useState<LiveMessage>({ id: 0, text: '' });
  const announcerRef = useRef<ReturnType<typeof createAnnouncer> | null>(null);

  useEffect(() => {
    let id = 0;
    const announcer = createAnnouncer({
      emit: (text) => setMessage({ id: ++id, text }),
    });
    announcerRef.current = announcer;
    return () => {
      announcer.dispose();
      announcerRef.current = null;
    };
  }, []);

  const announce = useCallback((item: Announcement) => {
    announcerRef.current?.push(item);
  }, []);

  return { message, announce };
}

'use client';

import { useNow } from '@/contexts/NowContext';
import { formatExactTime, formatRelativeTime } from '@/lib/time';

interface EventTimeProps {
  iso: string;
  className?: string;
}

/** Relative label in a semantic <time>, with the exact local time as a tooltip. */
export default function EventTime({ iso, className }: EventTimeProps) {
  const now = useNow();
  return (
    <time dateTime={iso} title={formatExactTime(iso)} className={className}>
      {formatRelativeTime(iso, now)}
    </time>
  );
}

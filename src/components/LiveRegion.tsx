import type { LiveMessage } from '@/hooks/useLiveAnnouncer';

/** Visually hidden polite live region. The key makes repeated text announce again. */
export default function LiveRegion({ message }: { message: LiveMessage }) {
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      <span key={message.id}>{message.text}</span>
    </div>
  );
}

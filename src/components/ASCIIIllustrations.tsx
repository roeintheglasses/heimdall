'use client';

import { cn } from '@/lib/utils';

interface ASCIIArtProps {
  className?: string;
}

// Radar/Scanning illustration for "waiting for events"
export function RadarASCII({ className }: ASCIIArtProps) {
  return (
    <pre className={cn('font-mono text-xs leading-tight text-neon-cyan', className)}>
      {`
      .---.
     /     \\
    |  ___  |
    | |   | |
    | |_._| |
     \\     /
      '---'
   SCANNING...
`}
    </pre>
  );
}

// Satellite dish for "first visit/setup"
export function SatelliteASCII({ className }: ASCIIArtProps) {
  return (
    <pre className={cn('font-mono text-xs leading-tight text-neon-cyan', className)}>
      {`
        .-.
       (   )
        '-'
     .-'   '-.
    /         \\
   |  HEIMDALL |
    \\   .-.   /
     '-.|_|.-'
        |_|
      __|__|__
`}
    </pre>
  );
}

// Search/magnifying glass for "no results"
export function SearchASCII({ className }: ASCIIArtProps) {
  return (
    <pre className={cn('font-mono text-xs leading-tight text-neon-orange', className)}>
      {`
     .-"""-.
    /        \\
   |  .----.  |
   | |      | |
   |  '----'  |
    \\        /
     '-.__.-'\\
              \\
               \\
`}
    </pre>
  );
}

// Server/terminal for "connecting"
export function TerminalASCII({ className }: ASCIIArtProps) {
  return (
    <pre className={cn('font-mono text-xs leading-tight text-neon-green', className)}>
      {`
  +-----------+
  |  _  _  _  |
  | |_||_||_| |
  +-----------+
  |  > _      |
  |           |
  +-----------+
`}
    </pre>
  );
}

// Webhook/hook for "setup webhooks"
export function WebhookASCII({ className }: ASCIIArtProps) {
  return (
    <pre className={cn('font-mono text-xs leading-tight text-neon-magenta', className)}>
      {`
       ____
      /    \\
     |      |
     |  ()  |
      \\    /
       |  |
       |  |
    .--'  '--.
   /          \\
`}
    </pre>
  );
}

// Celebration/success for "all caught up"
export function SuccessASCII({ className }: ASCIIArtProps) {
  return (
    <pre className={cn('font-mono text-xs leading-tight text-neon-green', className)}>
      {`
     \\   /
      \\ /
   ----*----
      / \\
     /   \\

  ALL CLEAR!
`}
    </pre>
  );
}

// Error/warning for "connection issues"
export function ErrorASCII({ className }: ASCIIArtProps) {
  return (
    <pre className={cn('font-mono text-xs leading-tight text-neon-orange', className)}>
      {`
      /\\
     /  \\
    / !! \\
   /______\\

  WARNING
`}
    </pre>
  );
}

// Loading dots animation
export function LoadingDotsASCII({ className }: ASCIIArtProps) {
  return (
    <pre className={cn('animate-pulse font-mono text-xs leading-tight text-neon-cyan', className)}>
      {`
   [.  ]  [.. ]  [...]
       LOADING...
`}
    </pre>
  );
}

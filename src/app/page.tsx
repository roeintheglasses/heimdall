'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Activity, ArrowRight, Terminal } from 'lucide-react';
import { HeatmapBackground } from '@/components/HeatmapBackground';
import SiteNav from '@/components/SiteNav';
import { SoundToggle } from '@/components/SoundToggle';
import { TerminalPrompt } from '@/components/TerminalText';
import {
  fetchSystemStatus,
  formatLastEvent,
  statusView,
  type SystemStatus,
  type StatusView,
} from '@/lib/status';
import { getGoServiceUrl } from '@/lib/api';

const TONE_CLASS: Record<StatusView['tone'], string> = {
  ok: 'text-neon-green',
  warn: 'text-neon-yellow',
  bad: 'text-neon-pink',
  neutral: 'text-muted-foreground',
};

function useSystemStatus(): SystemStatus {
  const [status, setStatus] = useState<SystemStatus>({
    backend: 'loading',
    lastEventAt: null,
    statsAvailable: false,
  });
  // Re-render each minute so "Last event: 3m ago" stays current between polls.
  const [, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let base = '';
    try {
      base = getGoServiceUrl();
    } catch {
      // No backend URL in this build: the health route still reports the backend state.
    }
    const load = () => {
      fetchSystemStatus(base).then((next) => {
        if (!cancelled) setStatus(next);
      });
    };
    load();
    // Poll once a minute so a backend that goes down while the page is open is shown.
    const timer = setInterval(() => {
      load();
      setTick((t) => t + 1);
    }, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return status;
}

// ASCII Art Logo
const HEIMDALL_ASCII = `
██╗  ██╗███████╗██╗███╗   ███╗██████╗  █████╗ ██╗     ██╗
██║  ██║██╔════╝██║████╗ ████║██╔══██╗██╔══██╗██║     ██║
███████║█████╗  ██║██╔████╔██║██║  ██║███████║██║     ██║
██╔══██║██╔══╝  ██║██║╚██╔╝██║██║  ██║██╔══██║██║     ██║
██║  ██║███████╗██║██║ ╚═╝ ██║██████╔╝██║  ██║███████╗███████╗
╚═╝  ╚═╝╚══════╝╚═╝╚═╝     ╚═╝╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝
`.trim();

export default function Home() {
  const system = useSystemStatus();
  const view = statusView(system.backend);
  const toneClass = TONE_CLASS[view.tone];

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-terminal-black">
      {/* Background layer - Activity heatmap */}
      <HeatmapBackground />

      {/* Content layer */}
      <div className="relative z-10 flex min-h-dvh flex-col">
        {/* Header - Terminal style */}
        <header className="shrink-0 border-b-2 border-neon-cyan bg-terminal-black/95 backdrop-blur-sm">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="border-2 border-neon-cyan bg-neon-cyan/10 p-2">
                <Shield className="h-5 w-5 text-neon-cyan" aria-hidden="true" />
              </div>
              <span className="text-glow-cyan font-mono text-xl font-bold text-neon-cyan">
                HEIMDALL
              </span>
            </div>
            <div className="flex items-center gap-2">
              <SiteNav className="hidden sm:flex" />
              <SoundToggle />
            </div>
          </div>
        </header>

        {/* Hero Section - Terminal boot sequence */}
        <main className="container flex flex-1 flex-col justify-center px-4 py-6 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="sr-only">Heimdall: real-time webhook monitoring dashboard</h1>

            {/* ASCII Art Logo: decorative, and too small to read on narrow screens */}
            <div className="-mx-4 mb-6 hidden overflow-x-auto px-4 min-[400px]:block xs:mb-8">
              <pre
                aria-hidden="true"
                className="text-glow-cyan inline-block text-left font-mono text-[8px] leading-tight text-neon-cyan sm:text-xs md:text-sm"
              >
                {HEIMDALL_ASCII}
              </pre>
            </div>

            <Badge
              variant="outline"
              className="mb-6 border-2 border-neon-cyan font-mono text-neon-cyan"
            >
              <Terminal className="mr-1 h-3 w-3" />
              REAL-TIME MONITORING v2.0
            </Badge>

            <div className="mx-auto max-w-2xl pb-10 text-center">
              <div className="mb-4 flex items-center justify-center gap-2 font-mono text-sm text-neon-cyan">
                <Terminal className="h-4 w-4" />
                <span>TECH::STACK</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                <Badge
                  variant="outline"
                  className="border-2 border-neon-cyan font-mono text-xs text-neon-cyan sm:text-sm"
                >
                  NEXT.JS 15
                </Badge>
                <Badge
                  variant="outline"
                  className="border-2 border-neon-green font-mono text-xs text-neon-green sm:text-sm"
                >
                  GO
                </Badge>
                <Badge
                  variant="outline"
                  className="border-2 border-neon-magenta font-mono text-xs text-neon-magenta sm:text-sm"
                >
                  POSTGRESQL
                </Badge>
                <Badge
                  variant="outline"
                  className="border-2 border-neon-orange font-mono text-xs text-neon-orange sm:text-sm"
                >
                  VERCEL EDGE
                </Badge>
                <Badge
                  variant="outline"
                  className="border-2 border-neon-pink font-mono text-xs text-neon-pink sm:text-sm"
                >
                  RAILWAY
                </Badge>
                <Badge
                  variant="outline"
                  className="border-2 border-neon-yellow font-mono text-xs text-neon-yellow sm:text-sm"
                >
                  TAILWIND CSS
                </Badge>
              </div>
            </div>

            <div className="mx-auto mb-6 max-w-2xl border-2 border-neon-cyan/50 bg-terminal-black p-3 text-left font-mono xs:mb-8 xs:p-4">
              <TerminalPrompt prefix="$ ">
                <span className="text-neon-green">system</span>
                <span className="text-muted-foreground">::</span>
                <span className="text-neon-cyan">init</span>
              </TerminalPrompt>
              <div className="mt-2 text-xs text-muted-foreground xs:text-sm">
                <p>
                  <span className="text-neon-magenta">&gt;</span> Real-time dashboard with
                  over-engineered edge pipeline
                </p>
                <p>
                  <span className="text-neon-magenta">&gt;</span> Monitor GitHub pushes, Vercel
                  deploys, Railway services
                </p>
                <p>
                  <span className="text-neon-magenta">&gt;</span> Status:{' '}
                  <span className={toneClass}>{view.label}</span>
                  {system.backend === 'up' && (
                    <span className="text-muted-foreground">
                      {' '}
                      {'//'} Last event:{' '}
                      {formatLastEvent(system.lastEventAt, new Date(), system.statsAvailable)}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
              <Button
                asChild
                variant="neon"
                size="lg"
                className="min-h-11 w-full gap-2 font-mono shadow-retro sm:w-auto"
              >
                <Link href="/dashboard">
                  <Activity className="h-4 w-4" aria-hidden="true" />
                  LAUNCH DASHBOARD
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <SiteNav className="mt-4 justify-center sm:hidden" />
          </div>
        </main>

        {/* Footer */}
        <footer className="shrink-0 py-3">
          <div className="container px-4 text-center sm:px-6">
            <p className="font-mono text-xs text-muted-foreground">
              <span className="text-neon-magenta">&gt;</span> HEIMDALL_DASHBOARD //{' '}
              <span className={toneClass}>{view.label}</span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

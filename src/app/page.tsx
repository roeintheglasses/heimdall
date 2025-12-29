'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Activity, ArrowRight, Terminal } from 'lucide-react';
import { HeatmapBackground } from '@/components/HeatmapBackground';
import { SoundToggle } from '@/components/SoundToggle';
import { TerminalPrompt } from '@/components/TerminalText';

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
  return (
    <div className="relative h-screen overflow-hidden bg-terminal-black">
      {/* Background layer - Activity heatmap */}
      <HeatmapBackground />

      {/* Content layer */}
      <div className="relative z-10 flex h-full flex-col">
        {/* Header - Terminal style */}
        <header className="shrink-0 border-b-2 border-neon-cyan bg-terminal-black/95 backdrop-blur-sm">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="border-2 border-neon-cyan bg-neon-cyan/10 p-2">
                <Shield className="h-5 w-5 text-neon-cyan" />
              </div>
              <span className="text-glow-cyan font-mono text-xl font-bold text-neon-cyan">
                HEIMDALL
              </span>
            </div>
            <SoundToggle />
          </div>
        </header>

        {/* Hero Section - Terminal boot sequence */}
        <section className="container flex flex-1 flex-col justify-center px-4 py-6 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-4xl text-center">
            {/* ASCII Art Logo */}
            <div className="-mx-4 mb-6 overflow-x-auto px-4 xs:mb-8">
              <pre className="text-glow-cyan inline-block text-left font-mono text-[5px] leading-tight text-neon-cyan xs:text-[7px] sm:text-xs md:text-sm">
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
                  <span className="text-neon-green">OPERATIONAL</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button
                  variant="neon"
                  size="lg"
                  className="w-full gap-2 font-mono shadow-retro sm:w-auto"
                >
                  <Activity className="h-4 w-4" />
                  LAUNCH DASHBOARD
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="shrink-0 py-3">
          <div className="container px-4 text-center sm:px-6">
            <p className="font-mono text-xs text-muted-foreground">
              <span className="text-neon-magenta">&gt;</span> HEIMDALL_DASHBOARD //{' '}
              <span className="text-neon-green">OPERATIONAL</span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

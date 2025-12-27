'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Activity, ArrowRight, CheckCircle, Terminal } from 'lucide-react';
import { ActivityHeatmap } from '@/components/ActivityHeatmap';
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
    <div className="min-h-screen bg-terminal-black">
      {/* Header - Terminal style */}
      <header className="sticky top-0 z-50 border-b-2 border-neon-magenta bg-terminal-black/95 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="border-2 border-neon-magenta bg-neon-cyan/10 p-2">
              <Shield className="h-5 w-5 text-neon-magenta" />
            </div>
            <span className="text-glow-magenta font-mono text-xl font-bold text-neon-magenta">
              HEIMDALL
            </span>
          </div>
          <SoundToggle />
        </div>
      </header>

      {/* Hero Section - Terminal boot sequence */}
      <section className="container px-4 py-16 sm:px-6 sm:py-24 md:pt-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* ASCII Art Logo */}
          <div className="mb-8 overflow-x-auto">
            <pre className="text-glow-magenta inline-block text-left font-mono text-[8px] leading-tight text-neon-magenta sm:text-xs md:text-sm">
              {HEIMDALL_ASCII}
            </pre>
          </div>

          <Badge
            variant="outline"
            className="mb-6 border-2 border-neon-magenta font-mono text-neon-magenta"
          >
            <Terminal className="mr-1 h-3 w-3" />
            REAL-TIME MONITORING v2.0
          </Badge>

          <div className="mx-auto mb-8 max-w-2xl border-2 border-neon-cyan/50 bg-terminal-black p-4 text-left font-mono">
            <TerminalPrompt prefix="$ ">
              <span className="text-neon-green">system</span>
              <span className="text-muted-foreground">::</span>
              <span className="text-neon-cyan">init</span>
            </TerminalPrompt>
            <div className="mt-2 text-sm text-muted-foreground">
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

            <Link href="/api/health" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full gap-2 border-2 border-neon-green font-mono text-neon-green hover:bg-neon-green/10 sm:w-auto"
              >
                <CheckCircle className="h-4 w-4" />
                API_HEALTH_CHECK
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Activity Preview Section */}
      <section className="container px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <div className="mb-2 flex items-center justify-center gap-2 font-mono text-sm text-neon-magenta">
              <Terminal className="h-4 w-4" />
              <span>ACTIVITY::OVERVIEW</span>
            </div>
            <h2 className="text-glow-cyan mb-2 font-mono text-2xl font-bold text-neon-cyan sm:text-3xl">
              DEVELOPMENT PATTERNS
            </h2>
            <p className="font-mono text-sm text-muted-foreground">
              GitHub-style activity visualization // 12 week history
            </p>
          </div>

          <Card className="mx-auto max-w-5xl border-2 border-neon-cyan bg-terminal-black shadow-retro">
            {/* Terminal header */}
            <div className="flex items-center justify-between border-b-2 border-neon-cyan bg-neon-cyan/10 px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 border border-neon-orange/50 bg-neon-orange" />
                <div className="h-3 w-3 border border-neon-yellow/50 bg-neon-yellow" />
                <div className="h-3 w-3 border border-neon-green/50 bg-neon-green" />
              </div>
              <span className="font-mono text-xs text-neon-cyan">HEATMAP.EXE</span>
            </div>
            <CardContent className="p-6">
              <ActivityHeatmap />
            </CardContent>
          </Card>

          <div className="mt-6 text-center">
            <Link href="/dashboard">
              <Button variant="neon" className="gap-2 font-mono">
                <Activity className="h-4 w-4" />
                VIEW_LIVE_DATA
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Tech Stack - Arcade badges */}
      <section className="border-t-2 border-neon-cyan/50 bg-terminal-gray/30 py-12 sm:py-16">
        <div className="container px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
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
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-neon-cyan/30 py-6">
        <div className="container px-4 text-center sm:px-6">
          <p className="font-mono text-xs text-muted-foreground">
            <span className="text-neon-magenta">&gt;</span> HEIMDALL_DASHBOARD //{' '}
            <span className="text-neon-green">OPERATIONAL</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

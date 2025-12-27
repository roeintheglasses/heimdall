'use client'

import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Activity, Zap, ArrowRight, CheckCircle, Terminal, Cpu, Database } from 'lucide-react'
import { ActivityHeatmap } from '@/components/ActivityHeatmap'
import { SoundToggle } from '@/components/SoundToggle'
import { TerminalText, TerminalPrompt, AsciiHeader } from '@/components/TerminalText'
import { RetroBorder } from '@/components/ScanlineOverlay'
import { cn } from '@/lib/utils'

// ASCII Art Logo
const HEIMDALL_ASCII = `
██╗  ██╗███████╗██╗███╗   ███╗██████╗  █████╗ ██╗     ██╗
██║  ██║██╔════╝██║████╗ ████║██╔══██╗██╔══██╗██║     ██║
███████║█████╗  ██║██╔████╔██║██║  ██║███████║██║     ██║
██╔══██║██╔══╝  ██║██║╚██╔╝██║██║  ██║██╔══██║██║     ██║
██║  ██║███████╗██║██║ ╚═╝ ██║██████╔╝██║  ██║███████╗███████╗
╚═╝  ╚═╝╚══════╝╚═╝╚═╝     ╚═╝╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝
`.trim()

export default function Home() {
  return (
    <div className="min-h-screen bg-terminal-black">
      {/* Header - Terminal style */}
      <header className="border-b-2 border-neon-cyan bg-terminal-black/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 border-2 border-neon-cyan bg-neon-cyan/10">
              <Shield className="h-5 w-5 text-neon-cyan" />
            </div>
            <span className="text-xl font-bold font-mono text-neon-cyan text-glow-cyan">
              HEIMDALL
            </span>
          </div>
          <SoundToggle />
        </div>
      </header>

      {/* Hero Section - Terminal boot sequence */}
      <section className="container py-16 sm:py-24 md:py-32 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          {/* ASCII Art Logo */}
          <div className="mb-8 overflow-x-auto">
            <pre className="font-mono text-neon-cyan text-[8px] sm:text-xs md:text-sm leading-tight text-glow-cyan inline-block text-left">
              {HEIMDALL_ASCII}
            </pre>
          </div>

          <Badge variant="outline" className="mb-6 border-2 border-neon-magenta text-neon-magenta font-mono">
            <Terminal className="w-3 h-3 mr-1" />
            REAL-TIME MONITORING v2.0
          </Badge>

          <div className="mb-8 font-mono text-left max-w-2xl mx-auto p-4 border-2 border-neon-cyan/50 bg-terminal-black">
            <TerminalPrompt prefix="$ ">
              <span className="text-neon-green">system</span>
              <span className="text-muted-foreground">::</span>
              <span className="text-neon-cyan">init</span>
            </TerminalPrompt>
            <div className="mt-2 text-sm text-muted-foreground">
              <p><span className="text-neon-magenta">&gt;</span> Real-time dashboard with over-engineered edge pipeline</p>
              <p><span className="text-neon-magenta">&gt;</span> Monitor GitHub pushes, Vercel deploys, Railway services</p>
              <p><span className="text-neon-magenta">&gt;</span> Status: <span className="text-neon-green">OPERATIONAL</span></p>
            </div>
          </div>

          <div className="flex gap-3 sm:gap-4 justify-center flex-col sm:flex-row">
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button variant="neon" size="lg" className="gap-2 w-full sm:w-auto shadow-retro font-mono">
                <Activity className="h-4 w-4" />
                LAUNCH DASHBOARD
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="/api/health" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto border-2 border-neon-green text-neon-green hover:bg-neon-green/10 font-mono">
                <CheckCircle className="h-4 w-4" />
                API_HEALTH_CHECK
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Activity Preview Section */}
      <section className="container py-12 sm:py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 text-neon-magenta font-mono text-sm mb-2">
              <Terminal className="h-4 w-4" />
              <span>ACTIVITY::OVERVIEW</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-mono text-neon-cyan text-glow-cyan mb-2">
              DEVELOPMENT PATTERNS
            </h2>
            <p className="text-muted-foreground font-mono text-sm">
              GitHub-style activity visualization // 12 week history
            </p>
          </div>

          <Card className="mx-auto max-w-5xl border-2 border-neon-cyan bg-terminal-black shadow-retro">
            {/* Terminal header */}
            <div className="flex items-center justify-between px-4 py-2 border-b-2 border-neon-cyan bg-neon-cyan/10">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-neon-orange border border-neon-orange/50" />
                <div className="w-3 h-3 bg-neon-yellow border border-neon-yellow/50" />
                <div className="w-3 h-3 bg-neon-green border border-neon-green/50" />
              </div>
              <span className="text-xs font-mono text-neon-cyan">HEATMAP.EXE</span>
            </div>
            <CardContent className="p-6">
              <ActivityHeatmap />
            </CardContent>
          </Card>

          <div className="text-center mt-6">
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

      {/* Features Section - Terminal cards */}
      <section className="container py-12 sm:py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-8 sm:mb-12">
            <div className="flex items-center justify-center gap-2 text-neon-green font-mono text-sm mb-2">
              <Cpu className="h-4 w-4" />
              <span>SYSTEM::ARCHITECTURE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-mono text-neon-cyan text-glow-cyan">
              EDGE PIPELINE
            </h2>
          </div>

          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            {/* Feature 1 */}
            <Card className="border-2 border-neon-cyan bg-terminal-black group hover:shadow-retro hover:-translate-x-1 hover:-translate-y-1 transition-all duration-200">
              <div className="flex items-center justify-between px-4 py-2 border-b-2 border-neon-cyan bg-neon-cyan/10">
                <span className="text-xs font-mono text-neon-cyan">EDGE.EXE</span>
              </div>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 border-2 border-neon-cyan bg-neon-cyan/10">
                    <Zap className="h-5 w-5 text-neon-cyan" />
                  </div>
                  <h3 className="font-mono font-bold text-neon-cyan">VERCEL EDGE</h3>
                </div>
                <p className="text-sm text-muted-foreground font-mono">
                  <span className="text-neon-magenta">&gt;</span> Sub-100ms webhook ingestion
                </p>
                <p className="text-sm text-muted-foreground font-mono">
                  <span className="text-neon-magenta">&gt;</span> Global edge deployment
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="border-2 border-neon-green bg-terminal-black group hover:shadow-retro-green hover:-translate-x-1 hover:-translate-y-1 transition-all duration-200">
              <div className="flex items-center justify-between px-4 py-2 border-b-2 border-neon-green bg-neon-green/10">
                <span className="text-xs font-mono text-neon-green">BACKEND.GO</span>
              </div>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 border-2 border-neon-green bg-neon-green/10">
                    <Activity className="h-5 w-5 text-neon-green" />
                  </div>
                  <h3 className="font-mono font-bold text-neon-green">RAILWAY GO</h3>
                </div>
                <p className="text-sm text-muted-foreground font-mono">
                  <span className="text-neon-magenta">&gt;</span> High-performance processing
                </p>
                <p className="text-sm text-muted-foreground font-mono">
                  <span className="text-neon-magenta">&gt;</span> Sub-80ms transform time
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="border-2 border-neon-magenta bg-terminal-black group hover:shadow-retro-magenta hover:-translate-x-1 hover:-translate-y-1 transition-all duration-200">
              <div className="flex items-center justify-between px-4 py-2 border-b-2 border-neon-magenta bg-neon-magenta/10">
                <span className="text-xs font-mono text-neon-magenta">STREAM.SSE</span>
              </div>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 border-2 border-neon-magenta bg-neon-magenta/10">
                    <Database className="h-5 w-5 text-neon-magenta" />
                  </div>
                  <h3 className="font-mono font-bold text-neon-magenta">REAL-TIME</h3>
                </div>
                <p className="text-sm text-muted-foreground font-mono">
                  <span className="text-neon-magenta">&gt;</span> Server-Sent Events
                </p>
                <p className="text-sm text-muted-foreground font-mono">
                  <span className="text-neon-magenta">&gt;</span> Sub-400ms e2e latency
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Tech Stack - Arcade badges */}
      <section className="border-t-2 border-neon-cyan/50 py-12 sm:py-16 bg-terminal-gray/30">
        <div className="container px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <div className="flex items-center justify-center gap-2 text-neon-cyan font-mono text-sm mb-4">
              <Terminal className="h-4 w-4" />
              <span>TECH::STACK</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              <Badge variant="outline" className="text-xs sm:text-sm font-mono border-2 border-neon-cyan text-neon-cyan">
                NEXT.JS 15
              </Badge>
              <Badge variant="outline" className="text-xs sm:text-sm font-mono border-2 border-neon-green text-neon-green">
                GO
              </Badge>
              <Badge variant="outline" className="text-xs sm:text-sm font-mono border-2 border-neon-magenta text-neon-magenta">
                POSTGRESQL
              </Badge>
              <Badge variant="outline" className="text-xs sm:text-sm font-mono border-2 border-neon-orange text-neon-orange">
                VERCEL EDGE
              </Badge>
              <Badge variant="outline" className="text-xs sm:text-sm font-mono border-2 border-neon-pink text-neon-pink">
                RAILWAY
              </Badge>
              <Badge variant="outline" className="text-xs sm:text-sm font-mono border-2 border-neon-yellow text-neon-yellow">
                TAILWIND CSS
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-neon-cyan/30 py-6">
        <div className="container px-4 sm:px-6 text-center">
          <p className="text-xs font-mono text-muted-foreground">
            <span className="text-neon-magenta">&gt;</span> HEIMDALL_DASHBOARD // <span className="text-neon-green">OPERATIONAL</span>
          </p>
        </div>
      </footer>
    </div>
  )
}

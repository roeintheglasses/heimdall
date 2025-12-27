'use client';

import { useState, useEffect, useCallback } from 'react';

export type BootPhase = 'idle' | 'init' | 'title' | 'progress' | 'checks' | 'complete' | 'done';

export interface BootCheck {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'ok' | 'error';
}

interface UseBootSequenceOptions {
  skipOnRefresh?: boolean;
  autoStart?: boolean;
  onComplete?: () => void;
}

const STORAGE_KEY = 'heimdall-booted';
const BOOT_DURATION = 3200; // Total boot time in ms

export function useBootSequence(options: UseBootSequenceOptions = {}) {
  const { skipOnRefresh = true, autoStart = true, onComplete } = options;

  const [phase, setPhase] = useState<BootPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [showBoot, setShowBoot] = useState(false);
  const [checks, setChecks] = useState<BootCheck[]>([
    { id: 'sound', label: 'Sound System', status: 'pending' },
    { id: 'stream', label: 'Event Stream', status: 'pending' },
    { id: 'category', label: 'Category Engine', status: 'pending' },
  ]);

  // Check if we should show boot sequence
  useEffect(() => {
    if (!skipOnRefresh) {
      setShowBoot(true);
      return;
    }

    const hasBooted = sessionStorage.getItem(STORAGE_KEY);
    if (!hasBooted) {
      setShowBoot(true);
    } else {
      setPhase('done');
    }
  }, [skipOnRefresh]);

  // Run the boot sequence
  const runBootSequence = useCallback(async () => {
    if (phase !== 'idle') return;

    setPhase('init');

    // Phase 1: Initialize (0.3s)
    await delay(300);
    setPhase('title');

    // Phase 2: Title typing (0.5s)
    await delay(500);
    setPhase('progress');

    // Phase 3: Progress bar (0.8s)
    const progressDuration = 800;
    const progressSteps = 20;
    const stepDuration = progressDuration / progressSteps;

    for (let i = 1; i <= progressSteps; i++) {
      await delay(stepDuration);
      setProgress(Math.round((i / progressSteps) * 100));
    }

    setPhase('checks');

    // Phase 4: System checks (1.0s)
    for (let i = 0; i < checks.length; i++) {
      setChecks((prev) =>
        prev.map((check, idx) => (idx === i ? { ...check, status: 'running' } : check))
      );
      await delay(200);
      setChecks((prev) =>
        prev.map((check, idx) => (idx === i ? { ...check, status: 'ok' } : check))
      );
      await delay(100);
    }

    // Phase 5: Complete (0.6s)
    await delay(200);
    setPhase('complete');

    await delay(400);

    // Mark as booted
    if (skipOnRefresh) {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    }

    // Phase 6: Done - transition to content
    setPhase('done');
    setShowBoot(false);
    onComplete?.();
  }, [phase, checks.length, skipOnRefresh, onComplete]);

  // Auto-start boot sequence
  useEffect(() => {
    if (autoStart && showBoot && phase === 'idle') {
      runBootSequence();
    }
  }, [autoStart, showBoot, phase, runBootSequence]);

  // Reset boot sequence (for manual trigger)
  const resetBoot = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setPhase('idle');
    setProgress(0);
    setShowBoot(true);
    setChecks((prev) => prev.map((check) => ({ ...check, status: 'pending' })));
  }, []);

  // Skip boot sequence
  const skipBoot = useCallback(() => {
    if (skipOnRefresh) {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    }
    setPhase('done');
    setShowBoot(false);
    onComplete?.();
  }, [skipOnRefresh, onComplete]);

  return {
    phase,
    progress,
    checks,
    showBoot,
    isBooting: showBoot && phase !== 'done',
    isComplete: phase === 'done',
    runBootSequence,
    resetBoot,
    skipBoot,
  };
}

// Helper function for delays
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

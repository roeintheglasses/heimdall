'use client';

import { useEffect, useState } from 'react';
import { Flame, Trophy, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getGoServiceUrl } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

interface StreakInfo {
  current_streak: number;
  longest_streak: number;
  last_active_date: string;
}

interface StreakCounterProps {
  streak?: StreakInfo;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLongest?: boolean;
}

export function StreakCounter({
  streak: initialStreak,
  className = '',
  size = 'md',
  showLongest = true,
}: StreakCounterProps) {
  const [streak, setStreak] = useState<StreakInfo | null>(initialStreak || null);
  const [loading, setLoading] = useState(!initialStreak);

  useEffect(() => {
    if (initialStreak) {
      setStreak(initialStreak);
      return;
    }

    const fetchStreak = async () => {
      try {
        const goServiceUrl = getGoServiceUrl();
        const response = await fetch(`${goServiceUrl}/api/stats`);

        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }

        const data = await response.json();
        setStreak(data.streak || { current_streak: 0, longest_streak: 0, last_active_date: '' });
      } catch (err) {
        console.error('Failed to fetch streak:', err);
        setStreak({ current_streak: 0, longest_streak: 0, last_active_date: '' });
      } finally {
        setLoading(false);
      }
    };

    fetchStreak();
  }, [initialStreak]);

  if (loading) {
    return <StreakSkeleton size={size} showLongest={showLongest} />;
  }

  if (!streak) {
    return null;
  }

  const isOnFire = streak.current_streak >= 3;
  const isPersonalBest =
    streak.current_streak > 0 && streak.current_streak >= streak.longest_streak;

  const sizeClasses = {
    sm: {
      container: 'gap-2 p-2',
      icon: 'h-4 w-4',
      number: 'text-2xl',
      label: 'text-[10px]',
    },
    md: {
      container: 'gap-3 p-3',
      icon: 'h-6 w-6',
      number: 'text-4xl',
      label: 'text-xs',
    },
    lg: {
      container: 'gap-4 p-4',
      icon: 'h-8 w-8',
      number: 'text-6xl',
      label: 'text-sm',
    },
  };

  const styles = sizeClasses[size];

  return (
    <div className={cn('flex items-center', styles.container, className)}>
      {/* Current streak */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <Flame
            className={cn(
              styles.icon,
              isOnFire
                ? 'animate-pulse text-neon-orange drop-shadow-[0_0_8px_hsl(30_100%_50%)]'
                : streak.current_streak > 0
                  ? 'text-neon-orange/60'
                  : 'text-muted-foreground'
            )}
          />
          {isPersonalBest && streak.current_streak > 0 && (
            <Trophy className="absolute -right-1 -top-1 h-3 w-3 text-neon-yellow drop-shadow-[0_0_4px_hsl(60_100%_50%)]" />
          )}
        </div>
        <div
          className={cn(
            'font-mono font-bold tabular-nums',
            styles.number,
            isOnFire
              ? 'text-glow-orange text-neon-orange'
              : streak.current_streak > 0
                ? 'text-neon-orange/80'
                : 'text-muted-foreground'
          )}
        >
          {streak.current_streak}
        </div>
        <div
          className={cn('font-mono uppercase tracking-wider text-muted-foreground', styles.label)}
        >
          Day Streak
        </div>
      </div>

      {/* Longest streak */}
      {showLongest && (
        <>
          <div className="h-12 w-px bg-neon-cyan/20" />
          <div className="flex flex-col items-center">
            <Trophy
              className={cn(
                styles.icon,
                streak.longest_streak > 0 ? 'text-neon-yellow/60' : 'text-muted-foreground'
              )}
            />
            <div
              className={cn(
                'font-mono font-bold tabular-nums',
                styles.number,
                streak.longest_streak > 0 ? 'text-neon-yellow/80' : 'text-muted-foreground'
              )}
            >
              {streak.longest_streak}
            </div>
            <div
              className={cn(
                'font-mono uppercase tracking-wider text-muted-foreground',
                styles.label
              )}
            >
              Best
            </div>
          </div>
        </>
      )}

      {/* Last active - only show if there's activity */}
      {streak.last_active_date && (
        <>
          <div className="h-12 w-px bg-neon-cyan/20" />
          <div className="flex flex-col items-center">
            <Calendar className={cn(styles.icon, 'text-neon-cyan/60')} />
            <div
              className={cn(
                'font-mono text-neon-cyan/80',
                styles.label === 'text-[10px]' ? 'text-xs' : 'text-sm'
              )}
            >
              {formatLastActive(streak.last_active_date)}
            </div>
            <div
              className={cn(
                'font-mono uppercase tracking-wider text-muted-foreground',
                styles.label
              )}
            >
              Last Active
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatLastActive(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function StreakSkeleton({ size, showLongest }: { size: string; showLongest: boolean }) {
  const heightClass = size === 'lg' ? 'h-24' : size === 'md' ? 'h-20' : 'h-16';
  const widthClass = showLongest ? 'w-48' : 'w-24';

  return (
    <div className={cn('flex items-center gap-4', heightClass)}>
      <Skeleton className={cn('rounded', heightClass, widthClass)} />
    </div>
  );
}

export default StreakCounter;

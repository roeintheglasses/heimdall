import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type NavPage = 'dashboard' | 'stats' | 'wrapped';

interface SiteNavProps {
  current?: NavPage;
  className?: string;
}

export default function SiteNav({ current, className }: SiteNavProps) {
  const items: Array<{ page: NavPage; label: string; href: string }> = [
    { page: 'dashboard', label: 'Dashboard', href: '/dashboard' },
    { page: 'stats', label: 'Stats', href: '/me' },
    { page: 'wrapped', label: 'Wrapped', href: '/wrapped' },
  ];

  return (
    <nav aria-label="Main" className={cn('flex items-center gap-1', className)}>
      {items.map((item) => {
        const isCurrent = current === item.page;
        return (
          <Button
            key={item.page}
            asChild
            variant="ghost"
            size="sm"
            className={cn(
              'min-h-11 px-3 font-mono text-xs',
              isCurrent
                ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan'
                : 'text-muted-foreground hover:text-neon-cyan'
            )}
          >
            <Link href={item.href} aria-current={isCurrent ? 'page' : undefined}>
              {item.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}

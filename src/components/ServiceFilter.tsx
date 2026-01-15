'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCategories, useCategoryOperations } from '@/contexts/CategoryContext';
import { DEFAULT_SERVICES } from '@/types/categories';
import { GitBranch, Zap, Train, Activity, Shield, Globe, Terminal, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceFilterProps {
  serviceStats: Record<string, number>;
  className?: string;
}

// Icon mapping for services
const serviceIcons: Record<string, LucideIcon> = {
  GitBranch,
  Zap,
  Train,
  Activity,
  Shield,
  Globe,
};

// Service to neon color mapping
const SERVICE_NEON_MAP: Record<
  string,
  { border: string; bg: string; text: string; shadow: string }
> = {
  github: {
    border: 'border-neon-cyan',
    bg: 'bg-neon-cyan/10',
    text: 'text-neon-cyan',
    shadow: 'shadow-[4px_4px_0_hsl(180_100%_50%)]',
  },
  vercel: {
    border: 'border-neon-magenta',
    bg: 'bg-neon-magenta/10',
    text: 'text-neon-magenta',
    shadow: 'shadow-[4px_4px_0_hsl(300_100%_50%)]',
  },
  railway: {
    border: 'border-neon-green',
    bg: 'bg-neon-green/10',
    text: 'text-neon-green',
    shadow: 'shadow-[4px_4px_0_hsl(120_100%_50%)]',
  },
};

function getNeonColors(serviceId: string) {
  return SERVICE_NEON_MAP[serviceId] || SERVICE_NEON_MAP.github;
}

export default function ServiceFilter({ serviceStats, className = '' }: ServiceFilterProps) {
  const { filter } = useCategories();
  const { selectService, isServiceSelected } = useCategoryOperations();

  // Get available services that have events
  const availableServices = DEFAULT_SERVICES.filter((service) => serviceStats[service.id] > 0);

  // Calculate total events
  const totalEvents = Object.values(serviceStats).reduce((sum, count) => sum + count, 0);

  const handleServiceClick = (serviceId: string) => {
    if (isServiceSelected(serviceId)) {
      selectService(null);
    } else {
      selectService(serviceId);
    }
  };

  if (availableServices.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Terminal-style header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-xs text-neon-cyan">
          <Terminal className="h-3 w-3" />
          <span>SERVICE::FILTER</span>
        </div>
        <Badge variant="outline" className="border-neon-cyan/50 font-mono text-xs text-neon-cyan">
          {String(totalEvents).padStart(4, '0')} TOTAL
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* All Services Button */}
        <Button
          variant={!filter.selectedService ? 'neon' : 'outline'}
          size="sm"
          onClick={() => selectService(null)}
          className={cn(
            'font-mono text-xs transition-all duration-200',
            !filter.selectedService && 'shadow-retro'
          )}
        >
          <Globe className="mr-2 h-4 w-4" />
          ALL
          <Badge
            variant="outline"
            className={cn(
              'ml-2 border-0 text-[10px]',
              !filter.selectedService ? 'bg-neon-cyan/20 text-neon-cyan' : 'bg-muted'
            )}
          >
            {totalEvents}
          </Badge>
        </Button>

        {/* Individual Service Buttons - Arcade style */}
        {availableServices.map((service) => {
          const count = serviceStats[service.id] || 0;
          const isSelected = isServiceSelected(service.id);
          const neonColors = getNeonColors(service.id);
          const IconComponent = serviceIcons[service.icon] || Globe;

          return (
            <Button
              key={service.id}
              variant="outline"
              size="sm"
              onClick={() => handleServiceClick(service.id)}
              className={cn(
                'font-mono text-xs transition-all duration-200',
                'border-2',
                neonColors.border,
                isSelected && [
                  neonColors.bg,
                  neonColors.text,
                  neonColors.shadow,
                  '-translate-x-0.5 -translate-y-0.5',
                ],
                !isSelected && ['hover:' + neonColors.bg, 'hover:' + neonColors.text]
              )}
            >
              <IconComponent className="mr-2 h-4 w-4" />
              {service.name.toUpperCase()}
              {count > 0 && (
                <Badge
                  variant="outline"
                  className={cn(
                    'ml-2 border-0 text-[10px]',
                    isSelected ? neonColors.text : 'bg-muted'
                  )}
                >
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Selected Service Info - Terminal style */}
      {filter.selectedService && (
        <div
          className={cn(
            'mt-3 border-2 p-3 font-mono',
            getNeonColors(filter.selectedService).border,
            getNeonColors(filter.selectedService).bg
          )}
        >
          {(() => {
            const selectedService = DEFAULT_SERVICES.find((s) => s.id === filter.selectedService);
            if (!selectedService) return null;

            const neonColors = getNeonColors(selectedService.id);
            const IconComponent = serviceIcons[selectedService.icon] || Globe;

            return (
              <div className="flex items-start gap-3">
                <div className={cn('border-2 p-2', neonColors.border, neonColors.bg)}>
                  <IconComponent className={cn('h-4 w-4', neonColors.text)} />
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className={cn('text-sm font-bold', neonColors.text)}>
                      {selectedService.name.toUpperCase()}
                    </span>
                    <Badge
                      className={cn('text-[10px]', neonColors.text, neonColors.border, 'border')}
                    >
                      {serviceStats[selectedService.id]} EVENTS
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-neon-magenta">&gt;</span> {selectedService.description}
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

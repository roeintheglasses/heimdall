'use client';

import React from 'react';
import { GitBranch, Zap, Train, Monitor, HelpCircle } from 'lucide-react';
import { getServiceFromEventType, getServiceColorClasses, ServiceInfo } from '@/types/services';

// Icon mapping for services (only includes icons for supported services)
const SERVICE_ICONS = {
  GitBranch, // GitHub
  Zap, // Vercel
  Train, // Railway
  Monitor, // System
  HelpCircle, // Unknown/fallback
} as const;

interface ServiceIconProps {
  eventType?: string;
  service?: ServiceInfo;
  className?: string;
  showTooltip?: boolean;
}

export function ServiceIcon({
  eventType,
  service,
  className = 'h-4 w-4',
  showTooltip = false,
}: ServiceIconProps) {
  // Get service info either from prop or event type
  const serviceInfo = service || (eventType ? getServiceFromEventType(eventType) : null);

  if (!serviceInfo) {
    const FallbackIcon = SERVICE_ICONS.HelpCircle;
    return <FallbackIcon className={className} />;
  }

  const IconComponent =
    SERVICE_ICONS[serviceInfo.icon as keyof typeof SERVICE_ICONS] || SERVICE_ICONS.HelpCircle;
  const colorClasses = getServiceColorClasses(serviceInfo.color);

  const iconElement = (
    <IconComponent className={`${className} ${colorClasses.text} transition-colors duration-200`} />
  );

  if (showTooltip) {
    return (
      <div className="group relative" title={`${serviceInfo.name}: ${serviceInfo.description}`}>
        {iconElement}
        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {serviceInfo.name}
        </div>
      </div>
    );
  }

  return iconElement;
}

// Service badge component that shows both icon and name
interface ServiceBadgeProps {
  eventType?: string;
  service?: ServiceInfo;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showName?: boolean;
  className?: string;
}

export function ServiceBadge({
  eventType,
  service,
  variant = 'outline',
  size = 'sm',
  showIcon = true,
  showName = true,
  className = '',
}: ServiceBadgeProps) {
  const serviceInfo = service || (eventType ? getServiceFromEventType(eventType) : null);

  if (!serviceInfo) return null;

  const colorClasses = getServiceColorClasses(serviceInfo.color);

  const sizeClasses = {
    sm: 'text-xs px-2 py-1 gap-1',
    md: 'text-sm px-3 py-1.5 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2',
  };

  const variantClasses = {
    default: `${colorClasses.badge}`,
    outline: `border ${colorClasses.border} ${colorClasses.text} bg-transparent`,
    secondary: 'bg-secondary text-secondary-foreground',
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-medium transition-colors duration-200 ${sizeClasses[size]} ${variantClasses[variant]} ${className} `}
      title={serviceInfo.description}
    >
      {showIcon && (
        <ServiceIcon
          service={serviceInfo}
          className={`${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'} shrink-0`}
        />
      )}
      {showName && <span className="truncate whitespace-nowrap">{serviceInfo.name}</span>}
    </div>
  );
}

// Service avatar component for larger displays
interface ServiceAvatarProps {
  eventType?: string;
  service?: ServiceInfo;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTooltip?: boolean;
}

export function ServiceAvatar({
  eventType,
  service,
  size = 'md',
  className = '',
  showTooltip = true,
}: ServiceAvatarProps) {
  const serviceInfo = service || (eventType ? getServiceFromEventType(eventType) : null);

  if (!serviceInfo) return null;

  const colorClasses = getServiceColorClasses(serviceInfo.color);

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
    xl: 'h-12 w-12',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
    xl: 'h-6 w-6',
  };

  const avatarElement = (
    <div
      className={` ${sizeClasses[size]} ${colorClasses.bg} ${colorClasses.border} flex items-center justify-center rounded-full border transition-all duration-200 hover:scale-105 hover:shadow-md ${className} `}
    >
      <ServiceIcon service={serviceInfo} className={iconSizes[size]} />
    </div>
  );

  if (showTooltip) {
    return (
      <div className="group relative" title={`${serviceInfo.name}: ${serviceInfo.description}`}>
        {avatarElement}
        <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {serviceInfo.name}
        </div>
      </div>
    );
  }

  return avatarElement;
}

export default ServiceIcon;

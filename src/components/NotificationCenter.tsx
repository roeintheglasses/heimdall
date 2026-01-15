'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/contexts/NotificationContext';
import { NOTIFICATION_CONFIG, type NotificationType } from '@/types/notifications';
import { cn } from '@/lib/utils';
import {
  Bell,
  BellOff,
  X,
  CheckCheck,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Terminal,
  Filter,
} from 'lucide-react';

const ICON_MAP = {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
};

export default function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    filteredNotifications,
    filter,
    setFilter,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    const config = NOTIFICATION_CONFIG[type as keyof typeof NOTIFICATION_CONFIG];
    if (!config) return Info;
    return ICON_MAP[config.icon as keyof typeof ICON_MAP] || Info;
  };

  const getNotificationColor = (type: string) => {
    const config = NOTIFICATION_CONFIG[type as keyof typeof NOTIFICATION_CONFIG];
    return config?.color || 'neon-cyan';
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative h-8 w-8 border-2 p-0',
          'border-neon-cyan/50 hover:bg-neon-cyan/10',
          isOpen && 'border-neon-cyan bg-neon-cyan/10'
        )}
      >
        {notifications.length > 0 ? (
          <Bell className="h-4 w-4 text-neon-cyan" />
        ) : (
          <BellOff className="h-4 w-4 text-muted-foreground" />
        )}

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span
            className={cn(
              'absolute -right-1 -top-1 h-4 min-w-4 px-1',
              'flex items-center justify-center',
              'font-mono text-[10px] font-bold',
              'bg-neon-orange text-terminal-black',
              'animate-pulse'
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className={cn(
            'absolute right-0 top-full z-50 mt-2',
            'w-[calc(100vw-2rem)] max-w-80 sm:max-w-96',
            'border-2 border-neon-cyan bg-terminal-black',
            'font-mono shadow-retro',
            'duration-200 animate-in fade-in-0 slide-in-from-top-2'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-neon-cyan bg-neon-cyan/10 px-3 py-2">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-neon-cyan" />
              <span className="text-xs text-neon-cyan">NOTIFICATIONS</span>
              {unreadCount > 0 && (
                <Badge
                  variant="outline"
                  className="border-neon-orange text-[10px] text-neon-orange"
                >
                  {unreadCount} NEW
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="h-8 w-8 p-0 hover:bg-neon-cyan/20"
              >
                <Filter className={cn('h-3 w-3', showFilters && 'text-neon-cyan')} />
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-8 px-2 text-xs hover:bg-neon-cyan/20"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3 w-3" />
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="h-8 px-2 text-xs text-neon-orange hover:bg-neon-orange/20"
                  title="Clear all"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="space-y-2 border-b border-neon-cyan/30 p-2">
              <div className="text-[10px] text-muted-foreground">FILTER BY TYPE:</div>
              <div className="flex flex-wrap gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilter({ ...filter, type: 'all' })}
                  className={cn(
                    'h-8 px-3 text-[10px]',
                    filter.type === 'all' && 'bg-neon-cyan/20 text-neon-cyan'
                  )}
                >
                  ALL
                </Button>
                {Object.entries(NOTIFICATION_CONFIG).map(([type, config]) => (
                  <Button
                    key={type}
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilter({ ...filter, type: type as NotificationType })}
                    className={cn(
                      'h-8 px-3 text-[10px]',
                      filter.type === type && `bg-${config.color}/20 text-${config.color}`
                    )}
                  >
                    {config.label}
                  </Button>
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground">FILTER BY STATUS:</div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilter({ ...filter, read: 'all' })}
                  className={cn(
                    'h-8 px-3 text-[10px]',
                    filter.read === 'all' && 'bg-neon-cyan/20 text-neon-cyan'
                  )}
                >
                  ALL
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilter({ ...filter, read: false })}
                  className={cn(
                    'h-8 px-3 text-[10px]',
                    filter.read === false && 'bg-neon-orange/20 text-neon-orange'
                  )}
                >
                  UNREAD
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilter({ ...filter, read: true })}
                  className={cn(
                    'h-8 px-3 text-[10px]',
                    filter.read === true && 'bg-neon-green/20 text-neon-green'
                  )}
                >
                  READ
                </Button>
              </div>
            </div>
          )}

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-6 text-center">
                <BellOff className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {notifications.length === 0 ? 'NO_NOTIFICATIONS' : 'NO_MATCHING_NOTIFICATIONS'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neon-cyan/20">
                {filteredNotifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);
                  const color = getNotificationColor(notification.type);

                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        'group relative cursor-pointer p-3',
                        'transition-colors hover:bg-neon-cyan/5',
                        !notification.read && `border-l-2 border-${color}`
                      )}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        <div
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center',
                            'border',
                            `border-${color}`,
                            `bg-${color}/10`
                          )}
                        >
                          <Icon className={cn('h-4 w-4', `text-${color}`)} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4
                              className={cn(
                                'truncate text-xs font-bold',
                                !notification.read && 'text-foreground',
                                notification.read && 'text-muted-foreground'
                              )}
                            >
                              {notification.title}
                            </h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notification.id);
                              }}
                              className="h-5 w-5 shrink-0 p-0 opacity-0 group-hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                            {notification.message}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">
                              {formatTime(notification.createdAt)}
                            </span>
                            {!notification.read && (
                              <span className={cn('h-1.5 w-1.5 rounded-full', `bg-${color}`)} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-neon-cyan/30 px-3 py-2 text-[10px] text-muted-foreground">
            {notifications.length} notifications stored
          </div>
        </div>
      )}
    </div>
  );
}

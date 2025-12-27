'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Notification,
  NotificationFilter,
  NotificationType,
  NotificationPriority,
  MAX_NOTIFICATIONS,
  NOTABLE_EVENT_PATTERNS,
} from '@/types/notifications';
import { DashboardEvent } from '@/types/categories';

const STORAGE_KEY = 'heimdall-notifications';

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  filter: NotificationFilter;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  setFilter: (filter: NotificationFilter) => void;
  processEvent: (event: DashboardEvent) => void;
  filteredNotifications: Notification[];
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>({
    type: 'all',
    read: 'all',
    priority: 'all',
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [processedEventIds] = useState<Set<string>>(new Set());

  // Load notifications from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setNotifications(parsed);
          // Mark existing event IDs as processed
          parsed.forEach((n: Notification) => {
            if (n.eventId) {
              processedEventIds.add(n.eventId);
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to load notifications from localStorage:', error);
    }
    setIsInitialized(true);
  }, [processedEventIds]);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('Failed to save notifications to localStorage:', error);
    }
  }, [notifications, isInitialized]);

  // Calculate unread count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filter.type !== 'all' && n.type !== filter.type) return false;
      if (filter.read !== 'all' && n.read !== filter.read) return false;
      if (filter.priority !== 'all' && n.priority !== filter.priority) return false;
      return true;
    });
  }, [notifications, filter]);

  // Add a new notification
  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
      const newNotification: Notification = {
        ...notification,
        id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) => {
        // Add new notification at the beginning
        const updated = [newNotification, ...prev];
        // Trim to max notifications
        return updated.slice(0, MAX_NOTIFICATIONS);
      });
    },
    []
  );

  // Mark a notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Remove a notification
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Process an event and create notification if notable
  const processEvent = useCallback(
    (event: DashboardEvent) => {
      // Skip if already processed
      if (event.id && processedEventIds.has(event.id)) {
        return;
      }

      // Check each pattern
      for (const [_key, pattern] of Object.entries(NOTABLE_EVENT_PATTERNS)) {
        if (pattern.match(event)) {
          addNotification({
            type: pattern.type,
            title: pattern.generateTitle(event),
            message: pattern.generateMessage(event),
            eventId: event.id,
            eventType: event.event_type,
            priority: pattern.priority,
            metadata: event.metadata,
          });

          // Mark as processed
          if (event.id) {
            processedEventIds.add(event.id);
          }

          // Only create one notification per event
          break;
        }
      }
    },
    [addNotification, processedEventIds]
  );

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    filter,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    setFilter,
    processEvent,
    filteredNotifications,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

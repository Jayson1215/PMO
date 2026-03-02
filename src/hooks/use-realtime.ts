'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook to subscribe to real-time booking updates
 */
export function useRealtimeBookings(userId?: string, isAdmin = false) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const supabase = createBrowserClient();

  useEffect(() => {
    if (!userId) return;

    const filter = isAdmin
      ? undefined
      : `borrower_id=eq.${userId}`;

    const ch = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          // Dispatch custom event for components to listen to
          window.dispatchEvent(
            new CustomEvent('booking-change', { detail: payload })
          );
        }
      )
      .subscribe();

    setChannel(ch);

    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, isAdmin]);

  return channel;
}

/**
 * Hook to subscribe to real-time notification updates
 */
export function useRealtimeNotifications(userId?: string) {
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createBrowserClient();

  useEffect(() => {
    if (!userId) return;

    // Get initial unread count
    const fetchCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      setUnreadCount(count || 0);
    };

    fetchCount();

    const ch = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setUnreadCount((prev) => prev + 1);
          window.dispatchEvent(
            new CustomEvent('new-notification', { detail: payload.new })
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if ((payload.new as any).is_read && !(payload.old as any).is_read) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId]);

  return { unreadCount, setUnreadCount };
}

/**
 * Hook to subscribe to real-time equipment availability changes
 */
export function useRealtimeEquipment() {
  const supabase = createBrowserClient();

  useEffect(() => {
    const ch = supabase
      .channel('equipment-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment',
        },
        (payload) => {
          window.dispatchEvent(
            new CustomEvent('equipment-change', { detail: payload })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);
}

/**
 * Generic hook to listen for custom real-time events
 */
export function useRealtimeEvent<T = any>(
  eventName: string,
  callback: (data: T) => void
) {
  useEffect(() => {
    const handler = (e: Event) => {
      callback((e as CustomEvent).detail);
    };

    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [eventName, callback]);
}

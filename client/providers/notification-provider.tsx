'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { NotificationDto } from '@/types/scheduling';

interface NotificationContextValue {
  /** Push a notification into the cache (used by SSE). */
  pushNotification: (notification: NotificationDto) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

const serverUrl = process.env.NEXT_PUBLIC_SERVER_BASE_URL;

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  const pushNotification = useCallback(
    (notification: NotificationDto) => {
      // Update notifications list cache for all query variations (e.g. different limit/offset)
      queryClient.setQueriesData<NotificationDto[]>(
        { queryKey: ['notifications'], exact: false, type: 'active' },
        (old: NotificationDto[] | undefined) => {
          if (!old) return [notification];
          return [notification, ...old];
        },
      );

      // Update unread count
      queryClient.setQueriesData<{ count: number }>(
        { queryKey: ['notifications', 'unread-count'] },
        (old: { count: number } | undefined) => ({
          count: (old?.count ?? 0) + 1,
        }),
      );
    },
    [queryClient],
  );

  useEffect(() => {
    if (!serverUrl) return;

    const connect = () => {
      const es = new EventSource(`${serverUrl}/notifications/stream`, {
        withCredentials: true,
      });

      es.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data) as NotificationDto;
          pushNotification(notification);
        } catch {
          // ignore malformed events
        }
      };

      es.onerror = () => {
        es.close();
        // Reconnect after 5 seconds
        setTimeout(connect, 5000);
      };

      eventSourceRef.current = es;
    };

    connect();

    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [pushNotification]);

  return (
    <NotificationContext.Provider value={{ pushNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  return useContext(NotificationContext);
}

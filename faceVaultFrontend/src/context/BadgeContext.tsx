import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { apiFetchUnreadNotificationCount } from '../api/socialApi';
import { apiFetchUnreadMessageCount } from '../api/usersApi';

// ── BadgeContext ──────────────────────────────────────────────────────────────
//
// Holds the two live unread counts shown as badges across the app:
//   • notifCount    → unread follow / like / comment notifications (heart tab)
//   • messageCount  → total unread direct messages (DM icon)
//   • unreadBySender → per-conversation unread counts (for the Messages list)
//
// It seeds the counts from the backend on login, then keeps them live by
// listening to the same socket events the app already emits:
//   • "new_notification" → a notification arrived  → notifCount + 1
//   • "receive_message"  → a DM arrived            → messageCount + 1
//
// Screens call the clear/refresh helpers when the user views that content
// (e.g. opening the Notifications tab clears the notif badge).

type BadgeContextType = {
  notifCount: number;
  messageCount: number;
  unreadBySender: Record<string, number>;
  refresh: () => void;
  clearNotifCount: () => void;
  // Clear unread messages from one sender (when you open that chat).
  clearMessagesFrom: (senderId: string) => void;
};

const BadgeContext = createContext<BadgeContextType>({
  notifCount: 0,
  messageCount: 0,
  unreadBySender: {},
  refresh: () => {},
  clearNotifCount: () => {},
  clearMessagesFrom: () => {},
});

export function BadgeProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const { socket } = useSocket();

  const [notifCount, setNotifCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [unreadBySender, setUnreadBySender] = useState<Record<string, number>>({});

  // Seed both counts from the backend.
  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const [notif, msg] = await Promise.all([
        apiFetchUnreadNotificationCount(token),
        apiFetchUnreadMessageCount(token),
      ]);
      setNotifCount(notif);
      setMessageCount(msg.count);
      setUnreadBySender(msg.bySender || {});
    } catch {
      // ignore — badges are best-effort
    }
  }, [token]);

  // Load once we're authenticated.
  useEffect(() => {
    if (isAuthenticated) refresh();
    else {
      setNotifCount(0);
      setMessageCount(0);
      setUnreadBySender({});
    }
  }, [isAuthenticated, refresh]);

  // Live updates from the socket.
  useEffect(() => {
    if (!socket) return;

    const onNotif = () => setNotifCount(c => c + 1);
    const onMessage = (msg: { sender: string }) => {
      setMessageCount(c => c + 1);
      setUnreadBySender(prev => ({
        ...prev,
        [msg.sender]: (prev[msg.sender] || 0) + 1,
      }));
    };

    socket.on('new_notification', onNotif);
    socket.on('receive_message', onMessage);
    return () => {
      socket.off('new_notification', onNotif);
      socket.off('receive_message', onMessage);
    };
  }, [socket]);

  const clearNotifCount = useCallback(() => setNotifCount(0), []);

  const clearMessagesFrom = useCallback((senderId: string) => {
    setUnreadBySender(prev => {
      const removed = prev[senderId] || 0;
      if (!removed) return prev;
      setMessageCount(c => Math.max(0, c - removed));
      const next = { ...prev };
      delete next[senderId];
      return next;
    });
  }, []);

  return (
    <BadgeContext.Provider
      value={{
        notifCount,
        messageCount,
        unreadBySender,
        refresh,
        clearNotifCount,
        clearMessagesFrom,
      }}>
      {children}
    </BadgeContext.Provider>
  );
}

export function useBadges() {
  return useContext(BadgeContext);
}

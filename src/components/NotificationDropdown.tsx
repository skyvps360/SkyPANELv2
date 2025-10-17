/**
 * NotificationDropdown Component
 * Real-time notification dropdown with SSE support
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { buildApiUrl } from "@/lib/api";

interface Notification {
  id: string;
  user_id: string;
  organization_id?: string | null;
  event_type: string;
  entity_type: string;
  entity_id?: string | null;
  message?: string | null;
  status: 'success' | 'warning' | 'error' | 'info';
  metadata?: Record<string, unknown>;
  created_at: string;
  is_read: boolean;
  read_at?: string | null;
}
const statusVariant: Record<Notification["status"], string> = {
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  error: "bg-red-500/10 text-red-600 dark:text-red-300",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
};

const formatTimeAgo = (timestamp: string) => {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const NotificationDropdown: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const eventSourceRef = useRef<EventSource | null>(null);

  const syncUnreadCount = (items: Notification[]) => {
    setUnreadCount(items.filter((n) => !n.is_read).length);
  };

  const markAsRead = async (notificationId: string) => {
    if (!token) return;
    try {
      const response = await fetch(buildApiUrl(`/api/notifications/${notificationId}/read`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to mark notification as read");

      setNotifications((prev) => {
        const next = prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        );
        syncUnreadCount(next);
        return next;
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to mark notification as read");
    }
  };

  const markAllAsRead = async () => {
    if (!token || unreadCount === 0) return;
    try {
      const response = await fetch(buildApiUrl("/api/notifications/read-all"), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to mark all notifications as read");

      setNotifications((prev) => {
        const next = prev.map((notification) => ({
          ...notification,
          is_read: true,
          read_at: new Date().toISOString(),
        }));
        syncUnreadCount(next);
        return next;
      });
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast.error("Failed to mark all notifications as read");
    }
  };

  const loadNotifications = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl("/api/notifications/unread?limit=20"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch notifications");

      const payload = await response.json();
      const items: Notification[] = payload.notifications || [];
      setNotifications(items);
      syncUnreadCount(items);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 5000; // 5 seconds

    const connectEventSource = () => {
      if (eventSource) {
        eventSource.close();
      }

      // EventSource doesn't support custom headers, so we pass the token as a query parameter
      const url = token 
        ? buildApiUrl(`/api/notifications/stream?token=${encodeURIComponent(token)}`)
        : buildApiUrl("/api/notifications/stream");

      eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data);
          setNotifications((prev) => [notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        } catch (error) {
          console.error("Error parsing notification:", error);
        }
      };

      eventSource.onopen = () => {
        retryCount = 0; // Reset retry count on successful connection
      };

      eventSource.onerror = () => {
        eventSource?.close();
        
        // Only show console warnings after the first retry attempt fails
        if (retryCount > 0) {
          console.warn(`Notification stream connection failed. Retry ${retryCount}/${maxRetries}`);
        }
        
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(connectEventSource, retryDelay);
        } else {
          console.warn("Notification stream: Max retries reached. Notifications will not be real-time.");
        }
      };
    };

    if (token) {
      connectEventSource();
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [token]);

  const hasNotifications = notifications.length > 0;

  useEffect(() => {
    if (open && notifications.length === 0) {
      loadNotifications();
    }
  }, [open, notifications.length, loadNotifications]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Open notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-medium">Notifications</p>
            <p className="text-xs text-muted-foreground">
              Stay on top of provisioning and billing updates.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-transparent"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            aria-label="Mark all as read"
          >
            <CheckCheck className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            Loading notifications…
          </div>
        ) : !hasNotifications ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
            You are all caught up.
          </div>
        ) : (
          <ScrollArea className="max-h-[320px]">
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 transition-colors ${
                    notification.is_read ? "bg-background" : "bg-muted/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={statusVariant[notification.status] || statusVariant.info}>
                          {notification.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(notification.created_at)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {notification.message || `${notification.event_type} ${notification.entity_type}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notification.entity_type}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mt-1"
                        onClick={() => markAsRead(notification.id)}
                        aria-label="Mark notification as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {hasNotifications && (
          <>
            <Separator />
            <div className="px-4 py-3">
              <Button
                variant="link"
                className="px-0 text-sm"
                onClick={() => setOpen(false)}
                asChild
              >
                <a href="/activity">View all activity</a>
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationDropdown;

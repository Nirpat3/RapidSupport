import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, Bell, Check, CheckCheck, Trash2, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { ActivityNotification } from "@shared/schema";

export default function ActivityPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const { toast } = useToast();

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<ActivityNotification[]>({
    queryKey: ['/api/activity/notifications', { search: searchQuery, unreadOnly: showUnreadOnly }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (showUnreadOnly) params.append('unreadOnly', 'true');
      return apiRequest(`/api/activity/notifications?${params.toString()}`, 'GET');
    },
  });

  // Fetch unread count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/activity/notifications/unread-count'],
    queryFn: () => apiRequest('/api/activity/notifications/unread-count', 'GET'),
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => 
      apiRequest(`/api/activity/notifications/${notificationId}/read`, 'PATCH'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activity/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activity/notifications/unread-count'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiRequest('/api/activity/notifications/read-all', 'PATCH'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activity/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activity/notifications/unread-count'] });
      toast({
        title: "All notifications marked as read",
      });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) => 
      apiRequest(`/api/activity/notifications/${notificationId}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activity/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activity/notifications/unread-count'] });
      toast({
        title: "Notification deleted",
      });
    },
  });

  const handleNotificationClick = (notification: ActivityNotification) => {
    // Mark as read
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate to the link if available
    if (notification.link) {
      setLocation(notification.link);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return '💬';
      case 'tag':
        return '🏷️';
      case 'reminder':
        return '⏰';
      case 'assignment':
        return '📋';
      case 'comment':
        return '💭';
      case 'system':
        return '🔔';
      default:
        return '📌';
    }
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-activity-title">Activity</h1>
            <p className="text-muted-foreground">
              Your notifications and activity updates
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadData && unreadData.count > 0 && (
              <Badge variant="default" data-testid="badge-unread-count">
                {unreadData.count} unread
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending || !notifications.some(n => !n.isRead)}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-notifications"
            />
          </div>
          <Button
            variant={showUnreadOnly ? "default" : "outline"}
            size="icon"
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            data-testid="button-filter-unread"
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchQuery || showUnreadOnly ? "No notifications found" : "No notifications yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`hover-elevate cursor-pointer transition-all ${
                  !notification.isRead ? 'border-primary/50' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
                data-testid={`card-notification-${notification.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm mb-1" data-testid={`text-notification-title-${notification.id}`}>
                            {notification.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <Badge variant="default" className="shrink-0">
                            New
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </span>
                        {notification.linkType && (
                          <Badge variant="outline" className="text-xs">
                            {notification.linkType}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsReadMutation.mutate(notification.id);
                          }}
                          data-testid={`button-mark-read-${notification.id}`}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotificationMutation.mutate(notification.id);
                        }}
                        data-testid={`button-delete-${notification.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

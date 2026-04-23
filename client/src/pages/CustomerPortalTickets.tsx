import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Ticket, Clock, CheckCircle, AlertCircle, ChevronRight, Plus, MessageSquare } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Open", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: AlertCircle },
  "in-progress": { label: "In Progress", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: Clock },
  closed: { label: "Resolved", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", icon: CheckCircle },
};

const priorityConfig: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
  high: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300",
  urgent: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300",
};

export default function CustomerPortalTickets() {
  const [, setLocation] = useLocation();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["/api/customer/tickets"],
    queryFn: () => apiRequest("/api/customer/tickets", "GET"),
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
      </div>
    );
  }

  const ticketList: any[] = tickets || [];
  const openCount = ticketList.filter(t => t.status === "open" || t.status === "in-progress").length;
  const closedCount = ticketList.filter(t => t.status === "closed").length;

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="w-6 h-6 text-primary" />
            My Support Tickets
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {openCount} open · {closedCount} resolved
          </p>
        </div>
        <Button onClick={() => setLocation("/portal/chat")} className="gap-2">
          <Plus className="w-4 h-4" />
          New Request
        </Button>
      </div>

      {ticketList.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No tickets yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Start a conversation with our support team and we'll create a ticket for you.</p>
            <Button onClick={() => setLocation("/portal/chat")}>Start a Conversation</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ticketList.map((ticket: any) => {
            const status = statusConfig[ticket.status] || statusConfig.open;
            const StatusIcon = status.icon;
            const isOpen = ticket.status !== "closed";
            const resolutionTime = ticket.resolvedAt && ticket.createdAt
              ? Math.round((new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime()) / 60000)
              : null;

            return (
              <Card
                key={ticket.id}
                className="cursor-pointer hover-elevate transition-all"
                onClick={() => setLocation(`/portal/tickets/${ticket.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig[ticket.priority] || priorityConfig.medium}`}>
                          {ticket.priority}
                        </span>
                        <span className="text-xs text-muted-foreground">#{ticket.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                      <h3 className="font-semibold text-sm truncate">{ticket.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ticket.description}</p>

                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                        </span>
                        {resolutionTime && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="w-3 h-3" />
                            Resolved in {resolutionTime < 60 ? `${resolutionTime}m` : `${Math.round(resolutionTime / 60)}h`}
                          </span>
                        )}
                        {ticket.category && (
                          <span className="bg-muted px-1.5 py-0.5 rounded">{ticket.category}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

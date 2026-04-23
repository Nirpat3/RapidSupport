import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useParams, useLocation } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { ArrowLeft, Clock, CheckCircle, AlertCircle, MessageSquare, Send, Star, Ticket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Open", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: AlertCircle },
  "in-progress": { label: "In Progress", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: Clock },
  closed: { label: "Resolved", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", icon: CheckCircle },
};

export default function CustomerPortalTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["/api/customer/tickets", id],
    queryFn: () => apiRequest(`/api/customer/tickets/${id}`, "GET"),
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest(`/api/customer/tickets/${id}/comments`, "POST", { content }),
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["/api/customer/tickets", id] });
      toast({ title: "Comment added" });
    },
    onError: () => {
      toast({ title: "Failed to add comment", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-60 w-full rounded-xl" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center py-20">
        <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-2">Ticket not found</h3>
        <Button variant="outline" onClick={() => setLocation("/portal/tickets")}>
          Back to Tickets
        </Button>
      </div>
    );
  }

  const status = statusConfig[ticket.status] || statusConfig.open;
  const StatusIcon = status.icon;
  const comments: any[] = ticket.comments || [];
  const resolutionTime = ticket.resolvedAt && ticket.createdAt
    ? Math.round((new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime()) / 60000)
    : null;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => setLocation("/portal/tickets")} className="gap-1 -ml-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Tickets
      </Button>

      {/* Ticket Header Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </span>
                <span className="text-xs text-muted-foreground font-mono">#{ticket.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <CardTitle className="text-lg">{ticket.title}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t text-xs text-muted-foreground">
            <div>
              <span className="font-medium text-foreground block">Category</span>
              {ticket.category || "General"}
            </div>
            <div>
              <span className="font-medium text-foreground block">Priority</span>
              <span className="capitalize">{ticket.priority}</span>
            </div>
            <div>
              <span className="font-medium text-foreground block">Created</span>
              {format(new Date(ticket.createdAt), "MMM d, yyyy 'at' h:mm a")}
            </div>
            {ticket.resolvedAt && (
              <div>
                <span className="font-medium text-emerald-600 dark:text-emerald-400 block">Resolved</span>
                {resolutionTime
                  ? `${resolutionTime < 60 ? `${resolutionTime}m` : `${Math.round(resolutionTime / 60)}h`} after creation`
                  : format(new Date(ticket.resolvedAt), "MMM d, yyyy")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comments Thread */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Conversation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No messages yet. Add a comment below.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment: any) => {
                const isCustomer = comment.authorType === "customer";
                const isSystem = comment.authorType === "system";
                return (
                  <div key={comment.id} className={`flex gap-3 ${isCustomer ? "flex-row-reverse" : ""}`}>
                    {!isSystem && (
                      <Avatar className="w-7 h-7 flex-shrink-0">
                        <AvatarFallback className={`text-xs ${isCustomer ? "bg-primary/10 text-primary" : "bg-muted"}`}>
                          {(comment.authorName || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`flex-1 ${isSystem ? "text-center" : ""}`}>
                      {isSystem ? (
                        <p className="text-xs text-muted-foreground italic py-1">{comment.content}</p>
                      ) : (
                        <div className={`rounded-xl px-3 py-2 text-sm max-w-xs ${isCustomer
                          ? "bg-primary text-primary-foreground ml-auto"
                          : "bg-muted"
                        }`}>
                          <p className="whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      )}
                      {!isSystem && (
                        <p className={`text-xs text-muted-foreground mt-0.5 ${isCustomer ? "text-right" : ""}`}>
                          {comment.authorName} · {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add comment */}
          {ticket.status !== "closed" ? (
            <div className="pt-2 border-t space-y-2">
              <Textarea
                placeholder="Write a message…"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => addCommentMutation.mutate(newComment)}
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                  className="gap-1"
                >
                  <Send className="w-3 h-3" />
                  Send
                </Button>
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t text-center text-sm text-muted-foreground">
              This ticket is resolved. <button className="text-primary underline" onClick={() => setNewComment("I need to reopen this ticket: ")}>Reopen by replying</button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

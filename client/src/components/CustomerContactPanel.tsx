import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow, format } from "date-fns";
import {
  User, Mail, Phone, Building2, Clock, MessageSquare,
  BookOpen, Star, Edit3, Check, X, ExternalLink,
  AlertCircle, CheckCircle, Loader2, TrendingUp, Calendar
} from "lucide-react";
import { useLocation } from "wouter";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  createdAt?: string;
  leadStatus?: string;
  leadScore?: number;
  tags?: string[];
}

interface Conversation {
  id: string;
  title?: string;
  status: string;
  priority: string;
  createdAt: string;
  lastMessage?: { content: string; timestamp: string };
}

interface KBArticle {
  id: string;
  title: string;
  categoryId?: string;
}

interface Props {
  customerId: string;
  conversationId?: string;
  onClose?: () => void;
}

const statusColor: Record<string, string> = {
  open: "text-blue-500",
  pending: "text-amber-500",
  resolved: "text-emerald-500",
  closed: "text-muted-foreground",
};

const statusIcon: Record<string, any> = {
  open: AlertCircle,
  pending: Clock,
  resolved: CheckCircle,
  closed: CheckCircle,
};

const leadStatusColor: Record<string, string> = {
  new: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  contacted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  qualified: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  converted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  lost: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function CustomerContactPanel({ customerId, conversationId, onClose }: Props) {
  const [, setLocation] = useLocation();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");

  const { data: customer, isLoading: loadingCustomer } = useQuery<Customer>({
    queryKey: ["/api/customers", customerId],
    queryFn: () => apiRequest(`/api/customers/${customerId}`, "GET"),
    enabled: !!customerId,
  });

  const { data: conversations = [], isLoading: loadingConversations } = useQuery<Conversation[]>({
    queryKey: ["/api/customers", customerId, "conversations"],
    queryFn: () => apiRequest(`/api/customers/${customerId}/conversations`, "GET"),
    enabled: !!customerId,
  });

  const { data: suggestedArticles = [], isLoading: loadingSuggestions } = useQuery<KBArticle[]>({
    queryKey: ["/api/customers", customerId, "kb-suggestions", conversationId],
    queryFn: () => apiRequest(`/api/customers/${customerId}/kb-suggestions${conversationId ? `?conversationId=${conversationId}` : ""}`, "GET"),
    enabled: !!customerId,
  });

  const updateNotesMutation = useMutation({
    mutationFn: (notes: string) => apiRequest(`/api/customers/${customerId}/notes`, "PATCH", { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId] });
      setIsEditingNotes(false);
    },
  });

  const startEditNotes = () => {
    setNotesValue(customer?.notes || "");
    setIsEditingNotes(true);
  };

  const saveNotes = () => updateNotesMutation.mutate(notesValue);

  if (loadingCustomer) {
    return (
      <div className="w-80 border-l flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!customer) return null;

  const initials = customer.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const otherConversations = conversations.filter(c => c.id !== conversationId);
  const totalConversations = conversations.length;
  const resolvedCount = conversations.filter(c => c.status === "resolved" || c.status === "closed").length;

  return (
    <div className="w-80 border-l flex flex-col bg-background overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contact</span>
        {onClose && (
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Customer Profile */}
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{customer.name}</div>
              {customer.company && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{customer.company}</span>
                </div>
              )}
              {customer.leadStatus && (
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${leadStatusColor[customer.leadStatus] || leadStatusColor.new}`}>
                  {customer.leadStatus}
                </span>
              )}
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-2">
            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate text-muted-foreground">{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{customer.phone}</span>
              </div>
            )}
            {customer.createdAt && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Customer since {format(new Date(customer.createdAt), "MMM yyyy")}</span>
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/50 rounded-md p-2.5 text-center">
              <div className="text-lg font-bold">{totalConversations}</div>
              <div className="text-xs text-muted-foreground">Conversations</div>
            </div>
            <div className="bg-muted/50 rounded-md p-2.5 text-center">
              <div className="text-lg font-bold text-green-600">{resolvedCount}</div>
              <div className="text-xs text-muted-foreground">Resolved</div>
            </div>
          </div>

          {/* Tags */}
          {customer.tags && customer.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {customer.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}

          <Separator />

          {/* Tabs for History and Suggestions */}
          <Tabs defaultValue="history">
            <TabsList className="w-full">
              <TabsTrigger value="history" className="flex-1 text-xs">
                <MessageSquare className="h-3 w-3 mr-1" />
                History
              </TabsTrigger>
              <TabsTrigger value="faqs" className="flex-1 text-xs">
                <BookOpen className="h-3 w-3 mr-1" />
                Suggestions
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex-1 text-xs">
                <Edit3 className="h-3 w-3 mr-1" />
                Notes
              </TabsTrigger>
            </TabsList>

            {/* History tab */}
            <TabsContent value="history" className="mt-3 space-y-2">
              {loadingConversations ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : otherConversations.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No other conversations</p>
              ) : (
                otherConversations.slice(0, 8).map(conv => {
                  const Icon = statusIcon[conv.status] || MessageSquare;
                  return (
                    <button
                      key={conv.id}
                      className="w-full text-left p-2.5 rounded-md hover-elevate text-xs group border border-border/50"
                      onClick={() => setLocation(`/conversations/${conv.id}`)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`flex items-center gap-1 font-medium ${statusColor[conv.status] || ""}`}>
                          <Icon className="h-3 w-3 shrink-0" />
                          {conv.status}
                        </span>
                        <span className="text-muted-foreground">{formatDistanceToNow(new Date(conv.createdAt), { addSuffix: true })}</span>
                      </div>
                      <div className="mt-1 text-muted-foreground truncate">
                        {conv.title || conv.lastMessage?.content || "No messages"}
                      </div>
                    </button>
                  );
                })
              )}
              {otherConversations.length > 8 && (
                <p className="text-xs text-center text-muted-foreground">
                  +{otherConversations.length - 8} more conversations
                </p>
              )}
            </TabsContent>

            {/* FAQ Suggestions tab */}
            <TabsContent value="faqs" className="mt-3 space-y-2">
              {loadingSuggestions ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : suggestedArticles.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No knowledge base articles suggested</p>
              ) : (
                suggestedArticles.map(article => (
                  <button
                    key={article.id}
                    className="w-full text-left p-2.5 rounded-md hover-elevate text-xs border border-border/50"
                    onClick={() => setLocation(`/knowledge/${article.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-3 w-3 text-primary shrink-0" />
                      <span className="font-medium truncate">{article.title}</span>
                    </div>
                  </button>
                ))
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs gap-1"
                onClick={() => setLocation("/knowledge-management")}
              >
                <ExternalLink className="h-3 w-3" />
                Browse Knowledge Base
              </Button>
            </TabsContent>

            {/* Notes tab */}
            <TabsContent value="notes" className="mt-3">
              {isEditingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    value={notesValue}
                    onChange={e => setNotesValue(e.target.value)}
                    placeholder="Add notes about this customer..."
                    className="min-h-[120px] text-xs"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={saveNotes}
                      disabled={updateNotesMutation.isPending}
                    >
                      {updateNotesMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditingNotes(false)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {customer.notes ? (
                    <div className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded-md p-3">
                      {customer.notes}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">No notes yet</p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 gap-1 text-xs"
                    onClick={startEditNotes}
                  >
                    <Edit3 className="h-3 w-3" />
                    {customer.notes ? "Edit Notes" : "Add Notes"}
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* View full profile link */}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-xs"
            onClick={() => setLocation(`/customers/${customerId}`)}
          >
            <User className="h-3 w-3" />
            View Full Profile
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}

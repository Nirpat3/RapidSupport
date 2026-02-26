import { useQuery, useMutation } from "@tanstack/react-query";
import { CommLayout } from "./CommLayout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Plus, Search, Send, User, MoreVertical } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface DMThread {
  id: string;
  participantId: string;
  participantName: string;
  participantEmail: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

interface DMMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  readAt?: string;
}

export default function CommMessages() {
  const { toast } = useToast();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isNewDmOpen, setIsNewDmOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const { data: threads, isLoading: loadingThreads } = useQuery<DMThread[]>({
    queryKey: ["/api/customer-portal/comm/dms"],
  });

  const { data: users, isLoading: loadingUsers } = useQuery<any[]>({
    queryKey: ["/api/customer-portal/comm/users/search", userSearch],
    enabled: userSearch.length > 2,
  });

  const startDmMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("/api/customer-portal/comm/dms", "POST", { participantId: userId });
    },
    onSuccess: (data) => {
      setIsNewDmOpen(false);
      setUserSearch("");
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/comm/dms"] });
      setSelectedThreadId(data.id);
    },
  });

  const selectedThread = threads?.find(t => t.id === selectedThreadId);

  return (
    <CommLayout>
      <div className="flex h-full border rounded-lg overflow-hidden bg-card">
        {/* Thread List */}
        <div className="w-80 border-r flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
            </h3>
            <Dialog open={isNewDmOpen} onOpenChange={setIsNewDmOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Message</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search users..." 
                      className="pl-9"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {loadingUsers ? (
                         Array(3).fill(0).map((_, i) => <div key={i} className="h-12 bg-accent animate-pulse rounded" />)
                      ) : users?.length === 0 ? (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          {userSearch.length > 2 ? "No users found" : "Type at least 3 characters to search"}
                        </div>
                      ) : (
                        users?.map((user) => (
                          <Button
                            key={user.id}
                            variant="ghost"
                            className="w-full justify-start gap-3 h-14"
                            onClick={() => startDmMutation.mutate(user.id)}
                            disabled={startDmMutation.isPending}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{user.name.split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
                            </Avatar>
                            <div className="text-left flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{user.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                          </Button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {loadingThreads ? (
                Array(5).fill(0).map((_, i) => <div key={i} className="h-16 bg-accent animate-pulse rounded m-1" />)
              ) : threads?.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground px-4">
                  No message threads yet. Start a new conversation to connect with your team!
                </div>
              ) : (
                threads?.map((thread) => (
                  <Button
                    key={thread.id}
                    variant={selectedThreadId === thread.id ? "secondary" : "ghost"}
                    className="w-full justify-start gap-3 h-16 p-3 group relative"
                    onClick={() => setSelectedThreadId(thread.id)}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback>{thread.participantName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="font-semibold text-sm truncate">{thread.participantName}</span>
                        {thread.lastMessageAt && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatDistanceToNow(new Date(thread.lastMessageAt))} ago
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {thread.lastMessage || "No messages yet"}
                      </p>
                    </div>
                    {thread.unreadCount > 0 && (
                      <span className="absolute right-2 top-2 h-2 w-2 bg-primary rounded-full" />
                    )}
                  </Button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Conversation Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedThread ? (
            <>
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{selectedThread.participantName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-sm">{selectedThread.participantName}</h3>
                    <p className="text-xs text-muted-foreground">{selectedThread.participantEmail}</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>

              <DMThread threadId={selectedThread.id} />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
              <MessageSquare className="h-12 w-12 opacity-20 mb-4" />
              <h3 className="text-lg font-medium">Select a conversation</h3>
              <p className="text-sm text-center">
                Choose a chat from the left or start a new message to get connected.
              </p>
            </div>
          )}
        </div>
      </div>
    </CommLayout>
  );
}

function DMThread({ threadId }: { threadId: string }) {
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery<DMMessage[]>({
    queryKey: ["/api/customer-portal/comm/dms", threadId, "messages"],
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest(`/api/customer-portal/comm/dms/${threadId}/messages`, "POST", { content });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/comm/dms", threadId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/comm/dms"] });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() || sendMutation.isPending) return;
    sendMutation.mutate(message);
  };

  return (
    <>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {isLoading ? (
             <div className="flex items-center justify-center py-12">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
             </div>
          ) : messages?.map((msg) => (
            <div key={msg.id} className={cn("flex", msg.senderName === "You" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] rounded-lg p-3 text-sm",
                msg.senderName === "You" 
                  ? "bg-primary text-primary-foreground rounded-br-none" 
                  : "bg-accent/30 text-foreground border rounded-bl-none"
              )}>
                <p>{msg.content}</p>
                <div className={cn(
                  "text-[10px] mt-1 opacity-70",
                  msg.senderName === "You" ? "text-right" : "text-left"
                )}>
                  {formatDistanceToNow(new Date(msg.createdAt))} ago
                </div>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input 
            placeholder="Type a message..." 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button size="icon" disabled={!message.trim() || sendMutation.isPending} onClick={handleSend}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

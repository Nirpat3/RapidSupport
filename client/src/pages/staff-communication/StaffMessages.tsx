import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageSquare, Send, Search, Loader2, MoreVertical, Plus } from "lucide-react";
import type { CommDirectThread, CommDirectMessage, User, Customer } from "@shared/schema";
import { format } from "date-fns";

import { useAuth } from "@/contexts/AuthContext";

export default function StaffMessages() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"staff" | "customers">("staff");

  const { data: threads = [], isLoading: threadsLoading } = useQuery<CommDirectThread[]>({
    queryKey: ["/api/comm/dms"],
    queryFn: async () => apiRequest("/api/comm/dms", "GET")
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<CommDirectMessage[]>({
    queryKey: ["/api/comm/dms", selectedThread, "messages"],
    queryFn: async () => {
      return apiRequest(`/api/comm/dms/${selectedThread}/messages`, "GET");
    },
    enabled: !!selectedThread,
    refetchInterval: 5000,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => apiRequest("/api/users", "GET")
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => apiRequest("/api/customers", "GET")
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest(`/api/comm/dms/${selectedThread}/messages`, "POST", { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comm/dms", selectedThread, "messages"] });
      setNewMessage("");
    },
  });

  const getParticipantInfo = (thread: CommDirectThread) => {
    const isA = thread.participantAId === currentUser?.id && thread.participantAType === 'staff';
    const otherId = isA ? thread.participantBId : thread.participantAId;
    const otherType = isA ? thread.participantBType : thread.participantAType;

    if (otherType === 'staff') {
      const user = users.find(u => u.id === otherId);
      return { name: user?.name || 'Staff Member', id: otherId, type: otherType };
    } else {
      const customer = customers.find(c => c.id === otherId);
      return { name: customer?.name || 'Customer', id: otherId, type: otherType };
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedThread) return;
    sendMessageMutation.mutate(newMessage);
  };

  const filteredThreads = threads.filter(t => {
    const info = getParticipantInfo(t);
    return activeTab === 'staff' ? info.type === 'staff' : info.type === 'customer';
  });

  const activeThread = threads.find(t => t.id === selectedThread);
  const info = activeThread ? getParticipantInfo(activeThread) : null;

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-80 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Messages</h2>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search messages..." className="pl-8" />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col min-h-0">
          <div className="px-4 pt-4 pb-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
            </TabsList>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {threadsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No conversations.</div>
              ) : (
                filteredThreads.map(thread => {
                  const info = getParticipantInfo(thread);
                  return (
                    <Button
                      key={thread.id}
                      variant={selectedThread === thread.id ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3 h-16 px-3"
                      onClick={() => setSelectedThread(thread.id)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{info.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm truncate">{info.name}</span>
                          <span className="text-[10px] text-muted-foreground">{thread.lastMessageAt ? format(new Date(thread.lastMessageAt), 'MMM d') : ''}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate italic">Last message preview...</p>
                      </div>
                    </Button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </Tabs>
      </div>

      <div className="flex-1 flex flex-col bg-background relative">
        {selectedThread && info ? (
          <>
            <div className="p-4 border-b flex items-center justify-between bg-background/95 backdrop-blur sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{info.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-sm leading-none">{info.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Online</p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messagesLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex gap-3 max-w-[80%] ${msg.senderType === 'staff' ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                      <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                      <div className={`space-y-1 ${msg.senderType === 'staff' ? 'text-right' : ''}`}>
                        <div className={`p-3 rounded-lg text-sm ${msg.senderType === 'staff' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-muted rounded-tl-none'}`}>
                          {msg.content}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{msg.createdAt ? format(new Date(msg.createdAt), 'h:mm a') : ''}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t bg-background">
              <div className="relative">
                <Textarea
                  placeholder="Type a message..."
                  className="min-h-[44px] max-h-32 pr-12 py-3 resize-none border-muted focus-visible:ring-primary"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button 
                  size="icon" 
                  className="absolute right-2 bottom-2 h-8 w-8"
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending || !newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold">Your Messages</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              Select a conversation from the left or start a new message to get in touch with staff or customers.
            </p>
            <Button className="mt-6 gap-2">
              <Plus className="h-4 w-4" />
              New Message
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

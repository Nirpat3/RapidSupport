import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Plus, Send, MoreVertical, Hash, Lock, Search, Loader2 } from "lucide-react";
import type { CommChannel, CommChannelMessage, User, CustomerOrganization } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";

export default function StaffCommunity() {
  const { toast } = useToast();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState<"internal" | "customer_facing" | "customer_internal">("internal");

  const { data: channels = [], isLoading: channelsLoading } = useQuery<CommChannel[]>({
    queryKey: ["/api/comm/channels"],
    queryFn: async () => apiRequest("/api/comm/channels", "GET")
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<CommChannelMessage[]>({
    queryKey: ["/api/comm/channels", selectedChannel, "messages"],
    queryFn: async () => {
      return apiRequest(`/api/comm/channels/${selectedChannel}/messages`, "GET");
    },
    enabled: !!selectedChannel,
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

  const getUserName = (id: string, type: string) => {
    if (type === 'staff' || type === 'superadmin') {
      return users.find(u => u.id === id)?.name || 'Staff';
    }
    return customers.find(c => c.id === id)?.name || 'Customer';
  };

  const getUserAvatar = (id: string, type: string) => {
    // In a real app we'd have avatar URLs
    return undefined;
  };

  const createChannelMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/comm/channels", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comm/channels"] });
      setIsCreateDialogOpen(false);
      setChannelName("");
      toast({ title: "Channel created" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest(`/api/comm/channels/${selectedChannel}/messages`, "POST", { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comm/channels", selectedChannel, "messages"] });
      setNewMessage("");
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChannel) return;
    sendMessageMutation.mutate(newMessage);
  };

  const handleCreateChannel = () => {
    if (!channelName.trim()) return;
    createChannelMutation.mutate({ name: channelName, type: channelType });
  };

  const internalChannels = channels.filter(c => c.type === "internal");
  const customerChannels = channels.filter(c => c.type === "customer_facing" || c.type === "customer_internal");

  const activeChannel = channels.find(c => c.id === selectedChannel);

  return (
    <div className="flex h-full">
      <div className="w-80 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Community</h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Channel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Channel Name</label>
                  <Input 
                    placeholder="e.g. general-support" 
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Tabs value={channelType} onValueChange={(v: any) => setChannelType(v)}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="internal">Internal</TabsTrigger>
                      <TabsTrigger value="customer_facing">Customer Facing</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleCreateChannel}
                  disabled={createChannelMutation.isPending || !channelName.trim()}
                >
                  Create Channel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="internal" className="flex-1 flex flex-col min-h-0">
          <div className="px-4 pt-4 pb-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="internal">Internal</TabsTrigger>
              <TabsTrigger value="customer">Customer</TabsTrigger>
            </TabsList>
          </div>
          
          <ScrollArea className="flex-1">
            <TabsContent value="internal" className="m-0 p-2 space-y-1">
              {internalChannels.map(channel => (
                <Button
                  key={channel.id}
                  variant={selectedChannel === channel.id ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2 h-9 px-3"
                  onClick={() => setSelectedChannel(channel.id)}
                >
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{channel.name}</span>
                </Button>
              ))}
            </TabsContent>
            <TabsContent value="customer" className="m-0 p-2 space-y-1">
              {customerChannels.map(channel => (
                <Button
                  key={channel.id}
                  variant={selectedChannel === channel.id ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2 h-9 px-3"
                  onClick={() => setSelectedChannel(channel.id)}
                >
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{channel.name}</span>
                </Button>
              ))}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      <div className="flex-1 flex flex-col bg-background">
        {selectedChannel ? (
          <>
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">{activeChannel?.name}</h3>
                <Badge variant="outline" className="text-[10px] uppercase ml-2">{activeChannel?.type}</Badge>
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6">
                {messagesLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    This is the start of the #{activeChannel?.name} channel.
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="flex gap-4 group">
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarFallback>{getUserName(msg.authorId, msg.authorType).slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{getUserName(msg.authorId, msg.authorType)}</span>
                          <span className="text-xs text-muted-foreground">{msg.createdAt ? format(new Date(msg.createdAt), 'h:mm a') : ''}</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="relative">
                <Textarea
                  placeholder={`Message #${activeChannel?.name}`}
                  className="min-h-[44px] max-h-32 pr-12 py-3 resize-none"
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
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Select a channel</h3>
            <p className="text-muted-foreground">Choose a channel from the left to join the conversation.</p>
          </div>
        )}
      </div>
    </div>
  );
}

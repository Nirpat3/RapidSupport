import { useQuery, useMutation } from "@tanstack/react-query";
import { CommLayout } from "./CommLayout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { Hash, Plus, Send, Users, MoreVertical, LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Channel {
  id: string;
  name: string;
  description?: string;
  type: "internal" | "customer_facing" | "customer_internal";
  createdAt: string;
  memberCount: number;
}

interface ChannelMessage {
  id: string;
  content: string;
  authorId: string;
  authorType: string;
  authorName: string;
  createdAt: string;
  isEdited: boolean;
}

export default function CommCommunity() {
  const { toast } = useToast();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");

  const { data: channels, isLoading: loadingChannels } = useQuery<Channel[]>({
    queryKey: ["/api/customer-portal/comm/channels"],
  });

  const createChannelMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return apiRequest("/api/customer-portal/comm/channels", "POST", {
        ...data,
        type: "customer_internal", // Default for retailers creating their own channels
      });
    },
    onSuccess: (data) => {
      setIsCreateDialogOpen(false);
      setNewChannelName("");
      setNewChannelDesc("");
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/comm/channels"] });
      setSelectedChannelId(data.id);
      toast({ title: "Channel created" });
    },
  });

  const selectedChannel = channels?.find(c => c.id === selectedChannelId);

  return (
    <CommLayout>
      <div className="flex h-full border rounded-lg overflow-hidden bg-card">
        {/* Channel List */}
        <div className="w-64 border-r flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Channels
            </h3>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Channel</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Channel Name</Label>
                    <Input 
                      placeholder="e.g. general-support" 
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (Optional)</Label>
                    <Textarea 
                      placeholder="What is this channel about?" 
                      value={newChannelDesc}
                      onChange={(e) => setNewChannelDesc(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                  <Button 
                    disabled={!newChannelName.trim() || createChannelMutation.isPending}
                    onClick={() => createChannelMutation.mutate({ name: newChannelName, description: newChannelDesc })}
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {loadingChannels ? (
                Array(5).fill(0).map((_, i) => <div key={i} className="h-10 bg-accent animate-pulse rounded m-1" />)
              ) : channels?.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No channels found
                </div>
              ) : (
                channels?.map((channel) => (
                  <Button
                    key={channel.id}
                    variant={selectedChannelId === channel.id ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2 font-normal"
                    onClick={() => setSelectedChannelId(channel.id)}
                  >
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{channel.name}</span>
                  </Button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedChannel ? (
            <>
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    {selectedChannel.name}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate max-w-md">
                    {selectedChannel.description || "No description provided"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {selectedChannel.memberCount} members
                  </span>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <ChannelChat channelId={selectedChannel.id} />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
              <Users className="h-12 w-12 opacity-20 mb-4" />
              <h3 className="text-lg font-medium">Select a channel</h3>
              <p className="text-sm text-center">
                Choose a channel from the left or create a new one to start collaborating.
              </p>
            </div>
          )}
        </div>
      </div>
    </CommLayout>
  );
}

function ChannelChat({ channelId }: { channelId: string }) {
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery<ChannelMessage[]>({
    queryKey: ["/api/customer-portal/comm/channels", channelId, "messages"],
    refetchInterval: 5000, // Poll for now, T002 might not have full WS setup for this task
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest(`/api/customer-portal/comm/channels/${channelId}/messages`, "POST", { content });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/customer-portal/comm/channels", channelId, "messages"] });
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
            <div key={msg.id} className="flex gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback>{msg.authorName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-sm">{msg.authorName}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <div className="text-sm text-foreground/90 bg-accent/30 p-3 rounded-lg rounded-tl-none border">
                  {msg.content}
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
            placeholder={`Message channel`} 
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

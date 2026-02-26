import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GitMerge, Search, Loader2, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Conversation {
  id: string;
  title?: string;
  customer?: {
    name: string;
    email?: string;
  };
  status: string;
  createdAt: string;
}

interface MergeConversationDialogProps {
  sourceConversationId: string;
  onSuccess?: (targetId: string) => void;
}

export function MergeConversationDialog({ sourceConversationId, onSuccess }: MergeConversationDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: conversations = [], isLoading: isSearching } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const filteredConversations = conversations.filter(c => 
    c.id !== sourceConversationId &&
    (c.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
     (c.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
     (c.customer?.name || "").toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedTarget = conversations.find(c => c.id === selectedTargetId);

  const mergeMutation = useMutation({
    mutationFn: async (targetId: string) => {
      return apiRequest(`/api/conversations/${sourceConversationId}/merge`, "POST", {
        targetConversationId: targetId
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Conversations Merged",
        description: "Messages have been moved and source conversation closed.",
      });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (onSuccess) {
        onSuccess(data.id);
      } else {
        setLocation(`/conversations/${data.id}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Merge Failed",
        description: error.message || "An error occurred while merging.",
        variant: "destructive"
      });
    }
  });

  const handleMerge = () => {
    if (selectedTargetId) {
      mergeMutation.mutate(selectedTargetId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <GitMerge className="h-4 w-4" />
          <span>Merge</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Merge Conversation</DialogTitle>
          <DialogDescription>
            Select a target conversation to merge this one into. All messages will be moved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, Title, or Customer Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="border rounded-md overflow-hidden">
            <ScrollArea className="h-[200px]">
              <div className="p-2 space-y-1">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No matching conversations found.
                  </div>
                ) : (
                  filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedTargetId(conv.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-sm transition-colors flex items-center justify-between group",
                        selectedTargetId === conv.id 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">
                          {conv.customer?.name || "Anonymous"}
                        </div>
                        <div className={cn(
                          "text-xs truncate",
                          selectedTargetId === conv.id ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}>
                          {conv.title || "No Title"} • {conv.id.slice(0, 8)}
                        </div>
                      </div>
                      <Badge variant={selectedTargetId === conv.id ? "outline" : "secondary"} className="ml-2 uppercase text-[10px]">
                        {conv.status}
                      </Badge>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {selectedTarget && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-semibold">Careful: Irreversible Action</span>
              </div>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/80 leading-relaxed">
                This will move all messages from the current conversation to <strong>{selectedTarget.customer?.name}'s</strong> conversation and permanently close the current one.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleMerge} 
            disabled={!selectedTargetId || mergeMutation.isPending}
            className="gap-2"
          >
            {mergeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

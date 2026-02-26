import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MessageSquare, Loader2, Plus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SavedReply } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

interface SavedRepliesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (content: string) => void;
  customerName?: string;
}

export default function SavedRepliesDialog({ 
  open, 
  onOpenChange, 
  onSelect,
  customerName = "Customer" 
}: SavedRepliesDialogProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const { data: replies = [], isLoading } = useQuery<SavedReply[]>({
    queryKey: ["/api/saved-replies", category, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category !== "All") params.append("category", category);
      if (search) params.append("q", search);
      return apiRequest(`/api/saved-replies?${params.toString()}`, "GET");
    },
    enabled: open
  });

  const useReplyMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/saved-replies/${id}/use`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-replies"] });
    }
  });

  const categories = ["All", "General", "Billing", "Technical"];
  // Add unique categories from replies if any
  const customCategories = Array.from(new Set(replies.map(r => r.category)))
    .filter(c => !categories.includes(c));
  const allCategories = [...categories, ...customCategories];

  const handleSelect = (reply: SavedReply) => {
    let content = reply.content;
    // Replace placeholders
    content = content.replace(/{{customerName}}/g, customerName);
    
    onSelect(content);
    useReplyMutation.mutate(reply.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Quick Replies</DialogTitle>
          <DialogDescription>
            Select a canned response to insert into your message.
          </DialogDescription>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search replies..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col mt-4">
          <Tabs value={category} onValueChange={setCategory} className="flex flex-col h-full">
            <div className="px-6 border-b">
              <TabsList className="w-full justify-start h-auto p-0 bg-transparent gap-6 rounded-none">
                {allCategories.map(cat => (
                  <TabsTrigger 
                    key={cat} 
                    value={cat}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2"
                  >
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <ScrollArea className="flex-1 p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : replies.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />
                  <p className="text-muted-foreground">No saved replies found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {replies.map((reply) => (
                    <button
                      key={reply.id}
                      onClick={() => handleSelect(reply)}
                      className="w-full text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-accent/50 transition-all group relative"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium group-hover:text-primary transition-colors">
                          {reply.title}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4">
                            {reply.category}
                          </Badge>
                          {reply.usageCount > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              Used {reply.usageCount} times
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {reply.content.replace(/{{customerName}}/g, customerName)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

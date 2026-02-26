import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X, Plus, Tags } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface TagEditorProps {
  conversationId: string;
  initialTags?: string[];
}

export function TagEditor({ conversationId, initialTags = [] }: TagEditorProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [inputValue, setInputValue] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  const { data: popularTags = [] } = useQuery<string[]>({
    queryKey: ['/api/conversations/tags'],
  });

  const updateTagsMutation = useMutation({
    mutationFn: async (newTags: string[]) => {
      return await apiRequest(`/api/conversations/${conversationId}/tags`, 'PATCH', { tags: newTags });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setTags(data.tags);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tags",
        variant: "destructive",
      });
    },
  });

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 10) {
      const newTags = [...tags, trimmedTag];
      updateTagsMutation.mutate(newTags);
      setInputValue("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    updateTagsMutation.mutate(newTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(inputValue);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {tags.map((tag) => (
        <Badge 
          key={tag} 
          variant="secondary" 
          className="flex items-center gap-1 py-0 px-2 h-6"
        >
          {tag}
          <button 
            onClick={() => handleRemoveTag(tag)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
      
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
            disabled={tags.length >= 10}
          >
            <Plus className="w-3 h-3" />
            Add Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-3" align="start">
          <div className="space-y-3">
            <div className="space-y-1">
              <h4 className="font-medium text-sm">Add Tag</h4>
              <p className="text-xs text-muted-foreground">Press enter or comma to add</p>
            </div>
            <Input 
              placeholder="Tag name..." 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8"
              autoFocus
            />
            {popularTags.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Popular Tags</p>
                <div className="flex flex-wrap gap-1">
                  {popularTags.slice(0, 10).map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleAddTag(tag)}
                      className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

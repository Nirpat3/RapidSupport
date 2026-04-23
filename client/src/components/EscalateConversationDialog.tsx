import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowUpRight, AlertTriangle } from "lucide-react";

interface Props {
  conversationId: string;
  isEscalated?: boolean;
  onSuccess?: () => void;
}

export function EscalateConversationDialog({ conversationId, isEscalated, onSuccess }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  const escalateMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/resellers/escalate/${conversationId}`, "POST", { escalationNote: note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      toast({
        title: "Conversation escalated",
        description: "This conversation has been escalated to the parent support team.",
      });
      setOpen(false);
      setNote("");
      onSuccess?.();
    },
    onError: (e: any) => {
      toast({
        title: "Escalation failed",
        description: e.message || "Failed to escalate conversation",
        variant: "destructive",
      });
    },
  });

  if (isEscalated) {
    return (
      <Button variant="outline" size="icon" disabled title="Already escalated">
        <ArrowUpRight className="h-4 w-4 text-amber-500" />
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Escalate to parent team">
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Escalate Conversation
          </DialogTitle>
          <DialogDescription>
            This will escalate the conversation to the parent organization's support team.
            They will be notified and the conversation will appear in their escalated queue.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Escalation Note <span className="text-destructive">*</span></Label>
            <Textarea
              placeholder="Describe what was tried and why escalation is needed..."
              value={note}
              onChange={e => setNote(e.target.value)}
              className="min-h-24"
            />
            <p className="text-xs text-muted-foreground">
              This note will be visible to the parent team to understand the context.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => escalateMutation.mutate()}
            disabled={!note.trim() || escalateMutation.isPending}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {escalateMutation.isPending ? "Escalating..." : "Escalate Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

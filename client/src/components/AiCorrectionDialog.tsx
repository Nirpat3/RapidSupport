import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { GraduationCap, AlertTriangle, Lightbulb } from 'lucide-react';

interface AiCorrectionDialogProps {
  conversationId: string;
  originalMessageId?: string;
  originalAiResponse: string;
  customerQuery: string;
  onCorrectionSubmitted?: () => void;
  embedded?: boolean;
}

const correctionTypes = [
  { value: 'factual_error', label: 'Factual Error', description: 'AI provided incorrect information' },
  { value: 'incomplete', label: 'Incomplete Answer', description: 'AI missed important details' },
  { value: 'tone_issue', label: 'Tone Issue', description: 'Response tone was inappropriate' },
  { value: 'wrong_context', label: 'Wrong Context', description: 'AI misunderstood the question' },
  { value: 'outdated', label: 'Outdated Info', description: 'Information is no longer accurate' },
  { value: 'other', label: 'Other', description: 'Other type of correction' },
];

function CorrectionForm({
  conversationId,
  originalMessageId,
  originalAiResponse,
  customerQuery,
  onCorrectionSubmitted,
  onClose
}: AiCorrectionDialogProps & { onClose?: () => void }) {
  const [correctedResponse, setCorrectedResponse] = useState('');
  const [correctionType, setCorrectionType] = useState('factual_error');
  const [correctionNotes, setCorrectionNotes] = useState('');
  const { toast } = useToast();

  const correctionMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/ai/corrections', 'POST', data),
    onSuccess: () => {
      toast({
        title: 'Correction Submitted',
        description: 'Thank you! This correction will help improve our AI responses.',
      });
      setCorrectedResponse('');
      setCorrectionNotes('');
      queryClient.invalidateQueries({ queryKey: ['/api/ai/corrections'] });
      onCorrectionSubmitted?.();
      onClose?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Submit Correction',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (!correctedResponse.trim()) {
      toast({
        title: 'Missing Correction',
        description: 'Please provide the correct response.',
        variant: 'destructive',
      });
      return;
    }

    correctionMutation.mutate({
      originalMessageId,
      conversationId,
      customerQuery,
      originalAiResponse,
      correctedResponse,
      correctionType,
      correctionNotes: correctionNotes || null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Customer's Question
        </Label>
        <div className="p-3 rounded-md bg-muted text-sm" data-testid="text-customer-query">
          {customerQuery || 'No customer query available'}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">AI Response</Badge>
          Original (Incorrect)
        </Label>
        <div className="p-3 rounded-md bg-muted text-sm max-h-32 overflow-y-auto" data-testid="text-original-response">
          {originalAiResponse}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Correction Type</Label>
        <Select value={correctionType} onValueChange={setCorrectionType}>
          <SelectTrigger data-testid="select-correction-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {correctionTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex flex-col">
                  <span>{type.label}</span>
                  <span className="text-xs text-muted-foreground">{type.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-green-500" />
          Correct Response
        </Label>
        <Textarea
          value={correctedResponse}
          onChange={(e) => setCorrectedResponse(e.target.value)}
          placeholder="Enter the correct response that should have been given..."
          className="min-h-[100px]"
          data-testid="textarea-corrected-response"
        />
        <p className="text-xs text-muted-foreground">
          This response will be used to train the AI for similar questions.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Additional Notes (Optional)</Label>
        <Textarea
          value={correctionNotes}
          onChange={(e) => setCorrectionNotes(e.target.value)}
          placeholder="Why was the original response incorrect? Any context that would help..."
          className="min-h-[80px]"
          data-testid="textarea-correction-notes"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button 
          onClick={handleSubmit} 
          disabled={correctionMutation.isPending || !correctedResponse.trim()}
          data-testid="button-submit-correction-confirm"
        >
          {correctionMutation.isPending ? 'Submitting...' : 'Submit Correction'}
        </Button>
      </div>
    </div>
  );
}

export default function AiCorrectionDialog({
  conversationId,
  originalMessageId,
  originalAiResponse,
  customerQuery,
  onCorrectionSubmitted,
  embedded = false
}: AiCorrectionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (embedded) {
    return (
      <CorrectionForm
        conversationId={conversationId}
        originalMessageId={originalMessageId}
        originalAiResponse={originalAiResponse}
        customerQuery={customerQuery}
        onCorrectionSubmitted={onCorrectionSubmitted}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          data-testid="button-submit-correction"
        >
          <GraduationCap className="w-4 h-4" />
          Teach AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Teach the AI
          </DialogTitle>
          <DialogDescription>
            Help improve AI responses by submitting a correction. This feedback trains the AI to provide better answers in the future.
          </DialogDescription>
        </DialogHeader>

        <CorrectionForm
          conversationId={conversationId}
          originalMessageId={originalMessageId}
          originalAiResponse={originalAiResponse}
          customerQuery={customerQuery}
          onCorrectionSubmitted={onCorrectionSubmitted}
          onClose={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

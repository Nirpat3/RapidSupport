import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  ChevronDown,
  Sparkles,
  X
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  path: string;
  isRequired: boolean;
  category: string;
}

interface OnboardingProgress {
  completed: string[];
  pending: ChecklistItem[];
  percentComplete: number;
}

interface OnboardingChecklistProps {
  onDismiss?: () => void;
  variant?: 'full' | 'compact';
}

export default function OnboardingChecklist({ onDismiss, variant = 'full' }: OnboardingChecklistProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [, setLocation] = useLocation();

  const { data: progress, isLoading } = useQuery<OnboardingProgress>({
    queryKey: ['/api/onboarding/progress'],
  });

  const { data: checklistData } = useQuery<{ checklist: ChecklistItem[] }>({
    queryKey: ['/api/onboarding/checklist'],
  });

  const completeMutation = useMutation({
    mutationFn: async (checklistItemId: string) => {
      return apiRequest('/api/onboarding/complete', 'POST', { checklistItemId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/progress'] });
    },
  });

  if (isLoading || !progress || !checklistData) {
    return null;
  }

  const checklist = checklistData.checklist;
  const isComplete = progress.percentComplete === 100;

  if (isComplete && variant === 'compact') {
    return null;
  }

  const handleNavigate = (path: string, itemId: string) => {
    setLocation(path);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'setup': return '⚙️';
      case 'content': return '📝';
      case 'ai': return '🤖';
      case 'channels': return '📱';
      case 'team': return '👥';
      case 'usage': return '💬';
      default: return '✨';
    }
  };

  if (variant === 'compact') {
    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card className="border-primary/20 bg-primary/5">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Getting Started</CardTitle>
                    <CardDescription className="text-xs">
                      {progress.completed.length} of {checklist.length} complete
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {progress.percentComplete}%
                  </Badge>
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform",
                    isExpanded && "rotate-180"
                  )} />
                </div>
              </div>
              <Progress value={progress.percentComplete} className="h-1 mt-2" />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-3">
              <div className="space-y-1">
                {checklist.slice(0, 4).map((item) => {
                  const isItemComplete = progress.completed.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.path, item.id)}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-md text-left text-sm transition-colors",
                        isItemComplete 
                          ? "text-muted-foreground" 
                          : "hover-elevate"
                      )}
                      data-testid={`checklist-item-${item.id}`}
                    >
                      {isItemComplete ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={cn(isItemComplete && "line-through")}>
                        {item.title}
                      </span>
                      {item.isRequired && !isItemComplete && (
                        <Badge variant="outline" className="text-xs ml-auto">Required</Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Card className="relative" data-testid="onboarding-checklist">
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={onDismiss}
          data-testid="button-dismiss-onboarding"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
      
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle>Welcome to Support Board!</CardTitle>
            <CardDescription>
              Complete these steps to get the most out of your support platform
            </CardDescription>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              {progress.completed.length} of {checklist.length} completed
            </span>
            <span className="font-medium">{progress.percentComplete}%</span>
          </div>
          <Progress value={progress.percentComplete} className="h-2" />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {checklist.map((item) => {
            const isItemComplete = progress.completed.includes(item.id);
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                  isItemComplete 
                    ? "bg-muted/50 border-muted" 
                    : "bg-card hover-elevate cursor-pointer"
                )}
                onClick={() => !isItemComplete && handleNavigate(item.path, item.id)}
                data-testid={`onboarding-item-${item.id}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {isItemComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{getCategoryIcon(item.category)}</span>
                    <span className={cn(
                      "font-medium",
                      isItemComplete && "line-through text-muted-foreground"
                    )}>
                      {item.title}
                    </span>
                    {item.isRequired && !isItemComplete && (
                      <Badge variant="secondary" className="text-xs">Required</Badge>
                    )}
                  </div>
                  <p className={cn(
                    "text-sm mt-0.5",
                    isItemComplete ? "text-muted-foreground" : "text-muted-foreground"
                  )}>
                    {item.description}
                  </p>
                </div>
                {!isItemComplete && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                )}
              </div>
            );
          })}
        </div>

        {isComplete && (
          <div className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <h3 className="font-semibold text-green-700 dark:text-green-400">All Set!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You've completed all onboarding steps. You're ready to provide amazing support!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

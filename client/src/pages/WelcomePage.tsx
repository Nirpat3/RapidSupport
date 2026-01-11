import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Sparkles,
  Settings,
  FileText,
  Bot,
  Smartphone,
  Users,
  MessageSquare,
  Rocket,
  Download,
  ExternalLink
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { NovaLogo } from '@/components/NovaLogo';

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

export default function WelcomePage() {
  const [, setLocation] = useLocation();

  const { data: user } = useQuery<{ id: string; name: string; email: string; role: string }>({
    queryKey: ['/api/auth/me'],
  });

  const { data: progress, isLoading: progressLoading } = useQuery<OnboardingProgress>({
    queryKey: ['/api/onboarding/progress'],
  });

  const { data: checklistData, isLoading: checklistLoading } = useQuery<{ checklist: ChecklistItem[] }>({
    queryKey: ['/api/onboarding/checklist'],
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/auth/complete-onboarding', 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      setLocation('/dashboard');
    },
  });

  const isLoading = progressLoading || checklistLoading;
  const checklist = checklistData?.checklist || [];
  const percentComplete = progress?.percentComplete || 0;
  const completedItems = progress?.completed || [];

  const getCategoryIcon = (category: string) => {
    const iconClass = "w-5 h-5";
    switch (category) {
      case 'setup': return <Settings className={iconClass} />;
      case 'content': return <FileText className={iconClass} />;
      case 'ai': return <Bot className={iconClass} />;
      case 'channels': return <Smartphone className={iconClass} />;
      case 'team': return <Users className={iconClass} />;
      case 'usage': return <MessageSquare className={iconClass} />;
      default: return <Sparkles className={iconClass} />;
    }
  };

  const handleNavigate = (path: string) => {
    setLocation(path);
  };

  const handleGetStarted = () => {
    completeOnboardingMutation.mutate();
  };

  const handleSkip = () => {
    completeOnboardingMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <NovaLogo size="lg" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Welcome to Nova AI{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
          </h1>
          <p className="text-muted-foreground text-lg">
            Let's get you set up for success. Complete these steps to unlock the full potential of your support platform.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Rocket className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle>Getting Started Checklist</CardTitle>
                  <CardDescription>
                    {completedItems.length} of {checklist.length} steps completed
                  </CardDescription>
                </div>
              </div>
              <Badge variant={percentComplete === 100 ? "default" : "secondary"} className="text-sm px-3 py-1">
                {percentComplete}% Complete
              </Badge>
            </div>
            <Progress value={percentComplete} className="h-2 mt-4" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {checklist.map((item) => {
                  const isItemComplete = completedItems.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-lg border transition-all",
                        isItemComplete 
                          ? "bg-muted/50 border-muted" 
                          : "bg-card hover-elevate cursor-pointer border-border"
                      )}
                      onClick={() => !isItemComplete && handleNavigate(item.path)}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {isItemComplete ? (
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                        ) : (
                          <Circle className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-primary">{getCategoryIcon(item.category)}</span>
                          <span className={cn(
                            "font-semibold",
                            isItemComplete && "line-through text-muted-foreground"
                          )}>
                            {item.title}
                          </span>
                          {item.isRequired && !isItemComplete && (
                            <Badge variant="outline" className="text-xs">Required</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      {!isItemComplete && (
                        <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Get the Mobile App</CardTitle>
                <CardDescription>
                  Install Nova AI on your device for quick access anytime
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setLocation('/install-app')}
            >
              <Smartphone className="w-4 h-4" />
              Install on Your Phone
              <ExternalLink className="w-3 h-3" />
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            size="lg" 
            onClick={handleGetStarted}
            disabled={completeOnboardingMutation.isPending}
            className="gap-2"
          >
            {completeOnboardingMutation.isPending ? (
              <>Loading...</>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                Go to Dashboard
              </>
            )}
          </Button>
          <Button 
            variant="ghost" 
            size="lg"
            onClick={handleSkip}
            disabled={completeOnboardingMutation.isPending}
          >
            Skip for Now
          </Button>
        </div>

        {percentComplete === 100 && (
          <div className="mt-8 p-6 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="font-bold text-xl text-green-700 dark:text-green-400">You're All Set!</h3>
            <p className="text-muted-foreground mt-2">
              Congratulations! You've completed all onboarding steps. You're ready to provide amazing customer support!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

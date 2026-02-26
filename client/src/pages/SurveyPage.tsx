import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Star, Loader2, CheckCircle2 } from "lucide-react";

export default function SurveyPage() {
  const [, params] = useRoute("/survey/:token");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: survey, isLoading, error } = useQuery({
    queryKey: [`/api/csat/survey/${params?.token}`],
    enabled: !!params?.token,
  });

  const mutation = useMutation({
    mutationFn: async (data: { rating: number; feedback?: string }) => {
      return await apiRequest(`/api/csat/survey/${params?.token}`, "POST", data);
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Thank you!",
        message: "Your feedback has been submitted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        message: error.message || "Failed to submit survey",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive text-center">Invalid Link</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              This survey link is invalid, expired, or has already been completed.
            </p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button onClick={() => setLocation("/")}>Go Home</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md text-center py-8">
          <CardContent className="space-y-4">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
            <CardTitle className="text-2xl">Thank You!</CardTitle>
            <p className="text-muted-foreground">
              We appreciate your feedback. It helps us improve our service.
            </p>
            <Button variant="outline" onClick={() => setLocation("/")} className="mt-4">
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-muted/30">
      <Card className="w-full max-w-lg shadow-lg border-t-4" style={{ borderTopColor: survey.primaryColor || 'hsl(var(--primary))' }}>
        <CardHeader className="text-center space-y-4">
          {survey.organizationLogo && (
            <img 
              src={survey.organizationLogo} 
              alt={survey.organizationName} 
              className="h-12 mx-auto object-contain"
            />
          )}
          <div className="space-y-2">
            <CardTitle className="text-2xl">How did we do?</CardTitle>
            <p className="text-muted-foreground">
              Please rate your recent conversation regarding "{survey.title}" with {survey.organizationName}.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  className={`h-10 w-10 ${
                    star <= (hoveredRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Optional: Any additional feedback?
            </label>
            <Textarea
              placeholder="Tell us more about your experience..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[120px] resize-none"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button 
            className="w-full h-11 text-lg font-semibold"
            disabled={rating === 0 || mutation.isPending}
            onClick={() => mutation.mutate({ rating, feedback })}
            style={{ backgroundColor: survey.primaryColor }}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground uppercase tracking-wider">
            Powered by Nova AI
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

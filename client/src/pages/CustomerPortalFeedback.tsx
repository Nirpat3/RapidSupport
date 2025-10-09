import { useQuery } from "@tanstack/react-query";
import { CustomerPortalLayout } from "@/components/CustomerPortalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MessageCircle, Calendar, ThumbsUp, ThumbsDown } from "lucide-react";
import { format } from "date-fns";

export default function CustomerPortalFeedback() {
  // Get all feedback submitted by this customer
  const { data: feedbackList, isLoading } = useQuery<Array<{
    id: string;
    conversationId: string;
    conversationSubject: string;
    rating: number;
    feedback: string | null;
    sentiment: number | null;
    createdAt: string;
  }>>({
    queryKey: ['/api/customer-portal/feedback'],
  });

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  const getSentimentBadge = (sentiment: number | null) => {
    if (sentiment === null) return null;
    
    if (sentiment >= 70) {
      return (
        <Badge variant="outline" className="gap-1 border-green-500/50 text-green-600 dark:text-green-400">
          <ThumbsUp className="h-3 w-3" />
          Positive
        </Badge>
      );
    } else if (sentiment >= 40) {
      return (
        <Badge variant="outline" className="gap-1">
          Neutral
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="gap-1 border-red-500/50 text-red-600 dark:text-red-400">
          <ThumbsDown className="h-3 w-3" />
          Negative
        </Badge>
      );
    }
  };

  return (
    <CustomerPortalLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h2 className="text-3xl font-bold" data-testid="title-feedback">Feedback History</h2>
          <p className="text-muted-foreground">View all feedback you've submitted for your conversations</p>
        </div>

        {/* Feedback Stats */}
        {feedbackList && feedbackList.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{feedbackList.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">
                    {(feedbackList.reduce((sum, f) => sum + f.rating, 0) / feedbackList.length).toFixed(1)}
                  </div>
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Positive Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {feedbackList.filter(f => f.rating >= 4).length}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Feedback List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading feedback...</p>
            </div>
          </div>
        ) : !feedbackList || feedbackList.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">No feedback submitted yet</p>
                <p className="text-sm text-muted-foreground">
                  You'll see your conversation feedback here after you submit ratings
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {feedbackList.map((feedback) => (
              <Card key={feedback.id} data-testid={`feedback-${feedback.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base mb-2">
                        {feedback.conversationSubject || 'Untitled Conversation'}
                      </CardTitle>
                      <div className="flex items-center gap-3 flex-wrap">
                        {renderStars(feedback.rating)}
                        {getSentimentBadge(feedback.sentiment)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-shrink-0">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(feedback.createdAt), 'MMM d, yyyy')}
                    </div>
                  </div>
                  {feedback.feedback && (
                    <CardDescription className="mt-3 whitespace-pre-wrap">
                      "{feedback.feedback}"
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CustomerPortalLayout>
  );
}

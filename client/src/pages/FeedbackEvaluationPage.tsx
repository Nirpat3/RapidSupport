import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Star, 
  MessageCircle, 
  Search, 
  User,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

type RatingFilter = 'all' | '5' | '4' | '3' | '2' | '1';

interface FeedbackEvaluationPageProps {
  embedded?: boolean;
}

export default function FeedbackEvaluationPage({ embedded = false }: FeedbackEvaluationPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');

  // Get all customer feedback
  const { data: feedbackList, isLoading } = useQuery<Array<{
    id: string;
    conversationId: string;
    conversationSubject: string;
    customerName: string;
    customerEmail: string;
    rating: number;
    feedback: string | null;
    sentiment: number | null;
    customerTone: string | null;
    resolutionQuality: string | null;
    createdAt: string;
  }>>({
    queryKey: ['/api/staff/feedback'],
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
          <Minus className="h-3 w-3" />
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

  const getTrendIcon = (sentiment: number | null) => {
    if (sentiment === null) return null;
    if (sentiment >= 70) return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />;
    if (sentiment >= 40) return <Minus className="h-4 w-4 text-muted-foreground" />;
    return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />;
  };

  const filteredFeedback = feedbackList?.filter(fb => {
    const matchesSearch = !searchQuery || 
      fb.conversationSubject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fb.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fb.feedback?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRating = ratingFilter === 'all' || fb.rating === parseInt(ratingFilter);
    return matchesSearch && matchesRating;
  });

  const ratingCounts = {
    all: feedbackList?.length || 0,
    5: feedbackList?.filter(f => f.rating === 5).length || 0,
    4: feedbackList?.filter(f => f.rating === 4).length || 0,
    3: feedbackList?.filter(f => f.rating === 3).length || 0,
    2: feedbackList?.filter(f => f.rating === 2).length || 0,
    1: feedbackList?.filter(f => f.rating === 1).length || 0,
  };

  const averageRating = feedbackList && feedbackList.length > 0
    ? (feedbackList.reduce((sum, f) => sum + f.rating, 0) / feedbackList.length).toFixed(1)
    : '0.0';

  const averageSentiment = feedbackList && feedbackList.length > 0
    ? Math.round(feedbackList.reduce((sum, f) => sum + (f.sentiment || 0), 0) / feedbackList.length)
    : 0;

  return (
    <div className="space-y-6 p-6">
      {!embedded && (
        <>
          {/* Page Header */}
          <div>
            <h2 className="text-3xl font-bold" data-testid="title-feedback">Customer Feedback</h2>
            <p className="text-muted-foreground">Review and analyze customer satisfaction ratings</p>
          </div>
        </>
      )}

      {/* Stats Cards */}
      {feedbackList && feedbackList.length > 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total">{feedbackList.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold" data-testid="stat-avg-rating">{averageRating}</div>
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Positive Ratings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-positive">
                {feedbackList.filter(f => f.rating >= 4).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Avg Sentiment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold" data-testid="stat-sentiment">{averageSentiment}</div>
                {getTrendIcon(averageSentiment)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer, conversation, or feedback..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Tabs value={ratingFilter} onValueChange={(v) => setRatingFilter(v as RatingFilter)}>
          <TabsList>
            <TabsTrigger value="all" data-testid="filter-all">All ({ratingCounts.all})</TabsTrigger>
            <TabsTrigger value="5" data-testid="filter-5">5★ ({ratingCounts[5]})</TabsTrigger>
            <TabsTrigger value="4" data-testid="filter-4">4★ ({ratingCounts[4]})</TabsTrigger>
            <TabsTrigger value="3" data-testid="filter-3">3★ ({ratingCounts[3]})</TabsTrigger>
            <TabsTrigger value="2" data-testid="filter-2">2★ ({ratingCounts[2]})</TabsTrigger>
            <TabsTrigger value="1" data-testid="filter-1">1★ ({ratingCounts[1]})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Feedback List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading feedback...</p>
          </div>
        </div>
      ) : !filteredFeedback || filteredFeedback.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchQuery || ratingFilter !== 'all' 
                  ? 'No feedback matches your filters' 
                  : 'No customer feedback yet'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFeedback.map((fb) => (
            <Card key={fb.id} data-testid={`feedback-${fb.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Link href={`/conversations/${fb.conversationId}`}>
                        <CardTitle className="text-base hover:underline cursor-pointer">
                          {fb.conversationSubject || 'Untitled Conversation'}
                        </CardTitle>
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <User className="h-4 w-4" />
                      <span>{fb.customerName}</span>
                      <span>•</span>
                      <span>{fb.customerEmail}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {renderStars(fb.rating)}
                      {getSentimentBadge(fb.sentiment)}
                      {fb.customerTone && (
                        <Badge variant="outline">
                          Tone: {fb.customerTone}
                        </Badge>
                      )}
                      {fb.resolutionQuality && (
                        <Badge variant="outline">
                          Resolution: {fb.resolutionQuality}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-shrink-0">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(fb.createdAt), 'MMM d, yyyy')}
                  </div>
                </div>
                {fb.feedback && (
                  <CardDescription className="mt-3 whitespace-pre-wrap border-l-2 border-muted pl-3">
                    "{fb.feedback}"
                  </CardDescription>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Stats Summary */}
      {filteredFeedback && filteredFeedback.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Showing {filteredFeedback.length} of {feedbackList?.length} feedback submission(s)
        </div>
      )}
    </div>
  );
}

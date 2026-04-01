import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { Loader2, Star, Users, MessageSquare, TrendingUp } from "lucide-react";
import { format } from "date-fns";

const RATING_COLORS = {
  1: "#ef4444", // red-500
  2: "#f97316", // orange-500
  3: "#eab308", // yellow-500
  4: "#84cc16", // lime-500
  5: "#22c55e", // green-500
};

export default function AgentAnalyticsCSAT() {
  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/admin/csat"],
  });

  const { data: responses, isLoading: responsesLoading } = useQuery<any>({
    queryKey: ["/api/admin/csat/responses"],
  });

  if (statsLoading || responsesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const ratingDist = stats?.ratingDistribution;
  const chartData = [1, 2, 3, 4, 5].map(rating => {
    let count = 0;
    if (Array.isArray(ratingDist)) {
      const found = ratingDist.find((d: any) => Number(d.rating) === rating);
      count = found ? Number(found.count) : 0;
    } else if (ratingDist && typeof ratingDist === 'object') {
      count = Number(ratingDist[rating] || 0);
    }
    return {
      rating: `${rating} Star`,
      count,
      color: RATING_COLORS[rating as keyof typeof RATING_COLORS]
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average CSAT</CardTitle>
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.averageRating || "0.0"}</div>
            <p className="text-xs text-muted-foreground">Out of 5.0 stars</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSurveys || 0}</div>
            <p className="text-xs text-muted-foreground">Completed surveys</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.responseRate || 0}%</div>
            <p className="text-xs text-muted-foreground">From total sent surveys</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CSAT Trend</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Stable</div>
            <p className="text-xs text-muted-foreground">Compared to last 30 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="rating" />
                  <YAxis allowDecimals={false} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background border rounded-lg p-2 shadow-sm text-sm">
                            <p className="font-medium">{payload[0].payload.rating}</p>
                            <p className="text-muted-foreground">{payload[0].value} responses</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {(responses?.responses ?? responses)?.length > 0 ? (
                (responses?.responses ?? responses).map((response: any) => (
                  <div key={response.id} className="border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-3 w-3 ${i < response.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} 
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(response.createdAt), "MMM d, h:mm a")}
                      </span>
                    </div>
                    {response.feedback && (
                      <p className="text-sm italic text-muted-foreground line-clamp-2">
                        "{response.feedback}"
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground mt-1 font-medium">
                      Convo: #{response.conversation?.id?.substring(0, 8)} - {response.conversation?.title}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No CSAT responses yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

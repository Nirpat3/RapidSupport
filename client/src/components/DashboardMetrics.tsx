import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Users, Clock, CheckCircle, TrendingUp, TrendingDown } from "lucide-react";

export interface MetricData {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  description?: string;
  icon: React.ReactNode;
}

interface DashboardMetricsProps {
  metrics?: MetricData[];
}

const defaultMetrics: MetricData[] = [
  {
    title: "Active Conversations",
    value: 24,
    change: { value: 12, type: 'increase' },
    description: "Currently active",
    icon: <MessageSquare className="w-4 h-4" />
  },
  {
    title: "Response Time", 
    value: "2.3m",
    change: { value: 8, type: 'decrease' },
    description: "Average response time",
    icon: <Clock className="w-4 h-4" />
  },
  {
    title: "Resolved Today",
    value: 156,
    change: { value: 23, type: 'increase' },
    description: "Tickets resolved",
    icon: <CheckCircle className="w-4 h-4" />
  },
  {
    title: "Online Agents",
    value: 8,
    description: "Available now",
    icon: <Users className="w-4 h-4" />
  }
];

export default function DashboardMetrics({ metrics = defaultMetrics }: DashboardMetricsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <Card key={index} className="hover-elevate" data-testid={`metric-card-${index}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid={`metric-title-${index}`}>
              {metric.title}
            </CardTitle>
            <div className="text-muted-foreground">
              {metric.icon}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid={`metric-value-${index}`}>
              {metric.value}
            </div>
            <div className="flex items-center justify-between mt-1">
              {metric.description && (
                <p className="text-xs text-muted-foreground" data-testid={`metric-description-${index}`}>
                  {metric.description}
                </p>
              )}
              {metric.change && (
                <div className="flex items-center gap-1">
                  {metric.change.type === 'increase' ? (
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                  <Badge 
                    variant={metric.change.type === 'increase' ? 'default' : 'secondary'}
                    className="text-xs"
                    data-testid={`metric-change-${index}`}
                  >
                    {metric.change.value}%
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
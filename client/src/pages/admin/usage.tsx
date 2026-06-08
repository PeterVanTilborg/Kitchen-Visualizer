import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle, XCircle, TrendingUp, Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface UsageStats {
  total: number;
  successful: number;
  failed: number;
  averagePerDay: number;
  chartData: { date: string; requests: number; success: number; failed: number }[];
}

type TimeRange = "day" | "week" | "month" | "year";

export default function AdminUsage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("week");

  const { data: stats, isLoading } = useQuery<UsageStats>({
    queryKey: ["/api/admin/usage", timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/admin/usage?timeRange=${timeRange}`);
      if (!res.ok) throw new Error("Failed to fetch usage stats");
      return res.json();
    },
  });

  const successRate = stats
    ? ((stats.successful / Math.max(stats.total, 1)) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Usage Analytics</h1>
        <p className="text-muted-foreground">
          Monitor API usage and performance metrics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-requests">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                (stats?.total ?? 0).toLocaleString()
              )}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-successful-requests">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                (stats?.successful ?? 0).toLocaleString()
              )}
            </div>
            <p className="text-xs text-muted-foreground">{successRate}% success rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-failed-requests">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                (stats?.failed ?? 0).toLocaleString()
              )}
            </div>
            <p className="text-xs text-muted-foreground">Total failures</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Per Day</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-per-day">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                stats?.averagePerDay.toFixed(1) || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Average requests</p>
          </CardContent>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <h2 className="text-lg font-semibold">Request Volume</h2>
          <div className="flex gap-2">
            {(["day", "week", "month", "year"] as TimeRange[]).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(range)}
                data-testid={`button-range-${range}`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="h-80 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : stats?.chartData && stats.chartData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData}>
                <defs>
                  <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Area
                  type="monotone"
                  dataKey="requests"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRequests)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No usage data available yet
          </div>
        )}
      </Card>
    </div>
  );
}

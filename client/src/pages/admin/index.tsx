import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Palette, BarChart3, Mail, Settings, ArrowRight, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import type { WrapColor, EmailSubmission } from "@shared/schema";

interface UsageStats {
  total: number;
  successful: number;
  failed: number;
  averagePerDay: number;
}

export default function AdminDashboard() {
  const { data: colors = [], isLoading: colorsLoading } = useQuery<WrapColor[]>({
    queryKey: ["/api/colors"],
  });

  const { data: emails = [], isLoading: emailsLoading } = useQuery<EmailSubmission[]>({
    queryKey: ["/api/admin/emails"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<UsageStats>({
    queryKey: ["/api/admin/usage", "week"],
    queryFn: async () => {
      const res = await fetch("/api/admin/usage?timeRange=week");
      if (!res.ok) throw new Error("Failed to fetch usage stats");
      return res.json();
    },
  });

  const quickStats = [
    {
      title: "Wrap Colors",
      value: colorsLoading ? null : colors.length,
      icon: Palette,
      href: "/admin/colors",
      color: "text-blue-500",
    },
    {
      title: "Total Requests",
      value: statsLoading ? null : stats?.total || 0,
      icon: BarChart3,
      href: "/admin/usage",
      color: "text-green-500",
    },
    {
      title: "Email Signups",
      value: emailsLoading ? null : emails.length,
      icon: Mail,
      href: "/admin/emails",
      color: "text-purple-500",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome to the Wrap Up AI admin panel
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {quickStats.map((stat) => (
          <Card key={stat.title} className="hover-elevate">
            <Link href={stat.href}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stat.value === null ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    stat.value.toLocaleString()
                  )}
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/colors">
              <Button variant="outline" className="w-full justify-between" data-testid="link-manage-colors">
                <span className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Manage Wrap Colors
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/admin/usage">
              <Button variant="outline" className="w-full justify-between" data-testid="link-view-usage">
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  View Usage Analytics
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/admin/emails">
              <Button variant="outline" className="w-full justify-between" data-testid="link-view-emails">
                <span className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  View Email List
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/admin/settings">
              <Button variant="outline" className="w-full justify-between" data-testid="link-settings">
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Configure Settings
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Colors</CardTitle>
          </CardHeader>
          <CardContent>
            {colorsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : colors.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">
                No colors added yet
              </p>
            ) : (
              <div className="space-y-3">
                {colors.slice(0, 5).map((color) => (
                  <div
                    key={color.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    <div
                      className="w-8 h-8 rounded-md border border-border flex-shrink-0"
                      style={{ backgroundColor: color.hexColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{color.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {color.manufacturer}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

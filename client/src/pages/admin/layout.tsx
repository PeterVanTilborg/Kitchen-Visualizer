import { Switch, Route } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LogOut, Loader2, Volume2, VolumeX } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAdminSoundNotifications } from "@/hooks/useAdminSoundNotifications";
import { SoundUnlockBanner } from "@/components/admin-sound-unlock-banner";

import AdminDashboard from "./index";
import AdminColors from "./colors";
import AdminPackages from "./packages";
import AdminUsage from "./usage";
import AdminEmails from "./emails";
import AdminSettings from "./settings";
import AdminUsers from "./users";
import AdminPayments from "./payments";
import AdminRenders from "./renders";
import AdminPartners from "./partners";
import AdminAuditLog from "./audit-log";
import AdminBugReports from "./bug-reports";
import AdminAmbassadors from "./ambassadors";
import AdminPayouts from "./payouts";
import AdminLogin from "./login";

export default function AdminLayout() {
  const { data: authStatus, isLoading } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/admin/auth/status"],
  });

  const handleLoginSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/auth/status"] });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!authStatus?.authenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return <AdminShell />;
}

// AdminShell holds every hook and JSX block that should only run once the
// admin session is authenticated. Splitting it out of AdminLayout means
// useAdminSoundNotifications (and its 30s poll) cannot fire on the login
// screen — hooks-rules-of-hooks would otherwise force an unconditional
// hook call from AdminLayout, which would cost one wasted 401 per 30s
// while logged out.
function AdminShell() {
  const { soundsEnabled, toggleSounds } = useAdminSoundNotifications();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/auth/logout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/auth/status"] });
    },
  });

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AdminSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-4 border-b bg-background">
            <SidebarTrigger data-testid="button-admin-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSounds}
                    data-testid="button-admin-sound-toggle"
                    aria-label={soundsEnabled ? "Disable sound notifications" : "Enable sound notifications"}
                    aria-pressed={soundsEnabled}
                  >
                    {soundsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {soundsEnabled ? "Sound notifications: on" : "Sound notifications: off"}
                </TooltipContent>
              </Tooltip>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                data-testid="button-admin-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </header>
          <SoundUnlockBanner soundsEnabled={soundsEnabled} />
          <main className="flex-1 overflow-auto p-6">
            <Switch>
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/admin/colors" component={AdminColors} />
              <Route path="/admin/packages" component={AdminPackages} />
              <Route path="/admin/usage" component={AdminUsage} />
              <Route path="/admin/users" component={AdminUsers} />
              <Route path="/admin/payments" component={AdminPayments} />
              <Route path="/admin/emails" component={AdminEmails} />
              <Route path="/admin/settings" component={AdminSettings} />
                <Route path="/admin/renders" component={AdminRenders} />
                <Route path="/admin/partners" component={AdminPartners} />
                <Route path="/admin/ambassadors" component={AdminAmbassadors} />
                <Route path="/admin/payouts" component={AdminPayouts} />
                <Route path="/admin/bug-reports" component={AdminBugReports} />
                <Route path="/admin/audit-log" component={AdminAuditLog} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";

const NotFound = lazy(() => import("@/pages/not-found"));
const Home = lazy(() => import("@/pages/home"));
const Terms = lazy(() => import("@/pages/terms"));
const Privacy = lazy(() => import("@/pages/privacy"));
const AdminLayout = lazy(() => import("@/pages/admin/layout"));
const InfluencerPage = lazy(() => import("@/pages/influencer"));
const AuthPage = lazy(() => import("@/pages/auth"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const AccountPage = lazy(() => import("@/pages/account"));
const PartnerSignup = lazy(() => import("@/pages/partner/signup"));
const PartnerDashboard = lazy(() => import("@/pages/partner/dashboard"));
function Router() {
  return (
    <Suspense fallback={null}>
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/influencer" component={InfluencerPage} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/admin" component={AdminLayout} />
      <Route path="/admin/:rest*" component={AdminLayout} />
      <Route path="/partner/signup" component={PartnerSignup} />
        <Route path="/partner/dashboard" component={PartnerDashboard} />
        <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="wrap-up-ai-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

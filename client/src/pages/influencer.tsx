import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { Car, Instagram, Youtube, Send, CheckCircle2, Clock, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { influencerApplicationFormSchema, type InfluencerApplicationForm } from "@shared/schema";

interface InfluencerStatus {
  hasApplication: boolean;
  status: string | null;
  createdAt: string | null;
  adminNotes: string | null;
}

export default function InfluencerPage() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: influencerStatus, isLoading: statusLoading } = useQuery<InfluencerStatus>({
    queryKey: ["/api/influencer/status"],
    queryFn: async () => {
      const response = await fetch("/api/influencer/status", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch status");
      return response.json();
    },
  });

  const form = useForm<InfluencerApplicationForm>({
    resolver: zodResolver(influencerApplicationFormSchema),
    defaultValues: {
      instagramUrl: "",
      tiktokUrl: "",
      youtubeUrl: "",
      otherSocialUrl: "",
      motivation: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: InfluencerApplicationForm) => {
      const res = await apiRequest("POST", "/api/influencer/apply", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Application Submitted!", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/influencer/status"] });
    },
    onError: (error: any) => {
      let msg = error.message || "Failed to submit application";
      try { msg = JSON.parse(msg.replace(/^\d+:\s*/, "")).message || msg; } catch {}
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const onSubmit = (data: InfluencerApplicationForm) => {
    submitMutation.mutate(data);
  };

  if (authLoading || statusLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95">
        <div className="container flex h-16 items-center justify-between gap-4 px-4 mx-auto max-w-5xl">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <Car className="w-6 h-6" />
              <span className="font-semibold text-lg">Wrap Up AI</span>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-12">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Designer
          </Button>
        </Link>

        {/* Not authenticated */}
        {!isAuthenticated && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Become an Ambassador</CardTitle>
              <CardDescription className="text-base mt-2">
                You need to create an account first before applying to our Ambassador program.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Link href="/">
                <Button size="lg">Sign Up to Get Started</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Already submitted */}
        {isAuthenticated && influencerStatus?.hasApplication && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Ambassador Application</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {influencerStatus.status === "pending" && (
                <div className="flex flex-col items-center gap-4 py-6">
                  <Clock className="w-12 h-12 text-yellow-500" />
                  <h3 className="text-xl font-semibold">Application Under Review</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Thank you for your interest! We are currently evaluating your application and will contact you here in your account once a decision has been made.
                  </p>
                </div>
              )}
              {influencerStatus.status === "approved" && (
                <div className="flex flex-col items-center gap-4 py-6">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                  <h3 className="text-xl font-semibold">You're an Ambassador!</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Congratulations! You've been approved as a WRAP-UP.AI Ambassador.
                  </p>
                  {influencerStatus.adminNotes && (
                    <div className="bg-muted rounded-lg p-4 w-full mt-2">
                      <p className="text-sm font-medium mb-1">Message from us:</p>
                      <p className="text-sm text-muted-foreground">{influencerStatus.adminNotes}</p>
                    </div>
                  )}
                </div>
              )}
              {influencerStatus.status === "rejected" && (
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-2xl">😔</span>
                  </div>
                  <h3 className="text-xl font-semibold">Application Not Approved</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Unfortunately we were not able to approve your application at this time. You're welcome to apply again in the future.
                  </p>
                  {influencerStatus.adminNotes && (
                    <div className="bg-muted rounded-lg p-4 w-full mt-2">
                      <p className="text-sm font-medium mb-1">Feedback:</p>
                      <p className="text-sm text-muted-foreground">{influencerStatus.adminNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Authenticated, no application yet */}
        {isAuthenticated && !influencerStatus?.hasApplication && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Become a WRAP-UP.AI Ambassador</CardTitle>
              <CardDescription className="text-base mt-2">
                Want to be an Ambassador for this tool? Fill in the form below and tell us why you're the perfect fit. We'll evaluate your application and contact you here in your account when you get approved.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="instagramUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Instagram className="w-4 h-4" />
                          Instagram Page *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://instagram.com/yourpage"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tiktokUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>TikTok (optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://tiktok.com/@yourpage"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="youtubeUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Youtube className="w-4 h-4" />
                          YouTube (optional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://youtube.com/@yourchannel"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="otherSocialUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Other Social Media (optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Any other social media link"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="motivation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Why would you be the perfect Ambassador? *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us about yourself, your audience, and why you'd be a great ambassador for WRAP-UP.AI..."
                            className="min-h-[150px] resize-y"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={submitMutation.isPending}
                  >
                    {submitMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Application
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

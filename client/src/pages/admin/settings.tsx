import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Loader2, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

import { rateLimitSettingsSchema, type RateLimitSettings } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function AdminSettings() {

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMessage, setPwMessage] = useState("");
  const [pwError, setPwError] = useState("");

  const changePwMutation = useMutation({
    mutationFn: async () => {
      if (newPw !== confirmPw) throw new Error("Passwords do not match");
      if (newPw.length < 8) throw new Error("Password must be at least 8 characters");
      const res = await apiRequest("POST", "/api/admin/auth/change-password", {
        currentPassword: currentPw,
        newPassword: newPw,
      });
      return res.json();
    },
    onSuccess: () => {
      setPwMessage("Password changed successfully");
      setPwError("");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    },
    onError: (err: Error) => {
      setPwError(err.message);
      setPwMessage("");
    },
  });
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<RateLimitSettings>({
    queryKey: ["/api/admin/rate-limits"],
  });

  const form = useForm<RateLimitSettings>({
    resolver: zodResolver(rateLimitSettingsSchema),
    defaultValues: {
      requestsPerMinute: 10,
      requestsPerHour: 100,
      requestsPerDay: 500,
    },
    values: settings,
  });

  const updateMutation = useMutation({
    mutationFn: (data: RateLimitSettings) =>
      apiRequest("PUT", "/api/admin/rate-limits", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rate-limits"] });
      toast({ title: "Rate limits updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update rate limits", variant: "destructive" });
    },
  });

  const onSubmit = (data: RateLimitSettings) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Configure rate limiting and other system settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <CardTitle>Rate Limiting</CardTitle>
          </div>
          <CardDescription>
            Set limits on how many requests can be made to protect your API and
            manage costs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="requestsPerMinute"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requests Per Minute</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={1000}
                          data-testid="input-rate-minute"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum requests allowed per minute per user
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="requestsPerHour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requests Per Hour</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={10000}
                          data-testid="input-rate-hour"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum requests allowed per hour per user
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="requestsPerDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Requests Per Day</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={100000}
                          data-testid="input-rate-day"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum requests allowed per day per user
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-save-settings"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>


        {/* Change Admin Password */}
        <Card>
          <CardHeader>
            <CardTitle>Change Admin Password</CardTitle>
            <CardDescription>Update your admin login password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Enter new password (min 8 chars)"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            {pwMessage && <p className="text-sm text-green-600">{pwMessage}</p>}
            {pwError && <p className="text-sm text-red-600">{pwError}</p>}
            <Button
              onClick={() => changePwMutation.mutate()}
              disabled={changePwMutation.isPending || !currentPw || !newPw || !confirmPw}
            >
              {changePwMutation.isPending ? "Changing..." : "Change Password"}
            </Button>
          </CardContent>
        </Card>    </div>
  );
}

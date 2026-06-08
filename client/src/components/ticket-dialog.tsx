import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 2000;

interface TicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
}

export function TicketDialog({ open, onOpenChange, defaultEmail = "" }: TicketDialogProps) {
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed email from defaultEmail whenever the dialog opens. Logged-in
  // user's email is the prefill; user is free to edit before submitting.
  useEffect(() => {
    if (open) {
      setEmail(defaultEmail);
      setError(null);
    }
  }, [open, defaultEmail]);

  const trimmedDescription = description.trim();
  const descriptionTooShort = trimmedDescription.length < DESCRIPTION_MIN;
  const emailInvalid = email.length > 0 && !EMAIL_REGEX.test(email);
  const submitDisabled = isSubmitting || descriptionTooShort || emailInvalid;

  async function handleSubmit() {
    if (submitDisabled) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          description: trimmedDescription,
          email: email.trim() || undefined,
          surface: "consumer",
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        }),
      });
      if (!res.ok) {
        const raw = await res.text();
        let detail = raw || res.statusText;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
              if (typeof parsed.message === "string") detail = parsed.message;
              else if (typeof parsed.error === "string") detail = parsed.error;
            }
          } catch {
            // not JSON, keep raw text
          }
        }
        throw new Error(`${res.status}: ${detail}`);
      }
      toast({ title: "Ticket submitted. Thanks!" });
      setDescription("");
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit a ticket</DialogTitle>
          <DialogDescription>
            Tell us what's wrong or what's missing. We read every ticket.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticket-description">What happened?</Label>
            <Textarea
              id="ticket-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={DESCRIPTION_MAX}
              rows={6}
              placeholder="Describe the issue or your suggestion..."
              data-testid="ticket-description"
            />
            <p className="text-right text-xs text-muted-foreground">
              {description.length} / {DESCRIPTION_MAX}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-email">Email (optional)</Label>
            <Input
              id="ticket-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              data-testid="ticket-email"
            />
            <p className="text-xs text-muted-foreground">
              Add an email if you'd like a reply. Otherwise leave blank.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive" data-testid="ticket-error">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitDisabled}
              data-testid="ticket-submit"
            >
              {isSubmitting ? "Submitting..." : "Submit ticket"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

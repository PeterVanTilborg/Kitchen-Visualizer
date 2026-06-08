import { Sparkles, Mail } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Item 0l Session 2.5 — request-mode mailto target. Pre-fills subject and
// body so users can suggest a specific brand instead of being routed to a
// generic signup. info@wrap-up.app is the active 2WRAP support mailbox per
// briefing v30 Section 1.
const REQUEST_MAILTO = `mailto:info@wrap-up.app?subject=${encodeURIComponent(
  "Brand request from wrap-up.ai",
)}&body=${encodeURIComponent(
  "Hi, I'd like to suggest the following wrap brand:\n\n[type brand name here]\n\nThanks!",
)}`;

interface PipelineBrandDialogProps {
  open: boolean;
  mode: "pipeline" | "request";
  brandName: string;
  onCancel: () => void;
  onSignUp: () => void;
}

/**
 * Item 0l Session 2 — redirect popup that fires when a consumer picks a
 * non-active brand in the color-picker dropdown:
 *   - "pipeline" mode: brand exists in the catalogue but has zero colors yet
 *     ("Coming Soon"). brandName is the brand display name. Primary button
 *     calls onSignUp, which the parent uses to open AuthModal on the
 *     register tab — interested users join the standard signup funnel.
 *   - "request" mode (Session 2.5): the __request__ placeholder
 *     ("My brand isn't listed →"). Primary button is a mailto link to
 *     info@wrap-up.app with a pre-filled subject and body so users can
 *     suggest a specific brand by name. onSignUp is unused in this mode.
 *
 * No lead-capture endpoint — the pipeline_leads table from Session 1 stays
 * unused, reserved for a future per-brand capture if either funnel
 * (signup for pipeline brands, mailto for general requests) proves
 * insufficient.
 */
export function PipelineBrandDialog({
  open,
  mode,
  brandName,
  onCancel,
  onSignUp,
}: PipelineBrandDialogProps) {
  const isPipeline = mode === "pipeline";

  function handleOpenChange(next: boolean) {
    if (!next) onCancel();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPipeline ? (
              <Sparkles className="w-5 h-5 text-primary" />
            ) : (
              <Mail className="w-5 h-5 text-primary" />
            )}
            {isPipeline ? "Coming Soon" : "Suggest a brand"}
          </DialogTitle>
          <DialogDescription>
            {isPipeline ? (
              <>
                <span className="font-medium text-foreground">{brandName}</span>{" "}
                is coming soon. Register an account and we&apos;ll notify you
                when it goes live.
              </>
            ) : (
              <>
                Don&apos;t see your brand? Send us a message and we&apos;ll
                consider adding it.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {isPipeline ? (
            <Button
              onClick={onSignUp}
              className="w-full"
              data-testid="button-pipeline-signup"
            >
              Sign Up
            </Button>
          ) : (
            <a
              href={REQUEST_MAILTO}
              onClick={onCancel}
              className={buttonVariants({ className: "w-full" })}
              data-testid="button-pipeline-send-email"
            >
              Send Email
            </a>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="w-full text-center text-sm text-muted-foreground underline hover:text-foreground"
            data-testid="button-pipeline-cancel"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

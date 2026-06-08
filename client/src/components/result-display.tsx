import { useState, useEffect, useRef } from "react";
import { Download, RotateCcw, Share2, Sparkles, Zap, Loader2, Send, Phone, Mail, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import { apiRequest } from "@/lib/queryClient";
import { buildShareComposite, buildShareCaption, preloadShareAssets } from "@/lib/share-composite";

interface ResultDisplayProps {
  imageUrl: string;
  originalImageUrl?: string;
  designId?: number;
  colorName?: string;
  manufacturer?: string;
  onReset: () => void;
  credits?: number;
  freeUsageRemaining?: number;
  isAuthenticated?: boolean;
  onBuyCredits?: () => void;
  userEmail?: string;
  autoEmailQueued?: boolean;
}

export function ResultDisplay({
  imageUrl,
  originalImageUrl,
  designId,
  colorName,
  manufacturer,
  onReset,
  credits = 0,
  freeUsageRemaining = 0,
  isAuthenticated = false,
  onBuyCredits,
  userEmail,
  autoEmailQueued = false,
}: ResultDisplayProps) {
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isComposiReady, setIsComposiReady] = useState(false);

  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const renderImgRef = useRef<HTMLImageElement | null>(null);

  const [deliveryMethod, setDeliveryMethod] = useState<"email">("email");
  const [customerContact, setCustomerContact] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [shareSent, setShareSent] = useState(false);

  const isFreeTier = !isAuthenticated || credits === 0;
  const hasRemainingFree = freeUsageRemaining > 0;
  const hasSlider = !!originalImageUrl;

  // Pre-load both source images + the WrapUp logo into stable refs as soon as
  // the result mounts. The Share click handler then only needs drawImage +
  // toBlob + clipboard + share, staying well inside the transient-activation
  // budget. Cancelled-ref pattern guards against the user clicking Try Again
  // mid-load. Failure of any preload leaves isComposiReady false, which
  // disables the Share button (Download still works via the unchanged
  // handleDownload below).
  useEffect(() => {
    let cancelled = false;
    setIsComposiReady(false);
    if (!imageUrl || !originalImageUrl) return;

    const loadOne = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Image load failed: ${url}`));
      img.src = url;
    });

    Promise.all([
      loadOne(imageUrl),
      loadOne(originalImageUrl),
      preloadShareAssets(),
    ])
      .then(([render, orig]) => {
        if (cancelled) return;
        renderImgRef.current = render;
        originalImgRef.current = orig;
        setIsComposiReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("[share] preload failed:", err);
      });

    return () => { cancelled = true; };
  }, [imageUrl, originalImageUrl]);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = "car-wrap-design.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (isSharing || !isComposiReady) return;
    const renderImg = renderImgRef.current;
    const originalImg = originalImgRef.current;
    if (!renderImg || !originalImg) return;

    setIsSharing(true);
    try {
      // Build caption first; written to clipboard BEFORE share() so it
      // consumes its own transient-activation slice cleanly. Failure here
      // is non-fatal — the share still proceeds without a copied caption.
      const caption = buildShareCaption({
        surface: "consumer",
        manufacturer,
        colorName,
      });
      try {
        await navigator.clipboard.writeText(caption);
      } catch (err) {
        console.warn("[share] clipboard write failed:", err);
      }

      const blob = await buildShareComposite(originalImg, renderImg, { surface: "consumer" });
      const file = new File([blob], "wrap-up-ai-share.jpg", { type: "image/jpeg" });

      // Fire-and-forget analytics. Failure must not affect share UX, so no
      // await and no user-visible error path.
      fetch("/api/share-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surface: "consumer", designId }),
      }).catch(() => {});

      // Restrict native share to mobile. Desktop Chrome advertises
      // navigator.share for files but rejects with AbortError immediately
      // when called from a stale user-activation context — composite build
      // (~250KB JPG) outlasts the gesture window, no share sheet appears,
      // and the silent-dismiss path looks like a broken button. Desktop
      // always uses the download fallback.
      const isMobile = ((navigator as any).userAgentData?.mobile === true)
        || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const canShareFiles = isMobile
        && typeof navigator.share === "function"
        && typeof navigator.canShare === "function"
        && navigator.canShare({ files: [file] });

      if (canShareFiles) {
        try {
          // Files-only payload — no text/title/url. iOS Safari drops the
          // file when text is also present (well-documented platform
          // quirk); the caption is on the clipboard for the user to paste.
          await navigator.share({ files: [file] });
          toast({
            title: "Shared!",
            description: "Caption copied — paste it in Instagram after the image opens.",
          });
        } catch (err: any) {
          if (err?.name !== "AbortError") throw err;
          // user dismissed the share sheet — silent
        }
      } else {
        // Desktop / Web Share unsupported: download composite + caption is
        // already on clipboard from the writeText above.
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "wrap-up-ai-share.jpg";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast({
          title: "Image downloaded",
          description: "Caption copied to clipboard. Paste it when you upload to Instagram.",
        });
      }
    } catch (err: any) {
      console.error("[share] failed:", err);
      toast({
        title: "Share failed",
        description: "Could not share the image. Try downloading instead.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleSendToCustomer = async () => {
    if (!designId) {
      toast({ title: "Cannot share", description: "Design ID not available.", variant: "destructive" });
      return;
    }
    if (!customerContact.trim()) {
      toast({ title: "Missing info", description: `Please enter the customer's ${deliveryMethod === "email" ? "email address" : "phone number"}.`, variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      await apiRequest("POST", `/api/designs/${designId}/share`, {
        deliveryMethod,
        ...(deliveryMethod === "email" ? { customerEmail: customerContact } : { customerPhone: customerContact }),
      });
      setShareSent(true);
      toast({ title: "Design Sent!", description: `Your customer will receive the design via ${deliveryMethod === "email" ? "email" : "SMS"}.` });
    } catch (err: any) {
      const msg = err.message?.replace(/^\d+:\s*/, "") || "Failed to send";
      let displayMsg = msg;
      try { displayMsg = JSON.parse(msg).message || msg; } catch {}
      toast({ title: "Send failed", description: displayMsg, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Your Custom Wrap Design</h2>
        <p className="text-muted-foreground">
          {hasSlider ? "Drag the slider to compare with the original" : "Here's your personalized car wrap visualization"}
        </p>
      </div>

      {/* Main image — slider if original available, plain image otherwise */}
      <Card className="overflow-hidden p-0 relative">
        {hasSlider ? (
          <BeforeAfterSlider
            beforeImage={originalImageUrl!}
            afterImage={imageUrl}
            beforeLabel="Original"
            afterLabel="Wrap Design"
          />
        ) : (
          <img
            src={imageUrl}
            alt="Generated car wrap design"
            className="w-full h-auto object-contain max-h-[600px]"
            data-testid="img-result"
          />
        )}

        {/* Expand button — tap to view full size / pinch-zoom on mobile */}
      <button
        onClick={() => setIsLightboxOpen(true)}
        className="absolute top-10 right-2 z-10 p-1.5 rounded transition-colors hover:bg-black/20"
        style={{ color: "#D2D915" }}
        title="View full size"
        aria-label="View full size"
      >
        <Maximize2 className="w-5 h-5" />
      </button>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button onClick={handleDownload} data-testid="button-download">
          <Download className="w-4 h-4 mr-2" />
          Download Design
        </Button>
        <Button variant="outline" onClick={handleShare} disabled={isSharing || !isComposiReady} data-testid="button-share">
          {isSharing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />}
          {isSharing ? "Sharing..." : "Share"}
        </Button>
        <Button variant="outline" onClick={onReset} data-testid="button-try-again">
          <RotateCcw className="w-4 h-4 mr-2" />
          Try Another Design
        </Button>
      </div>

      {isAuthenticated && autoEmailQueued && userEmail && (
        <p className="text-sm text-muted-foreground text-center" data-testid="text-auto-email-sent">
          A copy has been sent to your email.
        </p>
      )}

      {/* Send to Customer */}
      <Card className="p-5 border-border">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-base">Send to my contact</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isAuthenticated && userEmail
                ? "Send this design to your contact. You'll get a copy too."
                : "Share this design directly with your contact via email."}
            </p>
          </div>
          {shareSent ? (
            <div className="flex items-center gap-2 text-sm text-green-500 font-medium py-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Design sent! Your contact will receive it shortly.
              <button className="ml-auto text-xs text-muted-foreground underline" onClick={() => { setShareSent(false); setCustomerContact(""); }}>
                Send again
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDeliveryMethod("email")} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-colors ${deliveryMethod === "email" ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-muted-foreground border-border hover:border-foreground"}`}>
                  <Mail className="w-4 h-4" />Email
                </button>
</div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  {deliveryMethod === "email" ? "Contact email address" : "Contact phone number (incl. country code, e.g. +31612345678)"}
                </Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type={deliveryMethod === "email" ? "email" : "tel"}
                    placeholder={deliveryMethod === "email" ? "contact@example.com" : "+31612345678"}
                    value={customerContact}
                    onChange={(e) => setCustomerContact(e.target.value)}
                    className="h-10 flex-1"
                  />
                  <Button onClick={handleSendToCustomer} disabled={isSending || !customerContact.trim()} className="h-10">
                    {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    {isSending ? "Sending..." : "Send to my contact"}
                  </Button>
                </div>
                {isAuthenticated && userEmail && (
                  <p className="text-xs text-muted-foreground mt-1.5" data-testid="text-cc-hint">
                    A copy will be sent to you at {userEmail}.
                  </p>
                )}
              </div>
</>
          )}
        </div>
      </Card>

      {/* Upgrade CTA */}
      <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="p-2 bg-primary/20 rounded-full">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              {isFreeTier ? (
                <>
                  <p className="font-medium">{hasRemainingFree ? `${freeUsageRemaining} free preview${freeUsageRemaining !== 1 ? "s" : ""} left` : "Upgrade for high-resolution designs"}</p>
                  <p className="text-sm text-muted-foreground">Get full HD images without watermarks</p>
                </>
              ) : (
                <>
                  <p className="font-medium">{credits} credit{credits !== 1 ? "s" : ""} remaining</p>
                  <p className="text-sm text-muted-foreground">Need more? Get additional credits below</p>
                </>
              )}
            </div>
          </div>
          <Button onClick={onBuyCredits} className="shrink-0" data-testid="button-buy-credits-result">
            <Zap className="w-4 h-4 mr-2" />
            {isFreeTier ? "Upgrade Now" : "Buy More Credits"}
          </Button>
        </div>
</Card>

      {/* Fullscreen lightbox */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={() => setIsLightboxOpen(false)}>
          <button className="absolute top-4 right-4 z-50 bg-white/20 hover:bg-white/30 text-white rounded-full p-2.5 transition-colors" onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(false); }} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
          <p className="absolute bottom-5 left-0 right-0 text-center text-white/50 text-xs pointer-events-none select-none">Tap anywhere to close</p>
          <img src={imageUrl} alt="Car wrap design — full size" className="max-w-full max-h-full object-contain select-none" onClick={(e) => e.stopPropagation()} draggable={false} />
        </div>
      )}
    </div>
  );
}

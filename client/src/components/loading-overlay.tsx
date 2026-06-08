import { Loader2, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

interface LoadingOverlayProps {
  isLoading: boolean;
}

const loadingMessages = [
  "Analyzing your vehicle...",
  "Preparing wrap visualization...",
  "Applying color transformation...",
  "Adding finishing touches...",
  "Almost there...",
];

export function LoadingOverlay({ isLoading }: LoadingOverlayProps) {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      setMessageIndex(0);
      return;
    }

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.random() * 10;
      });
    }, 500);

    const messageInterval = setInterval(() => {
      setMessageIndex((prev) =>
        prev < loadingMessages.length - 1 ? prev + 1 : prev
      );
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
      data-testid="loading-overlay"
    >
      <div className="bg-card border border-card-border rounded-xl p-8 max-w-md w-full mx-4 space-y-6 shadow-lg">
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-primary animate-pulse" />
            </div>
            <div className="absolute -top-1 -right-1">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Generating Your Design</h3>
          <p className="text-muted-foreground text-sm">
            {loadingMessages[messageIndex]}
          </p>
        </div>

        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            {Math.round(progress)}% complete
          </p>
        </div>
      </div>
    </div>
  );
}

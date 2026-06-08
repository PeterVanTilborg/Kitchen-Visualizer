import * as React from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface HeicRejectedNoticeProps {
  onReset: () => void;
  className?: string;
}

export function HeicRejectedNotice({
  onReset,
  className,
}: HeicRejectedNoticeProps) {
  const [tutorialOpen, setTutorialOpen] = React.useState(false);

  return (
    <Alert
      variant="destructive"
      className={cn("space-y-3", className)}
      data-testid="alert-heic-rejected"
    >
      <AlertDescription className="space-y-3 text-foreground">
        <p className="font-medium text-destructive">
          This looks like a HEIC photo (Apple&apos;s iPhone format). Please
          convert it to JPG or PNG first.
        </p>

        <Collapsible open={tutorialOpen} onOpenChange={setTutorialOpen}>
          <CollapsibleTrigger
            className="text-sm font-medium text-destructive underline underline-offset-4"
            data-testid="button-heic-tutorial-toggle"
          >
            {tutorialOpen ? "Hide how to convert" : "Show how to convert"}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3 text-sm">
            <div>
              <p className="font-medium">Mac</p>
              <p className="text-muted-foreground">
                Right-click the photo &rarr; Open With &rarr; Preview &rarr;
                File &rarr; Export &rarr; set Format to JPEG &rarr; Save.
              </p>
            </div>
            <div>
              <p className="font-medium">Windows</p>
              <p className="text-muted-foreground">
                Right-click the photo &rarr; Open With &rarr; Photos &rarr;
                click the &quot;...&quot; menu &rarr; Save as &rarr; choose JPG.
              </p>
            </div>
            <div>
              <p className="font-medium">Android</p>
              <p className="text-muted-foreground">
                Open the photo in Google Photos &rarr; tap Share &rarr; choose
                &quot;Save as JPG&quot; or send via WhatsApp.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: Sending the photo via WhatsApp also converts it
              automatically.
            </p>
          </CollapsibleContent>
        </Collapsible>

        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            data-testid="button-heic-reset"
          >
            Try another file
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

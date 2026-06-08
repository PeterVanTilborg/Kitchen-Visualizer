import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { KITCHEN_SWATCHES } from "@shared/swatches";

interface SwatchPickerProps {
  selectedSwatchId: string | null;
  onSwatchSelect: (swatchId: string) => void;
}

// CLONE — replaces the DB-backed ColorPicker. Renders the hardcoded kitchen
// finish set from @shared/swatches; images are served from /swatches/<file>.
export function SwatchPicker({ selectedSwatchId, onSwatchSelect }: SwatchPickerProps) {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      data-testid="swatch-picker"
    >
      {KITCHEN_SWATCHES.map((swatch) => {
        const isSelected = selectedSwatchId === swatch.id;
        return (
          <button
            key={swatch.id}
            type="button"
            onClick={() => onSwatchSelect(swatch.id)}
            data-testid={`swatch-${swatch.id}`}
            className={cn(
              "relative rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-ring",
              isSelected ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/50",
            )}
          >
            <img
              src={`/swatches/${swatch.file}`}
              alt={swatch.label}
              className="w-full h-24 object-cover bg-muted"
              loading="lazy"
            />
            {isSelected && (
              <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                <Check className="w-3 h-3" />
              </div>
            )}
            <div className="p-2 text-sm font-medium text-center">{swatch.label}</div>
          </button>
        );
      })}
    </div>
  );
}

import { Check, Paintbrush, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { additionalOptions } from "@shared/schema";

interface OptionsSelectorProps {
  selectedOptions: string[];
  onOptionsChange: (options: string[]) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  "chrome-delete": <Paintbrush className="w-5 h-5" />,
  "window-tint": <Sun className="w-5 h-5" />,
};

export function OptionsSelector({
  selectedOptions,
  onOptionsChange,
}: OptionsSelectorProps) {
  const toggleOption = (optionId: string) => {
    if (selectedOptions.includes(optionId)) {
      onOptionsChange(selectedOptions.filter((id) => id !== optionId));
    } else {
      onOptionsChange([...selectedOptions, optionId]);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Additional Options</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {additionalOptions.map((option) => {
          const isSelected = selectedOptions.includes(option.id);
          return (
            <button
              type="button"
              key={option.id}
              onClick={() => toggleOption(option.id)}
              className={cn(
                "flex items-start gap-4 p-4 rounded-lg border transition-all text-left hover-elevate active-elevate-2",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
              data-testid={`button-option-${option.id}`}
            >
              <div
                className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {iconMap[option.id]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{option.name}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

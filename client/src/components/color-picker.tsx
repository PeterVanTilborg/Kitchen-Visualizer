import { useState, useMemo, useCallback, useEffect } from "react";
import { Check, Layers, Building2, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WrapColor } from "@shared/schema";
import { colorCategories } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

// Item 0l Session 2 — minimal shape of /api/manufacturers rows used by the
// color picker. The full row has more fields (sortOrder, createdAt) that the
// picker doesn't need.
export interface ManufacturerForPicker {
  id: number;
  name: string;
  status: string;
  displayLabel: string | null;
}

interface ColorPickerProps {
  colors: WrapColor[];
  selectedColorId: string | null;
  onColorSelect: (colorId: string) => void;
  isLoading?: boolean;
  scrollTargetRef?: React.RefObject<HTMLElement | null>;
  // Item 0l Session 2 — full manufacturer list including pipeline + request
  // entries that have no colors. Optional for backward-compatibility; when
  // undefined the picker behaves as before (only colors-derived brands).
  manufacturers?: ManufacturerForPicker[];
  // Item 0l Session 2 — fired when the user selects a pipeline-status brand
  // or the __request__ placeholder. Parent opens the redirect dialog.
  onPipelineBrandSelected?: (mode: "pipeline" | "request", brandName: string) => void;
}

const REQUEST_PLACEHOLDER_NAME = "__request__";

interface ExtendedManufacturer {
  /** Unique value for the SelectItem (manufacturer name; "__request__" for the placeholder). */
  value: string;
  /** Visible name. For "request" entries this is the displayLabel. */
  displayName: string;
  status: "active" | "in_progress" | "pipeline" | "request";
  /** Number of colors for this brand in the current /api/colors response. 0 for pipeline/request. */
  count: number;
  /** Optional badge suffix in the dropdown (e.g. "In Progress", "Coming Soon"). null for plain active rows. */
  badge: string | null;
}

export function ColorPicker({
  colors,
  selectedColorId,
  onColorSelect,
  isLoading,
  scrollTargetRef,
  manufacturers,
  onPipelineBrandSelected,
}: ColorPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedManufacturer, setSelectedManufacturer] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const isMobile = useIsMobile();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const availableManufacturers = useMemo(() => {
    // Preserve arrival order — backend returns colors in manufacturers.sort_order.
    return Array.from(new Set(colors.map((c) => c.manufacturer)));
  }, [colors]);

  const availableCategories = useMemo(() => {
    const filteredByManufacturer = selectedManufacturer 
      ? colors.filter(c => c.manufacturer === selectedManufacturer)
      : colors;
    const categories = new Set(filteredByManufacturer.map((c) => c.category));
    return colorCategories.filter((cat) => categories.has(cat));
  }, [colors, selectedManufacturer]);

  // Global counts — one O(n) reduce, recomputed only when colors changes.
  // Counts are intentionally NOT cross-filtered: "Gloss (151)" reflects all
  // 151 gloss colors across every brand, even when a specific brand is
  // currently selected. Matches admin "All Colors (314)" header style.
  const brandCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of colors) map[c.manufacturer] = (map[c.manufacturer] || 0) + 1;
    return map;
  }, [colors]);

  // Item 0l Session 2 — merge colors-derived brands with the manufacturers
  // prop so pipeline + request rows (which have zero colors) appear in the
  // brand Select. Status-grouped order: active → in_progress → pipeline →
  // request, regardless of manufacturers.sort_order. Within each status
  // group, the natural arrival order from the source list is preserved.
  const extendedManufacturers = useMemo<ExtendedManufacturer[]>(() => {
    const statusByName = new Map<string, ManufacturerForPicker>();
    for (const m of manufacturers ?? []) statusByName.set(m.name, m);

    const actives: ExtendedManufacturer[] = [];
    const inProgress: ExtendedManufacturer[] = [];

    for (const name of availableManufacturers) {
      const m = statusByName.get(name);
      const status = (m?.status ?? "active") as ExtendedManufacturer["status"];
      const count = brandCounts[name] ?? 0;
      if (status === "in_progress") {
        inProgress.push({
          value: name,
          displayName: name,
          status: "in_progress",
          count,
          badge: m?.displayLabel || "In Progress",
        });
      } else {
        // Treat anything other than in_progress (active, or unknown fallback)
        // as active for display purposes. A brand that's marked pipeline OR
        // request but somehow has colors should not happen given the admin
        // guards, but if it does we surface it as a normal active entry
        // rather than redirecting users away from working colors.
        actives.push({
          value: name,
          displayName: name,
          status: "active",
          count,
          badge: null,
        });
      }
    }

    const pipelines: ExtendedManufacturer[] = [];
    let request: ExtendedManufacturer | null = null;
    for (const m of manufacturers ?? []) {
      if (m.status === "pipeline" && !availableManufacturers.includes(m.name)) {
        pipelines.push({
          value: m.name,
          displayName: m.name,
          status: "pipeline",
          count: 0,
          badge: m.displayLabel || "Coming Soon",
        });
      } else if (m.status === "request" && m.name === REQUEST_PLACEHOLDER_NAME) {
        request = {
          value: REQUEST_PLACEHOLDER_NAME,
          displayName: m.displayLabel || "My brand isn't listed →",
          status: "request",
          count: 0,
          badge: null,
        };
      }
    }

    return [...actives, ...inProgress, ...pipelines, ...(request ? [request] : [])];
  }, [availableManufacturers, manufacturers, brandCounts]);

  function formatBrandSelectLabel(em: ExtendedManufacturer): string {
    if (em.status === "request") return em.displayName;
    if (em.status === "pipeline") return `${em.displayName} — ${em.badge}`;
    if (em.status === "in_progress") return `${em.displayName} (${em.count}) — ${em.badge}`;
    return `${em.displayName} (${em.count})`;
  }

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of colors) map[c.category] = (map[c.category] || 0) + 1;
    return map;
  }, [colors]);

  const filteredColors = useMemo(() => {
    let filtered = colors;
    if (selectedManufacturer) {
      filtered = filtered.filter((c) => c.manufacturer === selectedManufacturer);
    }
    if (selectedCategory) {
      filtered = filtered.filter((c) => c.category === selectedCategory);
    }
    if (debouncedSearch.trim()) {
      const search = debouncedSearch.toLowerCase();
      filtered = filtered.filter((c) =>
        c.name.toLowerCase().includes(search) ||
        c.manufacturer.toLowerCase().includes(search) ||
        c.category.toLowerCase().includes(search) ||
        (c.colorNumber && c.colorNumber.toLowerCase().includes(search))
      );
    }
    return filtered;
  }, [colors, selectedCategory, selectedManufacturer, debouncedSearch]);

  const selectedColor = useMemo(() => {
    if (!selectedColorId) return null;
    return colors.find((c) => String(c.id) === selectedColorId) || null;
  }, [colors, selectedColorId]);

  const handleColorSelect = useCallback((colorId: string) => {
    onColorSelect(colorId);
    if (isMobile && scrollTargetRef?.current) {
      setTimeout(() => {
        scrollTargetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [onColorSelect, isMobile, scrollTargetRef]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-20 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (colors.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          No colors available. Please check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={selectedManufacturer ?? "all"}
            onValueChange={(v) => {
              if (v === "all") {
                setSelectedManufacturer(null);
                return;
              }
              const em = extendedManufacturers.find((x) => x.value === v);
              if (em && em.status === "pipeline" && onPipelineBrandSelected) {
                // Intercept: don't update selectedManufacturer so the Select
                // snaps back to the prior value when the dialog closes.
                onPipelineBrandSelected("pipeline", em.displayName);
                return;
              }
              if (em && em.status === "request" && onPipelineBrandSelected) {
                onPipelineBrandSelected("request", "");
                return;
              }
              setSelectedManufacturer(v);
            }}
          >
            <SelectTrigger className="h-9" data-testid="select-brand-filter">
              <div className="flex items-center gap-1.5 min-w-0">
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <SelectValue placeholder="All Brands" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{`All Brands (${colors.length})`}</SelectItem>
              {extendedManufacturers.map((em) => (
                <SelectItem
                  key={em.value}
                  value={em.value}
                  data-testid={`select-brand-option-${em.value}`}
                >
                  {formatBrandSelectLabel(em)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedCategory ?? "all"}
            onValueChange={(v) => setSelectedCategory(v === "all" ? null : v)}
          >
            <SelectTrigger className="h-9" data-testid="select-finish-filter">
              <div className="flex items-center gap-1.5 min-w-0">
                <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
                <SelectValue placeholder="All Finishes" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{`All Finishes (${colors.length})`}</SelectItem>
              {availableCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {`${category} (${categoryCounts[category] ?? 0})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by name, number or brand..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-color-search"
        />
      </div>

      <p className="text-xs text-muted-foreground" data-testid="text-filtered-count">
        {selectedManufacturer || selectedCategory || debouncedSearch.trim()
          ? `${filteredColors.length} colors matching`
          : `${filteredColors.length} colors`}
      </p>

      {selectedColor && (
        <div className="sticky top-16 z-50 py-3 bg-background border-b border-border -mx-2 px-2" data-testid="sticky-selected-color">
          <div className="flex items-start gap-4">
            <div
              className="w-24 h-24 rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background flex-shrink-0 overflow-hidden"
              style={{
                backgroundColor: selectedColor.hexColor,
              }}
              data-testid="selected-color-preview"
            >
              {selectedColor.thumbnailUrl && <img src={selectedColor.thumbnailUrl} alt="" className="w-full h-full" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-lg" translate="no" data-testid="text-selected-color-name">{selectedColor.name}</h4>
                  <p className="text-sm text-muted-foreground" data-testid="text-selected-color-details">
                    {selectedColor.manufacturer}
                    {selectedColor.colorNumber && (
                      <span className="font-bold text-white"> {selectedColor.colorNumber}</span>
                    )}
                    {" "}- {selectedColor.category}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onColorSelect("")}
                  className="flex-shrink-0"
                  data-testid="button-clear-color"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Click another color below to change your selection
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-h-[480px] md:max-h-[520px] lg:max-h-[560px] overflow-y-auto rounded-lg">
      <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
        {filteredColors.map((color) => (
          <Tooltip key={color.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => handleColorSelect(String(color.id))}
                className={cn(
                  "relative aspect-square rounded-lg transition-all duration-200 hover-elevate active-elevate-2",
                  selectedColorId === String(color.id)
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "ring-1 ring-border hover:ring-primary/50"
                )}
                style={{
                  backgroundColor: color.hexColor,
                }}
                data-testid={`button-color-${color.id}`}
              >
              {color.thumbnailUrl && <img src={color.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full" />}
                {selectedColorId === String(color.id) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-center">
              <p className="font-medium" translate="no">{color.name}</p>
              <p className="text-xs text-muted-foreground">
                {color.manufacturer}
                {color.colorNumber && <span className="font-bold text-white"> {color.colorNumber}</span>}
                {" "}- {color.category}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      </div>

      {filteredColors.length === 0 && selectedCategory && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No colors available in the {selectedCategory} category.
        </p>
      )}
    </div>
  );
}

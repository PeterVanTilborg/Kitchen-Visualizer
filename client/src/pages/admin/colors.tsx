import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Loader2, Upload, X, Image, FolderOpen, Check, GripVertical, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

import type { WrapColor } from "@shared/schema";
import { insertWrapColorSchema, colorCategories } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// =========== Filename parser ===========

function titleCaseIfAllCaps(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return trimmed;
  // Only title-case when the name is fully uppercase (caps/digits/space/hyphen)
  // AND contains at least one letter. Mixed-case input is left untouched so
  // intentional casing like "3M Matte Red" or "iPhone Blue" survives.
  if (!/^[A-Z0-9\s\-]+$/.test(trimmed)) return trimmed;
  if (!/[A-Z]/.test(trimmed)) return trimmed;
  return trimmed
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function parseColorFilename(filename: string): {
  brand: string;
  colorNumber: string;
  colorName: string;
} {
  const base = filename.replace(/\.[^/.]+$/, "").trim();

  // 1. Leading-digit special case: pure-numeric first token means no brand
  //    prefix (e.g. "950 Silver.jpg"). Tightened from /^\d/ to /^\d+$/ so
  //    brand prefixes like "3M" fall through to the bracket/no-bracket paths.
  const firstToken = base.split(/\s+/)[0] ?? "";
  if (/^\d+$/.test(firstToken)) {
    const rest = base.slice(firstToken.length).trim();
    return {
      brand: "",
      colorNumber: firstToken,
      colorName: titleCaseIfAllCaps(rest),
    };
  }

  // 2. Bracket form (supports multi-word brands and legacy filenames):
  //    "Brand [Number] Color Name" — e.g. "3M 2080 [G13] Gloss Black".
  const bracketMatch = base.match(/^\s*(.+?)\s*\[\s*([^\]]+?)\s*\]\s*(.+?)\s*$/);
  if (bracketMatch) {
    return {
      brand: bracketMatch[1].trim(),
      colorNumber: bracketMatch[2].trim(),
      colorName: titleCaseIfAllCaps(bracketMatch[3]),
    };
  }

  // 3. No-bracket form (primary — the format suppliers actually ship):
  //    "Brand Number Color Name" where Number contains at least one digit.
  //    Single-token brand only; multi-word brands must use the bracket form.
  const noBracketMatch = base.match(/^(\S+)\s+(\S*\d\S*)\s+(.+)$/);
  if (noBracketMatch) {
    return {
      brand: noBracketMatch[1],
      colorNumber: noBracketMatch[2],
      colorName: titleCaseIfAllCaps(noBracketMatch[3]),
    };
  }

  // 4. Generic fallback: first token = brand, rest = name, number empty.
  const parts = base.split(/\s+/);
  const brand = parts[0] ?? "";
  const colorName = parts.slice(1).join(" ").trim();
  return {
    brand,
    colorNumber: "",
    colorName: titleCaseIfAllCaps(colorName),
  };
}

// =========== Category auto-detector ===========

function detectCategory(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("high gloss")) return "High Gloss";
  if (t.includes("iridescent") && t.includes("matte")) return "Iridescent Matte";
  if (t.includes("iridescent") || t.includes("flip") || t.includes("chameleon") || t.includes("color shift"))
    return "Iridescent Gloss";
  if (t.includes("pearlescent") && t.includes("matte")) return "Pearlescent Matte";
  if (t.includes("pearlescent") || t.includes("pearl")) return "Pearlescent Gloss";
  if (t.includes("satin")) return "Satin";
  if (t.includes("matte") || t.includes("matt")) return "Matte";
  if (t.includes("structured")) return "Structured";
  if (t.includes("gloss")) return "Gloss";
  return ""; // user fills in manually
}

// =========== Staging row type ===========

type StagingRow = {
  id: string;
  swatchFile: File;
  previewUrl: string | null;
  brand: string;
  colorNumber: string;
  colorName: string;
  category: string;
  referenceFile?: File;
  referencePreviewUrl?: string;
  importing: boolean;
  done: boolean;
  error?: string;
};

// =========== Form type ===========

type ColorFormData = {
  name: string;
  colorNumber?: string;
  hexColor: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  manufacturer: string;
  category: string;
};

// =========== Component ===========

export default function AdminColors() {
  const { toast } = useToast();

  // Main table state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<WrapColor | null>(null);
  const [deletingColor, setDeletingColor] = useState<WrapColor | null>(null);
  const [uploadingSwatchFor, setUploadingSwatchFor] = useState<number | null>(null);
  const [uploadingReferenceFor, setUploadingReferenceFor] = useState<number | null>(null);
  const swatchInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  // Edit dialog: staged swatch file (uploaded on Submit via the dialog's own file input)
  const [stagedSwatchFile, setStagedSwatchFile] = useState<File | null>(null);
  const dialogSwatchInputRef = useRef<HTMLInputElement>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Drag-to-reorder state
  const [orderedIds, setOrderedIds] = useState<number[]>([]);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const dragStartIndex = useRef<number>(-1);

  // Batch import state
  const [stagingRows, setStagingRows] = useState<StagingRow[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const batchDropInputRef = useRef<HTMLInputElement>(null);
  const rowReferenceInputRef = useRef<HTMLInputElement>(null);
  const [pendingReferenceRowId, setPendingReferenceRowId] = useState<string | null>(null);
  // Brand filter for list view
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>("");
  // Visual reorder mode
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderBrandFilter, setReorderBrandFilter] = useState<string>("");
  const [reorderIds, setReorderIds] = useState<number[]>([]);
  const [gridDraggingId, setGridDraggingId] = useState<number | null>(null);
  const [gridDragOverId, setGridDragOverId] = useState<number | null>(null);
  // Inline color number editing
  const [inlineEditColorId, setInlineEditColorId] = useState<number | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>("");

  // Brand-reorder state (Item 0d, commit 2). Superadmin-only.
  const [brandOrderIds, setBrandOrderIds] = useState<number[]>([]);
  const [brandDraggingId, setBrandDraggingId] = useState<number | null>(null);
  const [brandDragOverId, setBrandDragOverId] = useState<number | null>(null);

  // =========== Edit/Add form ===========

  const form = useForm<ColorFormData>({
    resolver: zodResolver(insertWrapColorSchema),
    defaultValues: {
      name: "",
      colorNumber: "",
      hexColor: "#000000",
      manufacturer: "",
      category: "Gloss",
    },
  });

  const { data: colors = [], isLoading } = useQuery<WrapColor[]>({
    queryKey: ["/api/admin/colors"],
    // Sync orderedIds whenever fresh data arrives from the server
    select: (data) => {
      // Keep server order; orderedIds will shadow it after user drags
      return data;
    },
  });

  // Auth status — read role to gate the superadmin-only Brand Order card.
  // Same query key as admin/layout.tsx, so TanStack Query dedupes the fetch.
  const { data: authStatus } = useQuery<{ authenticated: boolean; role?: string }>({
    queryKey: ["/api/admin/auth/status"],
  });

  // Manufacturer list driving the Brand Order card. Item 0l added status +
  // displayLabel; Session 1 admin UI excludes the __request__ placeholder
  // from this card (it is a system sentinel surfaced only on the consumer
  // dropdown in Session 2).
  type ManufacturerListItem = {
    id: number;
    name: string;
    sortOrder: number;
    status: string;
    displayLabel: string | null;
  };
  const { data: manufacturersList } = useQuery<Array<ManufacturerListItem>>({
    queryKey: ["/api/manufacturers"],
  });
  const realManufacturers = useMemo(
    () => (manufacturersList ?? []).filter((m) => m.status !== "request"),
    [manufacturersList],
  );

  // =========== Add Pipeline Brand dialog state (Item 0l Session 1) ===========
  const [isAddBrandDialogOpen, setIsAddBrandDialogOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandStatus, setNewBrandStatus] = useState<"active" | "in_progress" | "pipeline">("pipeline");
  const [newBrandDisplayLabel, setNewBrandDisplayLabel] = useState("");

  // Derive display order: if user has dragged, use orderedIds; otherwise use server order
  const displayColors = useMemo(() => {
    if (orderedIds.length === colors.length && orderedIds.length > 0) {
      const map = new Map(colors.map((c) => [c.id, c]));
      return orderedIds.map((id) => map.get(id)).filter(Boolean) as WrapColor[];
    }
    return colors;
  }, [colors, orderedIds]);

  // Filtered list for the search bar
  const filteredColors = useMemo(() => {
    let result = displayColors ?? [];
    if (selectedManufacturer) {
      result = result.filter((col) => col.manufacturer === selectedManufacturer);
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return result;
    return result.filter(
      (col) =>
        col.name.toLowerCase().includes(q) ||
        ((col as any).colorNumber || "").toLowerCase().includes(q) ||
        col.manufacturer.toLowerCase().includes(q)
    );
  }, [displayColors, searchQuery, selectedManufacturer]);

  // Unique manufacturers with counts for brand filter dropdowns
  const manufacturers = useMemo(() => {
    if (!colors) return [];
    const counts: Record<string, number> = {};
    colors.forEach((col) => {
      counts[col.manufacturer] = (counts[col.manufacturer] || 0) + 1;
    });
    // Preserve insertion order — backend returns colors in manufacturers.sort_order,
    // so iterating the counts map yields brands in the same order.
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }));
  }, [colors]);

  // Colors ordered for visual reorder grid
  const reorderColors = useMemo(() => {
    if (!colors) return [];
    const idToColor = new Map(colors.map((col) => [col.id, col]));
    return reorderIds.map((id) => idToColor.get(id)).filter(Boolean) as typeof colors;
  }, [colors, reorderIds]);

  const createMutation = useMutation({
    mutationFn: (data: ColorFormData) => apiRequest("POST", "/api/colors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/colors"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/colors"] });
      // Refresh brand list — POST /api/colors auto-registers a new manufacturer
      // when the new color introduces one (Item 0d, commit 1).
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturers"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Color added successfully" });
    },
    onError: () => toast({ title: "Failed to add color", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: ColorFormData & { id: string }) =>
      apiRequest("PATCH", `/api/colors/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/colors"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/colors"] });
      setIsDialogOpen(false);
      setEditingColor(null);
      form.reset();
      toast({ title: "Color updated successfully" });
    },
    onError: () => toast({ title: "Failed to update color", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/colors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/colors"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/colors"] });
      setDeletingColor(null);
      toast({ title: "Color deleted successfully" });
    },
    onError: () => toast({ title: "Failed to delete color", variant: "destructive" }),
  });


  const reorderMutation = useMutation({
    mutationFn: (ids: number[]) =>
      apiRequest("PATCH", "/api/colors/reorder", { orderedIds: ids }),
    onError: () => {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ["/api/colors"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/colors"] });
      toast({ title: "Failed to save order", variant: "destructive" });
    },
  });

  // Grid reorder mutation for visual reorder overlay
  const gridReorderMutation = useMutation({
    mutationFn: (ids: number[]) =>
      apiRequest("PATCH", "/api/colors/reorder", { orderedIds: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/colors"] });
      toast({ title: "Color order saved" });
    },
    onError: () => {
      toast({ title: "Failed to save order", variant: "destructive" });
    },
  });

  // Brand-reorder mutation (Item 0d, commit 2).
  const brandReorderMutation = useMutation({
    mutationFn: (ids: number[]) =>
      apiRequest("PATCH", "/api/manufacturers/reorder", { orderedIds: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/colors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/colors"] });
      toast({ title: "Brand order saved" });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturers"] });
      toast({ title: "Failed to save brand order", variant: "destructive" });
    },
  });

  // Item 0l Session 1 — create a new manufacturer (typically pipeline state).
  const addBrandMutation = useMutation({
    mutationFn: (data: { name: string; status: string; displayLabel?: string }) =>
      apiRequest("POST", "/api/manufacturers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturers"] });
      setIsAddBrandDialogOpen(false);
      setNewBrandName("");
      setNewBrandStatus("pipeline");
      setNewBrandDisplayLabel("");
      // Reset brandOrderIds so the new brand gets pulled in by the init effect.
      setBrandOrderIds([]);
      toast({ title: "Brand added" });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to add brand",
        description: err.message.replace(/^\d+:\s*/, ""),
        variant: "destructive",
      });
    },
  });

  // Item 0l Session 1 — transition a brand's status with optimistic update.
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/manufacturers/${id}/status`, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/manufacturers"] });
      const previous = queryClient.getQueryData<ManufacturerListItem[]>(["/api/manufacturers"]);
      if (previous) {
        queryClient.setQueryData<ManufacturerListItem[]>(
          ["/api/manufacturers"],
          previous.map((m) => (m.id === id ? { ...m, status } : m)),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["/api/manufacturers"], ctx.previous);
      }
      toast({ title: "Failed to update brand status", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturers"] });
    },
  });

  // Inline color-number save mutation
  const colorNumberMutation = useMutation({
    mutationFn: ({ id, colorNumber }: { id: number; colorNumber: string }) =>
      apiRequest("PATCH", "/api/colors/" + id, { colorNumber }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/colors"] });
    },
    onError: () => {
      toast({ title: "Failed to save color number", variant: "destructive" });
    },
  });

  // Init list-view order from server data on first load
  useEffect(() => {
    if (colors && orderedIds.length === 0) {
      setOrderedIds(colors.map((col) => col.id));
    }
  }, [colors]);

  // Init brand-reorder ids from server data on first load. Excludes the
  // __request__ placeholder so it is never draggable in this admin UI.
  useEffect(() => {
    if (realManufacturers.length > 0 && brandOrderIds.length === 0) {
      setBrandOrderIds(realManufacturers.map((m) => m.id));
    }
  }, [realManufacturers]);

  // Re-init reorder grid IDs when entering mode or changing filter
  useEffect(() => {
    if (!isReorderMode || !colors) return;
    // Default to the first brand (in manufacturers.sort_order, which the
    // memoized manufacturers list now follows) when entering reorder mode
    // with no brand selected — required since the "All Colors" option was
    // removed (Item 0d, commit 3).
    if (!reorderBrandFilter && manufacturers.length > 0) {
      setReorderBrandFilter(manufacturers[0].name);
      return; // wait for filter state to settle, effect will re-fire
    }
    const base = reorderBrandFilter
      ? colors.filter((col) => col.manufacturer === reorderBrandFilter)
      : [];
    setReorderIds(base.map((col) => col.id));
  }, [isReorderMode, reorderBrandFilter, manufacturers]);

  // Clear the Edit dialog's staged swatch file whenever the dialog closes
  useEffect(() => {
    if (!isDialogOpen) setStagedSwatchFile(null);
  }, [isDialogOpen]);

  // =========== Swatch / reference upload for existing colors ===========

  const uploadSwatchMutation = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`/api/colors/${id}/swatch`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to upload swatch");
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/colors"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/colors"] });
      setUploadingSwatchFor(null);
      const hexMsg = data?.autoHex ? ` Hex auto-set to ${data.autoHex}.` : "";
      toast({ title: `Swatch uploaded.${hexMsg}` });
    },
    onError: () => {
      setUploadingSwatchFor(null);
      toast({ title: "Failed to upload swatch", variant: "destructive" });
    },
  });

  const uploadReferenceMutation = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`/api/colors/${id}/reference`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to upload reference");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/colors"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/colors"] });
      setUploadingReferenceFor(null);
      toast({ title: "Reference image uploaded" });
    },
    onError: () => {
      setUploadingReferenceFor(null);
      toast({ title: "Failed to upload reference image", variant: "destructive" });
    },
  });

  const removeReferenceMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/colors/${id}/reference`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/colors"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/colors"] });
      toast({ title: "Reference image removed" });
    },
    onError: () => toast({ title: "Failed to remove reference image", variant: "destructive" }),
  });

  // =========== Existing color upload handlers ===========

  const handleSwatchFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingSwatchFor) uploadSwatchMutation.mutate({ id: uploadingSwatchFor, file });
    e.target.value = "";
  };

  const handleReferenceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingReferenceFor) uploadReferenceMutation.mutate({ id: uploadingReferenceFor, file });
    e.target.value = "";
  };

  // =========== Drag-to-reorder handlers ===========

  const handleDragStart = (e: React.DragEvent, id: number, index: number) => {
    setDraggingId(id);
    dragStartIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(id);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: number) => {
      e.preventDefault();
      if (draggingId == null || draggingId === targetId) {
        setDraggingId(null);
        setDragOverId(null);
        return;
      }
      const base = orderedIds.length === displayColors.length && orderedIds.length > 0
        ? orderedIds
        : displayColors.map((c) => c.id);

      const from = base.indexOf(draggingId);
      const to = base.indexOf(targetId);
      if (from === -1 || to === -1) return;

      const next = [...base];
      next.splice(from, 1);
      next.splice(to, 0, draggingId);

      setOrderedIds(next);
      setDraggingId(null);
      setDragOverId(null);
      reorderMutation.mutate(next);
    },
    [draggingId, displayColors, orderedIds, reorderMutation]
  );

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  // =========== Add/Edit dialog ===========

  const handleOpenDialog = (color?: WrapColor) => {
    if (color) {
      setEditingColor(color);
      form.reset({
        name: color.name,
        colorNumber: (color as any).colorNumber || "",
        hexColor: color.hexColor,
        manufacturer: color.manufacturer,
        category: color.category,
      });
    } else {
      setEditingColor(null);
      form.reset({ name: "", colorNumber: "", hexColor: "#000000", manufacturer: "", category: "Gloss" });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: ColorFormData) => {
    if (!editingColor) {
      createMutation.mutate(data);
      return;
    }

    const id = editingColor.id;
    const hexIsDirty = form.formState.dirtyFields.hexColor === true;
    let autoHex: string | undefined;
    let swatchUploaded = false;

    try {
      if (stagedSwatchFile) {
        const result = await uploadSwatchMutation.mutateAsync({ id, file: stagedSwatchFile });
        autoHex = (result as any)?.autoHex;
        swatchUploaded = true;
      }

      const patchData: ColorFormData & { id: string } = { ...data, id: String(id) };
      if (!hexIsDirty && autoHex) {
        patchData.hexColor = autoHex;
      }

      await updateMutation.mutateAsync(patchData);
      setStagedSwatchFile(null);
    } catch {
      if (swatchUploaded) {
        setStagedSwatchFile(null);
        toast({
          title: "Swatch updated, but metadata save failed",
          description: "Please edit the fields and try again.",
          variant: "destructive",
        });
      }
      // If swatch upload itself failed, uploadSwatchMutation.onError toast already fired.
      // Keep dialog open in both cases so the user can retry.
    }
  };

  // =========== Batch import: drag-and-drop ===========

  const processDroppedFiles = useCallback((files: FileList | File[]) => {
    try {
    const ACCEPTED_TYPES = ["image/jpeg"];
    const ACCEPTED_EXTS = [".jpg", ".jpeg"];
    const imageFiles = Array.from(files).filter((f) => {
      const type = f.type.toLowerCase();
      const name = f.name.toLowerCase();
      return ACCEPTED_TYPES.includes(type) || ACCEPTED_EXTS.some((ext) => name.endsWith(ext));
    });
    if (!imageFiles.length) return;

    const newRows: StagingRow[] = imageFiles.map((file) => {
      const { brand, colorNumber, colorName } = parseColorFilename(file.name);
      const fullText = `${colorNumber} ${colorName}`.trim();
      return {
        id: `${Date.now()}-${Math.random()}`,
        swatchFile: file,
        previewUrl: /\.(heic|heif|tiff?|bmp)$/i.test(file.name) ? null : URL.createObjectURL(file),
        brand,
        colorNumber,
        colorName,
        category: detectCategory(fullText),
        importing: false,
        done: false,
      };
    });

    setStagingRows((prev) => [...prev, ...newRows]);
    } catch (err) {
      console.error("Failed to process dropped files:", err);
      toast({ title: "Error", description: "Failed to process the selected files. Please try again.", variant: "destructive" });
    }
  }, []);

  const handleBatchDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      processDroppedFiles(e.dataTransfer.files);
    },
    [processDroppedFiles]
  );

  const handleBatchFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processDroppedFiles(e.target.files);
    e.target.value = "";
  };

  const handleRowReferenceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && pendingReferenceRowId) {
      setStagingRows((prev) =>
        prev.map((r) =>
          r.id === pendingReferenceRowId
            ? { ...r, referenceFile: file, referencePreviewUrl: URL.createObjectURL(file) }
            : r
        )
      );
    }
    e.target.value = "";
    setPendingReferenceRowId(null);
  };

  const updateRow = (id: string, patch: Partial<StagingRow>) => {
    setStagingRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: string) => {
    setStagingRows((prev) => {
      const row = prev.find((r) => r.id === id);
      if (row) URL.revokeObjectURL(row.previewUrl);
      return prev.filter((r) => r.id !== id);
    });
  };

  const importRow = async (row: StagingRow) => {
    updateRow(row.id, { importing: true, error: undefined });
    try {
      const fd = new FormData();
      fd.append("swatch", row.swatchFile);
      if (row.referenceFile) fd.append("reference", row.referenceFile);
      fd.append("manufacturer", row.brand);
      fd.append("colorNumber", row.colorNumber);
      fd.append("name", row.colorName);
      fd.append("category", row.category || "Gloss");
      fd.append("hexColor", "#000000"); // server auto-extracts from swatch

      const res = await fetch("/api/colors/import", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      updateRow(row.id, { importing: false, done: true });
      queryClient.invalidateQueries({ queryKey: ["/api/colors"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/colors"] });
      return true;
    } catch (err: any) {
      updateRow(row.id, { importing: false, error: err.message || "Import failed" });
      return false;
    }
  };

  const importAll = async () => {
    const pending = stagingRows.filter((r) => !r.done);
    let successCount = 0;
    for (const row of pending) {
      const ok = await importRow(row);
      if (ok) successCount++;
    }
    toast({ title: `${successCount} of ${pending.length} color(s) imported` });
  };

  const clearDoneRows = () => {
    setStagingRows((prev) => {
      prev.filter((r) => r.done).forEach((r) => URL.revokeObjectURL(r.previewUrl));
      return prev.filter((r) => !r.done);
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending || uploadSwatchMutation.isPending;
  const doneCount = stagingRows.filter((r) => r.done).length;
  const pendingCount = stagingRows.filter((r) => !r.done).length;


  return (
    <div className="space-y-6">
      {/* =========== Header =========== */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Wrap Colors</h1>
          <p className="text-muted-foreground">Manage available wrap colors for customers</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              for (const color of colors) {
                await fetch("/api/admin/colors/" + color.id + "/generate-thumbnail", { method: "POST" });
              }
            }}
          >
            Regenerate All Thumbnails
          </Button>
                    <Button
                variant="outline"
                onClick={() => {
                  setIsReorderMode(true);
                }}
              >
                Reorder Colors
              </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Color
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingColor ? "Edit Color" : "Add New Color"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="manufacturer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand / Manufacturer</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 3M, INOZETEK, ORAFOL" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="colorNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Color Number{" "}
                          <span className="text-muted-foreground text-xs">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. SP280, TBC 101" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Satin Flip Ghost Pearl" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {colorCategories.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hexColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hex Color</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              type="color"
                              className="w-14 h-10 p-1 cursor-pointer"
                              {...field}
                            />
                          </FormControl>
                          <Input
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="#000000"
                            className="flex-1"
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {editingColor && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Swatch Book Picture</div>
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-16 rounded-md border border-border overflow-hidden flex-shrink-0 bg-muted">
                          {(editingColor.thumbnailUrl || editingColor.imageUrl) ? (
                            <img
                              src={editingColor.thumbnailUrl || editingColor.imageUrl!}
                              alt="Current swatch"
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="flex-1 space-y-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => dialogSwatchInputRef.current?.click()}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Choose new image
                          </Button>
                          {stagedSwatchFile && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="truncate">{stagedSwatchFile.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => setStagedSwatchFile(null)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">Saves when you click Update Color</p>
                        </div>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        ref={dialogSwatchInputRef}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setStagedSwatchFile(f);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setStagedSwatchFile(null); }}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editingColor ? "Update" : "Add"} Color
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Brand Order + management — superadmin only, hidden when there are <2 real brands */}
      {authStatus?.role === "superadmin" && realManufacturers.length >= 2 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Brand Order</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddBrandDialogOpen(true)}
              data-testid="button-add-pipeline-brand"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Pipeline Brand
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Drag to reorder brand groups. Affects color order on wrap-up.ai, partner widgets, and the admin picker. Status controls whether the brand shows a "Coming Soon" or "In Progress" badge on the consumer dropdown.
            </p>
            <ul className="space-y-1 max-w-2xl">
              {brandOrderIds.map((id) => {
                const m = realManufacturers.find((x) => x.id === id);
                if (!m) return null;
                const colorCount = colors?.filter((c) => c.manufacturer === m.name).length ?? 0;
                const pillLabel =
                  m.status === "pipeline" ? (m.displayLabel || "Coming Soon")
                  : m.status === "in_progress" ? (m.displayLabel || "In Progress")
                  : null;
                const pillClass =
                  m.status === "pipeline" ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                  : m.status === "in_progress" ? "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200"
                  : "";
                return (
                  <li
                    key={m.id}
                    draggable
                    onDragStart={() => setBrandDraggingId(m.id)}
                    onDragOver={(e) => { e.preventDefault(); setBrandDragOverId(m.id); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (brandDraggingId == null || brandDraggingId === m.id) return;
                      const next = [...brandOrderIds];
                      const fromIdx = next.indexOf(brandDraggingId);
                      const toIdx = next.indexOf(m.id);
                      if (fromIdx !== -1 && toIdx !== -1) {
                        next.splice(fromIdx, 1);
                        next.splice(toIdx, 0, brandDraggingId);
                        setBrandOrderIds(next);
                        brandReorderMutation.mutate(next);
                      }
                      setBrandDraggingId(null);
                      setBrandDragOverId(null);
                    }}
                    onDragEnd={() => { setBrandDraggingId(null); setBrandDragOverId(null); }}
                    className={[
                      "flex items-center gap-3 px-3 py-2 rounded-md border bg-background",
                      "cursor-grab active:cursor-grabbing transition-colors",
                      brandDraggingId === m.id ? "opacity-50" : "",
                      brandDragOverId === m.id && brandDraggingId !== m.id ? "border-primary" : "",
                    ].join(" ")}
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{m.name}</span>
                    {pillLabel && (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${pillClass}`}
                        data-testid={`brand-pill-${m.id}`}
                      >
                        {pillLabel}
                      </span>
                    )}
                    <Select
                      value={m.status}
                      onValueChange={(value) => {
                        if (value === m.status) return;
                        statusMutation.mutate({ id: m.id, status: value });
                      }}
                    >
                      <SelectTrigger
                        className="h-7 w-36 text-xs"
                        data-testid={`select-brand-status-${m.id}`}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="pipeline">Pipeline</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground ml-auto">{colorCount} colors</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Add Pipeline Brand dialog — Item 0l Session 1 */}
      <Dialog open={isAddBrandDialogOpen} onOpenChange={setIsAddBrandDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Pipeline Brand</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-brand-name">Brand Name</Label>
              <Input
                id="add-brand-name"
                placeholder="e.g. Avery Dennison"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                disabled={addBrandMutation.isPending}
                data-testid="input-add-brand-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-brand-status">Status</Label>
              <Select
                value={newBrandStatus}
                onValueChange={(v) => setNewBrandStatus(v as "active" | "in_progress" | "pipeline")}
              >
                <SelectTrigger id="add-brand-status" data-testid="select-add-brand-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pipeline">Pipeline (Coming Soon)</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-brand-display-label">
                Display Label <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="add-brand-display-label"
                placeholder="Overrides default badge text — e.g. In Negotiation"
                value={newBrandDisplayLabel}
                onChange={(e) => setNewBrandDisplayLabel(e.target.value)}
                disabled={addBrandMutation.isPending}
                data-testid="input-add-brand-display-label"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use the default ("Coming Soon" for pipeline, "In Progress" for in_progress).
              </p>
            </div>
            <Button
              className="w-full"
              disabled={!newBrandName.trim() || addBrandMutation.isPending}
              onClick={() => {
                addBrandMutation.mutate({
                  name: newBrandName.trim(),
                  status: newBrandStatus,
                  displayLabel: newBrandDisplayLabel.trim() || undefined,
                });
              }}
              data-testid="button-save-add-brand"
            >
              {addBrandMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {addBrandMutation.isPending ? "Adding..." : "Add Brand"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========== Batch Import Drop Zone =========== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import Colors from Swatch Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleBatchDrop}
            onClick={() => batchDropInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/40"
            }`}
          >
            <FolderOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">Drop swatch images here, or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">
              Filename format:{" "}
              <span className="font-mono">Brand Number Color Name.jpg</span>
              {" (brackets optional for multi-word brands) — JPG files only"}
            </p>
          </div>
          <input
            ref={batchDropInputRef}
            type="file"
            multiple
            accept="image/jpeg,.jpg,.jpeg"
            className="absolute w-0 h-0 opacity-0 overflow-hidden"
            onChange={handleBatchFileInput}
          />
          <input
            ref={rowReferenceInputRef}
            type="file"
            accept="image/jpeg,.jpg,.jpeg"
            className="absolute w-0 h-0 opacity-0 overflow-hidden"
            onChange={handleRowReferenceFileChange}
          />

          {stagingRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {stagingRows.length} file(s) staged
                  {doneCount > 0 && ` — ${doneCount} imported`}
                </p>
                <div className="flex gap-2">
                  {doneCount > 0 && (
                    <Button variant="outline" size="sm" onClick={clearDoneRows}>
                      Clear imported
                    </Button>
                  )}
                  {pendingCount > 0 && (
                    <Button
                      size="sm"
                      onClick={importAll}
                      disabled={stagingRows.some((r) => r.importing)}
                    >
                      {stagingRows.some((r) => r.importing) && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Import All ({pendingCount})
                    </Button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2 text-left w-12">Swatch Book Picture</th>
                      <th className="p-2 text-left">Brand</th>
                      <th className="p-2 text-left">Number</th>
                      <th className="p-2 text-left">Color Name</th>
                      <th className="p-2 text-left w-44">Category</th>
                      <th className="p-2 text-left w-24">Reference</th>
                      <th className="p-2 text-left w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stagingRows.map((row) => (
                      <tr
                        key={row.id}
                        className={
                          row.done
                            ? "bg-green-50 dark:bg-green-950/20"
                            : row.error
                            ? "bg-red-50 dark:bg-red-950/20"
                            : ""
                        }
                      >
                        {/* Swatch preview */}
                        <td className="p-2">
                          <div className="w-10 h-10 rounded overflow-hidden border">
                            {row.previewUrl ? (
                              <img
                                src={row.previewUrl}
                                alt=""
                                className="w-full h-full object-cover"
                                width="100" height="100" />
                              ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                  {row.swatchFile.name.split('.').pop()}
                                </span>
                              </div>
                              )}
                          </div>
                        </td>
                        {/* Brand */}
                        <td className="p-2">
                          {row.done ? (
                            <span className="text-muted-foreground">{row.brand}</span>
                          ) : (
                            <Input
                              value={row.brand}
                              onChange={(e) => updateRow(row.id, { brand: e.target.value })}
                              className="h-8 text-sm min-w-[80px]"
                              disabled={row.importing}
                            />
                          )}
                        </td>
                        {/* Color number */}
                        <td className="p-2">
                          {row.done ? (
                            <span className="text-muted-foreground font-mono">
                              {row.colorNumber || "—"}
                            </span>
                          ) : (
                            <Input
                              value={row.colorNumber}
                              onChange={(e) =>
                                updateRow(row.id, { colorNumber: e.target.value })
                              }
                              placeholder="—"
                              className="h-8 text-sm min-w-[80px] font-mono"
                              disabled={row.importing}
                            />
                          )}
                        </td>
                        {/* Color name */}
                        <td className="p-2">
                          {row.done ? (
                            <span className="text-muted-foreground">{row.colorName}</span>
                          ) : (
                            <Input
                              value={row.colorName}
                              onChange={(e) => updateRow(row.id, { colorName: e.target.value })}
                              className="h-8 text-sm min-w-[140px]"
                              disabled={row.importing}
                            />
                          )}
                        </td>
                        {/* Category */}
                        <td className="p-2">
                          {row.done ? (
                            <span className="text-muted-foreground">{row.category || "—"}</span>
                          ) : (
                            <Select
                              value={row.category || "_blank_"}
                              onValueChange={(v) => updateRow(row.id, { category: v === "_blank_" ? "" : v })}
                              disabled={row.importing}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_blank_">— leave blank —</SelectItem>
                                {colorCategories.map((c) => (
                                  <SelectItem key={c} value={c}>
                                    {c}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        {/* Reference image */}
                        <td className="p-2">
                          {row.referencePreviewUrl ? (
                            <div className="flex items-center gap-1">
                              <div className="w-8 h-8 rounded overflow-hidden border">
                                <img
                                  src={row.referencePreviewUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                width="100" height="100" />
                              </div>
                              {!row.done && (
                                <button
                                  onClick={() =>
                                    updateRow(row.id, {
                                      referenceFile: undefined,
                                      referencePreviewUrl: undefined,
                                    })
                                  }
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ) : !row.done ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs px-2"
                              disabled={row.importing}
                              onClick={() => {
                                setPendingReferenceRowId(row.id);
                                rowReferenceInputRef.current?.click();
                              }}
                            >
                              <Upload className="w-3 h-3 mr-1" />
                              Add
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        {/* Action */}
                        <td className="p-2">
                          {row.done ? (
                            <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                              <Check className="w-3 h-3" /> Done
                            </span>
                          ) : row.error ? (
                            <span className="text-destructive text-xs" title={row.error}>
                              Error
                            </span>
                          ) : row.importing ? (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          ) : (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2"
                                onClick={() => importRow(row)}
                              >
                                Import
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => removeRow(row.id)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* =========== Colors table =========== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle>All Colors ({colors.length})</CardTitle>
            <select
                className="border rounded px-2 py-1 text-sm bg-background"
                value={selectedManufacturer}
                onChange={(e) => setSelectedManufacturer(e.target.value)}
              >
                <option value="">All Colors ({colors?.length ?? 0})</option>
                {manufacturers.map(({ name, count }) => (
                  <option key={name} value={name}>
                    {name} ({count})
                  </option>
                ))}
              </select>
              <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name, number or brand…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : colors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No colors yet. Use the import section above or &quot;Add Color&quot;.
            </div>
          ) : (
            <>
              <input
                type="file"
                ref={swatchInputRef}
                className="absolute w-0 h-0 opacity-0 overflow-hidden"
                accept="image/jpeg,.jpg,.jpeg"
                onChange={handleSwatchFileChange}
              />
              <input
                type="file"
                ref={referenceInputRef}
                className="absolute w-0 h-0 opacity-0 overflow-hidden"
                accept="image/jpeg,.jpg,.jpeg"
                onChange={handleReferenceFileChange}
              />
              {filteredColors.length === 0 && searchQuery && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No colors match &quot;{searchQuery}&quot;
                </div>
              )}
              {filteredColors.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="w-12">Preview</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Number</TableHead>
                    <TableHead>Color Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-20">Hex</TableHead>
                    <TableHead className="w-28">Swatch Book Picture</TableHead>
                    <TableHead className="w-28">Reference</TableHead>
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredColors.map((color, index) => (
                    <TableRow
                      key={color.id}
                      draggable={!searchQuery}
                      onDragStart={(e) => handleDragStart(e, color.id, index)}
                      onDragOver={(e) => handleDragOver(e, color.id)}
                      onDrop={(e) => handleDrop(e, color.id)}
                      onDragEnd={handleDragEnd}
                      className={`${draggingId === color.id ? "opacity-40" : ""} ${dragOverId === color.id && draggingId !== color.id ? "border-t-2 border-primary" : ""}`}
                    >
                      {/* Drag handle */}
                      <TableCell className="px-1">
                        <div
                          className={`text-muted-foreground ${searchQuery ? "opacity-20 cursor-not-allowed" : "cursor-grab active:cursor-grabbing hover:text-foreground"}`}
                          title={searchQuery ? "Clear search to drag" : "Drag to reorder"}
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                      </TableCell>
                      {/* Preview */}
                      <TableCell>
                        <div className="w-20 h-20 rounded-md border border-border overflow-hidden cursor-pointer" onClick={() => (color.imageUrl || color.thumbnailUrl) && setLightboxUrl(color.thumbnailUrl)}>
                          {color.thumbnailUrl ? (
                            <img
                              src={color.thumbnailUrl}
                              alt={color.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-full h-full"
                              style={{ backgroundColor: color.hexColor }}
                            />
                          )}
                        </div>
                      </TableCell>
                      {/* Brand */}
                      <TableCell className="font-medium">{color.manufacturer}</TableCell>
                      {/* Number */}
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {inlineEditColorId === color.id ? (
                          <input
                            autoFocus
                            className="border rounded px-1 py-0.5 text-sm w-24 font-mono"
                            value={inlineEditValue}
                            onChange={(e) => setInlineEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                colorNumberMutation.mutate({ id: color.id, colorNumber: inlineEditValue });
                                setInlineEditColorId(null);
                              } else if (e.key === "Escape") {
                                setInlineEditColorId(null);
                              }
                            }}
                            onBlur={() => {
                              colorNumberMutation.mutate({ id: color.id, colorNumber: inlineEditValue });
                              setInlineEditColorId(null);
                            }}
                          />
                        ) : (
                          <span
                            className="cursor-pointer hover:bg-muted rounded px-1 py-0.5"
                            onClick={() => {
                              setInlineEditColorId(color.id);
                              setInlineEditValue((color as any).colorNumber || "");
                            }}
                          >
                            {(color as any).colorNumber || "—"}
                          </span>
                        )}
                      </TableCell>
                      {/* Color name */}
                      <TableCell>{color.name}</TableCell>
                      {/* Category */}
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted">
                          {color.category}
                        </span>
                      </TableCell>
                      {/* Hex */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-4 h-4 rounded border border-border flex-shrink-0"
                            style={{ backgroundColor: color.hexColor }}
                          />
                          <span className="font-mono text-xs">{color.hexColor}</span>
                        </div>
                      </TableCell>
                      {/* Swatch */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {color.imageUrl ? (
                            <>
                              <div
                                className="w-14 h-14 rounded-md border border-border overflow-hidden cursor-pointer"
                                onClick={() => setLightboxUrl(color.imageUrl)}
                              >
                                <img
                                  src={color.imageUrl}
                                  alt={color.name}
                                  className="w-full h-full object-cover"
                                  width="100"
                                  height="100"
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => {
                                  setUploadingSwatchFor(color.id);
                                  swatchInputRef.current?.click();
                                }}
                                disabled={
                                  uploadSwatchMutation.isPending && uploadingSwatchFor === color.id
                                }
                              >
                                {uploadSwatchMutation.isPending &&
                                uploadingSwatchFor === color.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  "Replace"
                                )}
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setUploadingSwatchFor(color.id);
                                swatchInputRef.current?.click();
                              }}
                              disabled={
                                uploadSwatchMutation.isPending && uploadingSwatchFor === color.id
                              }
                            >
                              {uploadSwatchMutation.isPending &&
                              uploadingSwatchFor === color.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 mr-1" />
                                  Upload
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      {/* Reference */}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {(color as any).referenceImageData ? (
                            <>
                              <div className="w-14 h-14 rounded-md border border-border overflow-hidden cursor-pointer" onClick={() => setLightboxUrl((color as any).referenceImageData)}>
                                <img src={(color as any).referenceImageData} alt={color.name} className="w-full h-full object-cover" width="100" height="100" />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeReferenceMutation.mutate(color.id)}
                                disabled={removeReferenceMutation.isPending}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setUploadingReferenceFor(color.id);
                                referenceInputRef.current?.click();
                              }}
                              disabled={
                                uploadReferenceMutation.isPending &&
                                uploadingReferenceFor === color.id
                              }
                            >
                              {uploadReferenceMutation.isPending &&
                              uploadingReferenceFor === color.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 mr-1" />
                                  Upload
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(color)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingColor(color)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* =========== Delete confirmation =========== */}
      <AlertDialog open={!!deletingColor} onOpenChange={() => setDeletingColor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Color</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingColor?.name}&quot;? This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deletingColor && deleteMutation.mutate(String(deletingColor.id))
              }
              className="bg-destructive text-destructive-foreground"
            >
              {deleteMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Lightbox / image preview modal */}
      {/* Visual Reorder Mode Overlay */}
      {isReorderMode && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">Reorder Colors</h2>
              <select
                className="border rounded px-2 py-1 text-sm bg-background"
                value={reorderBrandFilter}
                onChange={(e) => setReorderBrandFilter(e.target.value)}
              >
                {manufacturers.map(({ name, count }) => (
                  <option key={name} value={name}>
                    {name} ({count})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              {!reorderBrandFilter && (
                <span className="text-xs text-muted-foreground">Select a brand to reorder</span>
              )}
              <Button
                onClick={() => gridReorderMutation.mutate(reorderIds)}
                disabled={gridReorderMutation.isPending || !reorderBrandFilter}
                title={!reorderBrandFilter ? "Select a brand to reorder" : undefined}
              >
                {gridReorderMutation.isPending ? "Saving..." : "Save Order"}
              </Button>
              <Button variant="outline" onClick={() => setIsReorderMode(false)}>
                Exit
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
              {reorderColors.map((col) => (
                <div
                  key={col.id}
                  draggable
                  onDragStart={() => setGridDraggingId(col.id)}
                  onDragOver={(e) => { e.preventDefault(); setGridDragOverId(col.id); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (gridDraggingId === null || gridDraggingId === col.id) return;
                    setReorderIds((prev) => {
                      const fromIdx = prev.indexOf(gridDraggingId!);
                      const toIdx = prev.indexOf(col.id);
                      if (fromIdx === -1 || toIdx === -1) return prev;
                      const next = [...prev];
                      next.splice(fromIdx, 1);
                      next.splice(toIdx, 0, gridDraggingId!);
                      return next;
                    });
                    setGridDraggingId(null);
                    setGridDragOverId(null);
                  }}
                  onDragEnd={() => { setGridDraggingId(null); setGridDragOverId(null); }}
                  title={col.name + ((col as any).colorNumber ? " — " + (col as any).colorNumber : "")}
                  className={[
                    "relative aspect-square rounded cursor-grab active:cursor-grabbing border-2 transition-all overflow-hidden",
                    gridDraggingId === col.id ? "opacity-50 scale-95" : "",
                    gridDragOverId === col.id && gridDraggingId !== col.id ? "border-primary scale-105" : "border-transparent",
                  ].join(" ")}
                >
                  {col.thumbnailUrl ? (
                    <img src={col.thumbnailUrl} alt={col.name} className="w-full h-full object-cover" draggable={false} />
                  ) : (
                    <div className="w-full h-full" style={{ backgroundColor: col.hexColor || "#ccc" }} />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-xs p-0.5 text-center truncate opacity-0 hover:opacity-100 transition-opacity">
                    {col.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
            {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={lightboxUrl}
              alt="Preview"
              className="max-w-full max-h-[85vh] w-auto h-auto rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
              onClick={() => setLightboxUrl(null)}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Image, Clock, TrendingUp, Loader2, AlertCircle, RefreshCw, Search, X } from "lucide-react";
import { useState, useEffect } from "react";
import { formatLocation } from "@/lib/format-location";

interface Render {
  id: number;
  source: "app" | "partner";
  partnerName: string | null;
  emailSubmissionId: number | null;
  colorId: number | null;
  colorName: string | null;
  createdAt: string | null;
  email: string | null;
  options: any;
  city: string | null;
  country: string | null;
  imageUrl: string;
}

interface RenderStats {
  total: number;
  today: number;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleString();
}

function isPaidRender(options: any): boolean {
  if (!options) return false;
  try {
    const parsed = typeof options === "string" ? JSON.parse(options) : options;
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    for (const opt of arr) {
      if (typeof opt === "object" && opt !== null) {
        if (opt.tier === "paid" || opt.tier === "premium" || opt.package) return true;
      }
    }
  } catch {}
  return false;
}

export default function AdminRenders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRender, setSelectedRender] = useState<Render | null>(null);

  const { data: renders, isLoading, error, refetch } = useQuery<Render[]>({
    queryKey: ["/api/admin/renders"],
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery<RenderStats>({
    queryKey: ["/api/admin/renders/stats"],
    refetchInterval: 30000,
  });

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedRender(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter renders by email / color / partner name / location
  const filteredRenders = renders?.filter((render) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const email = (render.email || "").toLowerCase();
    const color = (render.colorName || "").toLowerCase();
    const partner = (render.partnerName || "").toLowerCase();
    const location = (formatLocation(render.city, render.country) || "").toLowerCase();
    return (
      email.includes(query) ||
      color.includes(query) ||
      partner.includes(query) ||
      location.includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading renders...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load renders. Please try again.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Renders</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Image className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Renders</p>
              <p className="text-2xl font-bold">{stats?.total ?? renders?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingUp className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Today</p>
              <p className="text-2xl font-bold">{stats?.today ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">Auto-Refresh</p>
              <p className="text-2xl font-bold">30s</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Box */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email, color, partner, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search result count */}
      {searchQuery && filteredRenders && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredRenders.length} of {renders?.length ?? 0} renders
        </p>
      )}

      {/* Image Grid */}
      {!filteredRenders || filteredRenders.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <p className="text-muted-foreground">
              {searchQuery ? "No renders match your search." : "No renders yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredRenders.map((render) => (
            <Card
              key={`${render.source}-${render.id}`}
              className="overflow-hidden group hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedRender(render)}
            >
              <div className="aspect-[4/3] relative bg-muted">
                <img
                  src={render.imageUrl}
                  alt={`Render #${render.id}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    target.parentElement!.innerHTML = '<div class="flex items-center justify-center h-full text-muted-foreground text-xs">No image</div>';
                  }}
                width="400" height="300" />
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                  {render.source === "partner" ? (
                    <Badge className="text-xs bg-purple-600/80 text-white border-purple-400/30" title={render.partnerName || "Partner"}>
                      Partner{render.partnerName ? ` · ${render.partnerName}` : ""}
                    </Badge>
                  ) : (
                    <Badge variant={isPaidRender(render.options) ? "default" : "secondary"} className="text-xs">
                      {isPaidRender(render.options) ? "Paid" : "Free"}
                    </Badge>
                  )}
                </div>
                {render.colorName && (
                  <div className="absolute bottom-2 left-2">
                    <Badge variant="outline" className="text-xs bg-black/60 text-white border-white/30">
                      {render.colorName}
                    </Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate" title={render.email || "Unknown"}>
                  {render.email || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(render.createdAt)}
                </p>
                {(() => {
                  const location = formatLocation(render.city, render.country);
                  return location ? (
                    <p className="text-xs text-muted-foreground mt-1 truncate" title={location}>
                      {location}
                    </p>
                  ) : null;
                })()}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Full-size Image Modal */}
      {selectedRender && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedRender(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedRender(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Image */}
            <div className="rounded-lg overflow-hidden bg-black">
              <img
                src={selectedRender.imageUrl}
                alt={`Render #${selectedRender.id}`}
                className="w-full h-auto max-h-[80vh] object-contain"
              width="1200" height="900" />
            </div>

            {/* Info bar below image */}
            <div className="mt-3 flex items-center justify-between text-white">
              <div>
                <p className="text-sm font-medium">{selectedRender.email || "Unknown"}</p>
                <p className="text-xs text-gray-400">
                  {selectedRender.colorName ? selectedRender.colorName + " \u00b7 " : ""}
                  {formatDate(selectedRender.createdAt)}
                </p>
                {(() => {
                  const location = formatLocation(selectedRender.city, selectedRender.country);
                  return location ? (
                    <p className="text-xs text-gray-400 mt-1 truncate" title={location}>
                      {location}
                    </p>
                  ) : null;
                })()}
              </div>
              {selectedRender.source === "partner" ? (
                <Badge className="text-xs bg-purple-600/80 text-white border-purple-400/30">
                  Partner{selectedRender.partnerName ? ` · ${selectedRender.partnerName}` : ""}
                </Badge>
              ) : (
                <Badge variant={isPaidRender(selectedRender.options) ? "default" : "secondary"} className="text-xs">
                  {isPaidRender(selectedRender.options) ? "Paid" : "Free"}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

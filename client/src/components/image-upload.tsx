import { useCallback, useRef, useState } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isHeicFile } from "@/lib/heic-detection";
import { HeicRejectedNotice } from "@/components/heic-rejected-notice";

interface ImageUploadProps {
  onImageUpload: (file: File, previewUrl: string) => void;
  onImageRemove: () => void;
  currentImage: string | null;
  className?: string;
}

export function ImageUpload({
  onImageUpload,
  onImageRemove,
  currentImage,
  className,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [heicRejected, setHeicRejected] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (!file) return;
      if (isHeicFile(file)) {
        setHeicRejected(true);
        return;
      }
      if (file.type.startsWith("image/")) {
        const previewUrl = URL.createObjectURL(file);
        setHeicRejected(false);
        onImageUpload(file, previewUrl);
      }
    },
    [onImageUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Reset so picking the same file again still fires onChange.
      e.target.value = "";
      if (!file) return;
      if (isHeicFile(file)) {
        setHeicRejected(true);
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      setHeicRejected(false);
      onImageUpload(file, previewUrl);
    },
    [onImageUpload]
  );

  const openPicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleReset = useCallback(() => {
    setHeicRejected(false);
    fileInputRef.current?.click();
  }, []);

  return (
    <div className={cn("relative", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-file-upload"
      />

      {currentImage ? (
        <div className="relative group">
          <div className="relative overflow-hidden rounded-lg border border-border">
            <img
              src={currentImage}
              alt="Uploaded car"
              className="w-full h-auto object-contain max-h-[500px]"
              data-testid="img-uploaded-car"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                variant="destructive"
                size="sm"
                onClick={onImageRemove}
                data-testid="button-remove-image"
              >
                <X className="w-4 h-4 mr-2" />
                Remove Image
              </Button>
            </div>
          </div>
        </div>
      ) : heicRejected ? (
        <HeicRejectedNotice onReset={handleReset} />
      ) : (
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg transition-all duration-200 min-h-[400px] flex flex-col items-center justify-center cursor-pointer",
            isDragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-muted-foreground/25 hover:border-primary/50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openPicker}
          data-testid="dropzone-upload"
        >
          <div className="flex flex-col items-center gap-4 p-8 text-center pointer-events-none">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              {isDragging ? (
                <ImageIcon className="w-10 h-10 text-primary" />
              ) : (
                <Upload className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">
                {isDragging ? "Drop your image here" : "Upload your car image"}
              </h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Drag and drop your car photo here, or click to browse. We
                support JPG, PNG, and WebP formats.
              </p>
            </div>
            <Button variant="outline" className="pointer-events-none">
              <Upload className="w-4 h-4 mr-2" />
              Choose File
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useCallback, useEffect } from "react";

interface BeforeAfterSliderProps {
  beforeImage: string; // Original photo
  afterImage: string;  // Generated wrap design
  beforeLabel?: string;
  afterLabel?: string;
}

export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = "Original",
  afterLabel = "Wrap Design",
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50); // 0–100
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(pct);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updatePosition(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    updatePosition(e.touches[0].clientX);
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => updatePosition(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      updatePosition(e.touches[0].clientX);
    };
    const onEnd = () => setIsDragging(false);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    window.addEventListener("blur", onEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
      window.removeEventListener("blur", onEnd);
    };
  }, [isDragging, updatePosition]);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-lg select-none overflow-hidden"
      style={{ cursor: isDragging ? "ew-resize" : "default" }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Invisible spacer — locks container height to the after image */}
      <img
        src={afterImage}
        className="w-full block max-h-[600px] h-auto invisible pointer-events-none"
        aria-hidden="true"
        draggable={false}
      />

      {/* After image (full size, absolutely positioned) */}
      <img
        src={afterImage}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />

      {/* Before image (clipped to left portion via overflow-hidden wrapper) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={beforeImage}
          alt={beforeLabel}
          className="absolute top-0 left-0 h-full object-contain"
          style={{
            width: containerRef.current ? `${containerRef.current.offsetWidth}px` : "100%",
            minWidth: containerRef.current ? `${containerRef.current.offsetWidth}px` : "100%",
          }}
          draggable={false}
        />
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)]"
        style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
      >
        {/* Handle — plain white circle */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg cursor-ew-resize"
          style={{ touchAction: "none" }}
        />
      </div>

      {/* Labels */}
      <div
        className="absolute top-3 left-3 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded pointer-events-none"
        style={{ opacity: sliderPosition > 15 ? 1 : 0, transition: "opacity 0.2s" }}
      >
        {beforeLabel}
      </div>
      <div
        className="absolute top-3 right-3 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded pointer-events-none"
        style={{ opacity: sliderPosition < 85 ? 1 : 0, transition: "opacity 0.2s" }}
      >
        {afterLabel}
      </div>

      {/* Drag hint (fades out) */}
      {sliderPosition === 50 && (
        <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
          <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
            ← Drag to compare →
          </span>
        </div>
      )}
    </div>
  );
}

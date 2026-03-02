import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCw, Loader2 } from "lucide-react";

interface AvatarCropDialogProps {
  open: boolean;
  file: File | null;
  onClose: () => void;
  onSave: (croppedBlob: Blob) => void;
  saving?: boolean;
}

export default function AvatarCropDialog({ open, file, onClose, onSave, saving }: AvatarCropDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);

  const SIZE = 256;

  // Load image when file changes
  useEffect(() => {
    if (!file) return;
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    setImgLoaded(false);

    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.src = URL.createObjectURL(file);
    return () => URL.revokeObjectURL(img.src);
  }, [file]);

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, SIZE, SIZE);

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    // Fill background
    ctx.fillStyle = "hsl(var(--muted))";
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.translate(SIZE / 2 + offset.x, SIZE / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Fit image to canvas
    const scale = Math.max(SIZE / img.width, SIZE / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);

    ctx.restore();
  }, [zoom, rotation, offset]);

  useEffect(() => {
    if (imgLoaded) draw();
  }, [imgLoaded, draw]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
  };

  const handlePointerUp = () => setDragging(false);

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) onSave(blob);
    }, "image/png");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Photo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {/* Preview */}
          <div
            className="rounded-full overflow-hidden border-2 border-border cursor-grab active:cursor-grabbing"
            style={{ width: SIZE, height: SIZE, touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <canvas ref={canvasRef} width={SIZE} height={SIZE} className="w-full h-full" />
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-3 w-full max-w-xs">
            <ZoomOut className="w-4 h-4 text-muted-foreground shrink-0" />
            <Slider
              min={0.5}
              max={3}
              step={0.05}
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>

          {/* Rotate */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRotation((r) => (r + 90) % 360)}
          >
            <RotateCw className="w-4 h-4 mr-2" />
            Rotate
          </Button>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !imgLoaded}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

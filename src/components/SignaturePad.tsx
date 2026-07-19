import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";

export interface SignaturePadHandle {
  toDataURL: () => string | null;
  clear: () => void;
  isEmpty: () => boolean;
}

/** Pad de signature simple (tactile + souris), sans dépendance externe. */
export const SignaturePad = forwardRef<SignaturePadHandle>((_props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Adapte la résolution au conteneur (netteté)
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#1D1D1B";
    }
  }, []);

  function pos(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function down(e: React.PointerEvent) {
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !last.current) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    dirty.current = true;
  }
  function up() {
    drawing.current = false;
    last.current = null;
  }

  useImperativeHandle(ref, () => ({
    toDataURL: () => (dirty.current ? canvasRef.current!.toDataURL("image/png") : null),
    clear: () => {
      const c = canvasRef.current;
      if (!c) return;
      c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
      dirty.current = false;
    },
    isEmpty: () => !dirty.current,
  }));

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-40 rounded-md border border-slate-300 bg-white touch-none cursor-crosshair"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerLeave={up}
    />
  );
});
SignaturePad.displayName = "SignaturePad";

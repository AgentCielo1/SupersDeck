"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

// =============================================================================
//  SignaturePad — touchscreen-friendly signature capture
// =============================================================================
//  HTML5 canvas + pointer events. Handles mouse, touch, and stylus. Parent
//  uses the ref to call `clear()`, check `isEmpty()`, and call `toDataURL()`
//  to extract the PNG.
//
//  No external libraries. ~120 lines.
// =============================================================================

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: () => string;
}

interface Props {
  height?: number;     // CSS px
  className?: string;
  onChange?: (isEmpty: boolean) => void;
}

const SignaturePad = forwardRef<SignaturePadHandle, Props>(function SignaturePad(
  { height = 180, className = "", onChange },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const dirtyRef = useRef(false);
  const [width, setWidth] = useState(0);

  // Resize canvas to match container width, scale for crisp lines on HiDPI.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    function fit() {
      const cssW = parent!.clientWidth;
      setWidth(cssW);
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = cssW * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${cssW}px`;
      canvas!.style.height = `${height}px`;
      const ctx = canvas!.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#1a1a18";
      }
    }
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [height]);

  function pointer(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = true;
    lastPointRef.current = pointer(e);
    canvasRef.current!.setPointerCapture(e.pointerId);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current!.getContext("2d");
    if (!ctx || !lastPointRef.current) return;
    const p = pointer(e);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPointRef.current = p;
    if (!dirtyRef.current) {
      dirtyRef.current = true;
      onChange?.(false);
    }
  }

  function end() {
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  useImperativeHandle(
    ref,
    (): SignaturePadHandle => ({
      clear: () => {
        const c = canvasRef.current;
        if (!c) return;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.restore();
        dirtyRef.current = false;
        onChange?.(true);
      },
      isEmpty: () => !dirtyRef.current,
      toDataURL: () => canvasRef.current?.toDataURL("image/png") ?? "",
    }),
    [onChange]
  );

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={end}
        className="block w-full touch-none rounded-md border border-ink-200 bg-white"
        style={{ height }}
        aria-label="Signature pad"
      />
      <div
        className="pointer-events-none absolute inset-x-3 bottom-2 border-b border-dashed border-ink-200"
        style={{ display: width > 0 ? "block" : "none" }}
      />
    </div>
  );
});

export default SignaturePad;

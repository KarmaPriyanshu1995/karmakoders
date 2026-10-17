"use client";

import * as React from "react";
import { Eraser, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../../button";

/**
 * Draw-a-signature pad built on pointer events (mouse, touch and stylus, with pen pressure).
 * No dependency. Strokes are stored as points relative to the pad (0–1), so they redraw sharply
 * after a resize or rotation. Loaded only inside the sign dialog (signature-fonts.test.ts).
 * Drawing can't be done by keyboard; the hint points keyboard users to the Type tab.
 */

export type PadPoint = { x: number; y: number; p: number };
export type PadStroke = PadPoint[];

const INK = "#1C1B1A";
const MIN_WIDTH = 1.2;
const MAX_WIDTH = 3.6;

function lineWidth(p: number): number {
  return MIN_WIDTH + (MAX_WIDTH - MIN_WIDTH) * Math.min(1, Math.max(0, p));
}

/** Draws every stroke onto a canvas whose backing store is `width × height` CSS px × dpr. */
export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: PadStroke[], width: number, height: number, dpr: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const stroke of strokes) {
    if (stroke.length === 1) {
      const [pt] = stroke;
      ctx.beginPath();
      ctx.arc(pt.x * width, pt.y * height, lineWidth(pt.p) / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    for (let i = 1; i < stroke.length; i++) {
      const a = stroke[i - 1];
      const b = stroke[i];
      ctx.beginPath();
      ctx.lineWidth = lineWidth((a.p + b.p) / 2);
      ctx.moveTo(a.x * width, a.y * height);
      ctx.lineTo(b.x * width, b.y * height);
      ctx.stroke();
    }
  }
}

export function SignaturePad({
  onChange,
  label = "Signature drawing area",
  className,
}: {
  /** PNG data URL of the drawing, or null when the pad is empty. */
  onChange: (dataUrl: string | null) => void;
  label?: string;
  className?: string;
}) {
  const hintId = React.useId();
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const strokesRef = React.useRef<PadStroke[]>([]);
  const activeRef = React.useRef<{ pointerId: number; stroke: PadStroke } | null>(null);
  const sizeRef = React.useRef({ width: 0, height: 0, dpr: 1 });
  const [strokeCount, setStrokeCount] = React.useState(0);

  const redraw = React.useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { width, height, dpr } = sizeRef.current;
    drawStrokes(ctx, strokesRef.current, width, height, dpr);
  }, []);

  const emit = React.useCallback(() => {
    setStrokeCount(strokesRef.current.length);
    const canvas = canvasRef.current;
    onChange(strokesRef.current.length && canvas ? canvas.toDataURL("image/png") : null);
  }, [onChange]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      sizeRef.current = { width: rect.width, height: rect.height, dpr };
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      redraw();
    };
    resize();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw]);

  function pointFrom(e: { clientX: number; clientY: number; pressure: number; pointerType: string }): PadPoint {
    const rect = canvasRef.current!.getBoundingClientRect();
    const w = rect.width || 1;
    const h = rect.height || 1;
    // Mouse and touch report 0.5 (or 0) without real pressure; pens report 0–1.
    const p = e.pointerType === "pen" && e.pressure > 0 ? e.pressure : 0.5;
    return { x: Math.min(1, Math.max(0, (e.clientX - rect.left) / w)), y: Math.min(1, Math.max(0, (e.clientY - rect.top) / h)), p };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const stroke: PadStroke = [pointFrom(e)];
    activeRef.current = { pointerId: e.pointerId, stroke };
    strokesRef.current = [...strokesRef.current, stroke];
    redraw();
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const active = activeRef.current;
    if (!active || active.pointerId !== e.pointerId) return;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const ev of events.length ? events : [e]) active.stroke.push(pointFrom(ev));
    redraw();
  }

  function onPointerEnd(e: React.PointerEvent<HTMLCanvasElement>) {
    const active = activeRef.current;
    if (!active || active.pointerId !== e.pointerId) return;
    activeRef.current = null;
    emit();
  }

  function undo() {
    strokesRef.current = strokesRef.current.slice(0, -1);
    redraw();
    emit();
  }

  function clear() {
    strokesRef.current = [];
    redraw();
    emit();
  }

  const empty = strokeCount === 0;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative overflow-hidden rounded-xl border-2 border-white/35 bg-white">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={empty ? `${label}, empty` : `${label}, ${strokeCount} ${strokeCount === 1 ? "stroke" : "strokes"} drawn`}
          aria-describedby={hintId}
          data-strokes={strokeCount}
          className="block h-40 w-full cursor-crosshair touch-none select-none sm:h-48"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onLostPointerCapture={onPointerEnd}
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-black/30" />
        {empty ? (
          <p aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-black/60">
            Draw your signature here
          </p>
        ) : null}
      </div>
      <p id={hintId} className="text-sm text-[#A39F97]">
        Use your finger, a mouse or a stylus. Using a keyboard? Choose the Type tab instead.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" size="sm" icon={<Undo2 />} disabled={empty} onClick={undo}>
          Undo
        </Button>
        <Button type="button" variant="ghost" size="sm" icon={<Eraser />} disabled={empty} onClick={clear}>
          Clear
        </Button>
      </div>
    </div>
  );
}

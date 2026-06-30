"use client";

import { useRef, useState, useEffect } from "react";

interface Props {
  value?: string; // existing signature data URL
  onChange: (dataUrl: string | undefined) => void;
}

const SCRIPT_FONTS = ["Brush Script MT", "Segoe Script", "cursive"];

export default function SignaturePad({ value, onChange }: Props) {
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typed, setTyped] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  // Prepare canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
  }, [mode]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    dirty.current = true;
  }
  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    if (dirty.current) onChange(canvasRef.current!.toDataURL("image/png"));
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    dirty.current = false;
    onChange(undefined);
  }

  function renderTyped(text: string) {
    setTyped(text);
    if (!text.trim()) { onChange(undefined); return; }
    const canvas = document.createElement("canvas");
    canvas.width = 500; canvas.height = 140;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#111827";
    ctx.font = `48px ${SCRIPT_FONTS.join(", ")}`;
    ctx.textBaseline = "middle";
    ctx.fillText(text, 12, 78);
    onChange(canvas.toDataURL("image/png"));
  }

  const tabBtn = (active: boolean) =>
    `flex-1 py-1.5 text-xs font-semibold transition-colors ${active ? "bg-indigo-600 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`;

  return (
    <div>
      <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-2 w-48">
        <button onClick={() => setMode("draw")} className={tabBtn(mode === "draw")}>Draw</button>
        <button onClick={() => setMode("type")} className={tabBtn(mode === "type")}>Type</button>
      </div>

      {mode === "draw" ? (
        <div>
          <canvas
            ref={canvasRef}
            width={460}
            height={130}
            className="w-full border border-gray-200 rounded-lg bg-white touch-none cursor-crosshair"
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerLeave={up}
          />
          <button onClick={clearCanvas} className="mt-1 text-xs text-gray-400 hover:text-red-400">Clear</button>
        </div>
      ) : (
        <div>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            placeholder="Type your name"
            value={typed}
            onChange={(e) => renderTyped(e.target.value)}
          />
          {value && <img src={value} alt="signature" className="mt-2 h-14 object-contain" />}
        </div>
      )}

      {mode === "draw" && value && (
        <p className="text-xs text-green-600 mt-1">✓ Signature captured</p>
      )}
    </div>
  );
}

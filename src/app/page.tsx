"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { FiZoomIn } from "react-icons/fi";
import { BiZoomOut } from "react-icons/bi";
import { RiResetLeftLine } from "react-icons/ri";
import { ImRedo2, ImUndo2 } from "react-icons/im";
import { FaEraser } from "react-icons/fa6";
import { MdRestorePage } from "react-icons/md";
import { FiDownload } from "react-icons/fi";
import CheckerBackground from "@/components/CheckerBackground";

export default function Home() {
  const [image, setImage] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState(20);
  const [mode, setMode] = useState<"erase" | "restore">("erase");
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false });
  const [zoom, setZoom] = useState(1);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);

  const saveState = () => {
  if (!canvasRef.current) return;

  const dataUrl = canvasRef.current.toDataURL("image/png");
  undoStackRef.current.push(dataUrl);

  // limit history size
  if (undoStackRef.current.length > 30) {
    undoStackRef.current.shift();
  }

  // once new edit happens, redo history should clear
  redoStackRef.current = [];
};

const restoreCanvasFromDataUrl = (dataUrl: string) => {
  if (!canvasRef.current) return;

  const canvas = canvasRef.current;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const img = new Image();
  img.src = dataUrl;

  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
};

const handleUndo = () => {
  if (!canvasRef.current) return;
  if (undoStackRef.current.length <= 1) return;

  const currentState = undoStackRef.current.pop();
  if (currentState) {
    redoStackRef.current.push(currentState);
  }

  const previousState = undoStackRef.current[undoStackRef.current.length - 1];
  if (previousState) {
    restoreCanvasFromDataUrl(previousState);
  }
};

const handleRedo = () => {
  if (!canvasRef.current) return;
  if (redoStackRef.current.length === 0) return;

  const nextState = redoStackRef.current.pop();
  if (!nextState) return;

  undoStackRef.current.push(nextState);
  restoreCanvasFromDataUrl(nextState);
};

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  // AI output image
  const resultImageRef = useRef<HTMLImageElement | null>(null);

  // original uploaded image
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  const handleUpload = async () => {
    if (!image) return;

    try {
      setLoading(true);

      // load original image once
      const originalUrl = URL.createObjectURL(image);
      const originalImg = new Image();
      originalImg.src = originalUrl;

      await new Promise<void>((resolve, reject) => {
        originalImg.onload = () => resolve();
        originalImg.onerror = () => reject(new Error("Failed to load original image"));
      });

      originalImageRef.current = originalImg;

      const formData = new FormData();
      formData.append("file", image);

      const API = process.env.NEXT_PUBLIC_APILINK;

      if (!API) {
        alert("API URL not found");
        return;
      }

      const res = await axios.post(API, formData, {
        responseType: "blob",
      });

      const resultUrl = URL.createObjectURL(res.data);
      setResult(resultUrl);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to remove background.");
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (!canvasRef.current) return;

    const link = document.createElement("a");
    link.download = "removed-bg.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  useEffect(() => {
    if (!result || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = result;

    img.onload = () => {
      resultImageRef.current = img;

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      undoStackRef.current = [canvas.toDataURL("image/png")];
      redoStackRef.current = [];
    };
  }, [result]);

  const getMousePosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
  const canvas = canvasRef.current!;
  const rect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    canvasX: (e.clientX - rect.left) * scaleX,
    canvasY: (e.clientY - rect.top) * scaleY,
    viewX: e.clientX - rect.left,
    viewY: e.clientY - rect.top,
  };
};

  const startDrawing = () => {
  if (!canvasRef.current) return;
  saveState();
  isDrawing.current = true;
};

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { canvasX, canvasY, viewX, viewY } = getMousePosition(e);

    setCursor({
      x: viewX,
      y: viewY,
      visible: true,
    });

    if (!isDrawing.current) return;

    const radius = brushSize / 2;

    if (mode === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const originalImg = originalImageRef.current;
      if (!originalImg) return;

      ctx.save();
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, radius, 0, Math.PI * 2);
      ctx.clip();

      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(originalImg, 0, 0, canvas.width, canvas.height);

      ctx.restore();
    }
  };

  return (
    <div className="flex flex-col bg-gradient-to-br from-blue-100 to-gray-100 overflow-hidden items-center gap-4 p-6">
      <h1 className="text-2xl md:text-3xl text-black font-bold">AI Background Remover</h1>

      <div className="flex flex-col md:flex-row gap-2">
        
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files?.[0] || null)}
        className="text-blue-500 border border-blue-500 rounded px-2 py-2"
      />

      <button
        onClick={handleUpload}
        disabled={!image || loading}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Processing..." : "Remove Background"}
      </button>
      </div>


      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setMode("erase")}
          className={`px-2 py-2 rounded ${
            mode === "erase" ? "bg-red-500 text-white" : "bg-gray-200 text-black"
          }`}
        >
          <FaEraser className="md:size-8" />
        </button>

        <button
          onClick={() => setMode("restore")}
          className={`px-2 py-2 rounded ${
            mode === "restore" ? "bg-green-500 text-white" : "bg-gray-200 text-black"
          }`}
        >
          <MdRestorePage className="md:size-8" />
        </button>
        <button
          onClick={handleUndo}
          className="px-2 py-2 bg-blue-500 text-white rounded"
        >
          <ImUndo2 className="md:size-8" />
        </button>

        <button
          onClick={handleRedo}
          className="px-2 py-2 bg-blue-500 text-white rounded"
        >
          <ImRedo2 className="md:size-8" />
        </button>
  <button
    onClick={() => setZoom((z) => Math.min(z + 0.2, 5))}
    className="px-2 py-2 bg-blue-500 text-white rounded"
  >
    <FiZoomIn className="md:size-8" />
  </button>

  <button
    onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
    className="px-2 py-2 bg-blue-500 text-white rounded"
  >
    <BiZoomOut className="md:size-8" />
  </button>

  <button
    onClick={() => setZoom(1)}
    className="px-2 py-2 bg-blue-500 text-white rounded"
  >
    <RiResetLeftLine className="md:size-8"/>
  </button>
  
</div>

<div className="flex gap-2">
        <p className="text-gray-500">Brush Size: {brushSize}px</p>
        <input
        type="range"
        min="5"
        max="80"
        value={brushSize}
        onChange={(e) => setBrushSize(Number(e.target.value))}
      />

  <span className="text-sm text-gray-600">
    Zoom: {(zoom * 100).toFixed(0)}%
  </span>
      </div>

      <div className="relative inline-block overflow-auto border">
        
        {/* ✅ Background */}
        <div className="absolute inset-0">
          <CheckerBackground />
        </div>

  <div
    style={{
      transform: `scale(${zoom})`,
      transformOrigin: "top left",
    }}
  >
    
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseUp={stopDrawing}
      onMouseLeave={() => {
        stopDrawing();
        setCursor((prev) => ({ ...prev, visible: false }));
      }}
      onMouseEnter={() =>
        setCursor((prev) => ({ ...prev, visible: true }))
      }
      onMouseMove={draw}
      className="block cursor-none"
    />
  </div>

  {/* Brush Circle */}
  {cursor.visible && (
    <div
      className={`pointer-events-none absolute rounded-full border-2 ${
        mode === "erase" ? "border-red-500" : "border-green-500"
      }`}
      style={{
        width: `${brushSize * zoom}px`,
        height: `${brushSize * zoom}px`,
        left: `${cursor.x}px`,
        top: `${cursor.y}px`,
        transform: "translate(-50%, -50%)",
      }}
    />
  )}
</div>
      <button
        onClick={downloadImage}
        className="bg-blue-500 rounded-full text-white px-3 py-3"
      >
        <FiDownload className="size-10" />
      </button>
    </div>
  );
}
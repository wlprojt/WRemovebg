"use client";

import React from "react";

type CheckerBackgroundProps = {
  cellSize?: number;
  lightColor?: string;
  darkColor?: string;
  overlay?: boolean;
};

export default function CheckerBackground({
  cellSize = 20,
  lightColor = "#F5F5F5",
  darkColor = "#E0E0E0",
  overlay = false,
}: CheckerBackgroundProps) {
  const backgroundStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    backgroundImage: `
      linear-gradient(45deg, ${lightColor} 25%, transparent 25%),
      linear-gradient(-45deg, ${lightColor} 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, ${lightColor} 75%),
      linear-gradient(-45deg, transparent 75%, ${lightColor} 75%)
    `,
    backgroundSize: `${cellSize}px ${cellSize}px`,
    backgroundPosition: `0 0, 0 ${cellSize / 2}px, ${cellSize / 2}px -${cellSize / 2}px, -${cellSize / 2}px 0px`,
    backgroundColor: darkColor,
    position: "absolute",
    inset: 0,
  };

  const overlayStyle: React.CSSProperties = overlay
    ? {
        position: "absolute",
        inset: 0,
        background: "linear-gradient(to bottom, transparent, transparent, rgba(0,0,0,0.08))",
        pointerEvents: "none",
      }
    : {};

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div style={backgroundStyle} />
      {overlay && <div style={overlayStyle} />}
    </div>
  );
}
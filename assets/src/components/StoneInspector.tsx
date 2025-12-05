import React from "react";
import { Loupe } from "./Loupe";
import { MeasurementType } from "../contexts/SettingsContext";

interface StoneInspectorProps {
  x: number;
  y: number;
  fixedPosition?: { x: number; y: number };
  scale?: number;
  size?: number;
  sheetWidth?: number; // Used to calculate responsive size
  content: React.ReactNode;
  activeTypes: MeasurementType[];
  availableTypes: MeasurementType[];
  onToggleType: (type: MeasurementType) => void;
}

export const StoneInspector: React.FC<StoneInspectorProps> = ({
  x,
  y,
  fixedPosition,
  scale = 1.8,
  size: sizeProp,
  sheetWidth,
  content,
}) => {
  // Calculate size based on sheet width (60% of sheet width, clamped 120-240px)
  // Falls back to 180px if no sheetWidth provided
  const size = sizeProp ?? (sheetWidth ? Math.max(120, Math.min(240, sheetWidth * 0.6)) : 180);

  return (
    <Loupe
      x={x}
      y={y}
      fixedPosition={fixedPosition}
      scale={scale}
      size={size}
      content={content}
      showCrosshair={false}
    />
  );
};

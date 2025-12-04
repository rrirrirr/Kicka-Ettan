import React from "react";
import { Loupe } from "./Loupe";
import { MeasurementType } from "../contexts/SettingsContext";

interface StoneInspectorProps {
  x: number;
  y: number;
  fixedPosition?: { x: number; y: number };
  scale?: number;
  size?: number;
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
  size = 270,
  content,
}) => {
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

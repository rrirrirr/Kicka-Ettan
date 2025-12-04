import React, { useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface LoupeProps {
  x: number;
  y: number;
  scale?: number;
  size?: number;
  content: React.ReactNode;
  offsetY?: number;
  fixedPosition?: { x: number; y: number };
  showCrosshair?: boolean;
}

// Calculate the optimal angle for loupe positioning (continuous, not stepped)
const calculateOptimalAngle = (
  x: number,
  y: number,
  offsetY: number,
  loupeRadius: number,
  padding: number
): number => {
  if (typeof window === "undefined") return -Math.PI / 2;

  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  // Calculate how much we need to rotate based on proximity to edges
  // Start angle is -PI/2 (directly above)
  const baseAngle = -Math.PI / 2;

  // Check constraints for each edge
  const minX = loupeRadius + padding;
  const maxX = screenWidth - loupeRadius - padding;
  const minY = loupeRadius + padding;
  const maxY = screenHeight - loupeRadius - padding;

  // Calculate the default position (directly above)
  const defaultX = x;
  const defaultY = y - offsetY;

  // If default position is safe, use it
  if (defaultX >= minX && defaultX <= maxX && defaultY >= minY && defaultY <= maxY) {
    return baseAngle;
  }

  // Calculate required angle adjustments for each constraint
  // We need to find an angle where the loupe center is within bounds

  // For horizontal constraints (left/right edges)
  let horizontalAngle = baseAngle;
  if (defaultX < minX) {
    // Need to rotate right (positive direction)
    const requiredX = minX;
    const dx = requiredX - x;
    if (Math.abs(dx) <= offsetY) {
      horizontalAngle = Math.acos(dx / offsetY);
    } else {
      horizontalAngle = 0; // Max right
    }
  } else if (defaultX > maxX) {
    // Need to rotate left (negative direction)
    const requiredX = maxX;
    const dx = requiredX - x;
    if (Math.abs(dx) <= offsetY) {
      horizontalAngle = -Math.acos(dx / offsetY);
    } else {
      horizontalAngle = Math.PI; // Max left
    }
  }

  // For vertical constraints (top/bottom edges)
  let verticalAngle = baseAngle;
  if (defaultY < minY) {
    // Need to rotate down
    const requiredY = minY;
    const dy = requiredY - y;
    if (Math.abs(dy) <= offsetY) {
      // Calculate angle where sin(angle) * offsetY = dy
      const sinAngle = dy / offsetY;
      // Prefer the side away from center
      const direction = x > screenWidth / 2 ? -1 : 1;
      verticalAngle = Math.asin(sinAngle);
      if (direction < 0) {
        verticalAngle = Math.PI - verticalAngle;
      }
    } else {
      verticalAngle = Math.PI / 2; // Directly below
    }
  }

  // Combine constraints - use the angle that satisfies both
  // If top edge is the issue, use vertical angle
  if (defaultY < minY) {
    // Also check horizontal constraints at this angle
    const testX = x + offsetY * Math.cos(verticalAngle);
    if (testX < minX) {
      // Need more rotation - find angle that satisfies both
      return Math.max(horizontalAngle, verticalAngle);
    } else if (testX > maxX) {
      return Math.min(-Math.abs(horizontalAngle), verticalAngle);
    }
    return verticalAngle;
  }

  return horizontalAngle;
};

export const Loupe: React.FC<LoupeProps> = ({
  x,
  y,
  scale = 2,
  size = 120,
  content,
  offsetY = 100,
  fixedPosition,
  showCrosshair = true,
}) => {
  const padding = 10;
  const loupeRadius = size / 2;

  // Track previous angle for smoothing
  const prevAngleRef = useRef<number>(-Math.PI / 2);
  const animatedPosRef = useRef<{ x: number; y: number } | null>(null);

  // Calculate optimal angle continuously
  const targetAngle = calculateOptimalAngle(x, y, offsetY, loupeRadius, padding);

  // Smooth the angle transition
  const smoothingFactor = 0.3; // Lower = smoother but slower
  const angleDiff = targetAngle - prevAngleRef.current;

  // Handle angle wrapping (e.g., going from -PI to PI)
  let smoothedAngle: number;
  if (Math.abs(angleDiff) > Math.PI) {
    // Large jump, likely wrapping - just use target
    smoothedAngle = targetAngle;
  } else {
    smoothedAngle = prevAngleRef.current + angleDiff * smoothingFactor;
  }

  // Update ref for next render
  useEffect(() => {
    prevAngleRef.current = smoothedAngle;
  });

  let finalX: number;
  let finalY: number;

  if (fixedPosition) {
    finalX = fixedPosition.x;
    finalY = fixedPosition.y;
  } else {
    // Calculate position from smoothed angle
    finalX = x + offsetY * Math.cos(smoothedAngle);
    finalY = y + offsetY * Math.sin(smoothedAngle);

    // Final clamping to ensure we stay in bounds
    if (typeof window !== "undefined") {
      const minX = loupeRadius + padding;
      const maxX = window.innerWidth - loupeRadius - padding;
      const minY = loupeRadius + padding;
      const maxY = window.innerHeight - loupeRadius - padding;

      finalX = Math.max(minX, Math.min(maxX, finalX));
      finalY = Math.max(minY, Math.min(maxY, finalY));
    }
  }

  // Smooth the final position as well for extra smoothness
  if (animatedPosRef.current === null) {
    animatedPosRef.current = { x: finalX, y: finalY };
  } else {
    const posSmoothFactor = 0.4;
    animatedPosRef.current = {
      x: animatedPosRef.current.x + (finalX - animatedPosRef.current.x) * posSmoothFactor,
      y: animatedPosRef.current.y + (finalY - animatedPosRef.current.y) * posSmoothFactor,
    };
  }

  const smoothedX = animatedPosRef.current.x;
  const smoothedY = animatedPosRef.current.y;

  return createPortal(
    <div
      className="fixed pointer-events-none z-[10000] overflow-hidden rounded-full border-4 border-white shadow-2xl bg-white"
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${smoothedX - loupeRadius}px, ${smoothedY - loupeRadius}px, 0)`,
        width: size,
        height: size,
        willChange: "transform",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-${x * scale}px, -${y * scale}px) scale(${scale})`,
          transformOrigin: "0 0",
          width: "100vw", // Ensure enough space for content
          height: "100vh",
        }}
      >
        {content}
      </div>

      {/* Crosshair for precision */}
      {showCrosshair && (
        <div className="absolute inset-0 flex items-center justify-center opacity-50">
          <div className="w-4 h-0.5 bg-red-500/50 absolute" />
          <div className="h-4 w-0.5 bg-red-500/50 absolute" />
        </div>
      )}
    </div>,
    document.body,
  );
};

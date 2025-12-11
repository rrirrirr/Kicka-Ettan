import React from "react";
import { motion, AnimatePresence } from "framer-motion";

// Standard container for all tutorial animations - ensures consistent sizing
const ANIMATION_SIZE = { width: 270, height: 278 };

const AnimationContainer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div
    className="flex items-center justify-center"
    style={{ width: ANIMATION_SIZE.width, height: ANIMATION_SIZE.height }}
  >
    {children}
  </div>
);

// Animated stone that shows selection state
const AnimatedStone: React.FC<{
  color: string;
  size: number;
  isSelected?: boolean;
}> = ({ color, size, isSelected = false }) => {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Selection ring */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 rounded-full"
          initial={{ scale: 1, opacity: 0 }}
          animate={{ scale: [1, 1.3, 1.3], opacity: [0, 0.5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ border: `3px solid ${color}` }}
        />
      )}

      {/* Stone */}
      <div
        className={`absolute inset-0 rounded-full shadow-lg transition-transform duration-200 ${isSelected ? "scale-105" : ""}`}
        style={{
          backgroundColor: color,
          border: "2px solid #666",
        }}
      >
        {/* Handle */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm"
          style={{
            width: size * 0.4,
            height: size * 0.14,
            backgroundColor: "rgba(0,0,0,0.3)",
          }}
        />
      </div>
    </div>
  );
};

// Step 1: Tap a stone to select it
export const StoneTapDemo: React.FC = () => {
  const [isSelected, setIsSelected] = React.useState(false);
  const [isClicking, setIsClicking] = React.useState(false);

  React.useEffect(() => {
    // Animation cycle: unselected -> click -> selected -> pause -> reset
    const cycle = () => {
      setIsSelected(false);
      setIsClicking(false);
      // Start click animation
      setTimeout(() => setIsClicking(true), 600);
      // End click, show selected
      setTimeout(() => {
        setIsClicking(false);
        setIsSelected(true);
      }, 800);
      // Reset cycle
      setTimeout(() => setIsSelected(false), 2500);
    };

    cycle();
    const interval = setInterval(cycle, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimationContainer>
      <div
        className="relative flex items-center justify-center"
        style={{ width: 120, height: 120 }}
      >
        {/* Stone */}
        <AnimatedStone color="#cc0000" size={48} isSelected={isSelected} />

        {/* Cursor */}
        <motion.div className="absolute z-20" style={{ left: 60, top: 70 }}>
          <PointerCursor size={32} isClicking={isClicking} />
        </motion.div>
      </div>
    </AnimationContainer>
  );
};

// Measurement colors matching the actual implementation
const MEASUREMENT_COLORS = {
  ring: "#06b6d4", // cyan-500
  tLine: "#f59e0b", // amber-500
  centerLine: "#f59e0b", // amber-500
  stoneToStone: "#65a30d", // lime-600
};

// Step 2: Tap again to cycle through measurements
// Using real proportions from constants:
// 12ft ring = 183cm, 8ft = 122cm, 4ft = 61cm, Button = 15cm, Stone radius = 14.5cm
const HOUSE_SCALE = {
  // Using 12ft ring as base (r=70 in our SVG)
  ring12: 70,
  ring8: 70 * (122 / 183), // ~46.7
  ring4: 70 * (61 / 183), // ~23.3
  button: 70 * (15 / 183), // ~5.7
  stoneRadius: 70 * (14.5 / 183), // ~5.5 - slightly enlarged to 7 for visibility
};

export const MeasurementCycleDemo: React.FC = () => {
  const [step, setStep] = React.useState(0);
  const [isClicking, setIsClicking] = React.useState(false);
  // Order: closest-ring (0) → t-line (1) → center-line (2) → stone-to-stone (3)

  React.useEffect(() => {
    const cycle = () => {
      let currentStep = 0;
      const advance = () => {
        const nextStep = (currentStep + 1) % 5; // 0-3 = measurements, 4 = reset pause

        // Only show click animation when cycling between measurements (not first or reset)
        // Skip click when: going to reset (4), resetting to start (0), or leaving first step (from 0)
        if (nextStep !== 4 && currentStep !== 4 && currentStep !== 0) {
          setIsClicking(true);
          setTimeout(() => setIsClicking(false), 150);
        }

        currentStep = nextStep;
        setStep(currentStep === 4 ? 0 : currentStep);
      };

      const interval = setInterval(advance, 1400);
      return () => clearInterval(interval);
    };

    const cleanup = cycle();
    return cleanup;
  }, []);

  // Center of house
  const centerX = 100;
  const centerY = 100;

  // Stone radius (slightly enlarged for visibility but proportionally correct)
  const stoneR = 8;

  // Main stone position - in the 4ft ring area, offset from center
  const stoneX = centerX + 15;
  const stoneY = centerY - 30;

  // Second stone for stone-to-stone - yellow stone nearby
  const otherStoneX = centerX - 20;
  const otherStoneY = centerY - 15;

  // Calculate distance from stone to center to determine closest ring
  const distFromCenter = Math.sqrt(
    Math.pow(stoneX - centerX, 2) + Math.pow(stoneY - centerY, 2),
  );

  // Direction vector from center to stone (normalized)
  const dirX = (stoneX - centerX) / distFromCenter;
  const dirY = (stoneY - centerY) / distFromCenter;

  // Find closest ring edge (stone is beyond 4ft ring at ~23, so measure to 4ft)
  const closestRingR = HOUSE_SCALE.ring4;

  // Ring measurement: from stone edge (towards center) to ring edge (towards stone)
  const ringLineStart = {
    x: stoneX - dirX * stoneR,
    y: stoneY - dirY * stoneR,
  };
  const ringLineEnd = {
    x: centerX + dirX * closestRingR,
    y: centerY + dirY * closestRingR,
  };

  // T-line measurement: from stone bottom edge to T-line (if above T-line)
  const tLineY = centerY;
  const tLineStart = { x: stoneX, y: stoneY + stoneR };
  const tLineEnd = { x: stoneX, y: tLineY };

  // Center-line measurement: from stone left edge to center line (if right of center)
  const centerLineX = centerX;
  const centerLineStart = { x: stoneX - stoneR, y: stoneY };
  const centerLineEnd = { x: centerLineX, y: stoneY };

  // Stone-to-stone: calculate edge-to-edge
  const stoneToStoneDist = Math.sqrt(
    Math.pow(otherStoneX - stoneX, 2) + Math.pow(otherStoneY - stoneY, 2),
  );
  const s2sDirX = (otherStoneX - stoneX) / stoneToStoneDist;
  const s2sDirY = (otherStoneY - stoneY) / stoneToStoneDist;
  const s2sStart = {
    x: stoneX + s2sDirX * stoneR,
    y: stoneY + s2sDirY * stoneR,
  };
  const s2sEnd = {
    x: otherStoneX - s2sDirX * stoneR,
    y: otherStoneY - s2sDirY * stoneR,
  };

  return (
    <AnimationContainer>
      <div
        className="relative flex items-center justify-center"
        style={{ width: 200, height: 200 }}
      >
        {/* House rings with proper colors and proportions */}
        <svg className="absolute inset-0" viewBox="0 0 200 200">
          {/* Background ice */}
          <rect x="0" y="0" width="200" height="200" fill={HOUSE_COLORS.ice} />
          {/* 12-foot ring (blue) */}
          <circle
            cx={centerX}
            cy={centerY}
            r={HOUSE_SCALE.ring12}
            fill={HOUSE_COLORS.ring12}
            stroke={HOUSE_COLORS.stroke}
            strokeWidth="0.5"
          />
          {/* 8-foot ring (white) */}
          <circle
            cx={centerX}
            cy={centerY}
            r={HOUSE_SCALE.ring8}
            fill={HOUSE_COLORS.ring8}
            stroke={HOUSE_COLORS.stroke}
            strokeWidth="0.5"
          />
          {/* 4-foot ring (red) */}
          <circle
            cx={centerX}
            cy={centerY}
            r={HOUSE_SCALE.ring4}
            fill={HOUSE_COLORS.ring4}
            stroke={HOUSE_COLORS.stroke}
            strokeWidth="0.5"
          />
          {/* Button (white center) */}
          <circle
            cx={centerX}
            cy={centerY}
            r={HOUSE_SCALE.button}
            fill={HOUSE_COLORS.button}
            stroke={HOUSE_COLORS.stroke}
            strokeWidth="0.5"
          />
          {/* T-line */}
          <line
            x1="0"
            y1={centerY}
            x2="200"
            y2={centerY}
            stroke={HOUSE_COLORS.stroke}
            strokeWidth="1"
          />
          {/* Center line */}
          <line
            x1={centerX}
            y1="0"
            x2={centerX}
            y2="200"
            stroke={HOUSE_COLORS.stroke}
            strokeWidth="1"
          />

          {/* Main stone (red) - SVG circle for proper scaling */}
          <circle
            cx={stoneX}
            cy={stoneY}
            r={stoneR}
            fill="#cc0000"
            stroke="#666"
            strokeWidth="1.5"
          />
          {/* Stone handle */}
          <rect
            x={stoneX - stoneR * 0.4}
            y={stoneY - stoneR * 0.15}
            width={stoneR * 0.8}
            height={stoneR * 0.3}
            fill="rgba(0,0,0,0.3)"
            rx="1"
          />

          {/* Second stone (yellow) */}
          <circle
            cx={otherStoneX}
            cy={otherStoneY}
            r={stoneR}
            fill="#e5b800"
            stroke="#666"
            strokeWidth="1.5"
          />
          {/* Stone handle */}
          <rect
            x={otherStoneX - stoneR * 0.4}
            y={otherStoneY - stoneR * 0.15}
            width={stoneR * 0.8}
            height={stoneR * 0.3}
            fill="rgba(0,0,0,0.3)"
            rx="1"
          />
        </svg>

        {/* Measurement lines */}
        <svg
          className="absolute inset-0 z-15 pointer-events-none"
          viewBox="0 0 200 200"
        >
          {/* Closest ring measurement (cyan) - edge to edge */}
          {step === 0 && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <line
                x1={ringLineStart.x}
                y1={ringLineStart.y}
                x2={ringLineEnd.x}
                y2={ringLineEnd.y}
                stroke={MEASUREMENT_COLORS.ring}
                strokeWidth="2.5"
                strokeDasharray="2 6"
              />
              {/* End dots */}
              <circle
                cx={ringLineStart.x}
                cy={ringLineStart.y}
                r="2.5"
                fill={MEASUREMENT_COLORS.ring}
              />
              <circle
                cx={ringLineEnd.x}
                cy={ringLineEnd.y}
                r="2.5"
                fill={MEASUREMENT_COLORS.ring}
              />
            </motion.g>
          )}
          {/* T-line measurement (amber) */}
          {step === 1 && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <line
                x1={tLineStart.x}
                y1={tLineStart.y}
                x2={tLineEnd.x}
                y2={tLineEnd.y}
                stroke={MEASUREMENT_COLORS.tLine}
                strokeWidth="2.5"
                strokeDasharray="5 5"
              />
              {/* End dots */}
              <circle
                cx={tLineStart.x}
                cy={tLineStart.y}
                r="2.5"
                fill={MEASUREMENT_COLORS.tLine}
              />
              <circle
                cx={tLineEnd.x}
                cy={tLineEnd.y}
                r="2.5"
                fill={MEASUREMENT_COLORS.tLine}
              />
            </motion.g>
          )}
          {/* Center-line measurement (amber) */}
          {step === 2 && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <line
                x1={centerLineStart.x}
                y1={centerLineStart.y}
                x2={centerLineEnd.x}
                y2={centerLineEnd.y}
                stroke={MEASUREMENT_COLORS.centerLine}
                strokeWidth="2.5"
                strokeDasharray="5 5"
              />
              {/* End dots */}
              <circle
                cx={centerLineStart.x}
                cy={centerLineStart.y}
                r="2.5"
                fill={MEASUREMENT_COLORS.centerLine}
              />
              <circle
                cx={centerLineEnd.x}
                cy={centerLineEnd.y}
                r="2.5"
                fill={MEASUREMENT_COLORS.centerLine}
              />
            </motion.g>
          )}
          {/* Stone-to-stone measurement (lime) - edge to edge */}
          {step === 3 && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <line
                x1={s2sStart.x}
                y1={s2sStart.y}
                x2={s2sEnd.x}
                y2={s2sEnd.y}
                stroke={MEASUREMENT_COLORS.stoneToStone}
                strokeWidth="2.5"
                strokeDasharray="2 6"
              />
              {/* End dots */}
              <circle
                cx={s2sStart.x}
                cy={s2sStart.y}
                r="2.5"
                fill={MEASUREMENT_COLORS.stoneToStone}
              />
              <circle
                cx={s2sEnd.x}
                cy={s2sEnd.y}
                r="2.5"
                fill={MEASUREMENT_COLORS.stoneToStone}
              />
            </motion.g>
          )}
        </svg>

        {/* Cursor with click animation - positioned on the stone */}
        <motion.div
          className="absolute z-20"
          style={{ left: stoneX - 3, top: stoneY - 3 }}
        >
          <PointerCursor size={28} isClicking={isClicking} />
        </motion.div>

        {/* Step indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${i === step ? "bg-lavender-600" : "bg-gray-300"}`}
            />
          ))}
        </div>
      </div>
    </AnimationContainer>
  );
};

// Step indicator button icons (matching MeasurementStepIndicator)
const TargetIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const CenterLineIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 4.5v15" />
  </svg>
);

const ArrowLeftRightIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 3L4 7l4 4" />
    <path d="M4 7h16" />
    <path d="M16 21l4-4-4-4" />
    <path d="M20 17H4" />
  </svg>
);

// Step 3: Step indicator explanation
export const StepIndicatorDemo: React.FC = () => {
  const [activeStep, setActiveStep] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    {
      icon: <TargetIcon size={20} />,
      activeClass: "bg-cyan-500 text-white",
      inactiveClass: "bg-white text-icy-black",
    },
    {
      icon: <span className="text-xl font-bold">T</span>,
      activeClass: "bg-amber-500 text-white",
      inactiveClass: "bg-white text-icy-black",
    },
    {
      icon: <CenterLineIcon size={20} />,
      activeClass: "bg-amber-500 text-white",
      inactiveClass: "bg-white text-icy-black",
    },
    {
      icon: <ArrowLeftRightIcon size={20} />,
      activeClass: "bg-lime-600 text-white",
      inactiveClass: "bg-white text-icy-black",
    },
  ];

  return (
    <AnimationContainer>
      <div className="flex items-center gap-6">
        {/* Vertical indicator bar (matching real MeasurementStepIndicator) */}
        <div className="card-gradient backdrop-blur-md px-2 py-4 rounded-full shadow-lg border border-white/50 flex flex-col gap-2">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              className={`flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all duration-200 ${i === activeStep ? step.activeClass : step.inactiveClass
                }`}
              animate={{
                scale: i === activeStep ? 1.1 : 1,
              }}
              transition={{ duration: 0.2 }}
            >
              {step.icon}
            </motion.div>
          ))}
        </div>

        {/* Tap indicator */}
        <motion.div
          className="text-gray-500 text-xs max-w-[80px] text-center"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          click icon to toggle
        </motion.div>
      </div>
    </AnimationContainer>
  );
};

// ============================================
// PLACEMENT TUTORIAL ANIMATIONS
// ============================================

// Curling house colors (matching CurlingSheet)
const HOUSE_COLORS = {
  ring12: "#185494", // Blue outer
  ring8: "#ffffff", // White
  ring4: "#D22730", // Red inner
  button: "#ffffff", // White center
  stroke: "#252333",
  ice: "#F0F8FF",
};

// Pointer cursor with click animation
const PointerCursor: React.FC<{ size?: number; isClicking?: boolean }> = ({
  size = 24,
  isClicking = false,
}) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    animate={{ scale: isClicking ? 0.85 : 1 }}
    transition={{ duration: 0.1 }}
    style={{ filter: "drop-shadow(1px 2px 2px rgba(0,0,0,0.3))" }}
  >
    {/* Standard pointer cursor shape */}
    <path
      d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.85a.5.5 0 0 0-.85.36Z"
      fill="#ffffff"
      stroke="#000000"
      strokeWidth="1.5"
    />
  </motion.svg>
);

// Grabbing/drag cursor
const GrabCursor: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: "drop-shadow(1px 2px 2px rgba(0,0,0,0.3))" }}
  >
    {/* Closed hand/grabbing cursor */}
    <path
      d="M8 14V8.5C8 7.67 8.67 7 9.5 7S11 7.67 11 8.5V7.5C11 6.67 11.67 6 12.5 6S14 6.67 14 7.5V8.5C14 7.67 14.67 7 15.5 7S17 7.67 17 8.5V9.5C17 8.67 17.67 8 18.5 8S20 8.67 20 9.5V15C20 18.31 17.31 21 14 21H12C9.79 21 7.88 19.84 6.84 18.09L4.71 14.04C4.27 13.18 4.64 12.12 5.5 11.68C6.21 11.32 7.08 11.54 7.54 12.18L8 14Z"
      fill="#ffffff"
      stroke="#000000"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Simple stone for placement demos
const PlacementStone: React.FC<{
  color: string;
  size: number;
  opacity?: number;
}> = ({ color, size, opacity = 1 }) => (
  <div
    className="rounded-full shadow-md relative"
    style={{
      width: size,
      height: size,
      backgroundColor: color,
      border: "2px solid #666",
      opacity,
    }}
  >
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm"
      style={{
        width: size * 0.4,
        height: size * 0.14,
        backgroundColor: "rgba(0,0,0,0.3)",
      }}
    />
  </div>
);

// Step 1: Drag from bar or tap to place
export const PlacementMethodsDemo: React.FC = () => {
  const [phase, setPhase] = React.useState<"drag" | "tap">("drag");
  const [animState, setAnimState] = React.useState(0);

  React.useEffect(() => {
    // Cycle: drag animation -> pause -> tap animation -> pause -> repeat
    let step = 0;
    const sequence = () => {
      step = (step + 1) % 8;
      if (step < 4) {
        setPhase("drag");
        setAnimState(step);
      } else {
        setPhase("tap");
        setAnimState(step - 4);
      }
    };

    const interval = setInterval(sequence, 600);
    return () => clearInterval(interval);
  }, []);

  // Determine if we're in dragging state (picked up stone)
  const isDragging = phase === "drag" && animState >= 1 && animState < 3;
  const isClicking = phase === "tap" && animState === 1;

  return (
    <AnimationContainer>
      <div className="relative" style={{ width: 160, height: 185 }}>
        {/* Label at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
          <motion.div
            className="text-sm font-bold text-icy-black whitespace-nowrap px-3 py-1 bg-white/90 rounded-full shadow-sm"
            key={phase}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {phase === "drag" ? "Drag from bar" : "Tap to place"}
          </motion.div>
        </div>

        {/* Sheet area */}
        <div
          className="absolute inset-x-2 top-8 bottom-10 rounded-lg border border-gray-200 overflow-hidden"
          style={{ backgroundColor: HOUSE_COLORS.ice }}
        >
          {/* Curling house rings */}
          <svg
            className="absolute inset-0"
            viewBox="0 0 140 110"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* 12-foot ring (blue) */}
            <circle
              cx="70"
              cy="70"
              r="40"
              fill={HOUSE_COLORS.ring12}
              stroke={HOUSE_COLORS.stroke}
              strokeWidth="0.5"
            />
            {/* 8-foot ring (white) */}
            <circle
              cx="70"
              cy="70"
              r="28"
              fill={HOUSE_COLORS.ring8}
              stroke={HOUSE_COLORS.stroke}
              strokeWidth="0.5"
            />
            {/* 4-foot ring (red) */}
            <circle
              cx="70"
              cy="70"
              r="16"
              fill={HOUSE_COLORS.ring4}
              stroke={HOUSE_COLORS.stroke}
              strokeWidth="0.5"
            />
            {/* Button (white center) */}
            <circle
              cx="70"
              cy="70"
              r="5"
              fill={HOUSE_COLORS.button}
              stroke={HOUSE_COLORS.stroke}
              strokeWidth="0.5"
            />
            {/* T-line */}
            <line
              x1="0"
              y1="70"
              x2="140"
              y2="70"
              stroke={HOUSE_COLORS.stroke}
              strokeWidth="1"
            />
            {/* Center line */}
            <line
              x1="70"
              y1="0"
              x2="70"
              y2="110"
              stroke={HOUSE_COLORS.stroke}
              strokeWidth="1"
            />
          </svg>

          {/* Placed stone (appears during animation) */}
          <AnimatePresence>
            {((phase === "drag" && animState >= 2) ||
              (phase === "tap" && animState >= 2)) && (
                <motion.div
                  className="absolute"
                  style={{ left: 55, top: 45 }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <PlacementStone color="#cc0000" size={30} />
                </motion.div>
              )}
          </AnimatePresence>
        </div>

        {/* Stone bar at bottom */}
        <div className="absolute bottom-0 inset-x-2 h-10 bg-white rounded-lg shadow-md flex items-center justify-center gap-2 px-3">
          {/* Stone in bar (visible when not being dragged or tapped) */}
          {!(phase === "drag" && animState >= 1) &&
            !(phase === "tap" && animState >= 1) && (
              <PlacementStone color="#cc0000" size={24} />
            )}
          <PlacementStone color="#cc0000" size={24} opacity={0.3} />
          <PlacementStone color="#cc0000" size={24} opacity={0.3} />
        </div>

        {/* Cursor for drag animation - shows grab cursor while dragging */}
        {phase === "drag" && (
          <motion.div
            className="absolute z-20 pointer-events-none"
            animate={{
              left:
                animState === 0
                  ? 40
                  : animState === 1
                    ? 60
                    : animState === 2
                      ? 70
                      : 70,
              top:
                animState === 0
                  ? 155
                  : animState === 1
                    ? 120
                    : animState === 2
                      ? 85
                      : 85,
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            {isDragging ? (
              <GrabCursor size={28} />
            ) : (
              <PointerCursor size={28} isClicking={animState === 0} />
            )}
          </motion.div>
        )}

        {/* Cursor for tap animation - pointer with click effect */}
        {phase === "tap" && (
          <motion.div
            className="absolute z-20 pointer-events-none"
            style={{ left: 75, top: 95 }}
          >
            <PointerCursor size={28} isClicking={isClicking} />
          </motion.div>
        )}
      </div>
    </AnimationContainer>
  );
};

// Step 2: Loupe behavior near edges (hogline)
export const LoupeEdgeDemo: React.FC = () => {
  const [position, setPosition] = React.useState<"center" | "edge">("center");

  React.useEffect(() => {
    const interval = setInterval(() => {
      setPosition((prev) => (prev === "center" ? "edge" : "center"));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Loupe size
  const loupeSize = 50;

  return (
    <AnimationContainer>
      <div className="relative" style={{ width: 180, height: 185 }}>
        {/* Label at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
          <motion.div
            className="text-sm font-bold text-icy-black whitespace-nowrap px-3 py-1 bg-white/90 rounded-full shadow-sm"
            key={position}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.3 }}
          >
            {position === "center"
              ? "Loupe above cursor"
              : "Loupe shifts at edge"}
          </motion.div>
        </div>

        {/* Sheet area */}
        <div
          className="absolute inset-x-2 top-8 bottom-2 rounded-lg border border-gray-200 overflow-hidden"
          style={{ backgroundColor: HOUSE_COLORS.ice }}
        >
          {/* SVG for house and hogline */}
          <svg className="absolute inset-0" viewBox="0 0 160 140">
            {/* Hogline (red line at top) */}
            <line
              x1="0"
              y1="25"
              x2="160"
              y2="25"
              stroke="#D22730"
              strokeWidth="3"
            />

            {/* House rings */}
            <circle
              cx="80"
              cy="95"
              r="45"
              fill={HOUSE_COLORS.ring12}
              stroke={HOUSE_COLORS.stroke}
              strokeWidth="0.5"
            />
            <circle
              cx="80"
              cy="95"
              r="32"
              fill={HOUSE_COLORS.ring8}
              stroke={HOUSE_COLORS.stroke}
              strokeWidth="0.5"
            />
            <circle
              cx="80"
              cy="95"
              r="18"
              fill={HOUSE_COLORS.ring4}
              stroke={HOUSE_COLORS.stroke}
              strokeWidth="0.5"
            />
            <circle
              cx="80"
              cy="95"
              r="5"
              fill={HOUSE_COLORS.button}
              stroke={HOUSE_COLORS.stroke}
              strokeWidth="0.5"
            />

            {/* T-line */}
            <line
              x1="0"
              y1="95"
              x2="160"
              y2="95"
              stroke={HOUSE_COLORS.stroke}
              strokeWidth="1"
            />
            {/* Center line */}
            <line
              x1="80"
              y1="25"
              x2="80"
              y2="140"
              stroke={HOUSE_COLORS.stroke}
              strokeWidth="1"
            />
          </svg>

          {/* Stone being dragged */}
          <motion.div
            className="absolute"
            animate={{
              left: position === "center" ? 67 : 67,
              top: position === "center" ? 70 : 18,
            }}
            transition={{ duration: 1, ease: "easeInOut" }}
          >
            <PlacementStone color="#cc0000" size={26} />
          </motion.div>

          {/* Loupe visualization - always circular, shifts to side when near edge */}
          <motion.div
            className="absolute bg-white rounded-full shadow-xl border-2 border-gray-300 overflow-hidden flex items-center justify-center"
            style={{ width: loupeSize, height: loupeSize }}
            animate={{
              // When at center: loupe above stone
              // When at edge (near hogline): loupe shifts to the side (left) of cursor
              left: position === "center" ? 55 : 15,
              top: position === "center" ? 10 : 5,
            }}
            transition={{ duration: 1, ease: "easeInOut" }}
          >
            {/* Magnified view inside loupe */}
            <div className="w-full h-full bg-gray-50 flex items-center justify-center">
              {/* Mini stone representation */}
              <div
                className="rounded-full bg-red-600 border border-gray-500"
                style={{ width: 18, height: 18 }}
              />
            </div>
          </motion.div>

          {/* Cursor - uses GrabCursor since we're dragging */}
          <motion.div
            className="absolute z-20 pointer-events-none"
            animate={{
              left: position === "center" ? 75 : 75,
              top: position === "center" ? 78 : 26,
            }}
            transition={{ duration: 1, ease: "easeInOut" }}
          >
            <GrabCursor size={28} />
          </motion.div>
        </div>
      </div>
    </AnimationContainer>
  );
};

// ============================================
// BAN TUTORIAL ANIMATIONS
// ============================================

// Ban marker helper (visual match for DraggableBan)
const BanMarker: React.FC<{ size: number; opacity?: number }> = ({
  size,
  opacity = 1,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      border: "4px dashed #FB923C",
      backgroundColor: "rgba(251, 146, 60, 0.25)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity,
      boxSizing: "border-box", // Ensure border is included in size
    }}
  >
    {/* X icon drawn with CSS to avoid extra deps in this file if possible, or use SVG */}
    <svg
      width={size * 0.5}
      height={size * 0.5}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FB923C"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  </div>
);

// Drag ban marker to place it
export const BanDragDemo: React.FC = () => {
  const HOUSE_COLORS = {
    ring12: "#185494", // Blue outer
    ring8: "#ffffff", // White
    ring4: "#D22730", // Red inner
    button: "#ffffff", // White center
    stroke: "#252333",
    ice: "#F0F8FF",
  };

  return (
    <AnimationContainer>
      <div className="relative" style={{ width: 160, height: 185 }}>
        {/* Label */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
          <div className="text-sm font-bold text-icy-black whitespace-nowrap px-3 py-1 bg-white/90 rounded-full shadow-sm">
            Drag to ban area
          </div>
        </div>

        {/* Sheet area */}
        <div
          className="absolute inset-x-2 top-8 bottom-10 rounded-lg border border-gray-200 overflow-hidden"
          style={{ backgroundColor: HOUSE_COLORS.ice }}
        >
          {/* Curling house rings */}
          <svg
            className="absolute inset-0"
            viewBox="0 0 140 110"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* 12-foot ring (blue) */}
            <circle
              cx="70"
              cy="70"
              r="40"
              fill={HOUSE_COLORS.ring12}
              stroke={HOUSE_COLORS.stroke}
              strokeWidth="0.5"
            />
            {/* 8-foot ring (white) */}
            <circle
              cx="70"
              cy="70"
              r="28"
              fill={HOUSE_COLORS.ring8}
              stroke={HOUSE_COLORS.stroke}
              strokeWidth="0.5"
            />
            {/* 4-foot ring (red) */}
            <circle
              cx="70"
              cy="70"
              r="16"
              fill={HOUSE_COLORS.ring4}
              stroke={HOUSE_COLORS.stroke}
              strokeWidth="0.5"
            />
            {/* Button (white center) */}
            <circle
              cx="70"
              cy="70"
              r="5"
              fill={HOUSE_COLORS.button}
              stroke={HOUSE_COLORS.stroke}
              strokeWidth="0.5"
            />
            {/* T-line */}
            <line
              x1="0"
              y1="70"
              x2="140"
              y2="70"
              stroke={HOUSE_COLORS.stroke}
              strokeWidth="1"
            />
            {/* Center line */}
            <line
              x1="70"
              y1="0"
              x2="70"
              y2="110"
              stroke={HOUSE_COLORS.stroke}
              strokeWidth="1"
            />
          </svg>
        </div>

        {/* Ban bar at bottom */}
        <div className="absolute bottom-0 inset-x-2 h-10 bg-white rounded-lg shadow-md flex items-center justify-center gap-2 px-3 z-0">
          <div className="opacity-30">
            <BanMarker size={24} />
          </div>
        </div>

        {/* Animated Marker - Moves then stays */}
        <motion.div
          initial={{ x: 72, y: 160, opacity: 0 }}
          animate={{
            x: [72, 72, 72, 72, 72, 72],
            y: [160, 160, 160, 92, 92, 92], // Start -> Wait -> Drag -> Drop -> Stay -> Stay
            opacity: [0, 1, 1, 1, 1, 0], // Fade In -> Visible -> Stay -> Fade Out
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            times: [0, 0.1, 0.25, 0.5, 0.9, 1], // 0.5 to 0.9 is ~1.6s + drag time = 2s roughly
            repeatDelay: 0.5,
          }}
          className="absolute z-10 pointer-events-none"
          style={{ left: 0, top: 0 }}
        >
          <div className="absolute" style={{ left: -16, top: -16 }}>
            <BanMarker size={32} />
          </div>
        </motion.div>

        {/* Animated Hand - Moves then disappears */}
        <motion.div
          initial={{ x: 72, y: 160, opacity: 0 }}
          animate={{
            x: [72, 72, 72, 72, 72, 72],
            y: [160, 160, 160, 92, 92, 92],
            opacity: [0, 1, 1, 1, 0, 0], // Fade In -> Visible -> Drop -> Fade Out -> Gone
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            times: [0, 0.1, 0.25, 0.5, 0.6, 1],
            repeatDelay: 0.5,
          }}
          className="absolute z-10 pointer-events-none"
          style={{ left: 0, top: 0 }}
        >
          <div className="absolute" style={{ left: -2, top: -2 }}>
            <GrabCursor size={28} />
          </div>
        </motion.div>
      </div>
    </AnimationContainer>
  );
};

// ============================================
// COLLISION HANDLING ANIMATIONS
// ============================================

// Step 3: Collision handling - stones pushing each other
export const CollisionHandlingDemo: React.FC = () => {
  // Animation state
  // 0: Initial state (overlapping)
  // 1: Resolution (pushed apart)
  const [isResolved, setIsResolved] = React.useState(false);

  React.useEffect(() => {
    const sequence = async () => {
      while (true) {
        // Start overlapping
        setIsResolved(false);
        // Wait a bit showing overlap
        await new Promise((r) => setTimeout(r, 1000));

        // Resolve (push apart)
        setIsResolved(true);
        // Wait showing resolved state
        await new Promise((r) => setTimeout(r, 2000));
      }
    };

    sequence();
  }, []);

  // Center position
  const centerX = 90;
  const centerY = 80; // Moved down slightly
  const stoneSize = 30;

  // Overlap offset: small distance from center
  const startOffset = 5; // 10px distance = 20px overlap (66%)

  // Resolved offset: radius (touching)
  const endOffset = 15; // 30px distance = 0px gap

  return (
    <AnimationContainer>
      <div className="relative" style={{ width: 180, height: 185 }}>
        {/* Label */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 w-full text-center">
          <motion.div
            className="text-sm font-bold text-icy-black inline-block px-3 py-1 bg-white/90 rounded-full shadow-sm"
            animate={{
              opacity: isResolved ? 1 : 0.5,
              y: isResolved ? 0 : 2,
            }}
          >
            Equal pushback
          </motion.div>
        </div>

        {/* Sheet area */}
        <div
          className="absolute inset-x-2 top-8 bottom-2 rounded-lg border border-gray-200 overflow-hidden"
          style={{ backgroundColor: HOUSE_COLORS.ice }}
        >
          {/* Yellow Stone (Left) */}
          <motion.div
            className="absolute"
            animate={{
              left: centerX - (isResolved ? endOffset : startOffset) - stoneSize / 2,
              top: centerY - stoneSize / 2,
            }}
            transition={{
              duration: 0.8,
              ease: "easeInOut", // Smooth push, no spring
            }}
          >
            <PlacementStone color="#e5b800" size={stoneSize} />
          </motion.div>

          {/* Red Stone (Right) */}
          <motion.div
            className="absolute"
            animate={{
              left: centerX + (isResolved ? endOffset : startOffset) - stoneSize / 2,
              top: centerY - stoneSize / 2,
            }}
            transition={{
              duration: 0.8,
              ease: "easeInOut", // Smooth push, no spring
            }}
          >
            <PlacementStone color="#cc0000" size={stoneSize} />
          </motion.div>

          {/* Overlap Indicator (Flash) */}
          {!isResolved && (
            <motion.div
              className="absolute rounded-full border-2 border-red-500/50"
              style={{
                left: centerX - 10,
                top: centerY - 10,
                width: 20,
                height: 20,
              }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}

          {/* Push arrows */}
          <AnimatePresence>
            {isResolved && (
              <>
                {/* Left arrow */}
                <motion.div
                  className="absolute text-cyan-600 font-bold"
                  style={{ left: centerX - 25, top: centerY + 15 }}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                >
                  ←
                </motion.div>
                {/* Right arrow */}
                <motion.div
                  className="absolute text-cyan-600 font-bold"
                  style={{ left: centerX + 15, top: centerY + 15 }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                >
                  →
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AnimationContainer>
  );
};

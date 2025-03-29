"use client"

import React, { useState, useEffect, useRef } from "react"
import type { MouseEvent } from "react"
import { drawSheet } from "@/utils/drawing-utils"
import InstructionsModal from "./instructions-modal"
import { motion, AnimatePresence } from "framer-motion"

// Draw the house (concentric circles)
function drawHouse(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  // Outer circle (12-foot)
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.strokeStyle = "#000"
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = "#b3d9ff"
  ctx.fill()

  // 8-foot circle
  ctx.beginPath()
  ctx.arc(x, y, radius * 0.67, 0, Math.PI * 2)
  ctx.strokeStyle = "#000"
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = "#ffffff"
  ctx.fill()

  // 4-foot circle
  ctx.beginPath()
  ctx.arc(x, y, radius * 0.33, 0, Math.PI * 2)
  ctx.strokeStyle = "#000"
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = "#ff6666"
  ctx.fill()

  // Button (center)
  ctx.beginPath()
  ctx.arc(x, y, radius * 0.1, 0, Math.PI * 2)
  ctx.fillStyle = "#ffffff"
  ctx.fill()
  ctx.strokeStyle = "#000"
  ctx.lineWidth = 1
  ctx.stroke()
}

// Game states
type GameState = "placement" | "finished"

export default function CurlingGame() {
  // Fixed dimensions
  const width = 300
  const height = 600
  const stoneSize = 30
  const stoneRadius = stoneSize / 2
  const barHeight = 60
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Game state
  const [gameState, setGameState] = useState<GameState>("placement")

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Pre-populated stones in the rock bar
  const [stones, setStones] = useState([
    { id: "stone1", x: 50, y: 0, inBar: true },
    { id: "stone2", x: 100, y: 0, inBar: true },
  ])

  // Track which stone is being dragged
  const [draggingId, setDraggingId] = useState<string | null>(null)

  // Track if we're showing a visual indicator for overlap
  const [overlapIndicator, setOverlapIndicator] = useState<{ x: number; y: number; show: boolean }>({
    x: 0,
    y: 0,
    show: false,
  })

  // Scoring information
  const [scoreInfo, setScoreInfo] = useState<{
    distances: { id: string; distance: number; rank: number }[]
    closestStoneId: string | null
  }>({
    distances: [],
    closestStoneId: null,
  })

  // Add this after other state declarations
  const [selectedStoneId, setSelectedStoneId] = useState<string | null>(null)

  // Add this after other constants
  const measuringPoints = [
    { id: "center", name: "Center of House", x: width / 2, y: height * 0.75 },
    { id: "bottom", name: "Bottom of House", x: width / 2, y: height },
    { id: "left", name: "Left of House", x: width / 2 - height * 0.25, y: height * 0.75 },
    { id: "right", name: "Right of House", x: width / 2 + height * 0.25, y: height * 0.75 },
    { id: "top", name: "Top of House", x: width / 2, y: height * 0.5 },
    { id: "topLeft", name: "Top Left Corner", x: 0, y: 0 },
    { id: "topRight", name: "Top Right Corner", x: width, y: 0 },
  ]

  // Calculate scores based on stone positions
  const calculateScores = () => {
    const sheetStones = stones.filter((s) => !s.inBar)

    // Calculate distance to center of house for each stone
    // Center of house is at 50% width, 75% height
    const houseCenter = { x: width / 2, y: height * 0.75 }

    const distances = sheetStones.map((stone) => {
      const distance = Math.sqrt(Math.pow(stone.x - houseCenter.x, 2) + Math.pow(stone.y - houseCenter.y, 2))
      return { id: stone.id, distance, rank: 0 }
    })

    // Sort by distance (closest first)
    distances.sort((a, b) => a.distance - b.distance)

    // Assign ranks
    distances.forEach((item, index) => {
      item.rank = index + 1
    })

    setScoreInfo({
      distances,
      closestStoneId: distances.length > 0 ? distances[0].id : null,
    })
  }

  // Add this function after other utility functions
  const getClosestMeasuringPoints = (stone: { x: number; y: number }) => {
    // Calculate distance from stone center to each measuring point
    const distances = measuringPoints.map((point) => {
      const distance = Math.sqrt(Math.pow(stone.x - point.x, 2) + Math.pow(stone.y - point.y, 2))
      // Distance to edge = distance to center - stone radius
      const distanceToEdge = Math.max(0, distance - stoneRadius)
      return {
        ...point,
        distance,
        distanceToEdge,
      }
    })

    // Sort by distance and take the two closest
    return distances.sort((a, b) => a.distance - b.distance).slice(0, 2)
  }

  // Draw the curling sheet
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = width
    canvas.height = height

    // Draw the sheet
    drawSheet(ctx, width, height)
  }, [width, height])

  // Calculate scores when transitioning to finished state
  useEffect(() => {
    if (gameState === "finished") {
      calculateScores()
    }
  }, [gameState])

  // Check if two stones are overlapping
  const areOverlapping = (stone1: { x: number; y: number }, stone2: { x: number; y: number }) => {
    const distance = Math.sqrt(Math.pow(stone1.x - stone2.x, 2) + Math.pow(stone1.y - stone2.y, 2))
    return distance < stoneSize // If distance is less than stone diameter, they overlap
  }

  // Calculate the nearest valid position for a stone
  const findNearestValidPosition = (
    stonePosition: { x: number; y: number },
    otherStones: Array<{ x: number; y: number }>,
    containerWidth: number,
    containerHeight: number,
  ) => {
    // Clone the position to avoid modifying the original
    const newPosition = { ...stonePosition }
    let iterations = 0
    const maxIterations = 10 // Prevent infinite loops

    // Keep adjusting position until no overlaps or max iterations reached
    while (iterations < maxIterations) {
      let hasOverlap = false

      // Check for overlaps with each stone
      for (const otherStone of otherStones) {
        if (areOverlapping(newPosition, otherStone)) {
          hasOverlap = true

          // Calculate direction vector from other stone to current stone
          const dirX = newPosition.x - otherStone.x
          const dirY = newPosition.y - otherStone.y

          // Handle case where stones are exactly on top of each other
          if (dirX === 0 && dirY === 0) {
            // Move slightly to the right if exactly overlapping
            newPosition.x += stoneSize
            continue
          }

          // Calculate distance between centers
          const distance = Math.sqrt(dirX * dirX + dirY * dirY)

          // Normalize direction vector
          const normDirX = dirX / distance
          const normDirY = dirY / distance

          // Calculate minimum distance needed to prevent overlap
          const minDistance = stoneSize

          // Move stone along direction vector to prevent overlap
          newPosition.x = otherStone.x + normDirX * minDistance
          newPosition.y = otherStone.y + normDirY * minDistance

          // Break to recheck all stones with the new position
          break
        }
      }

      // If no overlaps, we're done
      if (!hasOverlap) {
        break
      }

      iterations++
    }

    // Ensure the stone stays within container bounds
    // Left boundary
    if (newPosition.x - stoneRadius < 0) {
      newPosition.x = stoneRadius
    }

    // Right boundary
    if (newPosition.x + stoneRadius > containerWidth) {
      newPosition.x = containerWidth - stoneRadius
    }

    // Top boundary
    if (newPosition.y - stoneRadius < 0) {
      newPosition.y = stoneRadius
    }

    // Bottom boundary - allow stones to be partially beyond the backline
    if (newPosition.y + stoneRadius * 2 > containerHeight) {
      // Only constrain if the stone is completely beyond the backline
      newPosition.y = containerHeight
    }

    return newPosition
  }

  // Add this function after other event handlers
  const handleStoneClick = (id: string) => {
    if (gameState !== "finished") return

    // Toggle selection if clicking the same stone
    if (selectedStoneId === id) {
      setSelectedStoneId(null)
    } else {
      setSelectedStoneId(id)
    }
  }

  // Start dragging a stone
  const startDrag = (id: string, e: MouseEvent) => {
    // Don't allow dragging in finished state
    if (gameState === "finished") return

    e.preventDefault()
    setDraggingId(id)
    setOverlapIndicator({ x: 0, y: 0, show: false })

    // Get container position (assuming it doesn't move during drag)
    const container = document.getElementById("drag-container")
    if (!container) return
    const containerRect = container.getBoundingClientRect()

    // Handle mouse movement
    function handleMouseMove(e: MouseEvent) {
      // Calculate new position relative to container
      const x = e.clientX - containerRect.left
      const y = e.clientY - containerRect.top

      // Update stone position using functional update
      setStones((prevStones) => {
        // Check for potential overlaps during drag
        const otherStones = prevStones.filter((s) => s.id !== id && !s.inBar)
        const updatedStone = { ...prevStones.find((s) => s.id === id)!, x, y, inBar: false }

        // Check if the current position would cause an overlap
        const wouldOverlap = otherStones.some((otherStone) => areOverlapping(updatedStone, otherStone))

        // Show visual indicator if there would be an overlap
        if (wouldOverlap) {
          setOverlapIndicator({ x, y, show: true })
        } else {
          setOverlapIndicator({ x: 0, y: 0, show: false })
        }

        return prevStones.map((s) => (s.id === id ? updatedStone : s))
      })
    }

    // Handle mouse up
    function handleMouseUp(e: MouseEvent) {
      setDraggingId(null) // Stop dragging state
      setOverlapIndicator({ x: 0, y: 0, show: false })

      // Check if stone is dropped in the container
      const isInContainer =
        e.clientX >= containerRect.left &&
        e.clientX <= containerRect.right &&
        e.clientY >= containerRect.top &&
        e.clientY <= containerRect.bottom

      // Update stones using functional update
      setStones((prevStones) => {
        // Get the current stone being dragged
        const currentStone = prevStones.find((s) => s.id === id)
        if (!currentStone) return prevStones

        // Check for overlaps with other stones on the sheet
        const otherStones = prevStones.filter((s) => s.id !== id && !s.inBar)
        const hasOverlap = otherStones.some((otherStone) => areOverlapping(currentStone, otherStone))

        // Check if the stone is outside boundaries
        const x = currentStone.x
        const y = currentStone.y

        const isOutsideLeft = x - stoneRadius < 0
        const isOutsideRight = x + stoneRadius > width
        const isOutsideTop = y - stoneRadius < 0
        // For the backline, we allow stones to be partially beyond it
        const isCompletelyBeyondBackline = y - stoneRadius * 2 >= height

        const isOutsideBoundary = isOutsideLeft || isOutsideRight || isOutsideTop || isCompletelyBeyondBackline

        return prevStones.map((s) => {
          if (s.id === id) {
            if (isInContainer && !isOutsideBoundary) {
              if (hasOverlap) {
                // Find nearest valid position
                const validPosition = findNearestValidPosition(
                  { x: currentStone.x, y: currentStone.y },
                  otherStones,
                  width,
                  height,
                )

                // Use the valid position
                return {
                  ...s,
                  inBar: false,
                  x: validPosition.x,
                  y: validPosition.y,
                }
              } else {
                // No overlap, keep current position
                return {
                  ...s,
                  inBar: false,
                }
              }
            } else {
              // Dropped outside or outside boundary: return to bar state
              return {
                ...s,
                inBar: true,
                x: 50 + prevStones.filter((stone) => stone.inBar).length * 40,
                y: 0,
              }
            }
          }
          return s
        })
      })

      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  // Handle finish button click
  const handleFinish = () => {
    setGameState("finished")
  }

  // Handle restart button click
  const handleRestart = () => {
    // Reset stones to initial state
    setStones([
      { id: "stone1", x: 50, y: 0, inBar: true },
      { id: "stone2", x: 100, y: 0, inBar: true },
    ])
    setGameState("placement")
  }

  // Get stone rank by id
  const getStoneRank = (stoneId: string): number | null => {
    const stoneInfo = scoreInfo.distances.find((d) => d.id === stoneId)
    return stoneInfo ? stoneInfo.rank : null
  }

  // Get stones in the bar and on the sheet
  const barStones = stones.filter((s) => s.inBar)
  const sheetStones = stones.filter((s) => !s.inBar)

  return (
    <div className="flex flex-col items-center p-4">
      <AnimatePresence mode="wait">
        {gameState === "placement" ? (
          <motion.h1
            key="placement-title"
            className="text-xl font-bold mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Kicka Ettan - Place Your Stones
          </motion.h1>
        ) : (
          <motion.h1
            key="finished-title"
            className="text-xl font-bold mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Final Stone Positions
          </motion.h1>
        )}
      </AnimatePresence>

      {/* Curling sheet container */}
      <div
        id="drag-container"
        className="relative border border-gray-300"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        {/* Curling sheet background */}
        <canvas ref={canvasRef} width={width} height={height} className="absolute top-0 left-0" />

        {/* Boundary indicators - only showing top, left, and right boundaries */}
        <div className="absolute inset-0 pointer-events-none border-2 border-transparent border-t-blue-500 border-l-blue-500 border-r-blue-500" />

        {/* Stones on the sheet */}
        {sheetStones.map((stone) => (
          <div
            key={stone.id}
            className={`absolute rounded-full ${gameState === "placement" ? "cursor-grab" : "cursor-pointer"} ${draggingId === stone.id ? "cursor-grabbing" : ""} ${gameState === "finished" && stone.id === scoreInfo.closestStoneId ? "ring-2 ring-yellow-400 ring-offset-2" : ""} ${gameState === "finished" && stone.id === selectedStoneId ? "ring-2 ring-emerald-500 ring-offset-2" : ""}`}
            style={{
              width: `${stoneSize}px`,
              height: `${stoneSize}px`,
              backgroundColor: "rgb(220, 53, 69)",
              border: "2px solid black",
              left: `${stone.x - stoneSize / 2}px`,
              top: `${stone.y - stoneSize / 2}px`,
              zIndex: draggingId === stone.id ? 10 : 1,
              boxShadow: draggingId === stone.id ? "0 0 10px rgba(0,0,0,0.5)" : "none",
              transition: gameState === "finished" ? "all 0.5s ease-in-out" : "none",
            }}
            onClick={() => handleStoneClick(stone.id)}
            onMouseDown={(e) => gameState === "placement" && startDrag(stone.id, e)}
          >
            {/* Stone handle */}
            <div
              className="absolute rounded-full bg-transparent border-2 border-black"
              style={{
                width: "60%",
                height: "60%",
                top: "20%",
                left: "20%",
              }}
            />

            {/* Team indicator */}
            <div
              className="absolute rounded-full bg-white border border-black"
              style={{
                width: "30%",
                height: "30%",
                top: "35%",
                left: "35%",
              }}
            />

            {/* Stone rank number (only in finished state) */}
            {gameState === "finished" && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + (getStoneRank(stone.id) || 0) * 0.1 }}
                className="absolute text-emerald-500 font-extrabold text-lg"
                style={{
                  top: `-${stoneSize / 2 + 2}px`,
                  left: "50%",
                  transform: "translateX(-50%)",
                  textShadow: "0 0 3px white, 0 0 5px white",
                  zIndex: 20,
                }}
              >
                {getStoneRank(stone.id)}
              </motion.div>
            )}
          </div>
        ))}

        {/* Overlap indicator */}
        {overlapIndicator.show && gameState === "placement" && (
          <div
            className="absolute rounded-full border-2 border-red-500 bg-red-200 bg-opacity-50 pointer-events-none"
            style={{
              width: `${stoneSize}px`,
              height: `${stoneSize}px`,
              left: `${overlapIndicator.x - stoneSize / 2}px`,
              top: `${overlapIndicator.y - stoneSize / 2}px`,
              zIndex: 5,
            }}
          />
        )}

        {/* Distance lines in finished state */}
        {gameState === "finished" &&
          scoreInfo.distances.map(({ id, distance }) => {
            const stone = stones.find((s) => s.id === id)
            if (!stone) return null

            const houseCenter = { x: width / 2, y: height * 0.75 }

            return (
              <svg
                key={`distance-${id}`}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ zIndex: 0 }}
              >
                <line
                  x1={stone.x}
                  y1={stone.y}
                  x2={houseCenter.x}
                  y2={houseCenter.y}
                  stroke={id === scoreInfo.closestStoneId ? "#FFD700" : "#888"}
                  strokeWidth="1"
                  strokeDasharray={id === scoreInfo.closestStoneId ? "none" : "5,5"}
                />
              </svg>
            )
          })}

        {/* Add this after the distance lines section */}
        {/* Measurement lines for selected stone */}
        {gameState === "finished" &&
          selectedStoneId &&
          (() => {
            const selectedStone = stones.find((s) => s.id === selectedStoneId)
            if (!selectedStone) return null

            const closestPoints = getClosestMeasuringPoints(selectedStone)

            return (
              <>
                {closestPoints.map((point, index) => (
                  <React.Fragment key={`measure-${point.id}`}>
                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 15 }}>
                      <line
                        x1={selectedStone.x}
                        y1={selectedStone.y}
                        x2={point.x}
                        y2={point.y}
                        stroke={index === 0 ? "#10b981" : "#3b82f6"}
                        strokeWidth="1.5"
                        strokeDasharray="5,5"
                      />

                      {/* Add a small circle at the measuring point */}
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="3"
                        fill={index === 0 ? "#10b981" : "#3b82f6"}
                        stroke="#fff"
                        strokeWidth="1"
                      />
                    </svg>

                    {/* Distance label */}
                    <div
                      className={`absolute px-1 py-0.5 rounded text-xs font-bold text-white ${index === 0 ? "bg-emerald-500" : "bg-blue-500"}`}
                      style={{
                        left: (selectedStone.x + point.x) / 2,
                        top: (selectedStone.y + point.y) / 2,
                        transform: "translate(-50%, -50%)",
                        zIndex: 16,
                      }}
                    >
                      {point.distanceToEdge.toFixed(1)}px
                    </div>
                  </React.Fragment>
                ))}

                {/* Add labels for the measuring points */}
                {closestPoints.map((point, index) => (
                  <div
                    key={`label-${point.id}`}
                    className={`absolute px-1 py-0.5 rounded text-xs font-bold text-white ${index === 0 ? "bg-emerald-500" : "bg-blue-500"}`}
                    style={{
                      left: point.x,
                      top: point.y + (index === 0 ? -15 : 15),
                      transform: "translateX(-50%)",
                      zIndex: 16,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {point.name}
                  </div>
                ))}
              </>
            )
          })()}

        {/* House center indicator in finished state */}
        {gameState === "finished" && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute w-4 h-4 rounded-full bg-yellow-400 border border-black"
            style={{
              left: `${width / 2 - 8}px`,
              top: `${height * 0.75 - 8}px`,
              zIndex: 5,
              boxShadow: "0 0 8px rgba(255,215,0,0.6)",
            }}
          />
        )}
      </div>

      <AnimatePresence>
        {gameState === "placement" ? (
          <motion.div
            className="flex items-center mt-8 w-full"
            style={{ maxWidth: `${width}px` }}
            initial={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            key="game-controls"
          >
            {/* Info button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="mr-4 p-2 bg-white text-black rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 border border-gray-300"
              aria-label="Game instructions"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>

            {/* Rock bar */}
            <div
              id="rock-bar"
              className="flex-1 flex justify-start items-center gap-4 p-2 bg-gray-100 rounded-md"
              style={{ height: `${barHeight}px` }}
            >
              {/* Stones in the bar */}
              {barStones.map((stone, index) => (
                <div
                  key={stone.id}
                  className={`relative rounded-full cursor-grab ${draggingId === stone.id ? "cursor-grabbing" : ""}`}
                  style={{
                    width: `${stoneSize}px`,
                    height: `${stoneSize}px`,
                    backgroundColor: "rgb(220, 53, 69)",
                    border: "2px solid black",
                    zIndex: draggingId === stone.id ? 10 : 1,
                    boxShadow: draggingId === stone.id ? "0 0 10px rgba(0,0,0,0.5)" : "none",
                    marginLeft: index === 0 ? `${stoneRadius}px` : "0",
                  }}
                  onMouseDown={(e) => startDrag(stone.id, e)}
                >
                  {/* Stone handle */}
                  <div
                    className="absolute rounded-full bg-transparent border-2 border-black"
                    style={{
                      width: "60%",
                      height: "60%",
                      top: "20%",
                      left: "20%",
                    }}
                  />

                  {/* Team indicator */}
                  <div
                    className="absolute rounded-full bg-white border border-black"
                    style={{
                      width: "30%",
                      height: "30%",
                      top: "35%",
                      left: "35%",
                    }}
                  />
                </div>
              ))}

              {/* Add a finish button only when both stones are placed */}
              {sheetStones.length === 2 && (
                <button
                  onClick={handleFinish}
                  className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Finish
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="mt-8 w-full flex justify-center"
            style={{ maxWidth: `${width}px` }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            key="scoring-controls"
          >
            {/* Scoring information */}
            <div className="bg-white p-4 rounded-lg shadow-md w-full">
              <h2 className="text-lg font-semibold mb-2">Stone Positions</h2>
              {scoreInfo.distances.length > 0 ? (
                <div className="space-y-2">
                  {scoreInfo.distances.map(({ id, distance, rank }) => (
                    <div key={id} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div
                          className={`w-6 h-6 rounded-full mr-2 flex items-center justify-center text-xs font-bold ${id === scoreInfo.closestStoneId ? "bg-yellow-400 text-black" : "bg-gray-200 text-gray-700"}`}
                        >
                          {rank}
                        </div>
                        <span>Stone {rank}</span>
                      </div>
                      <span className="font-mono">
                        {distance.toFixed(1)} px from center
                        {id === scoreInfo.closestStoneId && " (closest)"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No stones on the sheet</p>
              )}

              <div className="mt-4 p-3 bg-gray-100 rounded-md text-sm">
                <p className="font-medium">Stone Ranking</p>
                <p>Numbers above stones indicate their ranking by distance from the button (center).</p>
                <p>Stone #1 is closest to the button and would score in a real game.</p>
              </div>

              <button
                onClick={handleRestart}
                className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Play Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions Modal */}
      <InstructionsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Debug info - only show in placement mode */}
      {gameState === "placement" && (
        <div className="mt-4 text-sm">
          <div>Stones on sheet: {sheetStones.length}</div>
          <div>Stones in bar: {barStones.length}</div>
          <div>{draggingId ? `Dragging: ${draggingId}` : "Not dragging"}</div>
        </div>
      )}
    </div>
  )
}


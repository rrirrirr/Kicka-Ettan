"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import type { Stone } from "@/types/game-types"

interface DraggableRockProps {
  stone: Stone
  containerWidth: number
  containerHeight: number
  isPlaced: boolean
  onPlaced: (stone: Stone) => void
}

export default function DraggableRock({
  stone,
  containerWidth,
  containerHeight,
  isPlaced,
  onPlaced,
}: DraggableRockProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const rockRef = useRef<HTMLDivElement>(null)
  const stoneSize = containerWidth * 0.05 * 2 // Diameter is 5% of container width

  // Set initial position for rocks in the rock bar
  useEffect(() => {
    if (!isPlaced && rockRef.current) {
      // Position will be handled by flex layout in parent
      setPosition({ x: 0, y: 0 })
    }
  }, [isPlaced, containerWidth])

  // Set position for placed stones
  useEffect(() => {
    if (isPlaced) {
      setPosition({
        x: (stone.position.x / 100) * containerWidth - stoneSize / 2,
        y: (stone.position.y / 100) * containerHeight - stoneSize / 2,
      })
    }
  }, [isPlaced, stone.position, containerWidth, containerHeight, stoneSize])

  const handleMouseDown = (e: React.MouseEvent) => {
    //if (isPlaced) return // Don't allow dragging already placed stones

    e.preventDefault()
    setIsDragging(true)

    // Get container bounds
    const containerRect = document.getElementById("curling-container")?.getBoundingClientRect()
    //if (!containerRect) return

    // Calculate initial position within container
    const newX = e.clientX - containerRect.left - stoneSize / 2
    const newY = e.clientY - containerRect.top - stoneSize / 2

    setPosition({ x: newX, y: newY })
  }

  const handleMouseMove = (e: MouseEvent) => {
    //if (!isDragging) return

    // Get container bounds
    const containerRect = document.getElementById("curling-container")?.getBoundingClientRect()
    // if (!containerRect) return

    // Calculate new position relative to container
    const newX = e.clientX - containerRect.left - stoneSize / 2
    const newY = e.clientY - containerRect.top - stoneSize / 2

    // Constrain to container bounds
    // const constrainedX = Math.max(0, Math.min(newX, containerWidth - stoneSize))
    // const constrainedY = Math.max(0, Math.min(newY, containerHeight - stoneSize))
    setPosition({ x: newX, y: newY })
    // setPosition({ x: constrainedX, y: constrainedY })
  }

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false)

      // Convert position to percentage for game logic
      const percentX = ((position.x + stoneSize / 2) / containerWidth) * 100
      const percentY = ((position.y + stoneSize / 2) / containerHeight) * 100

      // Only place if within the playing area
      if (!isPlaced) {
        const placedStone: Stone = {
          ...stone,
          position: { x: percentX, y: percentY },
          isInRockBar: false,
        }
        onPlaced(placedStone)
      }
    }
  }

  // Add and remove event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging])

  return (
    <div
      ref={rockRef}
      className={`${isPlaced ? "absolute" : ""} rounded-full cursor-grab ${isDragging ? "cursor-grabbing z-50" : ""}`}
      style={{
        width: `${stoneSize}px`,
        height: `${stoneSize}px`,
        backgroundColor: "rgb(220, 53, 69)", // Always red
        border: "1px solid black",
        left: isPlaced || isDragging ? `${position.x}px` : "auto",
        top: isPlaced || isDragging ? `${position.y}px` : "auto",
        position: isPlaced || isDragging ? "absolute" : "relative",
        transform: isDragging ? "scale(1.05)" : "scale(1)",
        transition: isDragging ? "none" : "transform 0.1s",
        zIndex: isDragging ? 1000 : "auto",
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Stone handle/grip indicator */}
      <div
        className="absolute rounded-full bg-transparent border border-black"
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
  )
}


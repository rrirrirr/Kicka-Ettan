import { useRef, useEffect } from "react"
import type { Stone } from "@/types/game-types"
import { drawSheet } from "@/utils/drawing-utils"

interface CurlingSheetProps {
  width: number
  height: number
  stones: Stone[]
}

export default function CurlingSheet({ width, height, stones }: CurlingSheetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Draw the sheet and stones
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width === 0 || height === 0) return

    // Set canvas dimensions
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw the sheet
    drawSheet(ctx, width, height)
  }, [stones, width, height])

  if (width === 0 || height === 0) {
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute top-0 left-0 border border-gray-300 rounded-md shadow-md"
    />
  )
}


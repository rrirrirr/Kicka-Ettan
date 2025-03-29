import type { Stone } from "@/types/game-types"

/**
 * Draws a house (set of concentric circles) on the sheet
 */
export function drawHouse(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
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

/**
 * Draws the curling sheet on the canvas
 */
export function drawSheet(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  // Background
  ctx.fillStyle = "#e0f0ff"
  ctx.fillRect(0, 0, width, height)

  // Center line
  ctx.beginPath()
  ctx.moveTo(width / 2, 0)
  ctx.lineTo(width / 2, height)
  ctx.strokeStyle = "#000"
  ctx.lineWidth = 1
  ctx.stroke()

  // Hog line (approximately 1/3 from bottom)
  ctx.beginPath()
  ctx.moveTo(0, height * 0.67)
  ctx.lineTo(width, height * 0.67)
  ctx.strokeStyle = "#000"
  ctx.lineWidth = 2
  ctx.stroke()

  // Draw house at the bottom (much larger now - about half the height)
  const houseRadius = height * 0.25 // House is now 50% of the height in diameter
  const houseY = height - houseRadius // Position to show the full circle, with bottom touching the bottom edge

  drawHouse(ctx, width / 2, houseY, houseRadius)

  // Add horizontal tee line through the house
  ctx.beginPath()
  ctx.moveTo(0, houseY)
  ctx.lineTo(width, houseY)
  ctx.strokeStyle = "#000"
  ctx.lineWidth = 2
  ctx.stroke()

  // Draw guard zone indicator (subtle)
  ctx.beginPath()
  ctx.moveTo(0, height * 0.4)
  ctx.lineTo(width, height * 0.4)
  ctx.setLineDash([5, 5])
  ctx.strokeStyle = "#aaa"
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.setLineDash([])

  // Draw backline
  ctx.beginPath()
  ctx.moveTo(0, height)
  ctx.lineTo(width, height)
  ctx.setLineDash([])
  ctx.strokeStyle = "#000" // Standard black color for backline
  ctx.lineWidth = 2
  ctx.stroke()
}

/**
 * Draws stones on the sheet
 */
export function drawStones(ctx: CanvasRenderingContext2D, stones: Stone[], width: number, height: number): void {
  // We don't need to draw stones on the canvas anymore
  // They are rendered as DOM elements for dragging functionality
}


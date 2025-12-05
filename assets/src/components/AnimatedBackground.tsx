

import { useEffect, useRef } from "react"

// Helper to generate random variation
function randomVariation(base: number, variance: number) {
    return base + (Math.random() - 0.5) * variance
}

interface WaveBand {
    yPos: number
    amplitude: number
    frequency: number
    phase: number
    speed: number
    amplitude2: number
    frequency2: number
    phase2: number
    speed2: number
    color: string
    bandHeight: number
}

export function AnimatedBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const setSize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        setSize()
        window.addEventListener("resize", setSize)

        // Generate randomized wave bands - more waves for ocean effect
        const colors = [
            "rgba(255, 255, 255, 0.5)",
            "rgba(240, 248, 255, 0.45)",
            "rgba(225, 242, 252, 0.48)",
            "rgba(235, 245, 251, 0.52)",
            "rgba(245, 250, 253, 0.4)",
            "rgba(230, 245, 255, 0.42)",
            "rgba(220, 240, 250, 0.38)",
        ]

        // Create more waves with varied properties for ocean-like appearance
        const bands: WaveBand[] = []
        const numWaves = 15

        for (let i = 0; i < numWaves; i++) {
            const yPosition = randomVariation(i / numWaves, 0.05)
            bands.push({
                yPos: yPosition,
                amplitude: randomVariation(100, 60),
                frequency: randomVariation(0.003, 0.002),
                phase: Math.random() * Math.PI * 2,
                speed: randomVariation(0.0005, 0.0008),  // Wider range: 0.0001 to 0.0009
                // Secondary wave for ocean effect
                amplitude2: randomVariation(40, 30),
                frequency2: randomVariation(0.006, 0.003),
                phase2: Math.random() * Math.PI * 2,
                speed2: randomVariation(0.0008, 0.0012),  // Wider range: 0.0002 to 0.0014
                color: colors[Math.floor(Math.random() * colors.length)],
                bandHeight: randomVariation(100, 40)
            })
        }

        let animationId: number
        let time = 0

        const animate = () => {
            // Draw background gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
            gradient.addColorStop(0, "#f0f4f8")
            gradient.addColorStop(0.3, "#e8f1f7")
            gradient.addColorStop(0.6, "#dfe9f2")
            gradient.addColorStop(1, "#d4e3ed")
            ctx.fillStyle = gradient
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Draw animated wavy bands
            drawWavyBands(ctx, canvas.width, canvas.height, bands, time)

            time += 1
            animationId = requestAnimationFrame(animate)
        }

        animate()

        return () => {
            window.removeEventListener("resize", setSize)
            cancelAnimationFrame(animationId)
        }
    }, [])

    return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" style={{ filter: "blur(1px)" }} />
}

function drawWavyBands(ctx: CanvasRenderingContext2D, width: number, height: number, bands: WaveBand[], time: number) {
    bands.forEach((band) => {
        ctx.save()
        ctx.fillStyle = band.color
        ctx.beginPath()

        const baseY = height * band.yPos

        // Create wavy top edge with ocean-like layered waves
        ctx.moveTo(0, baseY)
        for (let x = 0; x <= width; x += 3) {
            const animatedPhase1 = band.phase + time * band.speed
            const animatedPhase2 = band.phase2 + time * band.speed2

            // Combine two wave functions for more organic ocean-like movement
            const wave1 = Math.sin(x * band.frequency + animatedPhase1) * band.amplitude
            const wave2 = Math.sin(x * band.frequency2 + animatedPhase2) * band.amplitude2

            const y = baseY + wave1 + wave2
            ctx.lineTo(x, y)
        }

        // Complete the band shape
        ctx.lineTo(width, baseY + band.bandHeight)
        ctx.lineTo(0, baseY + band.bandHeight)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
    })
}

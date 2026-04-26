import { useEffect, useRef, useState } from 'react'

export interface PoseData {
  left_shoulder: { x: number; y: number }
  right_shoulder: { x: number; y: number }
  left_hip: { x: number; y: number }
  right_hip: { x: number; y: number }
}

export interface SizeResult {
  size: string
  confidence: number
  shoulderCm: number
  chestCm: number
}

const SIZE_BANDS: { name: string; min: number; max: number }[] = [
  { name: 'XS', min: 36, max: 39 },
  { name: 'S', min: 39, max: 42 },
  { name: 'M', min: 42, max: 45 },
  { name: 'L', min: 45, max: 48 },
  { name: 'XL', min: 48, max: 51 },
  { name: 'XXL', min: 51, max: 100 },
]

const STABILIZATION_FRAMES = 10

/**
 * Estimates clothing size from MediaPipe pose keypoints.
 * Uses torso height (~50cm) as a calibration ruler, then derives
 * shoulder width in cm. Stabilizes across N consecutive frames.
 */
export function useSizeAnalysis(pose: PoseData | null): SizeResult | null {
  const [result, setResult] = useState<SizeResult | null>(null)
  const buffer = useRef<string[]>([])
  const lastCommitted = useRef<SizeResult | null>(null)

  useEffect(() => {
    if (!pose) return

    const ls = pose.left_shoulder
    const rs = pose.right_shoulder
    const lh = pose.left_hip
    const rh = pose.right_hip

    const shoulderY = (ls.y + rs.y) / 2
    const hipY = (lh.y + rh.y) / 2
    const torsoPx = Math.abs(hipY - shoulderY)

    if (torsoPx < 10) return

    // 1. Calibrate: torso ≈ 50 cm  (rough average for adults)
    const pxPerCm = torsoPx / 50

    // 2. Shoulder width in cm
    const shoulderPx = Math.abs(ls.x - rs.x)
    const shoulderCm = shoulderPx / pxPerCm

    // 3. Chest circumference rough estimate
    const chestCm = shoulderCm * 2.05

    // 4. Match to size band
    let band = SIZE_BANDS[SIZE_BANDS.length - 1]
    if (shoulderCm < SIZE_BANDS[0].min) {
      band = SIZE_BANDS[0]
    } else {
      for (const b of SIZE_BANDS) {
        if (shoulderCm >= b.min && shoulderCm < b.max) {
          band = b
          break
        }
      }
    }

    // 5. Confidence = 1 - normalized distance from center of band
    const center = (band.min + band.max) / 2
    const half = (band.max - band.min) / 2 || 1
    const dist = Math.abs(shoulderCm - center)
    const confidence = Math.max(0, Math.min(1, 1 - dist / half))

    // 6. Stabilization buffer
    buffer.current.push(band.name)
    if (buffer.current.length > STABILIZATION_FRAMES) buffer.current.shift()

    const measurements = {
      shoulderCm: Math.round(shoulderCm),
      chestCm: Math.round(chestCm),
    }

    if (buffer.current.length >= STABILIZATION_FRAMES) {
      const allSame = buffer.current.every((s) => s === buffer.current[0])
      if (allSame) {
        const committed: SizeResult = {
          size: band.name,
          confidence,
          ...measurements,
        }
        lastCommitted.current = committed
        setResult(committed)
        return
      }
    }

    // Until we commit, surface latest measurements but keep last stable size
    if (lastCommitted.current) {
      setResult({
        ...lastCommitted.current,
        confidence,
        ...measurements,
      })
    } else {
      // No committed yet — show provisional with low confidence
      setResult({
        size: band.name,
        confidence: confidence * 0.5,
        ...measurements,
      })
    }
  }, [pose])

  return result
}

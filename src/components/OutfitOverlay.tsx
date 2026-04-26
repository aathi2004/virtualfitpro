import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PoseData } from '../hooks/useSizeAnalysis'

interface Props {
  garmentUrl: string
  pose: PoseData | null
  videoW: number
  videoH: number
}

// ── Tunable constants ───────────────────────────────────────────
// Shoulder seam sits at 20% from the TOP of a shirt PNG. Anchoring to
// shoulderMidY - h * 0.20 puts that seam exactly on the user's shoulders.
const SHOULDER_SEAM_RATIO = 0.20
const WIDTH_SCALE = 1.55   // shirt sleeves extend past shoulders
const HEIGHT_SCALE = 1.35  // shirt drops past hips
const SMOOTH = 0.30        // EMA factor for jitter reduction

interface Smoothed {
  x: number
  y: number
  w: number
  h: number
  rot: number
}

export default function OutfitOverlay({ garmentUrl, pose, videoW, videoH }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const smoothedRef = useRef<Smoothed | null>(null)

  // Container size via ResizeObserver — clientWidth is 0 on first render
  const [box, setBox] = useState({ w: 0, h: 0 })
  // Style state used for rendering
  const [style, setStyle] = useState<{ s: Smoothed | null; visible: boolean }>({
    s: null,
    visible: false,
  })

  // ── ResizeObserver on parent ─────────────────────────────────
  useEffect(() => {
    const node = containerRef.current?.parentElement
    if (!node) return

    const update = () => {
      const r = node.getBoundingClientRect()
      setBox({ w: r.width, h: r.height })
    }
    update()

    const ro = new ResizeObserver(() => update())
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  // ── Compute & smooth in useLayoutEffect ─────────────────────
  // Doing this in useLayoutEffect (not in render body) avoids React 18
  // StrictMode double-invoke corrupting the previous-frame ref.
  useLayoutEffect(() => {
    if (!pose || !videoW || !videoH || !box.w || !box.h) {
      setStyle({ s: smoothedRef.current, visible: false })
      return
    }

    const { left_shoulder: ls, right_shoulder: rs, left_hip: lh, right_hip: rh } = pose

    const scaleX = box.w / videoW
    const scaleY = box.h / videoH

    // ── MIRROR FIX ──
    // Camera is rendered with CSS scaleX(-1) but MediaPipe returns
    // RAW (un-mirrored) coordinates. Invert X manually.
    const lsX = (videoW - ls.x) * scaleX
    const rsX = (videoW - rs.x) * scaleX
    const lsY = ls.y * scaleY
    const rsY = rs.y * scaleY
    const lhY = lh.y * scaleY
    const rhY = rh.y * scaleY

    // ── Geometry ──
    const shoulderSpan = Math.abs(rsX - lsX)
    const w = shoulderSpan * WIDTH_SCALE

    const torsoH = Math.abs((lhY + rhY) / 2 - (lsY + rsY) / 2)
    const h = torsoH * HEIGHT_SCALE

    const cx = (lsX + rsX) / 2
    const x = cx - w / 2

    // ── SHOULDER SEAM FIX ──
    // y = shoulderMidY - h * SHOULDER_SEAM_RATIO  (NOT 0.12)
    const y = (lsY + rsY) / 2 - h * SHOULDER_SEAM_RATIO

    // Rotation from shoulder slope (radians → degrees)
    const rot = (Math.atan2(rsY - lsY, rsX - lsX) * 180) / Math.PI

    // ── Smoothing (EMA) ──
    const target: Smoothed = { x, y, w, h, rot }
    const prev = smoothedRef.current
    const next: Smoothed = prev
      ? {
          x: prev.x + (target.x - prev.x) * SMOOTH,
          y: prev.y + (target.y - prev.y) * SMOOTH,
          w: prev.w + (target.w - prev.w) * SMOOTH,
          h: prev.h + (target.h - prev.h) * SMOOTH,
          rot: prev.rot + (target.rot - prev.rot) * SMOOTH,
        }
      : target
    smoothedRef.current = next

    setStyle({ s: next, visible: w > 20 && h > 20 })
  }, [pose, videoW, videoH, box.w, box.h])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden"
    >
      {style.visible && style.s && (
        <img
          src={garmentUrl}
          alt="garment"
          draggable={false}
          style={{
            position: 'absolute',
            left: style.s.x,
            top: style.s.y,
            width: style.s.w,
            height: style.s.h,
            transform: `rotate(${style.s.rot}deg)`,
            transformOrigin: 'top center',
            mixBlendMode: 'multiply',
            objectFit: 'contain',
            pointerEvents: 'none',
            willChange: 'transform, left, top, width, height',
          }}
        />
      )}
    </div>
  )
}

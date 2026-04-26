import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pose } from '@mediapipe/pose'
import { Camera } from '@mediapipe/camera_utils'
import { useSizeAnalysis, type PoseData } from '../hooks/useSizeAnalysis'
import SizeSelector from '../components/SizeSelector'

const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/'

export default function SizeAnalysis() {
  const nav = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const poseRef = useRef<Pose | null>(null)
  const cameraRef = useRef<Camera | null>(null)

  const [pose, setPose] = useState<PoseData | null>(null)
  const [manual, setManual] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const sizeResult = useSizeAnalysis(pose)
  const active = manual ?? sizeResult?.size ?? null

  // ── MediaPipe setup ────────────────────────────────────────
  const setupPose = useCallback(() => {
    if (!videoRef.current) return

    const mp = new Pose({
      locateFile: (file) => `${MEDIAPIPE_CDN}${file}`,
    })
    mp.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })
    mp.onResults((results: any) => {
      const lm = results.poseLandmarks
      if (!lm) { setPose(null); return }
      setPose({
        left_shoulder:  { x: lm[11].x * (videoRef.current?.videoWidth  ?? 640), y: lm[11].y * (videoRef.current?.videoHeight ?? 480) },
        right_shoulder: { x: lm[12].x * (videoRef.current?.videoWidth  ?? 640), y: lm[12].y * (videoRef.current?.videoHeight ?? 480) },
        left_hip:       { x: lm[23].x * (videoRef.current?.videoWidth  ?? 640), y: lm[23].y * (videoRef.current?.videoHeight ?? 480) },
        right_hip:      { x: lm[24].x * (videoRef.current?.videoWidth  ?? 640), y: lm[24].y * (videoRef.current?.videoHeight ?? 480) },
      })
    })
    poseRef.current = mp

    const cam = new Camera(videoRef.current, {
      onFrame: async () => {
        if (poseRef.current && videoRef.current) {
          await poseRef.current.send({ image: videoRef.current })
        }
      },
      width: 640,
      height: 480,
    })
    cam.start().then(() => setReady(true))
    cameraRef.current = cam
  }, [])

  useEffect(() => {
    setupPose()
    return () => {
      cameraRef.current?.stop()
      poseRef.current?.close()
    }
  }, [setupPose])

  // ── Continue ───────────────────────────────────────────────
  const onContinue = () => {
    if (active) localStorage.setItem('size', active)
    nav('/mode-select')
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row items-center justify-center gap-8 px-6 py-10">
      {/* Back */}
      <button
        onClick={() => nav('/gender')}
        className="fixed top-6 left-6 flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors z-10"
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Back
      </button>

      {/* Camera column */}
      <div className="flex flex-col items-center gap-4">
        <h2 className="text-2xl font-bold font-display">
          Step 2 — <span className="gradient-text">Size Analysis</span>
        </h2>
        <p className="text-sm text-white/50 text-center max-w-xs">
          Stand back so your full torso is visible. AI will measure your shoulder width.
        </p>

        <div className="relative rounded-2xl overflow-hidden w-[340px] h-[255px] glass">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl">
              <span className="text-white/60 text-sm animate-pulse-soft">Starting camera…</span>
            </div>
          )}
          {ready && !pose && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass-dark rounded-full px-4 py-1.5 text-xs text-white/70 animate-pulse-soft whitespace-nowrap">
              🕵️ Looking for your body…
            </div>
          )}
          {pose && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass-dark rounded-full px-4 py-1.5 text-xs text-emerald-300 whitespace-nowrap">
              ✓ Pose detected
            </div>
          )}
        </div>
      </div>

      {/* Right column */}
      <div className="w-full max-w-xs space-y-5">
        {sizeResult ? (
          <SizeSelector
            ai={sizeResult}
            manual={manual}
            onManual={setManual}
            active={active}
          />
        ) : (
          <div className="glass rounded-2xl p-6 flex flex-col items-center gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin-slow" />
            <p className="text-sm text-white/60 text-center">
              {ready ? 'Waiting for pose detection…' : 'Initialising camera…'}
            </p>
          </div>
        )}

        <div className="glass-dark rounded-2xl p-4">
          <p className="text-xs text-white/50 leading-relaxed">
            Size is estimated using your torso height (~50 cm) as a ruler.
            You can always override manually.
          </p>
        </div>

        <button
          className="btn-primary w-full"
          onClick={onContinue}
        >
          Continue
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

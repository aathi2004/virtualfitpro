import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { Pose } from '@mediapipe/pose'
import { Camera } from '@mediapipe/camera_utils'
import OutfitOverlay from '../components/OutfitOverlay'
import SizeSelector from '../components/SizeSelector'
import { useSizeAnalysis, type PoseData } from '../hooks/useSizeAnalysis'

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/'

const CATEGORIES = ['all', 'shirt', 'jacket', 'hoodie', 'suit', 'dress', 'top']

interface Garment {
  _id: string
  name: string
  category: string
  gender: string
  image: string
  color: string
}

// ── White-canvas pre-process ──────────────────────────────────
// IDM-VTON needs garment on solid white bg (not transparent PNG).
// Transparent pixels render as white cloth if not flattened first.
async function flattenGarmentToJpeg(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'                     // WHITE BACKGROUND — removes alpha
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.95))
    }
    img.onerror = () => reject(new Error('Failed to load garment image'))
    img.src = imageUrl
  })
}

export default function VirtualTryOn() {
  const nav = useNavigate()

  // ── Refs ───────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const poseRef = useRef<Pose | null>(null)
  const cameraRef = useRef<Camera | null>(null)

  // ── State ──────────────────────────────────────────────────
  const [cameraReady, setCameraReady] = useState(false)
  const [videoSize, setVideoSize] = useState({ w: 640, h: 480 })
  const [pose, setPose] = useState<PoseData | null>(null)

  const [garments, setGarments] = useState<Garment[]>([])
  const [category, setCategory] = useState('all')
  const [selected, setSelected] = useState<Garment | null>(null)

  const [manual, setManual] = useState<string | null>(null)
  const sizeResult = useSizeAnalysis(pose)
  const activeSize = manual ?? sizeResult?.size ?? localStorage.getItem('size') ?? null

  // Capture / countdown
  const [countdown, setCountdown] = useState<number | null>(null)
  const [capturing, setCapturing] = useState(false)

  // Colab URL modal
  const [showColabSetup, setShowColabSetup] = useState(false)
  const [colabInput, setColabInput] = useState(localStorage.getItem('colabUrl') ?? '')

  // AI result modal
  const [aiModal, setAiModal] = useState<{
    open: boolean
    loading: boolean
    capturedImg: string | null
    aiImg: string | null
    error: string | null
  }>({ open: false, loading: false, capturedImg: null, aiImg: null, error: null })

  // ── Fetch garments ─────────────────────────────────────────
  useEffect(() => {
    const gender = localStorage.getItem('gender') ?? ''
    fetch(`${BACKEND}/api/garments?gender=${gender}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setGarments(data)
      })
      .catch(() => {})
  }, [])

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
      const vw = videoRef.current?.videoWidth ?? 640
      const vh = videoRef.current?.videoHeight ?? 480
      setVideoSize({ w: vw, h: vh })
      if (!lm) { setPose(null); return }
      setPose({
        left_shoulder:  { x: lm[11].x * vw, y: lm[11].y * vh },
        right_shoulder: { x: lm[12].x * vw, y: lm[12].y * vh },
        left_hip:       { x: lm[23].x * vw, y: lm[23].y * vh },
        right_hip:      { x: lm[24].x * vw, y: lm[24].y * vh },
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
    cam.start().then(() => setCameraReady(true))
    cameraRef.current = cam
  }, [])

  useEffect(() => {
    setupPose()
    return () => {
      cameraRef.current?.stop()
      poseRef.current?.close()
    }
  }, [setupPose])

  // ── Capture flow ───────────────────────────────────────────
  const startCapture = () => {
    if (capturing) return
    setCapturing(true)
    let count = 3
    setCountdown(count)

    const timer = setInterval(() => {
      count -= 1
      if (count <= 0) {
        clearInterval(timer)
        setCountdown(null)
        doCapture()
      } else {
        setCountdown(count)
      }
    }, 1000)
  }

  const doCapture = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) { setCapturing(false); return }

    // Draw mirrored frame (mirror matches what user sees)
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.save()
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0)
    ctx.restore()

    const capturedImg = canvas.toDataURL('image/jpeg', 0.92)

    setAiModal({ open: true, loading: true, capturedImg, aiImg: null, error: null })
    setCapturing(false)

    if (!selected) {
      setAiModal((p) => ({ ...p, loading: false, error: 'Please select a garment first.' }))
      return
    }

    try {
      // CRITICAL: flatten transparent PNG to white JPEG before sending
      const garmentB64 = await flattenGarmentToJpeg(`${BACKEND}/uploads/${selected.image}`)

      const res = await fetch(`${BACKEND}/api/tryon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_image: capturedImg,
          garment_image: garmentB64,
          size: activeSize ?? 'M',
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? `Server returned ${res.status}`)
      }

      setAiModal((p) => ({
        ...p,
        loading: false,
        aiImg: `data:image/jpeg;base64,${data.image}`,
      }))
    } catch (err: any) {
      setAiModal((p) => ({
        ...p,
        loading: false,
        error: err.message ?? 'Unknown error',
      }))
    }
  }

  // ── Colab setup save ──────────────────────────────────────
  const saveColabUrl = () => {
    const url = colabInput.trim().replace(/\/$/, '')
    localStorage.setItem('colabUrl', url)
    setShowColabSetup(false)
  }

  // ── Filtered garments ─────────────────────────────────────
  const filtered = category === 'all' ? garments : garments.filter((g) => g.category === category)

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden">
      {/* ── Left: camera panel ──────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-5">
        {/* Top bar */}
        <div className="w-full max-w-lg flex items-center justify-between">
          <button
            onClick={() => nav('/mode-select')}
            className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Back
          </button>

          <div className="flex items-center gap-2">
            {activeSize && (
              <span className="badge bg-violet-500/20 border-violet-400/30 text-violet-200">
                Size {activeSize}
              </span>
            )}
          </div>
        </div>

        {/* Camera */}
        <div className="relative rounded-2xl overflow-hidden w-full max-w-lg aspect-video glass">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          {/* Garment overlay — sits on top of video, same absolute bounds */}
          {selected && (
            <OutfitOverlay
              garmentUrl={`${BACKEND}/uploads/${selected.image}`}
              pose={pose}
              videoW={videoSize.w}
              videoH={videoSize.h}
            />
          )}
          {/* Countdown overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="text-8xl font-bold text-white drop-shadow-lg">{countdown}</span>
            </div>
          )}
          {/* Camera not ready */}
          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-2xl">
              <span className="text-white/60 animate-pulse-soft">Starting camera…</span>
            </div>
          )}
          {/* Pose status dot */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${pose ? 'bg-emerald-400' : 'bg-white/30'} shadow-[0_0_6px_rgba(52,211,153,0.8)]`} />
            <span className="text-xs text-white/60">{pose ? 'Pose detected' : 'No pose'}</span>
          </div>
        </div>

        {/* Capture button */}
        <button
          className="btn-primary px-10 py-4 text-base"
          disabled={!cameraReady || capturing}
          onClick={startCapture}
        >
          {capturing
            ? `Capturing in ${countdown ?? '…'}`
            : '📸 Capture & Generate AI Try-On'}
        </button>

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* ── Right: garment panel ─────────────────────────────── */}
      <div className="w-full lg:w-80 xl:w-96 glass-dark border-l border-white/6 flex flex-col overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-white/8">
          <h3 className="font-semibold text-white/90 mb-3">Wardrobe</h3>
          {/* Category filter */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={[
                  'px-3 py-1 rounded-full text-xs font-medium capitalize transition-all',
                  category === c
                    ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white'
                    : 'bg-white/8 text-white/60 hover:bg-white/12',
                ].join(' ')}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Garment grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 gap-3">
              <div className="text-4xl">🧺</div>
              <p className="text-sm text-white/50">
                No garments yet.<br />
                Add some via the{' '}
                <button onClick={() => nav('/admin')} className="underline text-violet-300">
                  Admin panel
                </button>
                .
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((g) => (
                <button
                  key={g._id}
                  onClick={() => setSelected(selected?._id === g._id ? null : g)}
                  className={[
                    'relative rounded-xl overflow-hidden aspect-square transition-all border-2',
                    selected?._id === g._id
                      ? 'border-violet-400 shadow-lg shadow-violet-500/30'
                      : 'border-transparent hover:border-white/20',
                  ].join(' ')}
                >
                  <img
                    src={`${BACKEND}/uploads/${g.image}`}
                    alt={g.name}
                    className="w-full h-full object-cover bg-white/5"
                  />
                  <div className="absolute bottom-0 inset-x-0 glass-dark text-[10px] px-2 py-1.5 text-white/80 truncate">
                    {g.name}
                  </div>
                  {selected?._id === g._id && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                      <svg width="10" height="10" fill="none" viewBox="0 0 24 24">
                        <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Size selector at bottom */}
        <div className="p-4 border-t border-white/8">
          <SizeSelector
            ai={sizeResult}
            manual={manual}
            onManual={setManual}
            active={activeSize}
          />
        </div>
      </div>

      {/* ── Colab Setup Modal ───────────────────────────────── */}
      {showColabSetup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-6">
          <div className="glass rounded-2xl p-7 w-full max-w-md animate-fade-in">
            <h3 className="text-lg font-bold mb-2">Setup Colab URL</h3>
            <p className="text-sm text-white/55 mb-5 leading-relaxed">
              Run <code className="bg-white/10 rounded px-1 text-violet-300 text-xs">VirtualFitPro_Colab.ipynb</code> in
              Google Colab with a T4 GPU, then paste the ngrok URL here.
            </p>
            <input
              type="url"
              placeholder="https://xxxx.ngrok.app"
              value={colabInput}
              onChange={(e) => setColabInput(e.target.value)}
              className="w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/10 focus:border-violet-400 transition-colors mb-4"
            />
            <div className="flex gap-3">
              <button className="btn-primary flex-1" onClick={saveColabUrl}>
                Save & Close
              </button>
              <button className="btn-ghost flex-1" onClick={() => setShowColabSetup(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Result Modal ─────────────────────────────────── */}
      {aiModal.open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-6 overflow-y-auto">
          <div className="glass rounded-2xl p-7 w-full max-w-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold font-display">AI Try-On Result</h3>
              <button
                onClick={() => setAiModal((p) => ({ ...p, open: false }))}
                className="btn-ghost text-xs px-3 py-1.5"
              >
                ✕ Close
              </button>
            </div>

            {aiModal.loading && (
              <div className="flex flex-col items-center gap-5 py-12">
                <div className="w-10 h-10 rounded-full border-2 border-violet-400 border-t-transparent animate-spin-slow" />
                <p className="text-white/60 text-sm">
                  IDM-VTON is generating your try-on… (30–90 seconds)
                </p>
              </div>
            )}

            {aiModal.error && (
              <div className="text-center py-10">
                <div className="text-4xl mb-4">⚠️</div>
                <p className="text-rose-300 text-sm mb-6">{aiModal.error}</p>
                <button
                  className="btn-ghost text-sm px-6 py-2.5"
                  onClick={() => setAiModal((p) => ({ ...p, open: false }))}
                >
                  Try Again
                </button>
              </div>
            )}

            {!aiModal.loading && !aiModal.error && aiModal.capturedImg && aiModal.aiImg && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="text-xs text-white/50 mb-2 font-medium uppercase tracking-widest">
                      Your Photo
                    </div>
                    <img
                      src={aiModal.capturedImg}
                      alt="Captured"
                      className="w-full rounded-xl object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-white/50 mb-2 font-medium uppercase tracking-widest">
                      You Wearing It ✨
                    </div>
                    <img
                      src={aiModal.aiImg}
                      alt="AI Try-On"
                      className="w-full rounded-xl object-cover"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <a
                    href={aiModal.aiImg}
                    download="virtualfit-tryon.jpg"
                    className="btn-primary flex-1 text-center"
                  >
                    ⬇ Download Result
                  </a>
                  <button
                    className="btn-ghost flex-1"
                    onClick={() => setAiModal((p) => ({ ...p, open: false }))}
                  >
                    Try Another
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

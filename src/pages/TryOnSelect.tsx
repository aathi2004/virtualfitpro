import { useNavigate } from 'react-router-dom'

export default function TryOnSelect() {
  const nav = useNavigate()
  const size = localStorage.getItem('size') ?? '—'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <button
        onClick={() => nav('/size')}
        className="fixed top-6 left-6 flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors z-10"
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Back
      </button>

      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <h2 className="text-3xl font-bold font-display">Choose Mode</h2>
          <span className="badge">
            Size&nbsp;<span className="gradient-text font-bold">{size}</span>
          </span>
        </div>

        {/* Only one mode per spec */}
        <button
          onClick={() => nav('/try-on')}
          className="w-full glass rounded-2xl p-7 text-left hover:bg-white/10 hover:border-white/20 transition-all group border-2 border-violet-500/40"
        >
          <div className="text-4xl mb-4">🎥</div>
          <div className="font-bold text-xl text-white mb-2 group-hover:gradient-text transition-all">
            Live + AI Try-On
          </div>
          <p className="text-sm text-white/55 leading-relaxed">
            See the garment overlaid on your body live via webcam, then hit
            Capture to generate a photo-realistic AI result using IDM-VTON.
          </p>
          <div className="mt-5 flex items-center gap-2 text-violet-300 text-sm font-medium">
            Get started
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </button>

        <p className="text-center text-xs text-white/35 mt-6">
          More modes coming soon: photo upload, outfit builder, style comparison.
        </p>
      </div>
    </div>
  )
}

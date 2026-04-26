import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const nav = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center">
      {/* Logo / tagline */}
      <div className="animate-fade-in">
        <div className="inline-flex items-center gap-2.5 badge mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span className="text-white/70">Powered by IDM-VTON · MediaPipe</span>
        </div>

        <h1 className="text-6xl sm:text-7xl font-bold tracking-tight mb-4 font-display">
          Virtual<span className="gradient-text">Fit</span> Pro
        </h1>

        <p className="text-lg text-white/60 max-w-md mx-auto leading-relaxed mb-10">
          Stand in front of your camera and try on any garment in seconds —
          then let AI render a photo-realistic result.
        </p>

        <button
          className="btn-primary text-lg px-10 py-4"
          onClick={() => nav('/gender')}
        >
          Start Try-On
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          className="btn-ghost text-sm px-6 py-2.5 mt-3"
          onClick={() => nav('/admin')}
        >
          Admin Panel
        </button>
      </div>

      {/* Feature cards */}
      <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full animate-fade-in"
        style={{ animationDelay: '0.15s' }}>
        {[
          {
            icon: '📷',
            title: 'Live Pose Detection',
            desc: 'MediaPipe tracks 33 body keypoints in real-time',
          },
          {
            icon: '👕',
            title: 'Real-time Overlay',
            desc: 'Garments scale & rotate to match your body precisely',
          },
          {
            icon: '✨',
            title: 'AI Try-On',
            desc: 'IDM-VTON generates a photo-realistic result from one click',
          },
        ].map((f) => (
          <div key={f.title} className="glass rounded-2xl p-5 text-left">
            <div className="text-2xl mb-3">{f.icon}</div>
            <div className="text-sm font-semibold text-white/90 mb-1">{f.title}</div>
            <div className="text-xs text-white/50 leading-relaxed">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

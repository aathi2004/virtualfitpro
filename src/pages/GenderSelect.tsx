import { useNavigate } from 'react-router-dom'

const OPTIONS = [
  { value: 'men', label: 'Men', emoji: '👔', desc: 'Shirts, jackets, hoodies & suits' },
  { value: 'women', label: 'Women', emoji: '👗', desc: 'Tops, dresses & outerwear' },
] as const

export default function GenderSelect() {
  const nav = useNavigate()

  const pick = (gender: 'men' | 'women') => {
    localStorage.setItem('gender', gender)
    nav('/size')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Back */}
        <button
          onClick={() => nav('/')}
          className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-10 transition-colors"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Back
        </button>

        <h2 className="text-3xl font-bold mb-2 font-display">Who's trying on?</h2>
        <p className="text-white/50 mb-8 text-sm">
          We'll load the right wardrobe for you.
        </p>

        <div className="space-y-4">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => pick(opt.value)}
              className="w-full glass rounded-2xl p-6 flex items-center gap-5 text-left
                         hover:bg-white/10 hover:border-white/20 transition-all group"
            >
              <span className="text-4xl">{opt.emoji}</span>
              <div>
                <div className="text-lg font-semibold text-white group-hover:gradient-text transition-all">
                  {opt.label}
                </div>
                <div className="text-xs text-white/50 mt-0.5">{opt.desc}</div>
              </div>
              <svg
                className="ml-auto text-white/30 group-hover:text-white/70 transition-colors"
                width="20" height="20" fill="none" viewBox="0 0 24 24"
              >
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

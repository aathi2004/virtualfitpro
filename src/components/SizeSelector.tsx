import type { SizeResult } from '../hooks/useSizeAnalysis'

const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const

interface Props {
  ai: SizeResult | null
  manual: string | null
  onManual: (size: string | null) => void
  // Active size (manual if set, else AI)
  active: string | null
}

function confidenceColor(c: number) {
  if (c >= 0.75) return 'bg-emerald-400'
  if (c >= 0.45) return 'bg-amber-400'
  return 'bg-rose-400'
}

export default function SizeSelector({ ai, manual, onManual, active }: Props) {
  const aiSize = ai?.size ?? null
  const conf = ai?.confidence ?? 0
  const usingManual = manual !== null && manual !== aiSize

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      {/* Header / AI Recommendation */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/50 font-semibold">
            Recommended size
          </div>
          <div className="mt-1.5 flex items-center gap-2.5">
            <span className="text-3xl font-bold gradient-text leading-none">
              {aiSize ?? '—'}
            </span>
            {ai && (
              <span className="badge bg-violet-500/15 border-violet-400/30 text-violet-200">
                <span aria-hidden>✦</span> AI
              </span>
            )}
          </div>
        </div>
        {ai && (
          <div className="text-right">
            <div className="text-xs text-white/55">
              {ai.shoulderCm}cm · {ai.chestCm}cm
            </div>
            <div className="text-[10px] text-white/40 mt-0.5">
              shoulder · chest
            </div>
          </div>
        )}
      </div>

      {/* Confidence bar */}
      {ai && (
        <div>
          <div className="flex items-center justify-between text-[11px] text-white/55 mb-1.5">
            <span>Confidence</span>
            <span>{Math.round(conf * 100)}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full ${confidenceColor(conf)} transition-all duration-300`}
              style={{ width: `${Math.max(4, Math.round(conf * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3 pt-1">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium">
          or manual
        </span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Manual size grid */}
      <div className="grid grid-cols-6 gap-1.5">
        {ALL_SIZES.map((s) => {
          const isActive = active === s
          const isAI = aiSize === s
          const isManualPick = manual === s
          return (
            <button
              key={s}
              onClick={() => onManual(s)}
              className={[
                'relative h-11 rounded-lg text-sm font-semibold transition-all',
                isActive
                  ? 'bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-lg shadow-pink-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/8',
              ].join(' ')}
            >
              {s}
              {isAI && !isManualPick && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.8)]" />
              )}
            </button>
          )
        })}
      </div>

      {/* Status line */}
      <div className="flex items-center justify-between text-xs text-white/55 pt-1">
        {usingManual ? (
          <>
            <span>
              Manual: <span className="text-white font-semibold">{manual}</span>
            </span>
            <button
              onClick={() => onManual(null)}
              className="text-violet-300 hover:text-violet-200 underline-offset-2 hover:underline"
            >
              reset to AI
            </button>
          </>
        ) : (
          <span>
            AI recommended:{' '}
            <span className="text-white font-semibold">{aiSize ?? '—'}</span>
          </span>
        )}
      </div>
    </div>
  )
}

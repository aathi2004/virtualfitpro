import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const CATEGORIES = ['shirt', 'jacket', 'hoodie', 'suit', 'dress', 'top']

const EXAMPLE_PROMPTS = [
  'Elegant black blazer with silver buttons and satin lapels',
  'Casual white linen shirt with rolled sleeves',
  'Royal blue velvet dinner jacket with gold embroidery',
  'Red silk evening dress with flowing skirt',
  'Modern grey hoodie with geometric patterns',
  'Classic navy suit jacket with peak lapels',
]

export default function GarmentDesigner() {
  const nav = useNavigate()
  
  const [prompt, setPrompt] = useState('')
  const [category, setCategory] = useState('shirt')
  const [gender, setGender] = useState(localStorage.getItem('gender') || 'men')
  
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    image: string
    description: string
  } | null>(null)
  
  const [saving, setSaving] = useState(false)
  const [savedName, setSavedName] = useState('')

  const generate = async () => {
    if (!prompt.trim()) return

    setLoading(true)
    setResult(null)

    try {
      const res = await fetch(`${BACKEND}/api/design-garment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, category, gender }),
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Generation failed')
      }

      setResult({
        image: `data:image/png;base64,${data.image}`,
        description: data.description || prompt,
      })

      // Auto-suggest name from prompt
      const words = prompt.split(' ').slice(0, 3).join(' ')
      setSavedName(words.charAt(0).toUpperCase() + words.slice(1))

    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const saveToWardrobe = async () => {
    if (!result || !savedName.trim()) return

    setSaving(true)

    try {
      // Convert base64 to blob
      const base64Data = result.image.split(',')[1]
      const blob = await fetch(`data:image/png;base64,${base64Data}`).then(r => r.blob())

      // Create FormData
      const formData = new FormData()
      formData.append('name', savedName)
      formData.append('category', category)
      formData.append('gender', gender)
      formData.append('color', 'AI Generated')
      formData.append('image', blob, `${savedName.replace(/\s+/g, '_')}.png`)

      const res = await fetch(`${BACKEND}/api/garments`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Save failed')

      alert('✅ Saved to wardrobe!')
      setResult(null)
      setPrompt('')
      setSavedName('')

    } catch (err: any) {
      alert(`Error saving: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="glass-dark border-b border-white/8 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => nav('/admin/dashboard')}
              className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Back to Admin
            </button>
            <div className="w-px h-5 bg-white/10" />
            <h1 className="text-xl font-bold font-display">
              <span className="gradient-text">AI Garment</span> Designer
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="badge bg-violet-500/15 border-violet-400/30 text-violet-200">
              <span aria-hidden>✨</span> Powered by Gemini + SDXL
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Input Panel */}
            <div className="space-y-6">
              <div className="glass rounded-2xl p-6 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-white/90 mb-3">
                    Describe Your Garment
                  </h3>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="E.g., Elegant black evening dress with lace sleeves and flowing skirt"
                    className="w-full h-32 glass rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/10 focus:border-violet-400 transition-colors resize-none"
                    disabled={loading}
                  />
                </div>

                {/* Category & Gender */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-white/50 mb-2 block uppercase tracking-wider">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full glass rounded-xl px-4 py-2.5 text-sm text-white outline-none border border-white/10 focus:border-violet-400 transition-colors"
                      disabled={loading}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c} className="bg-slate-900">
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-2 block uppercase tracking-wider">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full glass rounded-xl px-4 py-2.5 text-sm text-white outline-none border border-white/10 focus:border-violet-400 transition-colors"
                      disabled={loading}
                    >
                      <option value="men" className="bg-slate-900">Men</option>
                      <option value="women" className="bg-slate-900">Women</option>
                      <option value="unisex" className="bg-slate-900">Unisex</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={generate}
                  disabled={loading || !prompt.trim()}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      ✨ Generate Design
                    </>
                  )}
                </button>
              </div>

              {/* Example Prompts */}
              <div className="glass-dark rounded-2xl p-5">
                <h4 className="text-xs font-semibold text-white/60 mb-3 uppercase tracking-widest">
                  Example Prompts
                </h4>
                <div className="space-y-2">
                  {EXAMPLE_PROMPTS.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(ex)}
                      className="w-full text-left text-xs text-white/60 hover:text-white/90 hover:bg-white/5 px-3 py-2 rounded-lg transition-all"
                      disabled={loading}
                    >
                      "{ex}"
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Result Panel */}
            <div className="space-y-6">
              <div className="glass rounded-2xl p-6 min-h-96">
                {!result && !loading && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="text-6xl mb-4">🎨</div>
                    <h3 className="text-lg font-semibold text-white/80 mb-2">
                      AI Garment Studio
                    </h3>
                    <p className="text-sm text-white/50 max-w-xs leading-relaxed">
                      Describe your dream garment and let AI bring it to life.
                      Then try it on instantly!
                    </p>
                  </div>
                )}

                {loading && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12 gap-5">
                    <div className="w-12 h-12 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                    <div>
                      <p className="text-sm text-white/70 mb-1">
                        Gemini is designing your garment...
                      </p>
                      <p className="text-xs text-white/40">
                        This may take 20-40 seconds
                      </p>
                    </div>
                  </div>
                )}

                {result && (
                  <div className="space-y-4">
                    <div className="aspect-[3/4] rounded-xl overflow-hidden bg-white/5 border border-white/10">
                      <img
                        src={result.image}
                        alt="Generated garment"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Save Section */}
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={savedName}
                        onChange={(e) => setSavedName(e.target.value)}
                        placeholder="Name this design..."
                        className="w-full glass rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none border border-white/10 focus:border-violet-400 transition-colors"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={saveToWardrobe}
                          disabled={saving || !savedName.trim()}
                          className="btn-primary"
                        >
                          {saving ? 'Saving...' : '💾 Save to Wardrobe'}
                        </button>
                        <button
                          onClick={() => setResult(null)}
                          className="btn-ghost"
                        >
                          ✕ Discard
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="glass-dark rounded-2xl p-5">
                <h4 className="text-xs font-semibold text-white/60 mb-2 uppercase tracking-widest">
                  How It Works
                </h4>
                <ol className="text-xs text-white/50 space-y-1.5 leading-relaxed">
                  <li>1. Describe your ideal garment in detail</li>
                  <li>2. AI generates a professional product photo</li>
                  <li>3. Save to wardrobe and try it on instantly</li>
                  <li>4. Generate unlimited variations</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

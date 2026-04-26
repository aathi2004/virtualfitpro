import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const CATEGORIES = ['shirt', 'jacket', 'hoodie', 'suit', 'dress', 'top']
const GENDERS = ['men', 'women', 'unisex']

interface Garment {
  _id: string
  name: string
  category: string
  gender: string
  image: string
  color: string
  createdAt: string
}

export default function AdminDashboard() {
  const nav = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [garments, setGarments] = useState<Garment[]>([])
  const [loading, setLoading] = useState(true)

  // Upload form state
  const [form, setForm] = useState({
    name: '',
    category: 'shirt',
    gender: 'men',
    color: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const [filterGender, setFilterGender] = useState('all')

  // Auth guard
  useEffect(() => {
    if (!localStorage.getItem('adminToken')) nav('/admin')
  }, [nav])

  const fetchGarments = () => {
    setLoading(true)
    fetch(`${BACKEND}/api/garments`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setGarments(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchGarments() }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  const uploadGarment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { setUploadErr('Please select an image'); return }
    setUploadErr('')
    setUploading(true)

    const fd = new FormData()
    fd.append('name', form.name)
    fd.append('category', form.category)
    fd.append('gender', form.gender)
    fd.append('color', form.color)
    fd.append('image', file)

    try {
      const res = await fetch(`${BACKEND}/api/garments`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      // Reset form
      setForm({ name: '', category: 'shirt', gender: 'men', color: '' })
      setFile(null)
      setPreview(null)
      if (fileRef.current) fileRef.current.value = ''
      fetchGarments()
    } catch (err: any) {
      setUploadErr(err.message)
    } finally {
      setUploading(false)
    }
  }

  const deleteGarment = async (id: string) => {
    if (!confirm('Delete this garment?')) return
    await fetch(`${BACKEND}/api/garments/${id}`, { method: 'DELETE' })
    setGarments((prev) => prev.filter((g) => g._id !== id))
  }

  const logout = () => {
    localStorage.removeItem('adminToken')
    nav('/admin')
  }

  const filtered =
    filterGender === 'all' ? garments : garments.filter((g) => g.gender === filterGender)

  return (
    <div className="min-h-screen px-6 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display">
            Wardrobe <span className="gradient-text">Admin</span>
          </h1>
          <p className="text-sm text-white/50 mt-0.5">
            {garments.length} garment{garments.length !== 1 ? 's' : ''} in the catalogue
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            className="btn-primary text-sm px-4 py-2"
            onClick={() => nav('/admin/designer')}
          >
            ✨ AI Designer
          </button>
          <button className="btn-ghost text-sm px-4 py-2" onClick={() => nav('/')}>
            ← App
          </button>
          <button className="btn-ghost text-sm px-4 py-2 text-rose-300 border-rose-400/30" onClick={logout}>
            Log Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Upload form ─────────────────────────────────────── */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold text-white/90 mb-5">Upload Garment</h2>
          <form onSubmit={uploadGarment} className="space-y-4">
            {/* Preview */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full h-36 rounded-xl glass flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-colors border-2 border-dashed border-white/15 hover:border-white/30"
            >
              {preview ? (
                <img src={preview} alt="preview" className="h-full object-contain p-2 rounded-xl" />
              ) : (
                <>
                  <span className="text-3xl">📂</span>
                  <span className="text-xs text-white/50">Click to select PNG / JPG</span>
                  <span className="text-[10px] text-white/35">Best: PNG with transparent background</span>
                </>
              )}
            </button>
            <input type="file" accept="image/*" ref={fileRef} className="hidden" onChange={handleFile} />

            <input
              type="text"
              placeholder="Garment name (e.g. Oxford Blue Shirt)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full glass rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none border border-white/10 focus:border-violet-400 transition-colors"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full glass rounded-xl px-3 py-2.5 text-sm text-white outline-none border border-white/10 bg-transparent focus:border-violet-400"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-[#0a0a0f]">{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full glass rounded-xl px-3 py-2.5 text-sm text-white outline-none border border-white/10 bg-transparent focus:border-violet-400"
                >
                  {GENDERS.map((g) => (
                    <option key={g} value={g} className="bg-[#0a0a0f]">{g}</option>
                  ))}
                </select>
              </div>
            </div>

            <input
              type="text"
              placeholder="Color (optional, e.g. Navy Blue)"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="w-full glass rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none border border-white/10 focus:border-violet-400 transition-colors"
            />

            {uploadErr && <p className="text-rose-300 text-sm">{uploadErr}</p>}

            <button type="submit" disabled={uploading} className="btn-primary w-full">
              {uploading ? 'Uploading…' : '⬆ Upload Garment'}
            </button>
          </form>
        </div>

        {/* ── Garment list ─────────────────────────────────────── */}
        <div className="glass rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-white/90">Catalogue</h2>
            <div className="flex gap-1.5">
              {['all', ...GENDERS].map((g) => (
                <button
                  key={g}
                  onClick={() => setFilterGender(g)}
                  className={[
                    'px-2.5 py-1 rounded-full text-xs capitalize transition-all',
                    filterGender === g
                      ? 'bg-violet-500/70 text-white'
                      : 'bg-white/8 text-white/55 hover:bg-white/12',
                  ].join(' ')}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-7 h-7 rounded-full border-2 border-violet-400 border-t-transparent animate-spin-slow" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-10">
              <div className="text-4xl">🧺</div>
              <p className="text-sm text-white/50">No garments yet.<br />Upload one to get started.</p>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {filtered.map((g) => (
                <div
                  key={g._id}
                  className="flex items-center gap-3 glass-dark rounded-xl px-3 py-2.5 group"
                >
                  <img
                    src={`${BACKEND}/uploads/${g.image}`}
                    alt={g.name}
                    className="w-12 h-12 rounded-lg object-cover bg-white/10 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white/90 truncate">{g.name}</div>
                    <div className="text-xs text-white/45 capitalize">
                      {g.category} · {g.gender} {g.color ? `· ${g.color}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteGarment(g._id)}
                    className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 transition-all text-xs px-2 py-1 rounded-lg hover:bg-rose-400/10"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

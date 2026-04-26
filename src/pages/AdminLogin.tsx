import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function AdminLogin() {
  const nav = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Already logged in?
  useEffect(() => {
    if (localStorage.getItem('adminToken')) nav('/admin/dashboard')
  }, [nav])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Wrong password')
      localStorage.setItem('adminToken', data.token)
      nav('/admin/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-in">
        <button
          onClick={() => nav('/')}
          className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-10 transition-colors"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Back to Home
        </button>

        <div className="glass rounded-2xl p-8">
          <div className="text-3xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold mb-1 font-display">Admin Panel</h2>
          <p className="text-sm text-white/50 mb-7">Upload and manage garments.</p>

          <form onSubmit={submit} className="space-y-4">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              className="w-full glass rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/10 focus:border-violet-400 transition-colors"
            />
            {error && (
              <p className="text-rose-300 text-sm">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Checking…' : 'Log In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

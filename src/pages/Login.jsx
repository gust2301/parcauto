import { useState } from 'react'
import { supabase } from '../lib/supabase'
import logo from '../assets/sn-cfs-flotte-logo-only.png'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#1A3C6B] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg p-2">
            <img src={logo} alt="SN-CFS Flotte" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A3C6B]">SN-CFS Flotte</h1>
          <p className="text-gray-500 text-sm mt-1">Gestion de flotte automobile</p>
        </div>

        {/* Card */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Connexion</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Adresse email</label>
              <input
                type="email"
                className="form-input"
                placeholder="gestionnaire@sncfs.sn"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label">Mot de passe</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          SNCFS — Système de gestion de flotte interne
        </p>
      </div>
    </div>
  )
}

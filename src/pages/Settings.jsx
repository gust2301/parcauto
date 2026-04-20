import { useState, useEffect } from 'react'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { MdPersonAdd, MdPerson, MdEmail } from 'react-icons/md'

export default function Settings() {
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  const hasAdmin = !!supabaseAdmin

  useEffect(() => {
    if (hasAdmin) loadUsers()
    else setLoadingUsers(false)
  }, [])

  async function loadUsers() {
    setLoadingUsers(true)
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    if (!error) setUsers(data?.users || [])
    setLoadingUsers(false)
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' })
      return
    }
    if (form.password.length < 6) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères.' })
      return
    }
    if (!hasAdmin) {
      setMessage({ type: 'error', text: 'Clé admin (VITE_SUPABASE_SERVICE_KEY) non configurée.' })
      return
    }
    setSaving(true)
    setMessage(null)
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: form.email,
      password: form.password,
      email_confirm: true,
    })
    setSaving(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: `Utilisateur ${form.email} créé avec succès.` })
      setForm({ email: '', password: '', confirmPassword: '' })
      loadUsers()
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800">Paramètres</h1>

      {/* Créer un utilisateur */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-[#1A3C6B]/10 flex items-center justify-center">
            <MdPersonAdd size={20} className="text-[#1A3C6B]" />
          </div>
          <h2 className="text-base font-semibold text-gray-800">Créer un utilisateur</h2>
        </div>

        {!hasAdmin && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
            La variable <code className="font-mono">VITE_SUPABASE_SERVICE_KEY</code> n'est pas configurée.
            Ajoutez-la dans vos fichiers <code>.env</code> pour activer la création d'utilisateurs.
          </div>
        )}

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="form-label">Adresse e-mail *</label>
            <input
              type="email"
              className="form-input"
              placeholder="utilisateur@sncfs.sn"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              required
              disabled={!hasAdmin}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Mot de passe *</label>
              <input
                type="password"
                className="form-input"
                placeholder="Min. 6 caractères"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                required
                disabled={!hasAdmin}
              />
            </div>
            <div>
              <label className="form-label">Confirmer le mot de passe *</label>
              <input
                type="password"
                className="form-input"
                placeholder="Répéter le mot de passe"
                value={form.confirmPassword}
                onChange={e => set('confirmPassword', e.target.value)}
                required
                disabled={!hasAdmin}
              />
            </div>
          </div>
          <div className="pt-2">
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={saving || !hasAdmin}
            >
              <MdPersonAdd size={18} />
              {saving ? 'Création...' : 'Créer l\'utilisateur'}
            </button>
          </div>
        </form>
      </div>

      {/* Liste des utilisateurs */}
      {hasAdmin && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-[#1A3C6B]/10 flex items-center justify-center">
              <MdPerson size={20} className="text-[#1A3C6B]" />
            </div>
            <h2 className="text-base font-semibold text-gray-800">Utilisateurs existants</h2>
          </div>

          {loadingUsers ? (
            <p className="text-gray-400 text-sm italic">Chargement...</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-3 py-3">
                  <div className="w-8 h-8 rounded-full bg-[#1A3C6B]/10 flex items-center justify-center">
                    <MdEmail size={16} className="text-[#1A3C6B]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{u.email}</p>
                    <p className="text-xs text-gray-400">
                      Créé le {new Date(u.created_at).toLocaleDateString('fr-FR')}
                      {u.last_sign_in_at && ` · Dernière connexion : ${new Date(u.last_sign_in_at).toLocaleDateString('fr-FR')}`}
                    </p>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <p className="text-gray-400 text-sm italic py-3">Aucun utilisateur</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

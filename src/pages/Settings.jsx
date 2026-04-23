import { useEffect, useState } from 'react'
import { MdClose, MdDelete, MdEdit, MdEmail, MdKey, MdPerson, MdPersonAdd } from 'react-icons/md'
import Pagination from '../components/Pagination'
import { useRole } from '../lib/roleContext'
import { getTotalPages, paginate } from '../lib/pagination'
import { ROLES, ROLE_LABELS, getUserRole } from '../lib/roles'
import { supabase } from '../lib/supabase'
import { supabaseAdmin } from '../lib/supabaseAdmin'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <MdClose size={22} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export default function Settings() {
  const { user, isAdmin } = useRole()
  const hasAdmin = !!supabaseAdmin

  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', role: ROLES.USER })
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [savingRole, setSavingRole] = useState(null)
  const [savingPassword, setSavingPassword] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState(null)
  const [message, setMessage] = useState(null)
  const [users, setUsers] = useState([])
  const [chauffeurs, setChauffeurs] = useState([])
  const [chauffeurLinkEnabled, setChauffeurLinkEnabled] = useState(true)
  const [userPage, setUserPage] = useState(1)
  const [usersPerPage, setUsersPerPage] = useState(10)
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({ role: ROLES.USER, chauffeurId: '' })

  useEffect(() => {
    loadChauffeurs()
    if (isAdmin && hasAdmin) loadUsers()
  }, [isAdmin, hasAdmin])

  async function loadUsers() {
    if (!supabaseAdmin) return
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }
    setUsers(data?.users || [])
  }

  async function loadChauffeurs() {
    const client = supabaseAdmin || supabase
    const { data, error } = await client
      .from('chauffeurs')
      .select('id, nom_complet, matricule, user_id')
      .order('nom_complet')

    if (error) {
      if (error.message?.includes('user_id')) {
        const fallback = await client
          .from('chauffeurs')
          .select('id, nom_complet, matricule')
          .order('nom_complet')
        setChauffeurLinkEnabled(false)
        setChauffeurs((fallback.data || []).map(c => ({ ...c, user_id: null })))
        return
      }
      setMessage({ type: 'error', text: `Chargement chauffeurs impossible : ${error.message}` })
      return
    }

    setChauffeurLinkEnabled(true)
    setChauffeurs(data || [])
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function setPassword(field, value) {
    setPasswordForm(f => ({ ...f, [field]: value }))
  }

  function getLinkedChauffeur(userId) {
    return chauffeurs.find(c => c.user_id === userId) || null
  }

  function openUserEdit(targetUser) {
    setEditingUser(targetUser)
    setEditForm({
      role: getUserRole(targetUser),
      chauffeurId: getLinkedChauffeur(targetUser.id)?.id || '',
    })
    setMessage(null)
  }

  async function handlePasswordChange(e) {
    e.preventDefault()

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' })
      return
    }
    if (passwordForm.password.length < 6) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caracteres.' })
      return
    }

    setSavingPassword(true)
    setMessage(null)
    const { error } = await supabase.auth.updateUser({ password: passwordForm.password })
    setSavingPassword(false)

    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }

    setPasswordForm({ password: '', confirmPassword: '' })
    setMessage({ type: 'success', text: 'Votre mot de passe a ete mis a jour.' })
  }

  async function handleCreate(e) {
    e.preventDefault()

    if (form.password !== form.confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' })
      return
    }
    if (form.password.length < 6) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caracteres.' })
      return
    }
    if (!hasAdmin) {
      setMessage({ type: 'error', text: 'Cle admin (VITE_SUPABASE_SERVICE_KEY) non configuree.' })
      return
    }

    setSaving(true)
    setMessage(null)
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: form.email,
      password: form.password,
      email_confirm: true,
      app_metadata: { role: form.role },
      user_metadata: { role: form.role },
    })
    setSaving(false)

    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }

    setMessage({ type: 'success', text: `Utilisateur ${form.email} cree avec succes.` })
    setForm({ email: '', password: '', confirmPassword: '', role: ROLES.USER })
    await loadUsers()
  }

  async function handleUserEditSave(e) {
    e.preventDefault()
    if (!editingUser || !hasAdmin) return

    if (editForm.role === ROLES.CHAUFFEUR && !editForm.chauffeurId) {
      setMessage({ type: 'error', text: 'Choisissez le chauffeur lie a cet utilisateur.' })
      return
    }
    if (editForm.role === ROLES.CHAUFFEUR && !chauffeurLinkEnabled) {
      setMessage({ type: 'error', text: 'La migration chauffeurs.user_id doit etre appliquee avant de lier un utilisateur a un chauffeur.' })
      return
    }

    setSavingRole(editingUser.id)
    setMessage(null)

    const { error: roleError } = await supabaseAdmin.auth.admin.updateUserById(editingUser.id, {
      app_metadata: { ...(editingUser.app_metadata || {}), role: editForm.role },
      user_metadata: { ...(editingUser.user_metadata || {}), role: editForm.role },
    })
    if (roleError) {
      setSavingRole(null)
      setMessage({ type: 'error', text: roleError.message })
      return
    }

    const client = supabaseAdmin || supabase
    const current = getLinkedChauffeur(editingUser.id)
    if (current && current.id !== editForm.chauffeurId) {
      const { error } = await client.from('chauffeurs').update({ user_id: null }).eq('id', current.id)
      if (error) {
        setSavingRole(null)
        setMessage({ type: 'error', text: error.message })
        return
      }
    }

    if (editForm.role === ROLES.CHAUFFEUR && editForm.chauffeurId) {
      const { error } = await client.from('chauffeurs').update({ user_id: editingUser.id }).eq('id', editForm.chauffeurId)
      if (error) {
        setSavingRole(null)
        setMessage({ type: 'error', text: error.message })
        return
      }
    }

    setSavingRole(null)
    setEditingUser(null)
    setMessage({ type: 'success', text: `Utilisateur ${editingUser.email} mis a jour.` })
    await Promise.all([loadUsers(), loadChauffeurs()])
  }

  async function handleDeleteUser(targetUser) {
    if (!hasAdmin || !isAdmin || !targetUser) return

    setDeletingUserId(targetUser.id)
    setMessage(null)

    const linkedChauffeur = getLinkedChauffeur(targetUser.id)
    if (linkedChauffeur) {
      const client = supabaseAdmin || supabase
      const { error: unlinkError } = await client
        .from('chauffeurs')
        .update({ user_id: null })
        .eq('id', linkedChauffeur.id)

      if (unlinkError) {
        setDeletingUserId(null)
        setMessage({ type: 'error', text: unlinkError.message })
        return
      }
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUser.id)
    setDeletingUserId(null)

    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }

    if (editingUser?.id === targetUser.id) setEditingUser(null)
    setMessage({ type: 'success', text: `Utilisateur ${targetUser.email} supprime.` })
    await Promise.all([loadUsers(), loadChauffeurs()])
  }

  const currentUserPage = Math.min(userPage, getTotalPages(users.length, usersPerPage))
  const paginatedUsers = paginate(users, currentUserPage, usersPerPage)

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Parametres</h1>

      {message && (
        <div className={`rounded-lg border p-3 text-sm ${
          message.type === 'error'
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-green-200 bg-green-50 text-green-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="card">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1A3C6B]/10">
            <MdKey size={20} className="text-[#1A3C6B]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-800">Mon mot de passe</h2>
            <p className="text-xs text-gray-400">{user?.email || 'Compte connecte'}</p>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">Nouveau mot de passe *</label>
              <input
                type="password"
                className="form-input"
                placeholder="Min. 6 caracteres"
                value={passwordForm.password}
                onChange={e => setPassword('password', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label">Confirmer le mot de passe *</label>
              <input
                type="password"
                className="form-input"
                placeholder="Repeter le mot de passe"
                value={passwordForm.confirmPassword}
                onChange={e => setPassword('confirmPassword', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={savingPassword}>
              <MdKey size={18} />
              {savingPassword ? 'Mise a jour...' : 'Mettre a jour le mot de passe'}
            </button>
          </div>
        </form>
      </div>

      {isAdmin && (
        <>
          <div className="card">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1A3C6B]/10">
                <MdPersonAdd size={20} className="text-[#1A3C6B]" />
              </div>
              <h2 className="text-base font-semibold text-gray-800">Creer un utilisateur</h2>
            </div>

            {!hasAdmin && (
              <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                La variable <code className="font-mono">VITE_SUPABASE_SERVICE_KEY</code> n'est pas configuree.
                Ajoutez-la dans vos fichiers <code>.env</code> pour activer la creation d'utilisateurs.
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="form-label">Mot de passe *</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Min. 6 caracteres"
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
                    placeholder="Repeter le mot de passe"
                    value={form.confirmPassword}
                    onChange={e => set('confirmPassword', e.target.value)}
                    required
                    disabled={!hasAdmin}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Role *</label>
                <select
                  className="form-input"
                  value={form.role}
                  onChange={e => set('role', e.target.value)}
                  disabled={!hasAdmin}
                >
                  <option value={ROLES.USER}>Utilisateur</option>
                  <option value={ROLES.CHAUFFEUR}>Chauffeur</option>
                  <option value={ROLES.ADMIN}>Admin</option>
                </select>
              </div>

              <div className="pt-2">
                <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving || !hasAdmin}>
                  <MdPersonAdd size={18} />
                  {saving ? 'Creation...' : "Creer l'utilisateur"}
                </button>
              </div>
            </form>
          </div>

          {hasAdmin && (
            <div className="card">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1A3C6B]/10">
                    <MdPerson size={20} className="text-[#1A3C6B]" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-800">Utilisateurs existants</h2>
                    <p className="text-xs text-gray-400">{users.length} utilisateur{users.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-gray-100">
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        {['Utilisateur', 'Role', 'Chauffeur lie', 'Connexion', ''].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedUsers.map(u => {
                        const role = getUserRole(u)
                        const linkedChauffeur = getLinkedChauffeur(u.id)
                        return (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-start gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1A3C6B]/10">
                                  <MdEmail size={16} className="text-[#1A3C6B]" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-800">{u.email}</p>
                                  <p className="text-xs text-gray-400">Cree le {new Date(u.created_at).toLocaleDateString('fr-FR')}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                                {ROLE_LABELS[role] || 'Lecture seule'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {linkedChauffeur ? `${linkedChauffeur.nom_complet}${linkedChauffeur.matricule ? ` - ${linkedChauffeur.matricule}` : ''}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('fr-FR') : 'Jamais'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-[#1A3C6B] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  onClick={() => openUserEdit(u)}
                                  disabled={savingRole === u.id || deletingUserId === u.id}
                                >
                                  <MdEdit size={15} />
                                  Modifier
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  onClick={() => handleDeleteUser(u)}
                                  disabled={u.id === user?.id || savingRole === u.id || deletingUserId === u.id}
                                  title={u.id === user?.id ? 'Suppression de votre propre compte desactivee' : 'Supprimer cet utilisateur'}
                                >
                                  <MdDelete size={15} />
                                  {deletingUserId === u.id ? 'Suppression...' : 'Supprimer'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm italic text-gray-400">Aucun utilisateur</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  total={users.length}
                  page={currentUserPage}
                  perPage={usersPerPage}
                  onPage={setUserPage}
                  onPerPage={size => {
                    setUsersPerPage(size)
                    setUserPage(1)
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}

      {editingUser && (
        <Modal title="Modifier l'utilisateur" onClose={() => setEditingUser(null)}>
          <form onSubmit={handleUserEditSave} className="space-y-4">
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-sm font-medium text-gray-800">{editingUser.email}</p>
              <p className="text-xs text-gray-400">Cree le {new Date(editingUser.created_at).toLocaleDateString('fr-FR')}</p>
            </div>

            <div>
              <label className="form-label">Role</label>
              <select
                className="form-input"
                value={editForm.role}
                onChange={e => setEditForm(f => ({
                  ...f,
                  role: e.target.value,
                  chauffeurId: e.target.value === ROLES.CHAUFFEUR ? f.chauffeurId : '',
                }))}
                disabled={savingRole === editingUser.id}
              >
                <option value={ROLES.USER}>Lecture seule</option>
                <option value={ROLES.CHAUFFEUR}>Chauffeur</option>
                <option value={ROLES.ADMIN}>Admin</option>
              </select>
            </div>

            {editForm.role === ROLES.CHAUFFEUR && (
              <div>
                <label className="form-label">Chauffeur lie</label>
                <select
                  className="form-input"
                  value={editForm.chauffeurId}
                  onChange={e => setEditForm(f => ({ ...f, chauffeurId: e.target.value }))}
                  disabled={savingRole === editingUser.id || !chauffeurLinkEnabled}
                  required
                >
                  <option value="">{chauffeurLinkEnabled ? 'Choisir un chauffeur...' : 'Migration user_id requise'}</option>
                  {chauffeurs.map(c => (
                    <option key={c.id} value={c.id} disabled={!!c.user_id && c.user_id !== editingUser.id}>
                      {c.nom_complet}{c.matricule ? ` - ${c.matricule}` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">Un chauffeur deja lie a un autre utilisateur ne peut pas etre selectionne.</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setEditingUser(null)} disabled={savingRole === editingUser.id}>
                Annuler
              </button>
              <button type="submit" className="btn-primary" disabled={savingRole === editingUser.id}>
                {savingRole === editingUser.id ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

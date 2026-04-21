import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MdArrowBack, MdSave } from 'react-icons/md'
import { AdminRequiredMessage } from '../components/RoleContext'
import { useRole } from '../lib/roleContext'

export default function EntretienForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useRole()
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type_intervention: '',
    pieces: '',
    cout: '',
    garage: '',
    kilometrage: '',
    commentaire: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isAdmin) return
    setSaving(true)
    setError('')
    const { error } = await supabase.from('entretiens').insert({
      vehicule_id: id,
      date: form.date,
      type_intervention: form.type_intervention || null,
      pieces: form.pieces || null,
      cout: form.cout ? parseInt(form.cout) : 0,
      garage: form.garage || null,
      kilometrage: form.kilometrage ? parseInt(form.kilometrage) : null,
      commentaire: form.commentaire || null,
    })
    if (error) {
      setError("Erreur lors de l'enregistrement.")
      setSaving(false)
      return
    }
    navigate(`/vehicules/${id}?tab=entretiens`)
  }

  return isAdmin ? (
    <div className="max-w-2xl mx-auto space-y-6">
      <button className="text-sm text-[#1A3C6B] hover:underline flex items-center gap-1" onClick={() => navigate(`/vehicules/${id}?tab=entretiens`)}>
        <MdArrowBack size={16} /> Retour au véhicule
      </button>

      <div className="card">
        <h1 className="text-xl font-bold text-gray-800 mb-6">Nouvel entretien</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">Date *</label>
              <input type="date" className="form-input" value={form.date} onChange={e => set('date', e.target.value)} required />
            </div>
            <div>
              <label className="form-label">Kilométrage au compteur</label>
              <input type="number" className="form-input" placeholder="ex: 45000" value={form.kilometrage} onChange={e => set('kilometrage', e.target.value)} min="0" />
            </div>
          </div>

          <div>
            <label className="form-label">Type d'intervention *</label>
            <input type="text" className="form-input" placeholder="ex: Vidange, changement pneus..." value={form.type_intervention} onChange={e => set('type_intervention', e.target.value)} required />
          </div>

          <div>
            <label className="form-label">Pièces remplacées</label>
            <input type="text" className="form-input" placeholder="ex: Filtre à huile, courroie..." value={form.pieces} onChange={e => set('pieces', e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">Coût (FCFA)</label>
              <input type="number" className="form-input" placeholder="0" value={form.cout} onChange={e => set('cout', e.target.value)} min="0" />
            </div>
            <div>
              <label className="form-label">Garage / Prestataire</label>
              <input type="text" className="form-input" placeholder="Nom du garage" value={form.garage} onChange={e => set('garage', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="form-label">Commentaire</label>
            <textarea className="form-input h-24 resize-none" placeholder="Observations, remarques..." value={form.commentaire} onChange={e => set('commentaire', e.target.value)} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => navigate(`/vehicules/${id}?tab=entretiens`)}>
              Annuler
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer l\'entretien'}
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : <AdminRequiredMessage />
}

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MdArrowBack } from 'react-icons/md'

export default function ContraventionForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    lieu: '',
    conducteur: '',
    nature: '',
    montant: '',
    statut: 'en_attente',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { error } = await supabase.from('contraventions').insert({
      vehicule_id: id,
      date: form.date,
      lieu: form.lieu || null,
      conducteur: form.conducteur || null,
      nature: form.nature || null,
      montant: form.montant ? parseInt(form.montant) : 0,
      statut: form.statut,
    })
    if (error) {
      setError("Erreur lors de l'enregistrement.")
      setSaving(false)
      return
    }
    navigate(`/vehicules/${id}?tab=contraventions`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button className="text-sm text-[#1A3C6B] hover:underline flex items-center gap-1" onClick={() => navigate(`/vehicules/${id}?tab=contraventions`)}>
        <MdArrowBack size={16} /> Retour au véhicule
      </button>

      <div className="card">
        <h1 className="text-xl font-bold text-gray-800 mb-6">Nouvelle contravention</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Date *</label>
              <input type="date" className="form-input" value={form.date} onChange={e => set('date', e.target.value)} required />
            </div>
            <div>
              <label className="form-label">Lieu</label>
              <input type="text" className="form-input" placeholder="ex: Avenue Faidherbe, Dakar" value={form.lieu} onChange={e => set('lieu', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Conducteur</label>
              <input type="text" className="form-input" placeholder="Nom du conducteur" value={form.conducteur} onChange={e => set('conducteur', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Nature de l'infraction</label>
              <input type="text" className="form-input" placeholder="ex: Excès de vitesse" value={form.nature} onChange={e => set('nature', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Montant (FCFA)</label>
              <input type="number" className="form-input" placeholder="0" value={form.montant} onChange={e => set('montant', e.target.value)} min="0" />
            </div>
            <div>
              <label className="form-label">Statut</label>
              <select className="form-input" value={form.statut} onChange={e => set('statut', e.target.value)}>
                <option value="en_attente">En attente</option>
                <option value="payee">Payée</option>
                <option value="contestee">Contestée</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => navigate(`/vehicules/${id}?tab=contraventions`)}>
              Annuler
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer la contravention'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

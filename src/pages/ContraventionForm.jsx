import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MdArrowBack } from 'react-icons/md'

export default function ContraventionForm({ editData, onSaved, onCancel }) {
  const params = useParams()
  const navigateHook = useNavigate()
  const id = editData ? editData.vehicule_id : params.id
  const isModal = !!editData

  const [chauffeurs, setChauffeurs] = useState([])
  const [chauffeurSearch, setChauffeurSearch] = useState('')
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    lieu: '',
    conducteur: '',
    chauffeur_id: '',
    nature: '',
    montant: '',
    statut: 'en_attente',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('chauffeurs').select('*').order('nom_complet')
      .then(({ data }) => setChauffeurs(data || []))
    if (editData) {
      setForm({
        date: editData.date || new Date().toISOString().split('T')[0],
        lieu: editData.lieu || '',
        conducteur: editData.conducteur || '',
        chauffeur_id: editData.chauffeur_id || '',
        nature: editData.nature || '',
        montant: editData.montant?.toString() || '',
        statut: editData.statut || 'en_attente',
      })
    }
  }, [])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function selectChauffeur(c) {
    setForm(f => ({ ...f, chauffeur_id: c.id, conducteur: c.nom_complet }))
    setChauffeurSearch('')
  }

  const chauffeursFiltres = chauffeurs.filter(c =>
    c.nom_complet.toLowerCase().includes(chauffeurSearch.toLowerCase()) ||
    (c.matricule || '').toLowerCase().includes(chauffeurSearch.toLowerCase())
  )

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = {
      vehicule_id: id,
      date: form.date,
      lieu: form.lieu || null,
      conducteur: form.conducteur || null,
      chauffeur_id: form.chauffeur_id || null,
      nature: form.nature || null,
      montant: form.montant ? parseInt(form.montant) : 0,
      statut: form.statut,
    }

    let err
    if (editData) {
      const res = await supabase.from('contraventions').update(payload).eq('id', editData.id)
      err = res.error
    } else {
      const res = await supabase.from('contraventions').insert(payload)
      err = res.error
    }

    if (err) {
      setError("Erreur lors de l'enregistrement.")
      setSaving(false)
      return
    }

    if (isModal) {
      onSaved()
    } else {
      navigateHook(`/vehicules/${id}?tab=contraventions`)
    }
  }

  const selectedChauffeur = chauffeurs.find(c => c.id === form.chauffeur_id)

  const content = (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

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

      {/* Sélection chauffeur */}
      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <label className="form-label">Chauffeur (liste)</label>
          {selectedChauffeur ? (
            <div className="flex items-center gap-2">
              <div className="form-input flex-1 bg-blue-50 text-[#1A3C6B] text-sm font-medium">
                {selectedChauffeur.nom_complet}
                {selectedChauffeur.matricule && <span className="text-gray-400 ml-1">· {selectedChauffeur.matricule}</span>}
              </div>
              <button type="button" className="text-gray-400 hover:text-red-500 text-lg leading-none"
                onClick={() => setForm(f => ({ ...f, chauffeur_id: '', conducteur: '' }))}>×</button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                className="form-input"
                placeholder="Rechercher un chauffeur..."
                value={chauffeurSearch}
                onChange={e => setChauffeurSearch(e.target.value)}
              />
              {chauffeurSearch && chauffeursFiltres.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                  {chauffeursFiltres.map(c => (
                    <button key={c.id} type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors"
                      onClick={() => selectChauffeur(c)}>
                      <span className="font-medium">{c.nom_complet}</span>
                      {c.matricule && <span className="text-gray-400 ml-2">{c.matricule}</span>}
                      {c.grade && <span className="text-gray-400 ml-1">· {c.grade}</span>}
                    </button>
                  ))}
                </div>
              )}
              {chauffeurSearch && chauffeursFiltres.length === 0 && (
                <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 px-3 py-2 text-sm text-gray-400">
                  Aucun chauffeur trouvé
                </div>
              )}
            </div>
          )}
        </div>
        <div>
          <label className="form-label">Nom conducteur (libre)</label>
          <input type="text" className="form-input" placeholder="Nom si non dans la liste" value={form.conducteur} onChange={e => set('conducteur', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Nature de l'infraction</label>
          <input type="text" className="form-input" placeholder="ex: Excès de vitesse" value={form.nature} onChange={e => set('nature', e.target.value)} />
        </div>
        <div>
          <label className="form-label">Montant (FCFA)</label>
          <input type="number" className="form-input" placeholder="0" value={form.montant} onChange={e => set('montant', e.target.value)} min="0" />
        </div>
      </div>

      <div>
        <label className="form-label">Statut</label>
        <select className="form-input" value={form.statut} onChange={e => set('statut', e.target.value)}>
          <option value="en_attente">En attente</option>
          <option value="payee">Payée</option>
          <option value="contestee">Contestée</option>
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" className="btn-secondary flex-1"
          onClick={() => isModal ? onCancel() : navigateHook(`/vehicules/${id}?tab=contraventions`)}>
          Annuler
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={saving}>
          {saving ? 'Enregistrement...' : (editData ? 'Modifier' : 'Enregistrer la contravention')}
        </button>
      </div>
    </form>
  )

  if (isModal) return content

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button className="text-sm text-[#1A3C6B] hover:underline flex items-center gap-1" onClick={() => navigateHook(`/vehicules/${id}?tab=contraventions`)}>
        <MdArrowBack size={16} /> Retour au véhicule
      </button>
      <div className="card">
        <h1 className="text-xl font-bold text-gray-800 mb-6">Nouvelle contravention</h1>
        {content}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MdArrowBack, MdClose } from 'react-icons/md'
import { AdminRequiredMessage } from '../components/RoleContext'
import { useRole } from '../lib/roleContext'

function getInitialForm(editData) {
  return {
    date: editData?.date || new Date().toISOString().split('T')[0],
    lieu: editData?.lieu || '',
    chauffeur_id: editData?.chauffeur_id || '',
    nature: editData?.nature || '',
    montant: editData?.montant?.toString() || '',
    statut: editData?.statut || 'en_attente',
  }
}

export default function ContraventionForm({ editData, onSaved, onCancel }) {
  const params = useParams()
  const navigateHook = useNavigate()
  const id = editData ? editData.vehicule_id : params.id
  const isModal = !!editData
  const { isAdmin } = useRole()

  const [chauffeurs, setChauffeurs] = useState([])
  const [chauffeurSearch, setChauffeurSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [form, setForm] = useState(() => getInitialForm(editData))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('chauffeurs').select('*').order('nom_complet')
      .then(({ data }) => setChauffeurs(data || []))
  }, [])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function selectChauffeur(c) {
    setForm(f => ({ ...f, chauffeur_id: c.id }))
    setChauffeurSearch('')
    setShowDropdown(false)
  }

  function clearChauffeur() {
    setForm(f => ({ ...f, chauffeur_id: '' }))
    setChauffeurSearch('')
  }

  const selectedChauffeur = chauffeurs.find(c => c.id === form.chauffeur_id)

  const chauffeursFiltres = chauffeurs.filter(c =>
    c.nom_complet.toLowerCase().includes(chauffeurSearch.toLowerCase()) ||
    (c.matricule || '').toLowerCase().includes(chauffeurSearch.toLowerCase())
  )

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isAdmin) return
    setSaving(true)
    setError('')
    const payload = {
      vehicule_id: id,
      date: form.date,
      lieu: form.lieu || null,
      conducteur: selectedChauffeur?.nom_complet || null,
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

  const content = (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="form-label">Date *</label>
          <input type="date" className="form-input" value={form.date} onChange={e => set('date', e.target.value)} required />
        </div>
        <div>
          <label className="form-label">Lieu</label>
          <input type="text" className="form-input" placeholder="ex: Avenue Faidherbe, Dakar" value={form.lieu} onChange={e => set('lieu', e.target.value)} />
        </div>
      </div>

      {/* Sélection chauffeur — liste déroulante avec recherche */}
      <div>
        <label className="form-label">Conducteur *</label>
        {selectedChauffeur ? (
          <div className="flex items-center gap-2">
            <div className="form-input flex-1 bg-blue-50 border-[#1A3C6B] text-[#1A3C6B] font-medium flex items-center justify-between">
              <span>
                {selectedChauffeur.nom_complet}
                {selectedChauffeur.matricule && <span className="text-gray-400 font-normal ml-2">· {selectedChauffeur.matricule}</span>}
                {selectedChauffeur.grade && <span className="text-gray-400 font-normal ml-1">· {selectedChauffeur.grade}</span>}
              </span>
            </div>
            <button type="button" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" onClick={clearChauffeur}>
              <MdClose size={18} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              className="form-input"
              placeholder="Rechercher un chauffeur par nom ou matricule..."
              value={chauffeurSearch}
              onChange={e => { setChauffeurSearch(e.target.value); setShowDropdown(true) }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              autoComplete="off"
            />
            {showDropdown && (
              <div className="absolute z-20 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto">
                {chauffeursFiltres.length > 0 ? (
                  chauffeursFiltres.map(c => (
                    <button key={c.id} type="button"
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                      onMouseDown={() => selectChauffeur(c)}>
                      <span className="font-medium text-gray-800">{c.nom_complet}</span>
                      <span className="text-gray-400 ml-2 text-xs">
                        {c.matricule && `${c.matricule}`}{c.grade && ` · ${c.grade}`}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-400 italic">
                    {chauffeurs.length === 0
                      ? 'Aucun chauffeur enregistré — ajoutez-en dans la section Chauffeurs'
                      : 'Aucun résultat pour cette recherche'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {chauffeurs.length === 0 && (
          <p className="text-xs text-orange-500 mt-1">Aucun chauffeur enregistré. Créez-en d'abord dans la section <strong>Chauffeurs</strong>.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
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

  if (!isAdmin) return isModal ? <AdminRequiredMessage /> : (
    <div className="max-w-2xl mx-auto space-y-6">
      <button className="text-sm text-[#1A3C6B] hover:underline flex items-center gap-1"
        onClick={() => navigateHook(`/vehicules/${id}?tab=contraventions`)}>
        <MdArrowBack size={16} /> Retour au véhicule
      </button>
      <AdminRequiredMessage />
    </div>
  )

  if (isModal) return content

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button className="text-sm text-[#1A3C6B] hover:underline flex items-center gap-1"
        onClick={() => navigateHook(`/vehicules/${id}?tab=contraventions`)}>
        <MdArrowBack size={16} /> Retour au véhicule
      </button>
      <div className="card">
        <h1 className="text-xl font-bold text-gray-800 mb-6">Nouvelle contravention</h1>
        {content}
      </div>
    </div>
  )
}

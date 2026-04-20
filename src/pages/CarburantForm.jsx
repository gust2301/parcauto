import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MdArrowBack } from 'react-icons/md'
import { AdminRequiredMessage } from '../components/RoleContext'
import { useRole } from '../lib/roleContext'

const TYPES_CARBURANT = ['Gasoil', 'Essence', 'Autre']

function getInitialForm(editData) {
  return {
    date: editData?.date || new Date().toISOString().split('T')[0],
    litres: editData?.litres?.toString() || '',
    kilometrage: editData?.kilometrage?.toString() || '',
    type_carburant: editData?.type_carburant || 'Gasoil',
    montant: editData?.montant?.toString() || '',
    station: editData?.station || '',
    numero_carte: editData?.reference_bon || '',
  }
}

export default function CarburantForm({ editData, onSaved, onCancel }) {
  const params = useParams()
  const navigateHook = useNavigate()
  const id = editData ? editData.vehicule_id : params.id
  const isModal = !!editData
  const { isAdmin } = useRole()

  const [kmVehicule, setKmVehicule] = useState(0)
  const [form, setForm] = useState(() => getInitialForm(editData))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('vehicules').select('kilometrage').eq('id', id).single()
      .then(({ data }) => { if (data) setKmVehicule(data.kilometrage || 0) })
  }, [id])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isAdmin) return
    if (!editData && form.kilometrage && parseInt(form.kilometrage) < kmVehicule) {
      setError(`Le kilométrage saisi (${parseInt(form.kilometrage).toLocaleString('fr-FR')} km) est inférieur au kilométrage actuel du véhicule (${kmVehicule.toLocaleString('fr-FR')} km).`)
      return
    }
    setSaving(true)
    setError('')
    const km = form.kilometrage ? parseInt(form.kilometrage) : null
    const payload = {
      vehicule_id: id,
      date: form.date,
      litres: parseFloat(form.litres),
      kilometrage: km,
      type_carburant: form.type_carburant,
      montant: form.montant ? parseInt(form.montant) : 0,
      station: form.station || null,
      reference_bon: form.numero_carte || null,
    }

    let err
    if (editData) {
      const res = await supabase.from('carburant').update(payload).eq('id', editData.id)
      err = res.error
    } else {
      const res = await supabase.from('carburant').insert(payload)
      err = res.error
    }

    if (err) {
      setError("Erreur lors de l'enregistrement.")
      setSaving(false)
      return
    }
    if (!editData && km && km > kmVehicule) {
      await supabase.from('vehicules').update({ kilometrage: km }).eq('id', id)
    }

    if (isModal) {
      onSaved()
    } else {
      navigateHook(`/vehicules/${id}?tab=carburant`)
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
          <label className="form-label">Type de carburant *</label>
          <select className="form-input" value={form.type_carburant} onChange={e => set('type_carburant', e.target.value)}>
            {TYPES_CARBURANT.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="form-label">Quantité (litres) *</label>
          <input type="number" className="form-input" placeholder="ex: 45.5" value={form.litres} onChange={e => set('litres', e.target.value)} step="0.1" min="0.1" required />
        </div>
        <div>
          <label className="form-label">Montant total (FCFA)</label>
          <input type="number" className="form-input" placeholder="Coût du plein" value={form.montant} onChange={e => set('montant', e.target.value)} min="0" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="form-label">Kilométrage au compteur</label>
          <input type="number" className="form-input" placeholder="ex: 45200" value={form.kilometrage}
            onChange={e => set('kilometrage', e.target.value)} min={editData ? 0 : kmVehicule} />
          {!editData && kmVehicule > 0 && <p className="text-xs text-gray-400 mt-1">Min : {kmVehicule.toLocaleString('fr-FR')} km</p>}
        </div>
        <div>
          <label className="form-label">Station</label>
          <input type="text" className="form-input" placeholder="Nom de la station" value={form.station} onChange={e => set('station', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="form-label">N° de carte carburant</label>
        <input type="text" className="form-input" placeholder="Numéro de carte carburant" value={form.numero_carte} onChange={e => set('numero_carte', e.target.value)} />
      </div>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <button type="button" className="btn-secondary flex-1"
          onClick={() => isModal ? onCancel() : navigateHook(`/vehicules/${id}?tab=carburant`)}>
          Annuler
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={saving}>
          {saving ? 'Enregistrement...' : (editData ? 'Modifier' : 'Enregistrer le plein')}
        </button>
      </div>
    </form>
  )

  if (!isAdmin) return isModal ? <AdminRequiredMessage /> : (
    <div className="max-w-2xl mx-auto space-y-6">
      <button className="text-sm text-[#1A3C6B] hover:underline flex items-center gap-1" onClick={() => navigateHook(`/vehicules/${id}?tab=carburant`)}>
        <MdArrowBack size={16} /> Retour au vÃ©hicule
      </button>
      <AdminRequiredMessage />
    </div>
  )

  if (isModal) return content

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button className="text-sm text-[#1A3C6B] hover:underline flex items-center gap-1" onClick={() => navigateHook(`/vehicules/${id}?tab=carburant`)}>
        <MdArrowBack size={16} /> Retour au véhicule
      </button>
      <div className="card">
        <h1 className="text-xl font-bold text-gray-800 mb-6">Nouveau ravitaillement</h1>
        {content}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MdArrowBack } from 'react-icons/md'

export default function CarburantForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [kmVehicule, setKmVehicule] = useState(0)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    litres: '',
    kilometrage: '',
    station: '',
    numero_carte: '',
  })
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
    if (form.kilometrage && parseInt(form.kilometrage) < kmVehicule) {
      setError(`Le kilométrage saisi (${parseInt(form.kilometrage).toLocaleString('fr-FR')} km) est inférieur au kilométrage actuel du véhicule (${kmVehicule.toLocaleString('fr-FR')} km).`)
      return
    }
    setSaving(true)
    setError('')
    const km = form.kilometrage ? parseInt(form.kilometrage) : null
    const { error } = await supabase.from('carburant').insert({
      vehicule_id: id,
      date: form.date,
      litres: parseFloat(form.litres),
      kilometrage: km,
      station: form.station || null,
      reference_bon: form.numero_carte || null,
    })
    if (error) {
      setError("Erreur lors de l'enregistrement.")
      setSaving(false)
      return
    }
    // Mettre à jour le kilométrage du véhicule si supérieur à l'actuel
    if (km && km > kmVehicule) {
      await supabase.from('vehicules').update({ kilometrage: km }).eq('id', id)
    }
    navigate(`/vehicules/${id}?tab=carburant`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button className="text-sm text-[#1A3C6B] hover:underline flex items-center gap-1" onClick={() => navigate(`/vehicules/${id}?tab=carburant`)}>
        <MdArrowBack size={16} /> Retour au véhicule
      </button>

      <div className="card">
        <h1 className="text-xl font-bold text-gray-800 mb-6">Nouveau ravitaillement</h1>

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
              <label className="form-label">Kilométrage au compteur</label>
              <input type="number" className="form-input" placeholder="ex: 45200" value={form.kilometrage}
                onChange={e => set('kilometrage', e.target.value)} min={kmVehicule} />
              {kmVehicule > 0 && <p className="text-xs text-gray-400 mt-1">Min : {kmVehicule.toLocaleString('fr-FR')} km</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Quantité (litres) *</label>
              <input type="number" className="form-input" placeholder="ex: 45.5" value={form.litres} onChange={e => set('litres', e.target.value)} step="0.1" min="0.1" required />
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

          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => navigate(`/vehicules/${id}?tab=carburant`)}>
              Annuler
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer le plein'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MdArrowBack, MdClose } from 'react-icons/md'
import { supabase } from '../lib/supabase'
import { WriteAccessMessage } from '../components/RoleContext'
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
    chauffeur_id: editData?.chauffeur_id || '',
    agent_nom: editData?.agent_nom || '',
    objet_mission: editData?.objet_mission || '',
    observation: editData?.observation || '',
  }
}

export default function CarburantForm({ editData, onSaved, onCancel }) {
  const params = useParams()
  const navigateHook = useNavigate()
  const id = editData ? editData.vehicule_id : params.id
  const isModal = !!editData
  const { user, isAdmin, isChauffeur, vehiculeIds, scopeLoading } = useRole()
  const canWrite = isAdmin || (isChauffeur && vehiculeIds.includes(id))

  const [kmVehicule, setKmVehicule] = useState(0)
  const [form, setForm] = useState(() => getInitialForm(editData))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [cartes, setCartes] = useState([])
  const [chauffeurs, setChauffeurs] = useState([])
  const [chauffeurSearch, setChauffeurSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    supabase.from('vehicules').select('kilometrage').eq('id', id).single()
      .then(({ data }) => { if (data) setKmVehicule(data.kilometrage || 0) })
  }, [id])

  useEffect(() => {
    supabase.from('carburant_cartes').select('id, numero, libelle, actif').order('numero', { ascending: true })
      .then(({ data }) => setCartes((data || []).filter(c => c.actif || c.numero === form.numero_carte)))
  }, [form.numero_carte])

  useEffect(() => {
    supabase.from('chauffeurs').select('id, nom_complet, matricule, grade').order('nom_complet')
      .then(({ data }) => setChauffeurs(data || []))
  }, [])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function selectChauffeur(chauffeur) {
    setForm(f => ({
      ...f,
      chauffeur_id: chauffeur.id,
      agent_nom: chauffeur.nom_complet,
    }))
    setChauffeurSearch('')
    setShowDropdown(false)
  }

  function clearChauffeur() {
    setForm(f => ({
      ...f,
      chauffeur_id: '',
      agent_nom: '',
    }))
    setChauffeurSearch('')
  }

  const selectedChauffeur = chauffeurs.find(c => c.id === form.chauffeur_id)
  const chauffeursFiltres = chauffeurs.filter(c =>
    c.nom_complet.toLowerCase().includes(chauffeurSearch.toLowerCase()) ||
    (c.matricule || '').toLowerCase().includes(chauffeurSearch.toLowerCase()),
  )

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canWrite) return
    if (!editData && form.kilometrage && parseInt(form.kilometrage) < kmVehicule) {
      setError(`Le kilometrage saisi (${parseInt(form.kilometrage).toLocaleString('fr-FR')} km) est inferieur au kilometrage actuel du vehicule (${kmVehicule.toLocaleString('fr-FR')} km).`)
      return
    }

    setSaving(true)
    setError('')

    const km = form.kilometrage ? parseInt(form.kilometrage) : null
    const selectedCard = cartes.find(c => c.numero === form.numero_carte)
    const payload = {
      vehicule_id: id,
      date: form.date,
      litres: parseFloat(form.litres),
      kilometrage: km,
      type_carburant: form.type_carburant,
      montant: form.montant ? parseInt(form.montant) : 0,
      station: form.station || null,
      reference_bon: form.numero_carte || null,
      carte_carburant_id: selectedCard?.id || null,
      chauffeur_id: form.chauffeur_id || null,
      agent_nom: selectedChauffeur?.nom_complet || form.agent_nom.trim() || null,
      objet_mission: form.objet_mission.trim() || null,
      observation: form.observation.trim() || null,
      created_by: editData?.created_by || user?.id || null,
      status: editData?.status || 'brouillon',
    }

    let err
    let carburantId = editData?.id || null
    if (editData) {
      const res = await supabase.from('carburant').update(payload).eq('id', editData.id)
      err = res.error
    } else {
      const res = await supabase.from('carburant').insert(payload).select('id').single()
      err = res.error
      carburantId = res.data?.id || null
    }

    if (err) {
      setError("Erreur lors de l'enregistrement.")
      setSaving(false)
      return
    }

    const shouldSyncCardTx = !!editData?.id || !!selectedCard?.id
    if (shouldSyncCardTx && carburantId) {
      const { error: deleteTxError } = await supabase.from('carburant_carte_transactions').delete().eq('carburant_id', carburantId)
      if (deleteTxError) {
        setError("Le plein a ete enregistre, mais la synchronisation de la carte carburant a echoue.")
        setSaving(false)
        return
      }
      if (selectedCard?.id) {
        const { error: insertTxError } = await supabase.from('carburant_carte_transactions').insert({
          carte_id: selectedCard.id,
          vehicule_id: id,
          carburant_id: carburantId,
          date: form.date,
          type: 'consommation',
          montant: form.montant ? parseInt(form.montant) : 0,
        })
        if (insertTxError) {
          setError("Le plein a ete enregistre, mais la synchronisation de la carte carburant a echoue.")
          setSaving(false)
          return
        }
      }
    }

    if (isAdmin && !editData && km && km > kmVehicule) {
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
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
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
          <label className="form-label">Quantite (litres) *</label>
          <input type="number" className="form-input" placeholder="ex: 45.5" value={form.litres} onChange={e => set('litres', e.target.value)} step="0.1" min="0.1" required />
        </div>
        <div>
          <label className="form-label">Montant total (FCFA)</label>
          <input type="number" className="form-input" placeholder="Cout du plein" value={form.montant} onChange={e => set('montant', e.target.value)} min="0" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="form-label">Kilometrage au compteur</label>
          <input type="number" className="form-input" placeholder="ex: 45200" value={form.kilometrage} onChange={e => set('kilometrage', e.target.value)} min={editData ? 0 : kmVehicule} />
          {!editData && kmVehicule > 0 && <p className="mt-1 text-xs text-gray-400">Min : {kmVehicule.toLocaleString('fr-FR')} km</p>}
        </div>
        <div>
          <label className="form-label">Station</label>
          <input type="text" className="form-input" placeholder="Nom de la station" value={form.station} onChange={e => set('station', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="form-label">N° de carte carburant</label>
        <select className="form-input" value={form.numero_carte} onChange={e => set('numero_carte', e.target.value)}>
          <option value="">Selectionner une carte</option>
          {cartes.map(c => <option key={c.id} value={c.numero}>{c.libelle ? `${c.numero} - ${c.libelle}` : c.numero}</option>)}
        </select>
      </div>

      <div>
        <label className="form-label">Nom / Prenoms de l'agent</label>
        {selectedChauffeur ? (
          <div className="flex items-center gap-2">
            <div className="form-input flex-1 items-center justify-between border-[#1A3C6B] bg-blue-50 font-medium text-[#1A3C6B]">
              <span>
                {selectedChauffeur.nom_complet}
                {selectedChauffeur.matricule && <span className="ml-2 font-normal text-gray-400">· {selectedChauffeur.matricule}</span>}
                {selectedChauffeur.grade && <span className="ml-1 font-normal text-gray-400">· {selectedChauffeur.grade}</span>}
              </span>
            </div>
            <button type="button" className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500" onClick={clearChauffeur}>
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
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {chauffeursFiltres.length > 0 ? (
                  chauffeursFiltres.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full border-b border-gray-50 px-4 py-2.5 text-left text-sm transition-colors last:border-0 hover:bg-blue-50"
                      onMouseDown={() => selectChauffeur(c)}
                    >
                      <span className="font-medium text-gray-800">{c.nom_complet}</span>
                      <span className="ml-2 text-xs text-gray-400">
                        {c.matricule && `${c.matricule}`}{c.grade && ` · ${c.grade}`}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm italic text-gray-400">
                    {chauffeurs.length === 0
                      ? 'Aucun chauffeur enregistre — ajoutez-en dans la section Chauffeurs'
                      : 'Aucun resultat pour cette recherche'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {chauffeurs.length === 0 && (
          <p className="mt-1 text-xs text-orange-500">Aucun chauffeur enregistre. Creez-en d'abord dans la section <strong>Chauffeurs</strong>.</p>
        )}
      </div>

      <div>
        <label className="form-label">Objet de la mission</label>
        <input type="text" className="form-input" placeholder="Objet ou destination" value={form.objet_mission} onChange={e => set('objet_mission', e.target.value)} />
      </div>

      <div>
        <label className="form-label">Observations</label>
        <textarea className="form-input" rows={3} placeholder="Informations complementaires" value={form.observation} onChange={e => set('observation', e.target.value)} />
      </div>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <button type="button" className="btn-secondary flex-1" onClick={() => isModal ? onCancel() : navigateHook(`/vehicules/${id}?tab=carburant`)}>
          Annuler
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={saving}>
          {saving ? 'Enregistrement...' : (editData ? 'Modifier' : 'Enregistrer le plein')}
        </button>
      </div>
    </form>
  )

  if (scopeLoading) return <div className="text-sm text-gray-400">Chargement...</div>

  if (!canWrite) {
    return isModal ? <WriteAccessMessage /> : (
      <div className="mx-auto max-w-2xl space-y-6">
        <button className="flex items-center gap-1 text-sm text-[#1A3C6B] hover:underline" onClick={() => navigateHook(`/vehicules/${id}?tab=carburant`)}>
          <MdArrowBack size={16} /> Retour au vehicule
        </button>
        <WriteAccessMessage />
      </div>
    )
  }

  if (isModal) return content

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button className="flex items-center gap-1 text-sm text-[#1A3C6B] hover:underline" onClick={() => navigateHook(`/vehicules/${id}?tab=carburant`)}>
        <MdArrowBack size={16} /> Retour au vehicule
      </button>
      <div className="card">
        <h1 className="mb-6 text-xl font-bold text-gray-800">Nouveau ravitaillement</h1>
        {content}
      </div>
    </div>
  )
}

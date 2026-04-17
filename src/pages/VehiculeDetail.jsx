import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AlerteBadge from '../components/AlerteBadge'
import DataTable from '../components/DataTable'
import { format, parseISO, differenceInDays } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import { MdAdd, MdArrowBack, MdLocalGasStation, MdBuild, MdDescription, MdGavel, MdSpeed } from 'react-icons/md'

function fmtDate(d) {
  if (!d) return '—'
  return format(parseISO(d), 'dd/MM/yyyy')
}

function fmtNum(n) {
  return n != null ? new Intl.NumberFormat('fr-FR').format(n) : '—'
}

const STATUT_CONFIG = {
  actif:   { label: 'Actif',    cls: 'bg-green-100 text-green-800' },
  panne:   { label: 'En panne', cls: 'bg-orange-100 text-orange-800' },
  reforme: { label: 'Réformé',  cls: 'bg-red-100 text-red-800' },
}

const TABS = ['Entretiens', 'Carburant', 'Documents', 'Contraventions']
const TAB_KEYS = ['entretiens', 'carburant', 'documents', 'contraventions']

// ──────────────────────────────────────────────────────────────────────────────
// Onglet Entretiens
// ──────────────────────────────────────────────────────────────────────────────
function OngletEntretiens({ vehiculeId }) {
  const navigate = useNavigate()
  const [data, setData] = useState([])

  useEffect(() => {
    supabase.from('entretiens').select('*').eq('vehicule_id', vehiculeId)
      .order('date', { ascending: false })
      .then(({ data }) => setData(data || []))
  }, [vehiculeId])

  const cols = [
    { label: 'Date',       key: 'date',              render: r => fmtDate(r.date) },
    { label: 'Intervention', key: 'type_intervention' },
    { label: 'Pièces',     key: 'pieces' },
    { label: 'Coût (FCFA)', key: 'cout',             render: r => fmtNum(r.cout) },
    { label: 'Garage',     key: 'garage' },
    { label: 'Km',         key: 'kilometrage',        render: r => fmtNum(r.kilometrage) },
    { label: 'Commentaire', key: 'commentaire' },
  ]

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn-primary flex items-center gap-2" onClick={() => navigate(`/vehicules/${vehiculeId}/entretien/new`)}>
          <MdAdd size={18} /> Ajouter un entretien
        </button>
      </div>
      <DataTable colonnes={cols} donnees={data} vide="Aucun entretien enregistré" />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Onglet Carburant
// ──────────────────────────────────────────────────────────────────────────────
const MOIS_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function OngletCarburant({ vehiculeId }) {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [vue, setVue] = useState('pleins') // 'pleins' | 'stats'
  const [annee, setAnnee] = useState(new Date().getFullYear())

  useEffect(() => {
    supabase.from('carburant').select('*').eq('vehicule_id', vehiculeId)
      .order('date', { ascending: true })
      .then(({ data }) => setData(data || []))
  }, [vehiculeId])

  // Calcul conso 100km plein par plein
  const avecConso = data.map((r, i) => {
    if (i === 0) return { ...r, conso: null }
    const prev = data[i - 1]
    if (prev.kilometrage && r.kilometrage && r.kilometrage > prev.kilometrage) {
      const diff = r.kilometrage - prev.kilometrage
      return { ...r, conso: ((r.litres / diff) * 100).toFixed(1) }
    }
    return { ...r, conso: null }
  }).reverse()

  const consoValues = avecConso.map(r => r.conso).filter(Boolean).map(Number)
  const moyenneConso = consoValues.length > 0
    ? (consoValues.reduce((a, b) => a + b, 0) / consoValues.length).toFixed(1)
    : null
  const totalLitres = data.reduce((s, r) => s + parseFloat(r.litres || 0), 0)

  // Stats mensuelles pour l'année sélectionnée
  const statsMensuelles = Array.from({ length: 12 }, (_, i) => {
    const pleins = data.filter(r => {
      const d = new Date(r.date)
      return d.getFullYear() === annee && d.getMonth() === i
    })
    const litres = pleins.reduce((s, r) => s + parseFloat(r.litres || 0), 0)
    // Conso moyenne du mois (pleins avec km valides)
    const consosMois = pleins
      .map(r => {
        const idx = data.indexOf(r)
        if (idx === 0) return null
        const prev = data[idx - 1]
        if (prev.kilometrage && r.kilometrage && r.kilometrage > prev.kilometrage)
          return (r.litres / (r.kilometrage - prev.kilometrage)) * 100
        return null
      })
      .filter(Boolean)
    const consoMoy = consosMois.length > 0
      ? parseFloat((consosMois.reduce((a, b) => a + b, 0) / consosMois.length).toFixed(1))
      : null
    return { mois: MOIS_LABELS[i], litres: parseFloat(litres.toFixed(1)), conso: consoMoy, nb: pleins.length }
  })

  const cols = [
    { label: 'Date',        key: 'date',         render: r => fmtDate(r.date) },
    { label: 'Litres',      key: 'litres',        render: r => r.litres ? parseFloat(r.litres).toFixed(1) + ' L' : '—' },
    { label: 'Km compteur', key: 'kilometrage',   render: r => fmtNum(r.kilometrage) },
    { label: 'Conso/100km', key: 'conso',         render: r => r.conso ? r.conso + ' L/100' : '—' },
    { label: 'Station',     key: 'station' },
    { label: 'N° carte',   key: 'reference_bon' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4 text-sm">
          <span className="text-gray-500">Total : <span className="font-bold text-[#1A3C6B]">{totalLitres.toFixed(1)} L</span></span>
          {moyenneConso && (
            <span className="text-gray-500">Conso moy. : <span className="font-bold text-[#1A3C6B]">{moyenneConso} L/100 km</span></span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            <button onClick={() => setVue('pleins')} className={`px-3 py-1.5 ${vue === 'pleins' ? 'bg-[#1A3C6B] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Pleins</button>
            <button onClick={() => setVue('stats')}  className={`px-3 py-1.5 ${vue === 'stats'  ? 'bg-[#1A3C6B] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Suivi mensuel</button>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => navigate(`/vehicules/${vehiculeId}/carburant/new`)}>
            <MdAdd size={18} /> Ajouter un plein
          </button>
        </div>
      </div>

      {vue === 'pleins' && (
        <DataTable colonnes={cols} donnees={avecConso} vide="Aucun plein enregistré" />
      )}

      {vue === 'stats' && (
        <div className="space-y-6">
          {/* Sélecteur année */}
          <div className="flex items-center gap-2">
            <button onClick={() => setAnnee(a => a - 1)} className="btn-secondary px-2 py-1 text-xs">◀</button>
            <span className="font-semibold text-gray-700 w-12 text-center">{annee}</span>
            <button onClick={() => setAnnee(a => a + 1)} className="btn-secondary px-2 py-1 text-xs">▶</button>
          </div>

          {/* Graphe litres par mois */}
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-2">Litres consommés par mois</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statsMensuelles} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit=" L" />
                <Tooltip formatter={v => [v + ' L', 'Litres']} />
                <Bar dataKey="litres" fill="#1A3C6B" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Graphe conso L/100 */}
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-2">Consommation moyenne L/100 km</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={statsMensuelles} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit=" L" />
                <Tooltip formatter={v => [v + ' L/100', 'Conso moy.']} />
                <Line type="monotone" dataKey="conso" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tableau récap mensuel */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2 text-left text-xs text-gray-500 font-semibold uppercase">Mois</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 font-semibold uppercase">Nb pleins</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 font-semibold uppercase">Litres</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 font-semibold uppercase">Conso moy.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {statsMensuelles.map((m, i) => (
                <tr key={i} className={m.nb === 0 ? 'opacity-40' : ''}>
                  <td className="px-4 py-2 font-medium text-gray-700">{m.mois} {annee}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{m.nb}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{m.litres > 0 ? m.litres.toFixed(1) + ' L' : '—'}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{m.conso ? m.conso + ' L/100' : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td className="px-4 py-2 text-gray-700">Total {annee}</td>
                <td className="px-4 py-2 text-right text-gray-700">{statsMensuelles.reduce((s, m) => s + m.nb, 0)}</td>
                <td className="px-4 py-2 text-right text-gray-700">{statsMensuelles.reduce((s, m) => s + m.litres, 0).toFixed(1)} L</td>
                <td className="px-4 py-2 text-right text-gray-700">{moyenneConso ? moyenneConso + ' L/100' : '—'}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Onglet Documents
// ──────────────────────────────────────────────────────────────────────────────
function OngletDocuments({ vehiculeId }) {
  // ── Visite technique ──────────────────────────────────────────────────────
  const [visite, setVisite] = useState(null)
  const [editingVisite, setEditingVisite] = useState(false)
  const [formVisite, setFormVisite] = useState({ date_realisation: '', date_echeance: '' })
  const [savingVisite, setSavingVisite] = useState(false)

  // ── Assurances ────────────────────────────────────────────────────────────
  const [assurances, setAssurances] = useState([])
  const [showFormAssurance, setShowFormAssurance] = useState(false)
  const [formAssurance, setFormAssurance] = useState({ date_debut: '', date_echeance: '', montant: '', assureur: '', numero_police: '' })
  const [savingAssurance, setSavingAssurance] = useState(false)

  useEffect(() => { load() }, [vehiculeId])

  async function load() {
    const [{ data: docs }, { data: ass }] = await Promise.all([
      supabase.from('documents').select('*').eq('vehicule_id', vehiculeId),
      supabase.from('assurances').select('*').eq('vehicule_id', vehiculeId).order('date_debut', { ascending: false }),
    ])
    const map = {}
    ;(docs || []).forEach(d => { map[d.type] = d })
    setVisite(map['visite_technique'] || null)
    setAssurances(ass || [])
  }

  async function handleSaveVisite() {
    setSavingVisite(true)
    const payload = { vehicule_id: vehiculeId, type: 'visite_technique', date_realisation: formVisite.date_realisation || null, date_echeance: formVisite.date_echeance || null }
    if (visite) await supabase.from('documents').update(payload).eq('id', visite.id)
    else await supabase.from('documents').insert(payload)
    setEditingVisite(false)
    load()
    setSavingVisite(false)
  }

  async function handleSaveAssurance(e) {
    e.preventDefault()
    setSavingAssurance(true)
    await supabase.from('assurances').insert({
      vehicule_id: vehiculeId,
      date_debut: formAssurance.date_debut,
      date_echeance: formAssurance.date_echeance,
      montant: formAssurance.montant ? parseInt(formAssurance.montant) : 0,
      assureur: formAssurance.assureur || null,
      numero_police: formAssurance.numero_police || null,
    })
    setFormAssurance({ date_debut: '', date_echeance: '', montant: '', assureur: '', numero_police: '' })
    setShowFormAssurance(false)
    load()
    setSavingAssurance(false)
  }

  const assuranceActive = assurances[0] // la plus récente

  const colsAssurance = [
    { label: 'Période',        key: 'periode',       render: r => `${fmtDate(r.date_debut)} → ${fmtDate(r.date_echeance)}` },
    { label: 'Assureur',       key: 'assureur' },
    { label: 'N° police',      key: 'numero_police' },
    { label: 'Montant (FCFA)', key: 'montant',       render: r => fmtNum(r.montant) },
    { label: 'Statut',         key: 'statut',        render: r => <AlerteBadge dateEcheance={r.date_echeance} /> },
  ]

  return (
    <div className="space-y-6">

      {/* ── Assurance ─────────────────────────────────────────────────── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-800">Assurance</h3>
            {assuranceActive && <AlerteBadge dateEcheance={assuranceActive.date_echeance} />}
            {assuranceActive && <span className="text-xs text-gray-400">Échéance : {fmtDate(assuranceActive.date_echeance)}</span>}
          </div>
          <button className="btn-primary flex items-center gap-1 py-1.5 text-xs" onClick={() => setShowFormAssurance(v => !v)}>
            <MdAdd size={16} /> Nouveau contrat
          </button>
        </div>

        {showFormAssurance && (
          <form onSubmit={handleSaveAssurance} className="p-4 bg-blue-50 border-b border-gray-200">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="form-label">Date début *</label>
                <input type="date" className="form-input" value={formAssurance.date_debut} onChange={e => setFormAssurance(f => ({...f, date_debut: e.target.value}))} required />
              </div>
              <div>
                <label className="form-label">Date échéance *</label>
                <input type="date" className="form-input" value={formAssurance.date_echeance} onChange={e => setFormAssurance(f => ({...f, date_echeance: e.target.value}))} required />
              </div>
              <div>
                <label className="form-label">Montant (FCFA)</label>
                <input type="number" className="form-input" min="0" value={formAssurance.montant} onChange={e => setFormAssurance(f => ({...f, montant: e.target.value}))} />
              </div>
              <div>
                <label className="form-label">Assureur</label>
                <input type="text" className="form-input" placeholder="Nom de la compagnie" value={formAssurance.assureur} onChange={e => setFormAssurance(f => ({...f, assureur: e.target.value}))} />
              </div>
              <div>
                <label className="form-label">N° de police</label>
                <input type="text" className="form-input" placeholder="Numéro de police" value={formAssurance.numero_police} onChange={e => setFormAssurance(f => ({...f, numero_police: e.target.value}))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={savingAssurance}>{savingAssurance ? '...' : 'Enregistrer'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowFormAssurance(false)}>Annuler</button>
            </div>
          </form>
        )}

        <div className="p-4">
          <DataTable colonnes={colsAssurance} donnees={assurances} vide="Aucun contrat d'assurance enregistré" />
        </div>
      </div>

      {/* ── Visite technique ──────────────────────────────────────────── */}
      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-800">Visite technique</h3>
            {visite?.date_echeance && <AlerteBadge dateEcheance={visite.date_echeance} />}
            {!visite && <span className="text-xs text-gray-400 italic">Non renseigné</span>}
          </div>
          <button className="text-sm text-[#1A3C6B] underline hover:no-underline" onClick={() => {
            setEditingVisite(v => !v)
            setFormVisite({ date_realisation: visite?.date_realisation || '', date_echeance: visite?.date_echeance || '' })
          }}>
            {editingVisite ? 'Annuler' : (visite ? 'Modifier' : 'Renseigner')}
          </button>
        </div>

        {!editingVisite && visite && (
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div><span className="font-medium">Réalisé le :</span> {fmtDate(visite.date_realisation)}</div>
            <div><span className="font-medium">Échéance :</span> {fmtDate(visite.date_echeance)}</div>
          </div>
        )}

        {editingVisite && (
          <div className="flex items-end gap-4 mt-2">
            <div>
              <label className="form-label">Date de réalisation</label>
              <input type="date" className="form-input w-40" value={formVisite.date_realisation} onChange={e => setFormVisite(f => ({...f, date_realisation: e.target.value}))} />
            </div>
            <div>
              <label className="form-label">Date d'échéance</label>
              <input type="date" className="form-input w-40" value={formVisite.date_echeance} onChange={e => setFormVisite(f => ({...f, date_echeance: e.target.value}))} />
            </div>
            <button className="btn-primary" onClick={handleSaveVisite} disabled={savingVisite}>{savingVisite ? '...' : 'Enregistrer'}</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Onglet Contraventions
// ──────────────────────────────────────────────────────────────────────────────
function OngletContraventions({ vehiculeId }) {
  const navigate = useNavigate()
  const [data, setData] = useState([])

  useEffect(() => {
    supabase.from('contraventions').select('*').eq('vehicule_id', vehiculeId)
      .order('date', { ascending: false })
      .then(({ data }) => setData(data || []))
  }, [vehiculeId])

  const STATUT = {
    payee:      { label: 'Payée',      cls: 'bg-green-100 text-green-800' },
    en_attente: { label: 'En attente', cls: 'bg-orange-100 text-orange-800' },
    contestee:  { label: 'Contestée', cls: 'bg-purple-100 text-purple-800' },
  }

  const cols = [
    { label: 'Date',       key: 'date',       render: r => fmtDate(r.date) },
    { label: 'Lieu',       key: 'lieu' },
    { label: 'Conducteur', key: 'conducteur' },
    { label: 'Nature',     key: 'nature' },
    { label: 'Montant',    key: 'montant',    render: r => fmtNum(r.montant) + ' FCFA' },
    { label: 'Statut',     key: 'statut',     render: r => {
      const s = STATUT[r.statut] || STATUT.en_attente
      return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
    }},
  ]

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn-primary flex items-center gap-2" onClick={() => navigate(`/vehicules/${vehiculeId}/contravention/new`)}>
          <MdAdd size={18} /> Ajouter une contravention
        </button>
      </div>
      <DataTable colonnes={cols} donnees={data} vide="Aucune contravention" />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Page principale VehiculeDetail
// ──────────────────────────────────────────────────────────────────────────────
export default function VehiculeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [vehicule, setVehicule] = useState(null)
  const tabParam = searchParams.get('tab')
  const initialTab = tabParam ? Math.max(0, TAB_KEYS.indexOf(tabParam)) : 0
  const [activeTab, setActiveTab] = useState(initialTab)
  const [loading, setLoading] = useState(true)
  const [editingStatut, setEditingStatut] = useState(false)
  const [newStatut, setNewStatut] = useState('')
  const [editingKm, setEditingKm] = useState(false)
  const [newKm, setNewKm] = useState('')

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('vehicules').select('*').eq('id', id).single()
    setVehicule(data)
    setLoading(false)
  }

  async function updateStatut() {
    await supabase.from('vehicules').update({ statut: newStatut }).eq('id', id)
    setEditingStatut(false)
    load()
  }

  async function updateKm() {
    await supabase.from('vehicules').update({ kilometrage: parseInt(newKm) }).eq('id', id)
    setEditingKm(false)
    load()
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>
  if (!vehicule) return <div className="text-center text-red-500 mt-10">Véhicule introuvable</div>

  const sc = STATUT_CONFIG[vehicule.statut] || STATUT_CONFIG.actif

  return (
    <div className="space-y-6">
      {/* Bouton retour */}
      <button className="text-sm text-[#1A3C6B] hover:underline flex items-center gap-1" onClick={() => navigate('/vehicules')}>
        <MdArrowBack size={16} /> Retour à la liste
      </button>

      {/* Header véhicule */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#1A3C6B]">{vehicule.immatriculation}</h1>
              {editingStatut ? (
                <div className="flex items-center gap-2">
                  <select className="form-input w-36 text-xs" value={newStatut} onChange={e => setNewStatut(e.target.value)}>
                    <option value="actif">Actif</option>
                    <option value="panne">En panne</option>
                    <option value="reforme">Réformé</option>
                  </select>
                  <button className="text-xs btn-primary py-1" onClick={updateStatut}>OK</button>
                  <button className="text-xs btn-secondary py-1" onClick={() => setEditingStatut(false)}>×</button>
                </div>
              ) : (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer ${sc.cls}`}
                  onClick={() => { setNewStatut(vehicule.statut); setEditingStatut(true) }}
                  title="Cliquer pour modifier"
                >
                  {sc.label}
                </span>
              )}
            </div>
            <p className="text-gray-600">
              {[vehicule.marque, vehicule.modele, vehicule.annee && `(${vehicule.annee})`].filter(Boolean).join(' ')}
            </p>
          </div>
          <div className="text-right">
            {editingKm ? (
              <div className="flex items-center gap-2">
                <input type="number" className="form-input w-32 text-sm" value={newKm} onChange={e => setNewKm(e.target.value)} />
                <button className="text-xs btn-primary py-1" onClick={updateKm}>OK</button>
                <button className="text-xs btn-secondary py-1" onClick={() => setEditingKm(false)}>×</button>
              </div>
            ) : (
              <div
                className="cursor-pointer hover:bg-gray-50 rounded-lg p-2 text-right"
                onClick={() => { setNewKm(vehicule.kilometrage); setEditingKm(true) }}
                title="Cliquer pour modifier"
              >
                <p className="text-2xl font-bold text-gray-800">{fmtNum(vehicule.kilometrage)} km</p>
                <p className="text-xs text-gray-400">Kilométrage actuel</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="card p-0 overflow-hidden">
        <div className="flex border-b border-gray-200 bg-white">
          {TABS.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`px-6 py-3.5 text-sm font-medium transition-colors ${
                activeTab === i ? 'tab-active' : 'tab-inactive'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === 0 && <OngletEntretiens vehiculeId={id} />}
          {activeTab === 1 && <OngletCarburant vehiculeId={id} />}
          {activeTab === 2 && <OngletDocuments vehiculeId={id} />}
          {activeTab === 3 && <OngletContraventions vehiculeId={id} />}
        </div>
      </div>
    </div>
  )
}

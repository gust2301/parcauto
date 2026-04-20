import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AlerteBadge from '../components/AlerteBadge'
import DataTable from '../components/DataTable'
import { format, parseISO } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts'
import {
  MdAdd, MdArrowBack, MdEdit, MdDelete, MdPrint, MdCheck, MdClose,
} from 'react-icons/md'
import CarburantForm from './CarburantForm'
import ContraventionForm from './ContraventionForm'
import SearchSort from '../components/SearchSort'
import { filterSort } from '../lib/searchSort'

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

// ── Confirmation suppression ─────────────────────────────────────────────────
function ConfirmDelete({ onConfirm, onCancel }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-red-600 font-medium">Supprimer ?</span>
      <button onClick={onConfirm} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Confirmer">
        <MdCheck size={16} />
      </button>
      <button onClick={onCancel} className="p-1 text-gray-400 hover:bg-gray-100 rounded" title="Annuler">
        <MdClose size={16} />
      </button>
    </div>
  )
}

// ── Boutons actions ──────────────────────────────────────────────────────────
function ActionBtns({ onEdit, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  if (confirming) {
    return <ConfirmDelete onConfirm={onDelete} onCancel={() => setConfirming(false)} />
  }
  return (
    <div className="flex items-center gap-1">
      <button onClick={onEdit} className="p-1 text-[#1A3C6B] hover:bg-blue-50 rounded" title="Modifier">
        <MdEdit size={16} />
      </button>
      <button onClick={() => setConfirming(true)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Supprimer">
        <MdDelete size={16} />
      </button>
    </div>
  )
}

// ── Modal inline ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <MdClose size={22} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ── Onglet Entretiens ────────────────────────────────────────────────────────
function OngletEntretiens({ vehiculeId }) {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('date')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => { load() }, [vehiculeId])

  function load() {
    supabase.from('entretiens').select('*').eq('vehicule_id', vehiculeId)
      .order('date', { ascending: false })
      .then(({ data }) => setData(data || []))
  }

  function startEdit(r) {
    setEditing(r.id)
    setEditForm({ ...r })
  }

  async function saveEdit() {
    setSaving(true)
    await supabase.from('entretiens').update({
      date: editForm.date,
      type_intervention: editForm.type_intervention,
      pieces: editForm.pieces,
      cout: editForm.cout ? parseInt(editForm.cout) : 0,
      garage: editForm.garage,
      kilometrage: editForm.kilometrage ? parseInt(editForm.kilometrage) : null,
      commentaire: editForm.commentaire,
    }).eq('id', editing)
    setEditing(null)
    setSaving(false)
    load()
  }

  async function handleDelete(id) {
    await supabase.from('entretiens').delete().eq('id', id)
    load()
  }

  const cols = [
    { label: 'Date',          key: 'date',              render: r => fmtDate(r.date) },
    { label: 'Intervention',  key: 'type_intervention' },
    { label: 'Pièces',        key: 'pieces' },
    { label: 'Coût (FCFA)',   key: 'cout',              render: r => fmtNum(r.cout) },
    { label: 'Garage',        key: 'garage' },
    { label: 'Km',            key: 'kilometrage',        render: r => fmtNum(r.kilometrage) },
    { label: 'Commentaire',   key: 'commentaire' },
    { label: '',              key: '_actions',           render: r => (
      <ActionBtns onEdit={() => startEdit(r)} onDelete={() => handleDelete(r.id)} />
    )},
  ]

  const filtered = filterSort(data, search, ['type_intervention', 'pieces', 'garage', 'commentaire'], sortKey, sortDir)

  return (
    <div>
      <div className="flex justify-between mb-4">
        <button className="print:hidden btn-secondary flex items-center gap-2 text-sm" onClick={() => window.print()}>
          <MdPrint size={16} /> Imprimer
        </button>
        <button className="btn-primary flex items-center gap-2" onClick={() => navigate(`/vehicules/${vehiculeId}/entretien/new`)}>
          <MdAdd size={18} /> Ajouter un entretien
        </button>
      </div>
      <div className="mb-4">
        <SearchSort
          search={search} onSearch={setSearch}
          placeholder="Rechercher (intervention, pièces, garage...)"
          sortKey={sortKey} sortDir={sortDir}
          onSort={(k, d) => { setSortKey(k); setSortDir(d) }}
          sortOptions={[
            { value: 'date',             label: 'Date' },
            { value: 'type_intervention',label: 'Intervention' },
            { value: 'cout',             label: 'Coût' },
            { value: 'kilometrage',      label: 'Kilométrage' },
            { value: 'garage',           label: 'Garage' },
          ]}
        />
      </div>
      <DataTable colonnes={cols} donnees={filtered} vide="Aucun entretien enregistré" />

      {editing && (
        <Modal title="Modifier l'entretien" onClose={() => setEditing(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">Date</label>
                <input type="date" className="form-input" value={editForm.date || ''} onChange={e => setEditForm(f => ({...f, date: e.target.value}))} />
              </div>
              <div>
                <label className="form-label">Intervention</label>
                <input type="text" className="form-input" value={editForm.type_intervention || ''} onChange={e => setEditForm(f => ({...f, type_intervention: e.target.value}))} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">Pièces</label>
                <input type="text" className="form-input" value={editForm.pieces || ''} onChange={e => setEditForm(f => ({...f, pieces: e.target.value}))} />
              </div>
              <div>
                <label className="form-label">Coût (FCFA)</label>
                <input type="number" className="form-input" value={editForm.cout || ''} onChange={e => setEditForm(f => ({...f, cout: e.target.value}))} min="0" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">Garage</label>
                <input type="text" className="form-input" value={editForm.garage || ''} onChange={e => setEditForm(f => ({...f, garage: e.target.value}))} />
              </div>
              <div>
                <label className="form-label">Kilométrage</label>
                <input type="number" className="form-input" value={editForm.kilometrage || ''} onChange={e => setEditForm(f => ({...f, kilometrage: e.target.value}))} min="0" />
              </div>
            </div>
            <div>
              <label className="form-label">Commentaire</label>
              <textarea className="form-input" rows={2} value={editForm.commentaire || ''} onChange={e => setEditForm(f => ({...f, commentaire: e.target.value}))} />
            </div>
            <div className="flex gap-3 pt-2">
              <button className="btn-secondary flex-1" onClick={() => setEditing(null)}>Annuler</button>
              <button className="btn-primary flex-1" onClick={saveEdit} disabled={saving}>{saving ? '...' : 'Enregistrer'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Onglet Carburant ─────────────────────────────────────────────────────────
const MOIS_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function OngletCarburant({ vehiculeId }) {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [vue, setVue] = useState('pleins')
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const [editData, setEditData] = useState(null)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('date')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => { load() }, [vehiculeId])

  function load() {
    supabase.from('carburant').select('*').eq('vehicule_id', vehiculeId)
      .order('date', { ascending: true })
      .then(({ data }) => setData(data || []))
  }

  async function handleDelete(id) {
    await supabase.from('carburant').delete().eq('id', id)
    load()
  }

  const avecConso = data.map((r, i) => {
    if (i === 0) return { ...r, conso: null }
    const prev = data[i - 1]
    if (prev.kilometrage && r.kilometrage && r.kilometrage > prev.kilometrage)
      return { ...r, conso: ((r.litres / (r.kilometrage - prev.kilometrage)) * 100).toFixed(1) }
    return { ...r, conso: null }
  }).reverse()

  const consoValues = avecConso.map(r => r.conso).filter(Boolean).map(Number)
  const moyenneConso = consoValues.length > 0
    ? (consoValues.reduce((a, b) => a + b, 0) / consoValues.length).toFixed(1) : null
  const totalLitres = data.reduce((s, r) => s + parseFloat(r.litres || 0), 0)
  const totalMontant = data.reduce((s, r) => s + (r.montant || 0), 0)

  const statsMensuelles = Array.from({ length: 12 }, (_, i) => {
    const pleins = data.filter(r => {
      const d = new Date(r.date)
      return d.getFullYear() === annee && d.getMonth() === i
    })
    const litres = pleins.reduce((s, r) => s + parseFloat(r.litres || 0), 0)
    const montant = pleins.reduce((s, r) => s + (r.montant || 0), 0)
    const consosMois = pleins.map(r => {
      const idx = data.indexOf(r)
      if (idx === 0) return null
      const prev = data[idx - 1]
      if (prev.kilometrage && r.kilometrage && r.kilometrage > prev.kilometrage)
        return (r.litres / (r.kilometrage - prev.kilometrage)) * 100
      return null
    }).filter(Boolean)
    const consoMoy = consosMois.length > 0
      ? parseFloat((consosMois.reduce((a, b) => a + b, 0) / consosMois.length).toFixed(1)) : null
    return { mois: MOIS_LABELS[i], litres: parseFloat(litres.toFixed(1)), montant, conso: consoMoy, nb: pleins.length }
  })

  const cols = [
    { label: 'Date',        key: 'date',          render: r => fmtDate(r.date) },
    { label: 'Type',        key: 'type_carburant', render: r => r.type_carburant || '—' },
    { label: 'Litres',      key: 'litres',         render: r => r.litres ? parseFloat(r.litres).toFixed(1) + ' L' : '—' },
    { label: 'Montant',     key: 'montant',        render: r => r.montant ? fmtNum(r.montant) + ' FCFA' : '—' },
    { label: 'Km compteur', key: 'kilometrage',    render: r => fmtNum(r.kilometrage) },
    { label: 'Conso/100',   key: 'conso',          render: r => r.conso ? r.conso + ' L' : '—' },
    { label: 'Station',     key: 'station' },
    { label: 'N° carte',    key: 'reference_bon' },
    { label: '',            key: '_actions',        render: r => (
      <ActionBtns onEdit={() => setEditData(r)} onDelete={() => handleDelete(r.id)} />
    )},
  ]

  return (
    <div>
      <div className="flex flex-col gap-4 mb-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="text-gray-500">Total : <span className="font-bold text-[#1A3C6B]">{totalLitres.toFixed(1)} L</span></span>
          {totalMontant > 0 && <span className="text-gray-500">Coût : <span className="font-bold text-[#1A3C6B]">{fmtNum(totalMontant)} FCFA</span></span>}
          {moyenneConso && <span className="text-gray-500">Conso moy. : <span className="font-bold text-[#1A3C6B]">{moyenneConso} L/100</span></span>}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button className="print:hidden btn-secondary flex items-center gap-1 text-sm py-1.5" onClick={() => window.print()}>
            <MdPrint size={16} /> Imprimer
          </button>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            <button onClick={() => setVue('pleins')} className={`px-3 py-1.5 ${vue === 'pleins' ? 'bg-[#1A3C6B] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Pleins</button>
            <button onClick={() => setVue('stats')}  className={`px-3 py-1.5 ${vue === 'stats'  ? 'bg-[#1A3C6B] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>Suivi mensuel</button>
          </div>
          <button className="btn-primary flex items-center justify-center gap-2" onClick={() => navigate(`/vehicules/${vehiculeId}/carburant/new`)}>
            <MdAdd size={18} /> Ajouter un plein
          </button>
        </div>
      </div>

      {vue === 'pleins' && (
        <>
          <div className="mb-4">
            <SearchSort
              search={search} onSearch={setSearch}
              placeholder="Rechercher (type, station, carte...)"
              sortKey={sortKey} sortDir={sortDir}
              onSort={(k, d) => { setSortKey(k); setSortDir(d) }}
              sortOptions={[
                { value: 'date',         label: 'Date' },
                { value: 'type_carburant', label: 'Type' },
                { value: 'litres',       label: 'Litres' },
                { value: 'montant',      label: 'Montant' },
                { value: 'kilometrage',  label: 'Kilométrage' },
                { value: 'station',      label: 'Station' },
              ]}
            />
          </div>
          <DataTable colonnes={cols} donnees={filterSort(avecConso, search, ['type_carburant', 'station', 'reference_bon'], sortKey, sortDir)} vide="Aucun plein enregistré" />
        </>
      )}

      {vue === 'stats' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <button onClick={() => setAnnee(a => a - 1)} className="btn-secondary px-2 py-1 text-xs">◀</button>
            <span className="font-semibold text-gray-700 w-12 text-center">{annee}</span>
            <button onClick={() => setAnnee(a => a + 1)} className="btn-secondary px-2 py-1 text-xs">▶</button>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-2">Litres consommés par mois</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statsMensuelles}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit=" L" />
                <Tooltip formatter={v => [v + ' L', 'Litres']} />
                <Bar dataKey="litres" fill="#1A3C6B" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-2">Coût carburant par mois (FCFA)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statsMensuelles}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(v)} />
                <Tooltip formatter={v => [fmtNum(v) + ' FCFA', 'Coût']} />
                <Bar dataKey="montant" fill="#10b981" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-2">Consommation moyenne L/100 km</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={statsMensuelles}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit=" L" />
                <Tooltip formatter={v => [v + ' L/100', 'Conso moy.']} />
                <Line type="monotone" dataKey="conso" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2 text-left text-xs text-gray-500 font-semibold uppercase">Mois</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 font-semibold uppercase">Pleins</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 font-semibold uppercase">Litres</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 font-semibold uppercase">Coût (FCFA)</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 font-semibold uppercase">Conso moy.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {statsMensuelles.map((m, i) => (
                <tr key={i} className={m.nb === 0 ? 'opacity-40' : ''}>
                  <td className="px-4 py-2 font-medium text-gray-700">{m.mois} {annee}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{m.nb}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{m.litres > 0 ? m.litres.toFixed(1) + ' L' : '—'}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{m.montant > 0 ? fmtNum(m.montant) : '—'}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{m.conso ? m.conso + ' L/100' : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td className="px-4 py-2 text-gray-700">Total {annee}</td>
                <td className="px-4 py-2 text-right text-gray-700">{statsMensuelles.reduce((s, m) => s + m.nb, 0)}</td>
                <td className="px-4 py-2 text-right text-gray-700">{statsMensuelles.reduce((s, m) => s + m.litres, 0).toFixed(1)} L</td>
                <td className="px-4 py-2 text-right text-gray-700">{fmtNum(statsMensuelles.reduce((s, m) => s + m.montant, 0))}</td>
                <td className="px-4 py-2 text-right text-gray-700">{moyenneConso ? moyenneConso + ' L/100' : '—'}</td>
              </tr>
            </tfoot>
          </table>
          </div>
        </div>
      )}

      {editData && (
        <Modal title="Modifier le plein" onClose={() => setEditData(null)}>
          <CarburantForm
            editData={editData}
            onSaved={() => { setEditData(null); load() }}
            onCancel={() => setEditData(null)}
          />
        </Modal>
      )}
    </div>
  )
}

// ── Onglet Documents ─────────────────────────────────────────────────────────
function OngletDocuments({ vehiculeId }) {
  const [visite, setVisite] = useState(null)
  const [editingVisite, setEditingVisite] = useState(false)
  const [formVisite, setFormVisite] = useState({ date_realisation: '', date_echeance: '' })
  const [savingVisite, setSavingVisite] = useState(false)

  const [assurances, setAssurances] = useState([])
  const [showFormAssurance, setShowFormAssurance] = useState(false)
  const [editingAssurance, setEditingAssurance] = useState(null)
  const [formAssurance, setFormAssurance] = useState({ date_debut: '', date_echeance: '', montant: '', assureur: '', numero_police: '' })
  const [savingAssurance, setSavingAssurance] = useState(false)
  const [assSearch, setAssSearch] = useState('')
  const [assSortKey, setAssSortKey] = useState('date_debut')
  const [assSortDir, setAssSortDir] = useState('desc')

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
    const payload = {
      vehicule_id: vehiculeId,
      date_debut: formAssurance.date_debut,
      date_echeance: formAssurance.date_echeance,
      montant: formAssurance.montant ? parseInt(formAssurance.montant) : 0,
      assureur: formAssurance.assureur || null,
      numero_police: formAssurance.numero_police || null,
    }
    if (editingAssurance) {
      await supabase.from('assurances').update(payload).eq('id', editingAssurance)
    } else {
      await supabase.from('assurances').insert(payload)
    }
    setFormAssurance({ date_debut: '', date_echeance: '', montant: '', assureur: '', numero_police: '' })
    setShowFormAssurance(false)
    setEditingAssurance(null)
    load()
    setSavingAssurance(false)
  }

  async function handleDeleteAssurance(id) {
    await supabase.from('assurances').delete().eq('id', id)
    load()
  }

  function startEditAssurance(a) {
    setEditingAssurance(a.id)
    setFormAssurance({
      date_debut: a.date_debut || '',
      date_echeance: a.date_echeance || '',
      montant: a.montant?.toString() || '',
      assureur: a.assureur || '',
      numero_police: a.numero_police || '',
    })
    setShowFormAssurance(true)
  }

  const assuranceActive = assurances[0]

  const colsAssurance = [
    { label: 'Période',        key: 'periode',       render: r => `${fmtDate(r.date_debut)} → ${fmtDate(r.date_echeance)}` },
    { label: 'Assureur',       key: 'assureur' },
    { label: 'N° police',      key: 'numero_police' },
    { label: 'Montant (FCFA)', key: 'montant',       render: r => fmtNum(r.montant) },
    { label: 'Statut',         key: 'statut',        render: r => <AlerteBadge dateEcheance={r.date_echeance} /> },
    { label: '',               key: '_actions',       render: r => (
      <ActionBtns onEdit={() => startEditAssurance(r)} onDelete={() => handleDeleteAssurance(r.id)} />
    )},
  ]

  return (
    <div className="space-y-6">
      {/* Assurance */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex flex-col gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-semibold text-gray-800">Assurance</h3>
            {assuranceActive && <AlerteBadge dateEcheance={assuranceActive.date_echeance} />}
            {assuranceActive && <span className="text-xs text-gray-400">Échéance : {fmtDate(assuranceActive.date_echeance)}</span>}
          </div>
          <button className="btn-primary flex items-center justify-center gap-1 py-1.5 text-xs"
            onClick={() => { setEditingAssurance(null); setFormAssurance({ date_debut: '', date_echeance: '', montant: '', assureur: '', numero_police: '' }); setShowFormAssurance(v => !v) }}>
            <MdAdd size={16} /> Nouveau contrat
          </button>
        </div>

        {showFormAssurance && (
          <form onSubmit={handleSaveAssurance} className="p-4 bg-blue-50 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">{editingAssurance ? 'Modifier le contrat' : 'Nouveau contrat'}</p>
            <div className="grid grid-cols-1 gap-3 mb-3 md:grid-cols-3">
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
                <input type="text" className="form-input" value={formAssurance.assureur} onChange={e => setFormAssurance(f => ({...f, assureur: e.target.value}))} />
              </div>
              <div>
                <label className="form-label">N° de police</label>
                <input type="text" className="form-input" value={formAssurance.numero_police} onChange={e => setFormAssurance(f => ({...f, numero_police: e.target.value}))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={savingAssurance}>{savingAssurance ? '...' : 'Enregistrer'}</button>
              <button type="button" className="btn-secondary" onClick={() => { setShowFormAssurance(false); setEditingAssurance(null) }}>Annuler</button>
            </div>
          </form>
        )}

        <div className="p-4">
          <div className="mb-3">
            <SearchSort
              search={assSearch} onSearch={setAssSearch}
              placeholder="Rechercher (assureur, n° police...)"
              sortKey={assSortKey} sortDir={assSortDir}
              onSort={(k, d) => { setAssSortKey(k); setAssSortDir(d) }}
              sortOptions={[
                { value: 'date_debut',    label: 'Début' },
                { value: 'date_echeance', label: 'Échéance' },
                { value: 'assureur',      label: 'Assureur' },
                { value: 'montant',       label: 'Montant' },
              ]}
            />
          </div>
          <DataTable colonnes={colsAssurance} donnees={filterSort(assurances, assSearch, ['assureur', 'numero_police'], assSortKey, assSortDir)} vide="Aucun contrat d'assurance enregistré" />
        </div>
      </div>

      {/* Visite technique */}
      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
        <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="grid grid-cols-1 gap-4 text-sm text-gray-600 sm:grid-cols-2">
            <div><span className="font-medium">Réalisé le :</span> {fmtDate(visite.date_realisation)}</div>
            <div><span className="font-medium">Échéance :</span> {fmtDate(visite.date_echeance)}</div>
          </div>
        )}

        {editingVisite && (
          <div className="flex flex-col gap-4 mt-2 sm:flex-row sm:items-end">
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

// ── Onglet Contraventions ────────────────────────────────────────────────────
function OngletContraventions({ vehiculeId }) {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [editData, setEditData] = useState(null)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('date')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => { load() }, [vehiculeId])

  function load() {
    supabase.from('contraventions').select('*, chauffeurs(nom_complet)').eq('vehicule_id', vehiculeId)
      .order('date', { ascending: false })
      .then(({ data }) => setData(data || []))
  }

  async function handleDelete(id) {
    await supabase.from('contraventions').delete().eq('id', id)
    load()
  }

  const STATUT = {
    payee:      { label: 'Payée',      cls: 'bg-green-100 text-green-800' },
    en_attente: { label: 'En attente', cls: 'bg-orange-100 text-orange-800' },
    contestee:  { label: 'Contestée',  cls: 'bg-purple-100 text-purple-800' },
  }

  const cols = [
    { label: 'Date',       key: 'date',       render: r => fmtDate(r.date) },
    { label: 'Lieu',       key: 'lieu' },
    { label: 'Conducteur', key: 'conducteur',  render: r => r.chauffeurs?.nom_complet || r.conducteur || '—' },
    { label: 'Nature',     key: 'nature' },
    { label: 'Montant',    key: 'montant',     render: r => fmtNum(r.montant) + ' FCFA' },
    { label: 'Statut',     key: 'statut',      render: r => {
      const s = STATUT[r.statut] || STATUT.en_attente
      return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
    }},
    { label: '',           key: '_actions',    render: r => (
      <ActionBtns onEdit={() => setEditData(r)} onDelete={() => handleDelete(r.id)} />
    )},
  ]

  const filtered = filterSort(data, search, ['lieu', 'conducteur', 'nature', 'statut'], sortKey, sortDir)

  return (
    <div>
      <div className="flex justify-end mb-4 gap-2">
        <button className="print:hidden btn-secondary flex items-center gap-2 text-sm" onClick={() => window.print()}>
          <MdPrint size={16} /> Imprimer
        </button>
        <button className="btn-primary flex items-center gap-2" onClick={() => navigate(`/vehicules/${vehiculeId}/contravention/new`)}>
          <MdAdd size={18} /> Ajouter une contravention
        </button>
      </div>
      <div className="mb-4">
        <SearchSort
          search={search} onSearch={setSearch}
          placeholder="Rechercher (lieu, conducteur, nature...)"
          sortKey={sortKey} sortDir={sortDir}
          onSort={(k, d) => { setSortKey(k); setSortDir(d) }}
          sortOptions={[
            { value: 'date',    label: 'Date' },
            { value: 'lieu',    label: 'Lieu' },
            { value: 'montant', label: 'Montant' },
            { value: 'statut',  label: 'Statut' },
            { value: 'nature',  label: 'Nature' },
          ]}
        />
      </div>
      <DataTable colonnes={cols} donnees={filtered} vide="Aucune contravention" />

      {editData && (
        <Modal title="Modifier la contravention" onClose={() => setEditData(null)}>
          <ContraventionForm
            editData={editData}
            onSaved={() => { setEditData(null); load() }}
            onCancel={() => setEditData(null)}
          />
        </Modal>
      )}
    </div>
  )
}

// ── Page principale VehiculeDetail ───────────────────────────────────────────
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
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <button className="text-sm text-[#1A3C6B] hover:underline flex items-center gap-1" onClick={() => navigate('/vehicules')}>
          <MdArrowBack size={16} /> Retour à la liste
        </button>
        <button className="btn-secondary flex items-center gap-2 text-sm" onClick={() => window.print()}>
          <MdPrint size={16} /> Imprimer la fiche
        </button>
      </div>

      {/* Header */}
      <div className="card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-[#1A3C6B]">{vehicule.immatriculation}</h1>
              {editingStatut ? (
                <div className="flex items-center gap-2 print:hidden">
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
                  className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer print:cursor-default ${sc.cls}`}
                  onClick={() => { setNewStatut(vehicule.statut); setEditingStatut(true) }}
                  title="Cliquer pour modifier">
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
              <div className="flex items-center gap-2 print:hidden">
                <input type="number" className="form-input w-32 text-sm" value={newKm} onChange={e => setNewKm(e.target.value)} />
                <button className="text-xs btn-primary py-1" onClick={updateKm}>OK</button>
                <button className="text-xs btn-secondary py-1" onClick={() => setEditingKm(false)}>×</button>
              </div>
            ) : (
              <div className="cursor-pointer hover:bg-gray-50 rounded-lg p-2 text-right print:cursor-default"
                onClick={() => { setNewKm(vehicule.kilometrage); setEditingKm(true) }}
                title="Cliquer pour modifier">
                <p className="text-2xl font-bold text-gray-800">{fmtNum(vehicule.kilometrage)} km</p>
                <p className="text-xs text-gray-400">Kilométrage actuel</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="card p-0 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-200 bg-white print:hidden scrollbar-thin">
          {TABS.map((tab, i) => (
            <button key={i} onClick={() => setActiveTab(i)}
              className={`shrink-0 px-4 py-3.5 text-sm font-medium transition-colors sm:px-6 ${activeTab === i ? 'tab-active' : 'tab-inactive'}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="p-4 sm:p-6">
          {activeTab === 0 && <OngletEntretiens vehiculeId={id} />}
          {activeTab === 1 && <OngletCarburant vehiculeId={id} />}
          {activeTab === 2 && <OngletDocuments vehiculeId={id} />}
          {activeTab === 3 && <OngletContraventions vehiculeId={id} />}
        </div>
      </div>
    </div>
  )
}

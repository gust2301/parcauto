import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { format, parseISO } from 'date-fns'
import {
  MdAdd, MdEdit, MdDelete, MdPerson, MdArrowBack, MdPrint,
  MdCheck, MdClose, MdDirectionsCar, MdWarning,
} from 'react-icons/md'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import SearchSort, { filterSort } from '../components/SearchSort'

function fmtDate(d) {
  if (!d) return '—'
  return format(parseISO(d), 'dd/MM/yyyy')
}
function fmtNum(n) {
  return n != null ? new Intl.NumberFormat('fr-FR').format(n) : '—'
}

function ConfirmDelete({ onConfirm, onCancel }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-red-600 font-medium">Supprimer ?</span>
      <button onClick={onConfirm} className="p-1 text-red-600 hover:bg-red-50 rounded"><MdCheck size={16} /></button>
      <button onClick={onCancel} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><MdClose size={16} /></button>
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><MdClose size={22} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ── Fiche détail chauffeur ───────────────────────────────────────────────────
function FicheChauffeur({ chauffeur, vehicules, onBack, onUpdated }) {
  const [deplacements, setDeplacements] = useState([])
  const [contraventions, setContraventions] = useState([])
  const [showFormDep, setShowFormDep] = useState(false)
  const [editingDep, setEditingDep] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [vehiculeSearch, setVehiculeSearch] = useState('')
  const [formDep, setFormDep] = useState({
    date: new Date().toISOString().split('T')[0],
    vehicule_id: '',
    nombre_jours: '1',
    montant_journalier: '',
    status: 'impaye',
  })
  const [saving, setSaving] = useState(false)
  const [editingInfo, setEditingInfo] = useState(false)
  const [formInfo, setFormInfo] = useState({ nom_complet: chauffeur.nom_complet, matricule: chauffeur.matricule || '', grade: chauffeur.grade || '' })

  useEffect(() => { loadAll() }, [chauffeur.id])

  async function loadAll() {
    const [{ data: deps }, { data: contras }] = await Promise.all([
      supabase.from('deplacements')
        .select('*, vehicules(immatriculation, marque, modele)')
        .eq('chauffeur_id', chauffeur.id)
        .order('date', { ascending: false }),
      supabase.from('contraventions')
        .select('*, vehicules(immatriculation)')
        .eq('chauffeur_id', chauffeur.id)
        .order('date', { ascending: false }),
    ])
    setDeplacements(deps || [])
    setContraventions(contras || [])
  }

  async function saveInfo() {
    await supabase.from('chauffeurs').update({
      nom_complet: formInfo.nom_complet,
      matricule: formInfo.matricule || null,
      grade: formInfo.grade || null,
    }).eq('id', chauffeur.id)
    setEditingInfo(false)
    onUpdated()
  }

  async function saveDep(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      chauffeur_id: chauffeur.id,
      vehicule_id: formDep.vehicule_id || null,
      date: formDep.date,
      nombre_jours: parseInt(formDep.nombre_jours) || 1,
      montant_journalier: formDep.montant_journalier ? parseInt(formDep.montant_journalier) : 0,
      status: formDep.status,
    }
    if (editingDep) {
      await supabase.from('deplacements').update(payload).eq('id', editingDep)
    } else {
      await supabase.from('deplacements').insert(payload)
    }
    setShowFormDep(false)
    setEditingDep(null)
    setFormDep({ date: new Date().toISOString().split('T')[0], vehicule_id: '', nombre_jours: '1', montant_journalier: '', status: 'impaye' })
    setSaving(false)
    loadAll()
  }

  async function deleteDep(id) {
    await supabase.from('deplacements').delete().eq('id', id)
    setConfirmDel(null)
    loadAll()
  }

  function startEditDep(d) {
    setEditingDep(d.id)
    setFormDep({
      date: d.date,
      vehicule_id: d.vehicule_id || '',
      nombre_jours: d.nombre_jours?.toString() || '1',
      montant_journalier: d.montant_journalier?.toString() || '',
      status: d.status || 'impaye',
    })
    setShowFormDep(true)
  }

  const vehiculesFiltres = vehicules.filter(v =>
    v.immatriculation.toLowerCase().includes(vehiculeSearch.toLowerCase()) ||
    `${v.marque} ${v.modele}`.toLowerCase().includes(vehiculeSearch.toLowerCase())
  )

  const selectedVehicule = vehicules.find(v => v.id === formDep.vehicule_id)

  const totalDeplacement = deplacements.reduce((s, d) => s + (d.nombre_jours || 1) * (d.montant_journalier || 0), 0)
  const totalImpaye = deplacements.filter(d => d.status === 'impaye').reduce((s, d) => s + (d.nombre_jours || 1) * (d.montant_journalier || 0), 0)
  const totalContrav = contraventions.reduce((s, c) => s + (c.montant || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <button className="text-sm text-[#1A3C6B] hover:underline flex items-center gap-1" onClick={onBack}>
          <MdArrowBack size={16} /> Retour à la liste
        </button>
        <button className="btn-secondary flex items-center gap-2 text-sm" onClick={() => window.print()}>
          <MdPrint size={16} /> Imprimer la fiche
        </button>
      </div>

      {/* Info chauffeur */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#1A3C6B]/10 flex items-center justify-center flex-shrink-0">
              <MdPerson size={28} className="text-[#1A3C6B]" />
            </div>
            {editingInfo ? (
              <div className="space-y-3">
                <input className="form-input text-lg font-bold" value={formInfo.nom_complet} onChange={e => setFormInfo(f => ({...f, nom_complet: e.target.value}))} placeholder="Nom complet" />
                <div className="flex gap-3">
                  <input className="form-input" value={formInfo.matricule} onChange={e => setFormInfo(f => ({...f, matricule: e.target.value}))} placeholder="Matricule" />
                  <input className="form-input" value={formInfo.grade} onChange={e => setFormInfo(f => ({...f, grade: e.target.value}))} placeholder="Grade" />
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary text-sm" onClick={saveInfo}>Enregistrer</button>
                  <button className="btn-secondary text-sm" onClick={() => setEditingInfo(false)}>Annuler</button>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold text-[#1A3C6B]">{chauffeur.nom_complet}</h1>
                <div className="flex gap-4 mt-1 text-sm text-gray-500">
                  {chauffeur.matricule && <span>Matricule : <span className="font-medium text-gray-700">{chauffeur.matricule}</span></span>}
                  {chauffeur.grade && <span>Grade : <span className="font-medium text-gray-700">{chauffeur.grade}</span></span>}
                </div>
              </div>
            )}
          </div>
          {!editingInfo && (
            <button className="print:hidden text-sm text-[#1A3C6B] underline hover:no-underline" onClick={() => setEditingInfo(true)}>Modifier</button>
          )}
        </div>

        {/* Résumé */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#1A3C6B]">{deplacements.length}</p>
            <p className="text-xs text-gray-400 mt-1">Déplacements</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-500">{fmtNum(totalImpaye)}</p>
            <p className="text-xs text-gray-400 mt-1">FCFA impayé</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">{contraventions.length}</p>
            <p className="text-xs text-gray-400 mt-1">Contraventions</p>
          </div>
        </div>
      </div>

      {/* Déplacements */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">Déplacements</h2>
          <button className="btn-primary flex items-center gap-2 text-sm"
            onClick={() => { setEditingDep(null); setFormDep({ date: new Date().toISOString().split('T')[0], vehicule_id: '', nombre_jours: '1', montant_journalier: '', status: 'impaye' }); setShowFormDep(true) }}>
            <MdAdd size={16} /> Nouveau déplacement
          </button>
        </div>

        {showFormDep && (
          <form onSubmit={saveDep} className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-sm font-medium text-gray-700 mb-3">{editingDep ? 'Modifier le déplacement' : 'Nouveau déplacement'}</p>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="form-label">Date *</label>
                <input type="date" className="form-input" value={formDep.date} onChange={e => setFormDep(f => ({...f, date: e.target.value}))} required />
              </div>
              <div>
                <label className="form-label">Nombre de jours</label>
                <input type="number" className="form-input" min="1" value={formDep.nombre_jours} onChange={e => setFormDep(f => ({...f, nombre_jours: e.target.value}))} />
              </div>
              <div>
                <label className="form-label">Montant journalier (FCFA)</label>
                <input type="number" className="form-input" min="0" value={formDep.montant_journalier} onChange={e => setFormDep(f => ({...f, montant_journalier: e.target.value}))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Sélection véhicule */}
              <div className="relative">
                <label className="form-label">Véhicule</label>
                {selectedVehicule ? (
                  <div className="flex items-center gap-2">
                    <div className="form-input flex-1 bg-blue-50 text-[#1A3C6B] text-sm">
                      {selectedVehicule.immatriculation} — {selectedVehicule.marque} {selectedVehicule.modele}
                    </div>
                    <button type="button" className="text-gray-400 hover:text-red-500" onClick={() => setFormDep(f => ({...f, vehicule_id: ''}))}>×</button>
                  </div>
                ) : (
                  <div className="relative">
                    <input type="text" className="form-input" placeholder="Rechercher un véhicule..."
                      value={vehiculeSearch} onChange={e => setVehiculeSearch(e.target.value)} />
                    {vehiculeSearch && vehiculesFiltres.length > 0 && (
                      <div className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                        {vehiculesFiltres.map(v => (
                          <button key={v.id} type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
                            onClick={() => { setFormDep(f => ({...f, vehicule_id: v.id})); setVehiculeSearch('') }}>
                            <span className="font-medium">{v.immatriculation}</span>
                            <span className="text-gray-400 ml-2">{v.marque} {v.modele}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="form-label">Statut</label>
                <select className="form-input" value={formDep.status} onChange={e => setFormDep(f => ({...f, status: e.target.value}))}>
                  <option value="impaye">Impayé</option>
                  <option value="paye">Payé</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm" disabled={saving}>{saving ? '...' : 'Enregistrer'}</button>
              <button type="button" className="btn-secondary text-sm" onClick={() => { setShowFormDep(false); setEditingDep(null) }}>Annuler</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['Date', 'Véhicule', 'Jours', 'Montant/jour', 'Total', 'Statut', ''].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs text-gray-500 font-semibold uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deplacements.map(d => {
                const total = (d.nombre_jours || 1) * (d.montant_journalier || 0)
                const isPaye = d.status === 'paye'
                return (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700">{fmtDate(d.date)}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {d.vehicules ? (
                        <span className="flex items-center gap-1"><MdDirectionsCar size={14} className="text-gray-400" />{d.vehicules.immatriculation}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{d.nombre_jours || 1}</td>
                    <td className="px-4 py-2 text-gray-600">{fmtNum(d.montant_journalier)}</td>
                    <td className="px-4 py-2 font-medium text-gray-800">{fmtNum(total)}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isPaye ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                        {isPaye ? 'Payé' : 'Impayé'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {confirmDel === d.id ? (
                        <ConfirmDelete onConfirm={() => deleteDep(d.id)} onCancel={() => setConfirmDel(null)} />
                      ) : (
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEditDep(d)} className="p-1 text-[#1A3C6B] hover:bg-blue-50 rounded"><MdEdit size={16} /></button>
                          <button onClick={() => setConfirmDel(d.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><MdDelete size={16} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {deplacements.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400 italic">Aucun déplacement enregistré</td></tr>
              )}
            </tbody>
            {deplacements.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                  <td className="px-4 py-2 text-gray-700" colSpan={4}>Total</td>
                  <td className="px-4 py-2 text-gray-700">{fmtNum(totalDeplacement)} FCFA</td>
                  <td className="px-4 py-2">
                    {totalImpaye > 0 && <span className="text-orange-600 text-xs">{fmtNum(totalImpaye)} impayé</span>}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Contraventions liées */}
      {contraventions.length > 0 && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <MdWarning size={18} className="text-orange-500" />
            Contraventions ({contraventions.length}) — Total : {fmtNum(totalContrav)} FCFA
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {['Date', 'Véhicule', 'Nature', 'Montant', 'Statut'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs text-gray-500 font-semibold uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contraventions.map(c => {
                  const STATUT = { payee: { label: 'Payée', cls: 'bg-green-100 text-green-800' }, en_attente: { label: 'En attente', cls: 'bg-orange-100 text-orange-800' }, contestee: { label: 'Contestée', cls: 'bg-purple-100 text-purple-800' } }
                  const s = STATUT[c.statut] || STATUT.en_attente
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-700">{fmtDate(c.date)}</td>
                      <td className="px-4 py-2 text-gray-600">{c.vehicules?.immatriculation || '—'}</td>
                      <td className="px-4 py-2 text-gray-600">{c.nature || '—'}</td>
                      <td className="px-4 py-2 font-medium text-gray-800">{fmtNum(c.montant)} FCFA</td>
                      <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page principale Chauffeurs ───────────────────────────────────────────────
export default function Chauffeurs() {
  const [chauffeurs, setChauffeurs] = useState([])
  const [vehicules, setVehicules] = useState([])
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nom_complet: '', matricule: '', grade: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState([])
  const [confirmDel, setConfirmDel] = useState(null)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('nom_complet')
  const [sortDir, setSortDir] = useState('asc')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: ch }, { data: veh }] = await Promise.all([
      supabase.from('chauffeurs').select('*').order('nom_complet'),
      supabase.from('vehicules').select('id, immatriculation, marque, modele').order('immatriculation'),
    ])
    setChauffeurs(ch || [])
    setVehicules(veh || [])

    // Stats contraventions par chauffeur
    const { data: contras } = await supabase
      .from('contraventions')
      .select('chauffeur_id, montant')
      .not('chauffeur_id', 'is', null)

    const map = {}
    ;(contras || []).forEach(c => {
      if (!map[c.chauffeur_id]) map[c.chauffeur_id] = { count: 0, montant: 0 }
      map[c.chauffeur_id].count++
      map[c.chauffeur_id].montant += c.montant || 0
    })
    const statsArr = (ch || [])
      .filter(c => map[c.id])
      .map(c => ({ nom: c.nom_complet, count: map[c.id].count, montant: map[c.id].montant }))
      .sort((a, b) => b.count - a.count)
    setStats(statsArr)
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('chauffeurs').insert({
      nom_complet: form.nom_complet,
      matricule: form.matricule || null,
      grade: form.grade || null,
    })
    setForm({ nom_complet: '', matricule: '', grade: '' })
    setShowForm(false)
    setSaving(false)
    loadAll()
  }

  async function handleDelete(id) {
    await supabase.from('chauffeurs').delete().eq('id', id)
    setConfirmDel(null)
    if (selected?.id === id) setSelected(null)
    loadAll()
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>

  if (selected) {
    return (
      <FicheChauffeur
        chauffeur={selected}
        vehicules={vehicules}
        onBack={() => { setSelected(null); loadAll() }}
        onUpdated={loadAll}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Chauffeurs</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowForm(v => !v)}>
          <MdAdd size={18} /> Nouveau chauffeur
        </button>
      </div>

      {/* Formulaire d'ajout */}
      {showForm && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Nouveau chauffeur</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="form-label">Nom complet *</label>
                <input type="text" className="form-input" placeholder="Prénom et Nom" value={form.nom_complet} onChange={e => setForm(f => ({...f, nom_complet: e.target.value}))} required />
              </div>
              <div>
                <label className="form-label">Matricule</label>
                <input type="text" className="form-input" placeholder="ex: SN-2024-001" value={form.matricule} onChange={e => setForm(f => ({...f, matricule: e.target.value}))} />
              </div>
              <div>
                <label className="form-label">Grade</label>
                <input type="text" className="form-input" placeholder="ex: Chauffeur principal" value={form.grade} onChange={e => setForm(f => ({...f, grade: e.target.value}))} />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? '...' : 'Créer le chauffeur'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Liste chauffeurs */}
        <div className="col-span-2 space-y-3">
          <SearchSort
            search={search} onSearch={setSearch}
            placeholder="Rechercher par nom, matricule, grade..."
            sortKey={sortKey} sortDir={sortDir}
            onSort={(k, d) => { setSortKey(k); setSortDir(d) }}
            sortOptions={[
              { value: 'nom_complet', label: 'Nom' },
              { value: 'matricule', label: 'Matricule' },
              { value: 'grade', label: 'Grade' },
            ]}
          />
          <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['Nom complet', 'Matricule', 'Grade', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filterSort(chauffeurs, search, ['nom_complet', 'matricule', 'grade'], sortKey, sortDir).map(c => (
                <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(c)}>
                  <td className="px-4 py-3 font-medium text-[#1A3C6B]">{c.nom_complet}</td>
                  <td className="px-4 py-3 text-gray-600">{c.matricule || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.grade || '—'}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {confirmDel === c.id ? (
                      <ConfirmDelete onConfirm={() => handleDelete(c.id)} onCancel={() => setConfirmDel(null)} />
                    ) : (
                      <button onClick={() => setConfirmDel(c.id)} className="p-1 text-red-400 hover:bg-red-50 rounded">
                        <MdDelete size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {chauffeurs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">Aucun chauffeur enregistré</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Stats infractions */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <MdWarning size={18} className="text-orange-500" />
            Infractions par chauffeur
          </h2>
          {stats.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="nom" type="category" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip formatter={(v, name) => [v, name === 'count' ? 'Infractions' : 'Montant FCFA']} />
                  <Bar dataKey="count" fill="#f97316" radius={[0,3,3,0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 divide-y divide-gray-100">
                {stats.map(s => (
                  <div key={s.nom} className="flex justify-between py-2 text-xs">
                    <span className="text-gray-700 font-medium truncate">{s.nom}</span>
                    <span className="text-gray-500">{s.count} infraction{s.count > 1 ? 's' : ''} · {fmtNum(s.montant)} FCFA</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-sm italic">Aucune infraction liée aux chauffeurs</p>
          )}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { format, parseISO } from 'date-fns'
import {
  MdAdd, MdEdit, MdDelete, MdPerson, MdArrowBack, MdPrint,
  MdCheck, MdClose, MdDirectionsCar, MdWarning,
} from 'react-icons/md'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import SearchSort from '../components/SearchSort'
import { filterSort } from '../lib/searchSort'
import Pagination from '../components/Pagination'
import { getTotalPages, paginate } from '../lib/pagination'
import { AdminOnly } from '../components/RoleContext'
import { useRole } from '../lib/roleContext'

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
  const { user, isAdmin, isChauffeur } = useRole()
  const canManageDeplacements = isAdmin || (isChauffeur && chauffeur.user_id === user?.id)
  const [deplacements, setDeplacements] = useState([])
  const [contraventions, setContraventions] = useState([])
  const [affectations, setAffectations] = useState([])
  const [allAffectations, setAllAffectations] = useState([])
  const [showFormDep, setShowFormDep] = useState(false)
  const [editingDep, setEditingDep] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [vehiculeSearch, setVehiculeSearch] = useState('')
  const [assignSearch, setAssignSearch] = useState('')
  const [assignPage, setAssignPage] = useState(1)
  const [assignSaving, setAssignSaving] = useState(null)
  const [assignError, setAssignError] = useState('')
  const [formDep, setFormDep] = useState({
    date: new Date().toISOString().split('T')[0],
    vehicule_id: '',
    site: '',
    nombre_jours: '1',
    montant_journalier: '',
    status: 'impaye',
  })
  const [saving, setSaving] = useState(false)
  const [editingInfo, setEditingInfo] = useState(false)
  const [formInfo, setFormInfo] = useState({ nom_complet: chauffeur.nom_complet, matricule: chauffeur.matricule || '', grade: chauffeur.grade || '' })

  useEffect(() => { loadAll() }, [chauffeur.id])

  async function loadAll() {
    const [{ data: deps }, { data: contras }, { data: affs, error: affsError }] = await Promise.all([
      supabase.from('deplacements')
        .select('*, vehicules(immatriculation, marque, modele)')
        .eq('chauffeur_id', chauffeur.id)
        .order('date', { ascending: false }),
      supabase.from('contraventions')
        .select('*, vehicules(immatriculation)')
        .eq('chauffeur_id', chauffeur.id)
        .order('date', { ascending: false }),
      supabase.from('chauffeur_vehicules')
        .select('*')
        .eq('chauffeur_id', chauffeur.id)
    ])
    setDeplacements(deps || [])
    setContraventions(contras || [])
    if (affsError) setAssignError(`Chargement des affectations impossible : ${affsError.message}`)
    setAllAffectations(affs || [])
    setAffectations((affs || []).filter(a => a.active))
  }

  async function toggleAffectation(vehiculeId) {
    if (!isAdmin) return
    setAssignSaving(vehiculeId)
    setAssignError('')
    const activeLink = affectations.find(a => a.vehicule_id === vehiculeId)
    const inactiveLink = allAffectations.find(a => a.vehicule_id === vehiculeId && !a.active)
    let result

    if (activeLink) {
      result = await supabase
        .from('chauffeur_vehicules')
        .update({ active: false, date_fin: new Date().toISOString().split('T')[0] })
        .eq('id', activeLink.id)
    } else if (inactiveLink) {
      result = await supabase
        .from('chauffeur_vehicules')
        .update({ active: true, date_debut: new Date().toISOString().split('T')[0], date_fin: null })
        .eq('id', inactiveLink.id)
    } else {
      result = await supabase
        .from('chauffeur_vehicules')
        .insert({ chauffeur_id: chauffeur.id, vehicule_id: vehiculeId, active: true })
    }
    if (result?.error) {
      setAssignError(`Affectation impossible : ${result.error.message}`)
    } else {
      await loadAll()
    }
    setAssignSaving(null)
  }

  async function saveInfo() {
    if (!isAdmin) return
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
    if (!canManageDeplacements) return
    setSaving(true)
    const payload = {
      chauffeur_id: chauffeur.id,
      vehicule_id: formDep.vehicule_id || null,
      site: formDep.site || null,
      date: formDep.date,
      nombre_jours: parseInt(formDep.nombre_jours) || 1,
      montant_journalier: formDep.montant_journalier ? parseInt(formDep.montant_journalier) : 0,
      status: formDep.status,
    }
    if (!editingDep) payload.created_by = user?.id || null
    if (editingDep) {
      await supabase.from('deplacements').update(payload).eq('id', editingDep)
    } else {
      await supabase.from('deplacements').insert(payload)
    }
    setShowFormDep(false)
    setEditingDep(null)
    setFormDep({ date: new Date().toISOString().split('T')[0], vehicule_id: '', site: '', nombre_jours: '1', montant_journalier: '', status: 'impaye' })
    setSaving(false)
    loadAll()
  }

  async function deleteDep(id) {
    if (!canManageDeplacements) return
    await supabase.from('deplacements').delete().eq('id', id)
    setConfirmDel(null)
    loadAll()
  }

  function startEditDep(d) {
    if (!isAdmin && d.created_by !== user?.id) return
    setEditingDep(d.id)
    setFormDep({
      date: d.date,
      vehicule_id: d.vehicule_id || '',
      site: d.site || '',
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

  const assignedIds = new Set(affectations.map(a => a.vehicule_id))
  const affectationVehicules = vehicules
    .filter(v => `${v.immatriculation} ${v.marque || ''} ${v.modele || ''} ${v.affectation_lieu || ''}`.toLowerCase().includes(assignSearch.toLowerCase()))
    .sort((a, b) => {
      const assignedDiff = Number(assignedIds.has(b.id)) - Number(assignedIds.has(a.id))
      if (assignedDiff !== 0) return assignedDiff
      return (a.immatriculation || '').localeCompare(b.immatriculation || '')
    })
  const ASSIGN_PER_PAGE = 6
  const currentAssignPage = Math.min(assignPage, getTotalPages(affectationVehicules.length, ASSIGN_PER_PAGE))
  const paginatedAffectationVehicules = paginate(affectationVehicules, currentAssignPage, ASSIGN_PER_PAGE)

  const selectedVehicule = vehicules.find(v => v.id === formDep.vehicule_id)

  const totalDeplacement = deplacements.reduce((s, d) => s + (d.nombre_jours || 1) * (d.montant_journalier || 0), 0)
  const totalImpaye = deplacements.filter(d => d.status === 'impaye').reduce((s, d) => s + (d.nombre_jours || 1) * (d.montant_journalier || 0), 0)
  const totalContrav = contraventions.reduce((s, c) => s + (c.montant || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <button className="text-sm text-[#1A3C6B] hover:underline flex items-center gap-1" onClick={onBack}>
          <MdArrowBack size={16} /> Retour à la liste
        </button>
        <button className="btn-secondary flex items-center gap-2 text-sm" onClick={() => window.print()}>
          <MdPrint size={16} /> Imprimer la fiche
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
          {!editingInfo && isAdmin && (
            <button className="print:hidden text-sm text-[#1A3C6B] underline hover:no-underline" onClick={() => setEditingInfo(true)}>Modifier</button>
          )}
        </div>

        {/* Résumé */}
        <div className="grid grid-cols-1 gap-4 mt-5 pt-5 border-t border-gray-100 sm:grid-cols-3">
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

      {isAdmin && (
        <div className="card print:hidden">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Affectation vehicules</h2>
              <p className="mt-1 text-sm text-gray-500">
                {affectations.length} vehicule{affectations.length > 1 ? 's' : ''} affecte{affectations.length > 1 ? 's' : ''}
              </p>
            </div>
            <input
              className="form-input sm:max-w-xs"
              value={assignSearch}
              onChange={e => { setAssignSearch(e.target.value); setAssignPage(1) }}
              placeholder="Rechercher un vehicule..."
            />
          </div>
          {assignError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {assignError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {paginatedAffectationVehicules.map(v => {
              const checked = assignedIds.has(v.id)
              const savingThis = assignSaving === v.id
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => toggleAffectation(v.id)}
                  disabled={!!assignSaving}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    checked ? 'border-[#1A3C6B] bg-blue-50' : 'border-gray-200 bg-white hover:border-[#1A3C6B]/40 hover:bg-gray-50'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-gray-800">{v.immatriculation}</span>
                    <span className="block truncate text-xs text-gray-500">{v.marque} {v.modele}</span>
                    {v.affectation_lieu && <span className="block truncate text-xs text-gray-400">{v.affectation_lieu}</span>}
                  </span>
                  <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    checked ? 'bg-[#1A3C6B] text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {savingThis ? '...' : (checked ? 'Affecte' : 'Affecter')}
                  </span>
                </button>
              )
            })}
            {affectationVehicules.length === 0 && <p className="text-sm text-gray-400 italic">Aucun vehicule disponible</p>}
          </div>
          <Pagination
            total={affectationVehicules.length}
            page={currentAssignPage}
            perPage={ASSIGN_PER_PAGE}
            onPage={setAssignPage}
          />
        </div>
      )}
      {/* Déplacements */}
      <div className="card">
        <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-gray-800">Déplacements</h2>
          {canManageDeplacements && (
            <button className="btn-primary flex w-full items-center justify-center gap-2 text-sm sm:w-auto"
              onClick={() => { setEditingDep(null); setFormDep({ date: new Date().toISOString().split('T')[0], vehicule_id: '', site: '', nombre_jours: '1', montant_journalier: '', status: 'impaye' }); setShowFormDep(true) }}>
              <MdAdd size={16} /> Nouveau déplacement
            </button>
          )}
        </div>

        {showFormDep && canManageDeplacements && (
          <form onSubmit={saveDep} className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-sm font-medium text-gray-700 mb-3">{editingDep ? 'Modifier le déplacement' : 'Nouveau déplacement'}</p>
            <div className="grid grid-cols-1 gap-3 mb-3 md:grid-cols-3">
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
            <div className="grid grid-cols-1 gap-3 mb-3 md:grid-cols-2">
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
            <div className="mb-3">
              <label className="form-label">Site</label>
              <input
                type="text"
                className="form-input"
                value={formDep.site}
                onChange={e => setFormDep(f => ({ ...f, site: e.target.value }))}
                placeholder="Ex: District Thiès, Siège, chantier..."
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-sm" disabled={saving}>{saving ? '...' : 'Enregistrer'}</button>
              <button type="button" className="btn-secondary text-sm" onClick={() => { setShowFormDep(false); setEditingDep(null) }}>Annuler</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['Date', 'Véhicule', 'Site', 'Jours', 'Montant/jour', 'Total', 'Statut', ''].map(h => (
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
                    <td className="px-4 py-2 text-gray-600">{d.site || '—'}</td>
                    <td className="px-4 py-2 text-gray-600">{d.nombre_jours || 1}</td>
                    <td className="px-4 py-2 text-gray-600">{fmtNum(d.montant_journalier)}</td>
                    <td className="px-4 py-2 font-medium text-gray-800">{fmtNum(total)}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isPaye ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                        {isPaye ? 'Payé' : 'Impayé'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {(isAdmin || d.created_by === user?.id) && (confirmDel === d.id ? (
                        <ConfirmDelete onConfirm={() => deleteDep(d.id)} onCancel={() => setConfirmDel(null)} />
                      ) : (
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEditDep(d)} className="p-1 text-[#1A3C6B] hover:bg-blue-50 rounded"><MdEdit size={16} /></button>
                          <button onClick={() => setConfirmDel(d.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><MdDelete size={16} /></button>
                        </div>
                      ))}
                    </td>
                  </tr>
                )
              })}
              {deplacements.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400 italic">Aucun déplacement enregistré</td></tr>
              )}
            </tbody>
            {deplacements.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                  <td className="px-4 py-2 text-gray-700" colSpan={5}>Total</td>
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
          <div className="overflow-x-auto scrollbar-thin">
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
  const { user, isAdmin, isChauffeur, vehiculeIds, scopeLoading } = useRole()
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
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [statsPage, setStatsPage] = useState(1)
  const STATS_PER_PAGE = 5

  useEffect(() => {
    if (!scopeLoading) loadAll()
  }, [scopeLoading, isChauffeur, vehiculeIds.join(','), user?.id])

  const filteredChauffeurs = filterSort(chauffeurs, search, ['nom_complet', 'matricule', 'grade'], sortKey, sortDir)
  const currentPage = Math.min(page, getTotalPages(filteredChauffeurs.length, perPage))
  const currentStatsPage = Math.min(statsPage, getTotalPages(stats.length, STATS_PER_PAGE))
  const paginatedStats = paginate(stats, currentStatsPage, STATS_PER_PAGE)

  async function loadAll() {
    setLoading(true)
    let chauffeursQuery = supabase.from('chauffeurs').select('*').order('nom_complet')
    let vehiculesQuery = supabase.from('vehicules').select('id, immatriculation, marque, modele, affectation_lieu').order('immatriculation')
    if (isChauffeur) {
      chauffeursQuery = chauffeursQuery.eq('user_id', user?.id)
      if (vehiculeIds.length === 0) {
        vehiculesQuery = vehiculesQuery.limit(0)
      } else {
        vehiculesQuery = vehiculesQuery.in('id', vehiculeIds)
      }
    }
    const [{ data: ch }, { data: veh }] = await Promise.all([
      chauffeursQuery,
      vehiculesQuery,
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
    if (!isAdmin) return
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
    if (!isAdmin) return
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Chauffeurs</h1>
        <AdminOnly>
          <button className="btn-primary flex w-full items-center justify-center gap-2 sm:w-auto" onClick={() => setShowForm(v => !v)}>
            <MdAdd size={18} /> Nouveau chauffeur
          </button>
        </AdminOnly>
      </div>

      {/* Formulaire d'ajout */}
      {showForm && isAdmin && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Nouveau chauffeur</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Liste chauffeurs */}
        <div className="space-y-3 xl:col-span-2">
          <SearchSort
            search={search} onSearch={v => { setSearch(v); setPage(1) }}
            placeholder="Rechercher par nom, matricule, grade..."
            sortKey={sortKey} sortDir={sortDir}
            onSort={(k, d) => { setSortKey(k); setSortDir(d); setPage(1) }}
            sortOptions={[
              { value: 'nom_complet', label: 'Nom' },
              { value: 'matricule', label: 'Matricule' },
              { value: 'grade', label: 'Grade' },
            ]}
          />
          {(() => {
            const filteredCh = filteredChauffeurs
            const paginatedCh = paginate(filteredCh, currentPage, perPage)
            return (
              <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      {['Nom complet', 'Matricule', 'Grade', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedCh.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(c)}>
                        <td className="px-4 py-3 font-medium text-[#1A3C6B]">{c.nom_complet}</td>
                        <td className="px-4 py-3 text-gray-600">{c.matricule || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{c.grade || '—'}</td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          {isAdmin && (confirmDel === c.id ? (
                            <ConfirmDelete onConfirm={() => handleDelete(c.id)} onCancel={() => setConfirmDel(null)} />
                          ) : (
                            <button onClick={() => setConfirmDel(c.id)} className="p-1 text-red-400 hover:bg-red-50 rounded">
                              <MdDelete size={16} />
                            </button>
                          ))}
                        </td>
                      </tr>
                    ))}
                    {filteredCh.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">Aucun chauffeur enregistré</td></tr>
                    )}
                  </tbody>
                </table>
                </div>
                <Pagination
                  total={filteredCh.length}
                  page={currentPage}
                  perPage={perPage}
                  onPage={setPage}
                  onPerPage={size => { setPerPage(size); setPage(1) }}
                />
              </div>
            )
          })()}
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
                {paginatedStats.map(s => (
                  <div key={s.nom} className="flex justify-between py-2 text-xs">
                    <span className="text-gray-700 font-medium truncate">{s.nom}</span>
                    <span className="text-gray-500">{s.count} infraction{s.count > 1 ? 's' : ''} · {fmtNum(s.montant)} FCFA</span>
                  </div>
                ))}
              </div>
              <Pagination
                total={stats.length}
                page={currentStatsPage}
                perPage={STATS_PER_PAGE}
                onPage={setStatsPage}
              />
            </>
          ) : (
            <p className="text-gray-400 text-sm italic">Aucune infraction liée aux chauffeurs</p>
          )}
        </div>
      </div>
    </div>
  )
}

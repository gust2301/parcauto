import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MdGarage, MdNotificationsActive, MdPayments, MdAssessment, MdPrint, MdDirectionsCar, MdPerson } from 'react-icons/md'
import StatCard from '../components/StatCard'
import AlerteBadge from '../components/AlerteBadge'
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import Pagination from '../components/Pagination'
import { getTotalPages, paginate } from '../lib/pagination'
import { useRole } from '../lib/roleContext'

function fmt(n) { return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA' }
function fmtDate(d) { if (!d) return '—'; return format(parseISO(d), 'dd/MM/yyyy') }

const FILTRE_OPTIONS = ['Tout', 'Carburant', 'Assurance', 'Contravention', 'Entretien', 'Péages']
const COLORS_VEHICULE = ['#1A3C6B','#2563eb','#0891b2','#059669','#7c3aed','#db2777','#ea580c']
const CARD_PAGE_SIZE = 5
const COST_KEYS = ['Assurance', 'Carburant', 'Contravention', 'Entretien', 'Péages']

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  const total = COST_KEYS.reduce((sum, key) => sum + (row[key] || 0), 0)

  return (
    <div className="min-w-64 rounded-lg border border-gray-100 bg-white p-3 text-xs shadow-lg">
      <p className="mb-3 text-sm font-semibold text-gray-800">{row.name}</p>
      <div className="space-y-1.5">
        {COST_KEYS.map(key => (
          <div key={key} className="flex justify-between gap-6 text-gray-600">
            <span>{key}</span>
            <span className="text-right font-medium text-gray-800">{(row[key] || 0).toLocaleString('fr-FR')} FCFA</span>
          </div>
        ))}
      </div>
      <hr className="my-2 border-gray-200" />
      <div className="flex justify-between gap-6 text-sm font-bold text-[#1A3C6B]">
        <span>TOTAL</span>
        <span className="text-right">{total.toLocaleString('fr-FR')} FCFA</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { isChauffeur, vehiculeIds, scopeLoading } = useRole()
  const [stats, setStats] = useState({ actifs: 0, alertes: 0, coutMois: 0, coutAnnee: 0 })
  const [alertesDocs, setAlertesDocs] = useState([])
  const [coutParVehicule, setCoutParVehicule] = useState([])
  const [filtreVehicule, setFiltreVehicule] = useState('Tout')
  const [periodeCouts, setPeriodeCouts] = useState('annee')
  const [vehiculeSearch, setVehiculeSearch] = useState('')
  const [selectedVehicules, setSelectedVehicules] = useState([])
  const [deplacements, setDeplacements] = useState([])
  const [alertesPage, setAlertesPage] = useState(1)
  const [deplacementsPage, setDeplacementsPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [costsLoading, setCostsLoading] = useState(false)
  const hasLoaded = useRef(false)

  async function loadAll() {
    const initialLoad = !hasLoaded.current
    if (initialLoad) setLoading(true)
    else setCostsLoading(true)
    const now = new Date()
    const debutMois  = format(startOfMonth(now), 'yyyy-MM-dd')
    const finMois    = format(endOfMonth(now),   'yyyy-MM-dd')
    const debutAnnee = format(startOfYear(now),  'yyyy-MM-dd')
    const finAnnee   = format(endOfYear(now),    'yyyy-MM-dd')
    const debutCouts = periodeCouts === 'mois' ? debutMois : debutAnnee
    const finCouts = periodeCouts === 'mois' ? finMois : finAnnee

    const [
      { data: vehicules },
      { data: docs },
      { data: assurances },
      { data: entretiensMois },
      { data: contraventionsMois },
      { data: assurancesMois },
      { data: carburantMois },
      { data: peagesMois },
      { data: entretiensAnnee },
      { data: contraventionsAnnee },
      { data: assurancesAnnee },
      { data: carburantAnnee },
      { data: peagesAnnee },
      { data: deps },
      { data: peageCartes },
      { data: peageTransactions },
      { data: carburantCartes },
      { data: carburantCarteTransactions },
    ] = await Promise.all([
      isChauffeur && vehiculeIds.length === 0
        ? supabase.from('vehicules').select('id, statut, immatriculation, marque, modele').limit(0)
        : (isChauffeur
          ? supabase.from('vehicules').select('id, statut, immatriculation, marque, modele').in('id', vehiculeIds)
          : supabase.from('vehicules').select('id, statut, immatriculation, marque, modele')),
      supabase.from('documents').select('*, vehicules(immatriculation, marque, modele)'),
      supabase.from('assurances').select('*, vehicules(immatriculation, marque, modele)').order('date_echeance', { ascending: false }),
      supabase.from('entretiens').select('cout, vehicule_id').gte('date', debutMois).lte('date', finMois),
      supabase.from('contraventions').select('montant, vehicule_id').gte('date', debutMois).lte('date', finMois),
      supabase.from('assurances').select('montant, vehicule_id').gte('date_debut', debutMois).lte('date_debut', finMois),
      supabase.from('carburant').select('montant, vehicule_id').gte('date', debutMois).lte('date', finMois),
      supabase.from('peage_transactions').select('montant, vehicule_id').neq('type', 'rechargement').gte('date', debutMois).lte('date', finMois),
      supabase.from('entretiens').select('cout, vehicule_id').gte('date', debutAnnee).lte('date', finAnnee),
      supabase.from('contraventions').select('montant, vehicule_id').gte('date', debutAnnee).lte('date', finAnnee),
      supabase.from('assurances').select('montant, vehicule_id').gte('date_debut', debutAnnee).lte('date_debut', finAnnee),
      supabase.from('carburant').select('montant, vehicule_id').gte('date', debutAnnee).lte('date', finAnnee),
      supabase.from('peage_transactions').select('montant, vehicule_id').neq('type', 'rechargement').gte('date', debutAnnee).lte('date', finAnnee),
      supabase.from('deplacements').select('*, chauffeurs(nom_complet), vehicules(immatriculation)').order('date', { ascending: false }).limit(100),
      supabase.from('peage_cartes').select('*'),
      supabase.from('peage_transactions').select('carte_id, montant, type, vehicule_id, vehicules(immatriculation)'),
      supabase.from('carburant_cartes').select('*'),
      supabase.from('carburant_carte_transactions').select('carte_id, montant, type, vehicule_id, vehicules(immatriculation)'),
    ])

    const scoped = rows => isChauffeur ? (rows || []).filter(r => !r.vehicule_id || vehiculeIds.includes(r.vehicule_id)) : (rows || [])
    const scopedDocs = scoped(docs)
    const scopedAssurances = scoped(assurances)

    const actifs = (vehicules || []).filter(v => v.statut === 'actif').length
    const coutMois = [scoped(entretiensMois), scoped(contraventionsMois), scoped(assurancesMois), scoped(carburantMois), scoped(peagesMois)]
      .flat().filter(Boolean).reduce((s, e) => s + (e.cout || e.montant || 0), 0)
    const coutAnnee = [scoped(entretiensAnnee), scoped(contraventionsAnnee), scoped(assurancesAnnee), scoped(carburantAnnee), scoped(peagesAnnee)]
      .flat().filter(Boolean).reduce((s, e) => s + (e.cout || e.montant || 0), 0)

    // Alertes
    const alertesVisite = scopedDocs
      .filter(d => d.type === 'visite_technique' && d.date_echeance)
      .map(d => ({ ...d, jours: differenceInDays(parseISO(d.date_echeance), now), label: 'Visite technique' }))
    const assurancesParVehicule = {}
    ;(scopedAssurances || []).forEach(a => { if (!assurancesParVehicule[a.vehicule_id]) assurancesParVehicule[a.vehicule_id] = a })
    const alertesAssurance = Object.values(assurancesParVehicule)
      .filter(a => a.date_echeance)
      .map(a => ({ ...a, type: 'assurance', jours: differenceInDays(parseISO(a.date_echeance), now), label: 'Assurance' }))
    const docsAlerte = [...alertesVisite, ...alertesAssurance].filter(d => d.jours <= 30).sort((a, b) => a.jours - b.jours)
    const scopedPeageTransactions = scoped(peageTransactions)
    const alertesPeages = (peageCartes || []).map(carte => {
      const carteTransactions = (scopedPeageTransactions || []).filter(t => t.carte_id === carte.id)
      const solde = (scopedPeageTransactions || [])
        .filter(t => t.carte_id === carte.id)
        .reduce((sum, t) => {
          if (t.type === 'rechargement') return sum + (t.montant || 0)
          if (t.type === 'passage_carte') return sum - (t.montant || 0)
          return sum
        }, 0)
      const lastPassage = carteTransactions.find(t => t.type === 'passage_carte' && t.vehicule_id)
      return { ...carte, vehicule_id: lastPassage?.vehicule_id, vehicules: lastPassage?.vehicules, type: 'peage', label: 'Péage', solde }
    }).filter(carte => carte.solde < (carte.seuil_alerte || 0))
    const scopedCarburantCarteTransactions = scoped(carburantCarteTransactions)
    const alertesCarburantCartes = (carburantCartes || []).map(carte => {
      const carteTransactions = (scopedCarburantCarteTransactions || []).filter(t => t.carte_id === carte.id)
      const solde = carteTransactions.reduce((sum, t) => {
        if (t.type === 'approvisionnement') return sum + (t.montant || 0)
        if (t.type === 'consommation') return sum - (t.montant || 0)
        return sum
      }, 0)
      const lastUsage = [...carteTransactions].reverse().find(t => t.type === 'consommation' && t.vehicule_id)
      return { ...carte, vehicule_id: lastUsage?.vehicule_id, vehicules: lastUsage?.vehicules, type: 'carburant_carte', label: 'Carte carburant', solde }
    }).filter(carte => carte.solde <= (carte.seuil_alerte || 0))

    // Coût par véhicule avec détail par catégorie.
    const coutVehicule = await Promise.all((vehicules || []).map(async v => {
      const [{ data: ent }, { data: con }, { data: ass }, { data: carb }, { data: peage }] = await Promise.all([
        supabase.from('entretiens').select('cout').eq('vehicule_id', v.id).gte('date', debutCouts).lte('date', finCouts),
        supabase.from('contraventions').select('montant').eq('vehicule_id', v.id).gte('date', debutCouts).lte('date', finCouts),
        supabase.from('assurances').select('montant').eq('vehicule_id', v.id).gte('date_debut', debutCouts).lte('date_debut', finCouts),
        supabase.from('carburant').select('montant').eq('vehicule_id', v.id).gte('date', debutCouts).lte('date', finCouts),
        supabase.from('peage_transactions').select('montant').eq('vehicule_id', v.id).neq('type', 'rechargement').gte('date', debutCouts).lte('date', finCouts),
      ])
      const carburant  = (carb || []).reduce((s, e) => s + (e.montant || 0), 0)
      const assurance  = (ass || []).reduce((s, e) => s + (e.montant || 0), 0)
      const contravention = (con || []).reduce((s, e) => s + (e.montant || 0), 0)
      const entretien  = (ent || []).reduce((s, e) => s + (e.cout || 0), 0)
      const peages = (peage || []).reduce((s, e) => s + (e.montant || 0), 0)
      return {
        id: v.id,
        name: v.immatriculation,
        marque: `${v.marque || ''} ${v.modele || ''}`.trim(),
        carburant,
        assurance,
        contravention,
        entretien,
        peages,
        total: carburant + assurance + contravention + entretien + peages,
      }
    }))

    setStats({ actifs, alertes: docsAlerte.length + alertesPeages.length + alertesCarburantCartes.length, coutMois, coutAnnee })
    setAlertesDocs([...docsAlerte, ...alertesPeages, ...alertesCarburantCartes])
    setCoutParVehicule(coutVehicule.filter(v => v.total > 0).sort((a, b) => b.total - a.total))
    setDeplacements(scoped(deps))
    hasLoaded.current = true
    setLoading(false)
    setCostsLoading(false)
  }

  useEffect(() => {
    if (!scopeLoading) Promise.resolve().then(loadAll)
  }, [scopeLoading, isChauffeur, vehiculeIds.join(','), periodeCouts])

  const typeLabel = { assurance: 'Assurance', visite_technique: 'Visite technique' }
  const currentAlertesPage = Math.min(alertesPage, getTotalPages(alertesDocs.length, CARD_PAGE_SIZE))
  const currentDeplacementsPage = Math.min(deplacementsPage, getTotalPages(deplacements.length, CARD_PAGE_SIZE))
  const paginatedAlertes = paginate(alertesDocs, currentAlertesPage, CARD_PAGE_SIZE)
  const paginatedDeplacements = paginate(deplacements, currentDeplacementsPage, CARD_PAGE_SIZE)

  const selectedVehiculeDetails = coutParVehicule.filter(v => selectedVehicules.includes(v.id))
  const vehiculesGraph = selectedVehicules.length === 0
    ? coutParVehicule
    : selectedVehiculeDetails

  function toggleVehicule(id) {
    setSelectedVehicules(current => current.includes(id) ? current.filter(v => v !== id) : [...current, id])
  }

  function addVehiculeSearch(e) {
    e?.preventDefault()
    const q = vehiculeSearch.trim().toLowerCase()
    if (!q) return
    const matches = coutParVehicule.filter(v => `${v.name} ${v.marque}`.toLowerCase().includes(q))
    if (matches.length === 0) return
    setSelectedVehicules(current => [...new Set([...current, ...matches.map(v => v.id)])])
    setVehiculeSearch('')
  }

  // Données graphe selon filtre
  const graphData = vehiculesGraph.map(v => ({
    name: v.name,
    Carburant: v.carburant,
    Assurance: v.assurance,
    Contravention: v.contravention,
    Entretien: v.entretien,
    Péages: v.peages,
  }))
  const chartWidth = Math.max(graphData.length * 80, 800)

  const BARS = {
    'Tout':          [{ key: 'Carburant', color: '#10b981' }, { key: 'Assurance', color: '#1A3C6B' }, { key: 'Contravention', color: '#f97316' }, { key: 'Entretien', color: '#8b5cf6' }, { key: 'Péages', color: '#e11d48' }],
    'Carburant':     [{ key: 'Carburant', color: '#10b981' }],
    'Assurance':     [{ key: 'Assurance', color: '#1A3C6B' }],
    'Contravention': [{ key: 'Contravention', color: '#f97316' }],
    'Entretien':     [{ key: 'Entretien', color: '#8b5cf6' }],
    'Péages':        [{ key: 'Péages', color: '#e11d48' }],
  }

  if (loading || scopeLoading) return <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Tableau de bord</h1>
        <button className="print:hidden btn-secondary flex w-full items-center justify-center gap-2 text-sm sm:w-auto" onClick={() => window.print()}>
          <MdPrint size={16} /> Imprimer
        </button>
      </div>

      {/* StatCards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard titre="Véhicules actifs"   valeur={stats.actifs}            icone={MdGarage}              couleur="blue" />
        <StatCard titre="Alertes actives"    valeur={stats.alertes}           icone={MdNotificationsActive}  couleur={stats.alertes > 0 ? 'red' : 'green'} />
        <StatCard titre="Coût du mois"       valeur={fmt(stats.coutMois)}     icone={MdPayments}             couleur="orange" />
        <StatCard titre="Coût de l'année"    valeur={fmt(stats.coutAnnee)}    icone={MdAssessment}           couleur="purple" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Alertes */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Alertes actives</h2>
          {alertesDocs.length === 0 ? (
            <p className="text-gray-400 text-sm italic text-center py-4">Aucune alerte</p>
          ) : (
            <div className="space-y-2">
              {paginatedAlertes.map(d => (
                <div key={d.id}
                  className="flex flex-col gap-2 py-2 border-b border-gray-100 last:border-0 hover:bg-blue-50 rounded-lg px-2 cursor-pointer transition-colors sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => {
                    if (d.type === 'carburant_carte') {
                      navigate('/carburant/cartes')
                      return
                    }
                    if (d.vehicule_id) {
                      navigate(`/vehicules/${d.vehicule_id}?tab=${d.type === 'peage' ? 'peages' : 'documents'}`)
                    }
                  }}>
                  <div>
                    {d.type === 'peage' || d.type === 'carburant_carte' ? (
                      <>
                        <p className="text-sm font-medium text-gray-800">{(d.nom || d.numero)} - {d.vehicules?.immatriculation || 'Aucun véhicule récent'}</p>
                        <p className="text-xs text-gray-400">Solde : {fmt(d.solde)} - Seuil : {fmt(d.seuil_alerte || 0)}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-gray-800">{d.vehicules?.immatriculation} - {typeLabel[d.type] || d.type}</p>
                        <p className="text-xs text-gray-400">Echeance : {fmtDate(d.date_echeance)}</p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {d.type === 'peage' || d.type === 'carburant_carte' ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Solde bas</span>
                    ) : (
                      <AlerteBadge dateEcheance={d.date_echeance} />
                    )}
                    <span className="text-xs text-[#1A3C6B]">-&gt;</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pagination
            total={alertesDocs.length}
            page={currentAlertesPage}
            perPage={CARD_PAGE_SIZE}
            onPage={setAlertesPage}
          />
        </div>

        {/* Déplacements chauffeurs */}
        <div className="card">
          <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <MdPerson size={18} className="text-[#1A3C6B]" /> Déplacements chauffeurs
            </h2>
            <button className="text-xs text-[#1A3C6B] underline hover:no-underline" onClick={() => navigate('/chauffeurs')}>
              Gérer les chauffeurs →
            </button>
          </div>
          <div className="max-h-64 overflow-auto scrollbar-thin">
            {deplacements.length === 0 ? (
              <p className="text-gray-400 text-sm italic text-center py-4">Aucun déplacement enregistré</p>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-xs text-gray-500 font-semibold uppercase">Chauffeur</th>
                    <th className="text-left py-2 text-xs text-gray-500 font-semibold uppercase">Véhicule</th>
                    <th className="text-left py-2 text-xs text-gray-500 font-semibold uppercase">Site</th>
                    <th className="text-right py-2 text-xs text-gray-500 font-semibold uppercase">Total</th>
                    <th className="text-right py-2 text-xs text-gray-500 font-semibold uppercase">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedDeplacements.map(d => {
                    const total = (d.nombre_jours || 1) * (d.montant_journalier || 0)
                    const isPaye = d.status === 'paye'
                    return (
                      <tr key={d.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate('/chauffeurs')}>
                        <td className="py-2 text-gray-700 font-medium">{d.chauffeurs?.nom_complet || '—'}</td>
                        <td className="py-2 text-gray-500 flex items-center gap-1">
                          <MdDirectionsCar size={13} className="text-gray-400" />
                          {d.vehicules?.immatriculation || '—'}
                        </td>
                        <td className="py-2 text-gray-500">{d.site || '—'}</td>
                        <td className="py-2 text-right text-gray-700">{new Intl.NumberFormat('fr-FR').format(total)}</td>
                        <td className="py-2 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isPaye ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                            {isPaye ? 'Payé' : 'Impayé'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            )}
          </div>
          <Pagination
            total={deplacements.length}
            page={currentDeplacementsPage}
            perPage={CARD_PAGE_SIZE}
            onPage={setDeplacementsPage}
          />
        </div>
      </div>

      {/* Graphe comparaison coûts par véhicule */}
      <div className="card">
        <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Coûts par véhicule</h2>
            <p className="text-xs text-gray-400 mt-1">
              {periodeCouts === 'mois' ? 'Vue mensuelle' : 'Vue annuelle'}
              {costsLoading && <span className="ml-2">Actualisation...</span>}
            </p>
          </div>
          <div className="flex flex-col gap-2 print:hidden lg:items-end">
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-gray-200 text-sm">
              {[
                { value: 'mois', label: 'Mensuel' },
                { value: 'annee', label: 'Annuel' },
              ].map(p => (
                <button key={p.value}
                  onClick={() => setPeriodeCouts(p.value)}
                  className={`shrink-0 px-3 py-1.5 ${periodeCouts === p.value ? 'bg-[#1A3C6B] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-gray-200 text-sm">
              {FILTRE_OPTIONS.map(f => (
                <button key={f}
                  onClick={() => setFiltreVehicule(f)}
                  className={`shrink-0 px-3 py-1.5 ${filtreVehicule === f ? 'bg-[#1A3C6B] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-4 space-y-3 print:hidden">
          <form onSubmit={addVehiculeSearch} className="flex max-w-md flex-col gap-2 sm:flex-row">
            <input
              className="form-input sm:flex-1"
              value={vehiculeSearch}
              onChange={e => setVehiculeSearch(e.target.value)}
              placeholder="Immatriculation ou modele..."
            />
            <button type="submit" className="btn-primary shrink-0">Valider</button>
          </form>
          {selectedVehiculeDetails.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedVehiculeDetails.map(v => (
                <button key={v.id} type="button" onClick={() => toggleVehicule(v.id)}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 hover:bg-red-50 hover:text-red-600">
                  {v.name} x
                </button>
              ))}
              <button type="button" onClick={() => setSelectedVehicules([])} className="text-xs text-[#1A3C6B] underline">
                Tout afficher
              </button>
            </div>
          )}
        </div>
        {graphData.length === 0 ? (
          <p className="text-gray-400 text-sm italic text-center py-8">Aucune donnée pour cette année</p>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ width: chartWidth, minWidth: 800 }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={graphData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    angle={0}
                    textAnchor="middle"
                    interval={0}
                    height={40}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {BARS[filtreVehicule].map(b => (
                    <Bar key={b.key} dataKey={b.key} fill={b.color} radius={[3,3,0,0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


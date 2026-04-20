import { useEffect, useState } from 'react'
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

function fmt(n) { return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA' }
function fmtDate(d) { if (!d) return '—'; return format(parseISO(d), 'dd/MM/yyyy') }

const FILTRE_OPTIONS = ['Tout', 'Carburant', 'Assurance', 'Contravention']
const COLORS_VEHICULE = ['#1A3C6B','#2563eb','#0891b2','#059669','#7c3aed','#db2777','#ea580c']
const CARD_PAGE_SIZE = 5

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ actifs: 0, alertes: 0, coutMois: 0, coutAnnee: 0 })
  const [alertesDocs, setAlertesDocs] = useState([])
  const [coutParVehicule, setCoutParVehicule] = useState([])
  const [filtreVehicule, setFiltreVehicule] = useState('Tout')
  const [deplacements, setDeplacements] = useState([])
  const [alertesPage, setAlertesPage] = useState(1)
  const [deplacementsPage, setDeplacementsPage] = useState(1)
  const [loading, setLoading] = useState(true)

  async function loadAll() {
    setLoading(true)
    const now = new Date()
    const debutMois  = format(startOfMonth(now), 'yyyy-MM-dd')
    const finMois    = format(endOfMonth(now),   'yyyy-MM-dd')
    const debutAnnee = format(startOfYear(now),  'yyyy-MM-dd')
    const finAnnee   = format(endOfYear(now),    'yyyy-MM-dd')

    const [
      { data: vehicules },
      { data: docs },
      { data: assurances },
      { data: entretiensMois },
      { data: contraventionsMois },
      { data: assurancesMois },
      { data: carburantMois },
      { data: entretiensAnnee },
      { data: contraventionsAnnee },
      { data: assurancesAnnee },
      { data: carburantAnnee },
      { data: deps },
    ] = await Promise.all([
      supabase.from('vehicules').select('id, statut, immatriculation, marque, modele'),
      supabase.from('documents').select('*, vehicules(immatriculation, marque, modele)'),
      supabase.from('assurances').select('*, vehicules(immatriculation, marque, modele)').order('date_echeance', { ascending: false }),
      supabase.from('entretiens').select('cout').gte('date', debutMois).lte('date', finMois),
      supabase.from('contraventions').select('montant').gte('date', debutMois).lte('date', finMois),
      supabase.from('assurances').select('montant').gte('date_debut', debutMois).lte('date_debut', finMois),
      supabase.from('carburant').select('montant').gte('date', debutMois).lte('date', finMois),
      supabase.from('entretiens').select('cout').gte('date', debutAnnee).lte('date', finAnnee),
      supabase.from('contraventions').select('montant').gte('date', debutAnnee).lte('date', finAnnee),
      supabase.from('assurances').select('montant').gte('date_debut', debutAnnee).lte('date_debut', finAnnee),
      supabase.from('carburant').select('montant').gte('date', debutAnnee).lte('date', finAnnee),
      supabase.from('deplacements').select('*, chauffeurs(nom_complet), vehicules(immatriculation)').order('date', { ascending: false }).limit(100),
    ])

    const actifs = (vehicules || []).filter(v => v.statut === 'actif').length
    const coutMois = [entretiensMois, contraventionsMois, assurancesMois, carburantMois]
      .flat().filter(Boolean).reduce((s, e) => s + (e.cout || e.montant || 0), 0)
    const coutAnnee = [entretiensAnnee, contraventionsAnnee, assurancesAnnee, carburantAnnee]
      .flat().filter(Boolean).reduce((s, e) => s + (e.cout || e.montant || 0), 0)

    // Alertes
    const alertesVisite = (docs || [])
      .filter(d => d.type === 'visite_technique' && d.date_echeance)
      .map(d => ({ ...d, jours: differenceInDays(parseISO(d.date_echeance), now), label: 'Visite technique' }))
    const assurancesParVehicule = {}
    ;(assurances || []).forEach(a => { if (!assurancesParVehicule[a.vehicule_id]) assurancesParVehicule[a.vehicule_id] = a })
    const alertesAssurance = Object.values(assurancesParVehicule)
      .filter(a => a.date_echeance)
      .map(a => ({ ...a, type: 'assurance', jours: differenceInDays(parseISO(a.date_echeance), now), label: 'Assurance' }))
    const docsAlerte = [...alertesVisite, ...alertesAssurance].filter(d => d.jours <= 30).sort((a, b) => a.jours - b.jours)

    // Coût par véhicule (annuel) avec détail par catégorie
    const coutVehicule = await Promise.all((vehicules || []).map(async v => {
      const [{ data: ent }, { data: con }, { data: ass }, { data: carb }] = await Promise.all([
        supabase.from('entretiens').select('cout').eq('vehicule_id', v.id).gte('date', debutAnnee).lte('date', finAnnee),
        supabase.from('contraventions').select('montant').eq('vehicule_id', v.id).gte('date', debutAnnee).lte('date', finAnnee),
        supabase.from('assurances').select('montant').eq('vehicule_id', v.id).gte('date_debut', debutAnnee).lte('date_debut', finAnnee),
        supabase.from('carburant').select('montant').eq('vehicule_id', v.id).gte('date', debutAnnee).lte('date', finAnnee),
      ])
      const carburant  = (carb || []).reduce((s, e) => s + (e.montant || 0), 0)
      const assurance  = (ass || []).reduce((s, e) => s + (e.montant || 0), 0)
      const contravention = (con || []).reduce((s, e) => s + (e.montant || 0), 0)
      const entretien  = (ent || []).reduce((s, e) => s + (e.cout || 0), 0)
      return {
        name: v.immatriculation,
        marque: `${v.marque || ''} ${v.modele || ''}`.trim(),
        carburant,
        assurance,
        contravention,
        entretien,
        total: carburant + assurance + contravention + entretien,
      }
    }))

    setStats({ actifs, alertes: docsAlerte.length, coutMois, coutAnnee })
    setAlertesDocs(docsAlerte)
    setCoutParVehicule(coutVehicule.filter(v => v.total > 0).sort((a, b) => b.total - a.total))
    setDeplacements(deps || [])
    setLoading(false)
  }

  useEffect(() => { Promise.resolve().then(loadAll) }, [])

  const typeLabel = { assurance: 'Assurance', visite_technique: 'Visite technique' }
  const currentAlertesPage = Math.min(alertesPage, getTotalPages(alertesDocs.length, CARD_PAGE_SIZE))
  const currentDeplacementsPage = Math.min(deplacementsPage, getTotalPages(deplacements.length, CARD_PAGE_SIZE))
  const paginatedAlertes = paginate(alertesDocs, currentAlertesPage, CARD_PAGE_SIZE)
  const paginatedDeplacements = paginate(deplacements, currentDeplacementsPage, CARD_PAGE_SIZE)

  // Données graphe selon filtre
  const graphData = coutParVehicule.map(v => {
    if (filtreVehicule === 'Carburant')     return { name: v.name, Carburant: v.carburant }
    if (filtreVehicule === 'Assurance')     return { name: v.name, Assurance: v.assurance }
    if (filtreVehicule === 'Contravention') return { name: v.name, Contravention: v.contravention }
    return { name: v.name, Carburant: v.carburant, Assurance: v.assurance, Contravention: v.contravention, Entretien: v.entretien }
  })

  const BARS = {
    'Tout':          [{ key: 'Carburant', color: '#10b981' }, { key: 'Assurance', color: '#1A3C6B' }, { key: 'Contravention', color: '#f97316' }, { key: 'Entretien', color: '#8b5cf6' }],
    'Carburant':     [{ key: 'Carburant', color: '#10b981' }],
    'Assurance':     [{ key: 'Assurance', color: '#1A3C6B' }],
    'Contravention': [{ key: 'Contravention', color: '#f97316' }],
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>

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
        <StatCard titre="Alertes documents"  valeur={stats.alertes}           icone={MdNotificationsActive}  couleur={stats.alertes > 0 ? 'red' : 'green'} />
        <StatCard titre="Coût du mois"       valeur={fmt(stats.coutMois)}     icone={MdPayments}             couleur="orange" />
        <StatCard titre="Coût de l'année"    valeur={fmt(stats.coutAnnee)}    icone={MdAssessment}           couleur="purple" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Alertes */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Alertes documents (&le; 30 jours)</h2>
          {alertesDocs.length === 0 ? (
            <p className="text-gray-400 text-sm italic text-center py-4">Aucune alerte</p>
          ) : (
            <div className="space-y-2">
              {paginatedAlertes.map(d => (
                <div key={d.id}
                  className="flex flex-col gap-2 py-2 border-b border-gray-100 last:border-0 hover:bg-blue-50 rounded-lg px-2 cursor-pointer transition-colors sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => navigate(`/vehicules/${d.vehicule_id}?tab=documents`)}>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{d.vehicules?.immatriculation} — {typeLabel[d.type] || d.type}</p>
                    <p className="text-xs text-gray-400">Échéance : {fmtDate(d.date_echeance)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlerteBadge dateEcheance={d.date_echeance} />
                    <span className="text-xs text-[#1A3C6B]">→</span>
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
        <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-base font-semibold text-gray-800">Coûts annuels par véhicule</h2>
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-gray-200 text-sm print:hidden">
            {FILTRE_OPTIONS.map(f => (
              <button key={f}
                onClick={() => setFiltreVehicule(f)}
                className={`shrink-0 px-3 py-1.5 ${filtreVehicule === f ? 'bg-[#1A3C6B] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {graphData.length === 0 ? (
          <p className="text-gray-400 text-sm italic text-center py-8">Aucune donnée pour cette année</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={graphData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(v)} />
              <Tooltip formatter={(v, name) => [new Intl.NumberFormat('fr-FR').format(v) + ' FCFA', name]} />
              <Legend />
              {BARS[filtreVehicule].map(b => (
                <Bar key={b.key} dataKey={b.key} fill={b.color} radius={[3,3,0,0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

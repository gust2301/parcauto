import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MdDirectionsCar, MdWarning, MdAttachMoney, MdCalendarToday } from 'react-icons/md'
import StatCard from '../components/StatCard'
import AlerteBadge from '../components/AlerteBadge'
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

function fmt(n) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
}

function fmtDate(d) {
  if (!d) return '—'
  return format(parseISO(d), 'dd/MM/yyyy')
}

const MOIS_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ actifs: 0, alertes: 0, coutMois: 0, coutAnnee: 0 })
  const [alertesDocs, setAlertesDocs] = useState([])
  const [graphData, setGraphData] = useState([])
  const [coutParVehicule, setCoutParVehicule] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const now = new Date()
    const debutMois = format(startOfMonth(now), 'yyyy-MM-dd')
    const finMois = format(endOfMonth(now), 'yyyy-MM-dd')
    const debutAnnee = format(startOfYear(now), 'yyyy-MM-dd')
    const finAnnee = format(endOfYear(now), 'yyyy-MM-dd')

    const [
      { data: vehicules },
      { data: docs },
      { data: entretiensMois },
      { data: contraventionsMois },
      { data: entretiensAnnee },
      { data: contraventionsAnnee },
      { data: entretiensGraph },
      { data: contraventionsGraph },
    ] = await Promise.all([
      supabase.from('vehicules').select('id, statut, immatriculation, marque, modele'),
      supabase.from('documents').select('*, vehicules(immatriculation, marque, modele)'),
      supabase.from('entretiens').select('cout').gte('date', debutMois).lte('date', finMois),
      supabase.from('contraventions').select('montant').gte('date', debutMois).lte('date', finMois),
      supabase.from('entretiens').select('cout').gte('date', debutAnnee).lte('date', finAnnee),
      supabase.from('contraventions').select('montant').gte('date', debutAnnee).lte('date', finAnnee),
      supabase.from('entretiens').select('cout, date').gte('date', debutAnnee).lte('date', finAnnee),
      supabase.from('contraventions').select('montant, date').gte('date', debutAnnee).lte('date', finAnnee),
    ])

    // Stats de base
    const actifs = (vehicules || []).filter(v => v.statut === 'actif').length
    const coutMois = (entretiensMois || []).reduce((s, e) => s + (e.cout || 0), 0)
                   + (contraventionsMois || []).reduce((s, c) => s + (c.montant || 0), 0)
    const coutAnnee = (entretiensAnnee || []).reduce((s, e) => s + (e.cout || 0), 0)
                    + (contraventionsAnnee || []).reduce((s, c) => s + (c.montant || 0), 0)

    // Alertes documents
    const docsAlerte = (docs || [])
      .filter(d => d.date_echeance)
      .map(d => ({
        ...d,
        jours: differenceInDays(parseISO(d.date_echeance), new Date()),
      }))
      .filter(d => d.jours <= 30)
      .sort((a, b) => a.jours - b.jours)

    // Graphe mensuel
    const moisData = Array.from({ length: 12 }, (_, i) => ({
      mois: MOIS_LABELS[i],
      entretiens: 0,
      contraventions: 0,
    }))

    ;(entretiensGraph || []).forEach(e => {
      const m = new Date(e.date).getMonth()
      moisData[m].entretiens += e.cout || 0
    })
    ;(contraventionsGraph || []).forEach(c => {
      const m = new Date(c.date).getMonth()
      moisData[m].contraventions += c.montant || 0
    })

    // Coût par véhicule (annuel)
    const coutVehicule = await Promise.all((vehicules || []).map(async v => {
      const [{ data: ent }, { data: con }] = await Promise.all([
        supabase.from('entretiens').select('cout').eq('vehicule_id', v.id)
          .gte('date', debutAnnee).lte('date', finAnnee),
        supabase.from('contraventions').select('montant').eq('vehicule_id', v.id)
          .gte('date', debutAnnee).lte('date', finAnnee),
      ])
      return {
        ...v,
        cout: (ent || []).reduce((s, e) => s + (e.cout || 0), 0)
            + (con || []).reduce((s, c) => s + (c.montant || 0), 0),
      }
    }))

    setStats({ actifs, alertes: docsAlerte.length, coutMois, coutAnnee })
    setAlertesDocs(docsAlerte)
    setGraphData(moisData)
    setCoutParVehicule(coutVehicule.sort((a, b) => b.cout - a.cout))
    setLoading(false)
  }

  const typeLabel = { assurance: 'Assurance', visite_technique: 'Visite technique', vignette: 'Vignette' }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Tableau de bord</h1>

      {/* StatCards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard titre="Véhicules actifs" valeur={stats.actifs} icone={MdDirectionsCar} couleur="blue" />
        <StatCard titre="Alertes documents" valeur={stats.alertes} icone={MdWarning} couleur={stats.alertes > 0 ? 'red' : 'green'} />
        <StatCard titre="Coût du mois" valeur={fmt(stats.coutMois)} icone={MdAttachMoney} couleur="orange" />
        <StatCard titre="Coût de l'année" valeur={fmt(stats.coutAnnee)} icone={MdCalendarToday} couleur="purple" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Alertes documents */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Alertes documents (&le; 30 jours)</h2>
          {alertesDocs.length === 0 ? (
            <p className="text-gray-400 text-sm italic text-center py-4">Aucune alerte</p>
          ) : (
            <div className="space-y-2">
              {alertesDocs.map(d => (
                <div
                  key={d.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-blue-50 rounded-lg px-2 cursor-pointer transition-colors"
                  onClick={() => navigate(`/vehicules/${d.vehicule_id}?tab=documents`)}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {d.vehicules?.immatriculation} — {typeLabel[d.type] || d.type}
                    </p>
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
        </div>

        {/* Coût par véhicule */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Coût annuel par véhicule</h2>
          <div className="overflow-y-auto max-h-64">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-xs text-gray-500 font-semibold uppercase">Véhicule</th>
                  <th className="text-right py-2 text-xs text-gray-500 font-semibold uppercase">Coût (FCFA)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coutParVehicule.map(v => (
                  <tr key={v.id}>
                    <td className="py-2 text-gray-700">{v.immatriculation} <span className="text-gray-400 text-xs">{v.marque} {v.modele}</span></td>
                    <td className="py-2 text-right font-medium text-gray-800">{new Intl.NumberFormat('fr-FR').format(v.cout)}</td>
                  </tr>
                ))}
                {coutParVehicule.length === 0 && (
                  <tr><td colSpan={2} className="py-4 text-center text-gray-400 italic text-sm">Aucun véhicule</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Graphe barres */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Coûts mensuels (entretiens + contraventions)</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={graphData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(v)} />
            <Tooltip formatter={(v, name) => [new Intl.NumberFormat('fr-FR').format(v) + ' FCFA', name === 'entretiens' ? 'Entretiens' : 'Contraventions']} />
            <Legend formatter={n => n === 'entretiens' ? 'Entretiens' : 'Contraventions'} />
            <Bar dataKey="entretiens" fill="#1A3C6B" radius={[3, 3, 0, 0]} />
            <Bar dataKey="contraventions" fill="#f97316" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

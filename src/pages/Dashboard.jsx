import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MdGarage, MdNotificationsActive, MdPayments, MdAssessment } from 'react-icons/md'
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
      { data: assurances },
      { data: entretiensMois },
      { data: contraventionsMois },
      { data: assurancesMois },
      { data: entretiensAnnee },
      { data: contraventionsAnnee },
      { data: assurancesAnnee },
      { data: entretiensGraph },
      { data: contraventionsGraph },
      { data: assurancesGraph },
    ] = await Promise.all([
      supabase.from('vehicules').select('id, statut, immatriculation, marque, modele'),
      supabase.from('documents').select('*, vehicules(immatriculation, marque, modele)'),
      supabase.from('assurances').select('*, vehicules(immatriculation, marque, modele)').order('date_echeance', { ascending: false }),
      supabase.from('entretiens').select('cout').gte('date', debutMois).lte('date', finMois),
      supabase.from('contraventions').select('montant').gte('date', debutMois).lte('date', finMois),
      supabase.from('assurances').select('montant').gte('date_debut', debutMois).lte('date_debut', finMois),
      supabase.from('entretiens').select('cout').gte('date', debutAnnee).lte('date', finAnnee),
      supabase.from('contraventions').select('montant').gte('date', debutAnnee).lte('date', finAnnee),
      supabase.from('assurances').select('montant').gte('date_debut', debutAnnee).lte('date_debut', finAnnee),
      supabase.from('entretiens').select('cout, date').gte('date', debutAnnee).lte('date', finAnnee),
      supabase.from('contraventions').select('montant, date').gte('date', debutAnnee).lte('date', finAnnee),
      supabase.from('assurances').select('montant, date_debut').gte('date_debut', debutAnnee).lte('date_debut', finAnnee),
    ])

    // Stats de base
    const actifs = (vehicules || []).filter(v => v.statut === 'actif').length
    const coutMois = (entretiensMois || []).reduce((s, e) => s + (e.cout || 0), 0)
                   + (contraventionsMois || []).reduce((s, c) => s + (c.montant || 0), 0)
                   + (assurancesMois || []).reduce((s, a) => s + (a.montant || 0), 0)
    const coutAnnee = (entretiensAnnee || []).reduce((s, e) => s + (e.cout || 0), 0)
                    + (contraventionsAnnee || []).reduce((s, c) => s + (c.montant || 0), 0)
                    + (assurancesAnnee || []).reduce((s, a) => s + (a.montant || 0), 0)

    // Alertes : visite technique + assurances par véhicule (la plus récente)
    const alertesVisite = (docs || [])
      .filter(d => d.type === 'visite_technique' && d.date_echeance)
      .map(d => ({ ...d, jours: differenceInDays(parseISO(d.date_echeance), new Date()), label: 'Visite technique' }))

    // Grouper assurances par véhicule → garder la plus récente
    const assurancesParVehicule = {}
    ;(assurances || []).forEach(a => {
      if (!assurancesParVehicule[a.vehicule_id]) assurancesParVehicule[a.vehicule_id] = a
    })
    const alertesAssurance = Object.values(assurancesParVehicule)
      .filter(a => a.date_echeance)
      .map(a => ({
        id: a.id,
        vehicule_id: a.vehicule_id,
        vehicules: a.vehicules,
        date_echeance: a.date_echeance,
        type: 'assurance',
        jours: differenceInDays(parseISO(a.date_echeance), new Date()),
        label: 'Assurance',
      }))

    const docsAlerte = [...alertesVisite, ...alertesAssurance]
      .filter(d => d.jours <= 30)
      .sort((a, b) => a.jours - b.jours)

    // Graphe mensuel
    const moisData = Array.from({ length: 12 }, (_, i) => ({
      mois: MOIS_LABELS[i],
      entretiens: 0,
      contraventions: 0,
      assurances: 0,
    }))

    ;(entretiensGraph || []).forEach(e => {
      const m = new Date(e.date).getMonth()
      moisData[m].entretiens += e.cout || 0
    })
    ;(contraventionsGraph || []).forEach(c => {
      const m = new Date(c.date).getMonth()
      moisData[m].contraventions += c.montant || 0
    })
    ;(assurancesGraph || []).forEach(a => {
      const m = new Date(a.date_debut).getMonth()
      moisData[m].assurances += a.montant || 0
    })

    // Coût par véhicule (annuel)
    const coutVehicule = await Promise.all((vehicules || []).map(async v => {
      const [{ data: ent }, { data: con }, { data: ass }] = await Promise.all([
        supabase.from('entretiens').select('cout').eq('vehicule_id', v.id)
          .gte('date', debutAnnee).lte('date', finAnnee),
        supabase.from('contraventions').select('montant').eq('vehicule_id', v.id)
          .gte('date', debutAnnee).lte('date', finAnnee),
        supabase.from('assurances').select('montant').eq('vehicule_id', v.id)
          .gte('date_debut', debutAnnee).lte('date_debut', finAnnee),
      ])
      return {
        ...v,
        cout: (ent || []).reduce((s, e) => s + (e.cout || 0), 0)
            + (con || []).reduce((s, c) => s + (c.montant || 0), 0)
            + (ass || []).reduce((s, a) => s + (a.montant || 0), 0),
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
        <StatCard titre="Véhicules actifs" valeur={stats.actifs} icone={MdGarage} couleur="blue" />
        <StatCard titre="Alertes documents" valeur={stats.alertes} icone={MdNotificationsActive} couleur={stats.alertes > 0 ? 'red' : 'green'} />
        <StatCard titre="Coût du mois" valeur={fmt(stats.coutMois)} icone={MdPayments} couleur="orange" />
        <StatCard titre="Coût de l'année" valeur={fmt(stats.coutAnnee)} icone={MdAssessment} couleur="purple" />
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
            <Tooltip formatter={(v, name) => [new Intl.NumberFormat('fr-FR').format(v) + ' FCFA', { entretiens: 'Entretiens', contraventions: 'Contraventions', assurances: 'Assurances' }[name] || name]} />
            <Legend formatter={n => ({ entretiens: 'Entretiens', contraventions: 'Contraventions', assurances: 'Assurances' })[n] || n} />
            <Bar dataKey="entretiens" fill="#1A3C6B" radius={[3, 3, 0, 0]} />
            <Bar dataKey="contraventions" fill="#f97316" radius={[3, 3, 0, 0]} />
            <Bar dataKey="assurances" fill="#10b981" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  fs.readFileSync('.env.development', 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => {
      const index = line.indexOf('=')
      return [line.slice(0, index), line.slice(index + 1)]
    })
)

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_SERVICE_KEY || env.VITE_SUPABASE_ANON_KEY
)

function addDays(base, days) {
  const date = new Date(base)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

async function insertMissing(table, rows, selectCol, getKey) {
  const keys = rows.map(getKey)
  const chunks = []
  for (let i = 0; i < keys.length; i += 100) chunks.push(keys.slice(i, i + 100))

  const existing = []
  for (const chunk of chunks) {
    const { data, error } = await supabase.from(table).select(selectCol).in(selectCol, chunk)
    if (error) throw error
    existing.push(...(data || []))
  }

  const existingSet = new Set(existing.map(row => row[selectCol]))
  const toInsert = rows.filter(row => !existingSet.has(getKey(row)))

  if (toInsert.length) {
    const { error } = await supabase.from(table).insert(toInsert)
    if (error) throw error
  }

  return { existing: existing.length, inserted: toInsert.length, totalRequested: rows.length }
}

const chauffeursSeed = [
  ['CH-001', 'Mamadou Ndiaye', 'Chauffeur principal'],
  ['CH-002', 'Awa Diop', 'Chauffeure'],
  ['CH-003', 'Ibrahima Fall', 'Chauffeur senior'],
  ['CH-004', 'Fatou Seck', 'Chauffeure principale'],
  ['CH-005', 'Ousmane Ba', 'Chauffeur'],
  ['CH-006', 'Mariama Sarr', 'Chauffeure'],
  ['CH-007', 'Cheikh Gueye', 'Chauffeur principal'],
  ['CH-008', 'Aminata Sow', 'Chauffeure'],
  ['CH-009', 'Abdoulaye Kane', 'Chauffeur senior'],
  ['CH-010', 'Ndeye Thiam', 'Chauffeure'],
  ['CH-011', 'Moussa Diallo', 'Chauffeur'],
  ['CH-012', 'Adama Cisse', 'Chauffeur principal'],
  ['CH-013', 'Khady Faye', 'Chauffeure'],
  ['CH-014', 'Babacar Lo', 'Chauffeur'],
  ['CH-015', 'Rokhaya Sy', 'Chauffeure senior'],
  ['CH-016', 'Modou Diagne', 'Chauffeur'],
  ['CH-017', 'Seynabou Tall', 'Chauffeure'],
  ['CH-018', 'Pape Mbaye', 'Chauffeur principal'],
  ['CH-019', 'Coumba Wade', 'Chauffeure'],
  ['CH-020', 'Serigne Sene', 'Chauffeur'],
].map(([matricule, nom_complet, grade]) => ({ matricule, nom_complet, grade }))

const report = {}

let { data: existingChauffeurs, error } = await supabase
  .from('chauffeurs')
  .select('id,matricule,nom_complet')
  .in('matricule', chauffeursSeed.map(chauffeur => chauffeur.matricule))
if (error) throw error

const existingMatricules = new Set((existingChauffeurs || []).map(chauffeur => chauffeur.matricule))
const chauffeursToInsert = chauffeursSeed.filter(chauffeur => !existingMatricules.has(chauffeur.matricule))

if (chauffeursToInsert.length) {
  const { error: insertError } = await supabase.from('chauffeurs').insert(chauffeursToInsert)
  if (insertError) throw insertError
}

report.chauffeurs = {
  existing: (existingChauffeurs || []).length,
  inserted: chauffeursToInsert.length,
  totalRequested: chauffeursSeed.length,
}

;({ data: existingChauffeurs, error } = await supabase
  .from('chauffeurs')
  .select('id,matricule,nom_complet')
  .in('matricule', chauffeursSeed.map(chauffeur => chauffeur.matricule)))
if (error) throw error

const { data: vehicules, error: vehiculesError } = await supabase
  .from('vehicules')
  .select('id,immatriculation,kilometrage')
  .order('immatriculation')
if (vehiculesError) throw vehiculesError
if (!vehicules?.length) throw new Error('Aucun vehicule disponible pour lier les donnees de test.')

const testVehicules = vehicules.filter(vehicule => /^DK-10\d{2}-AA$/.test(vehicule.immatriculation))
const vehiculesToUse = testVehicules.length ? testVehicules : vehicules
const chauffeurRows = existingChauffeurs || []
const today = '2026-04-20'

const interventions = ['Vidange moteur', 'Controle freins', 'Revision generale', 'Changement pneus', 'Controle climatisation', 'Remplacement batterie']
const pieces = ['Filtre a huile', 'Plaquettes de frein', 'Courroie accessoire', 'Pneus avant', 'Batterie', 'Filtre gasoil']
const garages = ['Garage Dakar Nord', 'Atelier Central', 'SEN Auto Services', 'Garage Plateau', 'Express Maintenance']
const stations = ['TotalEnergies Liberte', 'Shell VDN', 'Eydon Almadies', 'Oryx Pikine', 'Star Oil Rufisque']
const assureurs = ['AXA Senegal', 'NSIA Assurances', 'ASKIA Assurances', 'Sunu Assurances', 'Allianz Senegal']
const lieux = ['Avenue Bourguiba', 'Route de Ngor', 'VDN Dakar', 'Autoroute a peage', 'Avenue Faidherbe', 'Corniche Ouest']
const natures = ['Exces de vitesse', 'Stationnement interdit', 'Defaut de port de ceinture', 'Feu rouge', 'Telephone au volant']

const entretiens = []
const carburants = []
const assurances = []
const visitesTechniques = []
const contraventions = []

vehiculesToUse.forEach((vehicule, index) => {
  const kilometrage = Number(vehicule.kilometrage || 50000)

  for (let position = 0; position < 2; position++) {
    entretiens.push({
      vehicule_id: vehicule.id,
      date: addDays(today, -(index * 3 + position * 65 + 12)),
      type_intervention: interventions[(index + position) % interventions.length],
      pieces: pieces[(index + position) % pieces.length],
      cout: 35000 + ((index + position) % 7) * 15000,
      garage: garages[(index + position) % garages.length],
      kilometrage: Math.max(0, kilometrage - (position + 1) * 4200),
      commentaire: `SEED_TEST entretien ${vehicule.immatriculation} #${position + 1}`,
    })
  }

  for (let position = 0; position < 3; position++) {
    const litres = 35 + ((index + position) % 8) * 4.5
    carburants.push({
      vehicule_id: vehicule.id,
      date: addDays(today, -(index * 2 + (3 - position) * 18)),
      litres,
      type_carburant: (index + position) % 5 === 0 ? 'Essence' : 'Gasoil',
      kilometrage: Math.max(0, kilometrage - (2 - position) * 850),
      station: stations[(index + position) % stations.length],
      reference_bon: `SEED-FUEL-${vehicule.immatriculation}-${position + 1}`,
      montant: Math.round(litres * ((index + position) % 5 === 0 ? 855 : 755)),
    })
  }

  assurances.push({
    vehicule_id: vehicule.id,
    date_debut: addDays(today, -(index % 6) * 20 - 35),
    date_echeance: addDays(today, 60 + (index % 12) * 18),
    montant: 180000 + (index % 8) * 25000,
    assureur: assureurs[index % assureurs.length],
    numero_police: `SEED-POL-${vehicule.immatriculation}`,
  })

  visitesTechniques.push({
    vehicule_id: vehicule.id,
    type: 'visite_technique',
    date_realisation: addDays(today, -90 - (index % 10) * 7),
    date_echeance: addDays(today, 30 + (index % 9) * 25),
  })

  const chauffeur = chauffeurRows[index % chauffeurRows.length]
  contraventions.push({
    vehicule_id: vehicule.id,
    date: addDays(today, -(index * 4 + 6)),
    lieu: lieux[index % lieux.length],
    conducteur: chauffeur?.nom_complet || null,
    chauffeur_id: chauffeur?.id || null,
    nature: natures[index % natures.length],
    montant: 10000 + (index % 6) * 5000,
    statut: ['en_attente', 'payee', 'contestee'][index % 3],
    justificatif_url: `SEED-CONTRA-${vehicule.immatriculation}-1`,
  })

  if (index % 2 === 0) {
    const secondChauffeur = chauffeurRows[(index + 3) % chauffeurRows.length]
    contraventions.push({
      vehicule_id: vehicule.id,
      date: addDays(today, -(index * 5 + 19)),
      lieu: lieux[(index + 2) % lieux.length],
      conducteur: secondChauffeur?.nom_complet || null,
      chauffeur_id: secondChauffeur?.id || null,
      nature: natures[(index + 1) % natures.length],
      montant: 15000 + (index % 4) * 7500,
      statut: ['payee', 'en_attente'][index % 2],
      justificatif_url: `SEED-CONTRA-${vehicule.immatriculation}-2`,
    })
  }
})

report.entretiens = await insertMissing('entretiens', entretiens, 'commentaire', row => row.commentaire)
report.carburant = await insertMissing('carburant', carburants, 'reference_bon', row => row.reference_bon)
report.assurances = await insertMissing('assurances', assurances, 'numero_police', row => row.numero_police)
report.contraventions = await insertMissing('contraventions', contraventions, 'justificatif_url', row => row.justificatif_url)

const { data: existingVisits, error: visitsError } = await supabase
  .from('documents')
  .select('id,vehicule_id,type')
  .eq('type', 'visite_technique')
if (visitsError) throw visitsError

const existingVisitSet = new Set((existingVisits || []).map(row => `${row.vehicule_id}:${row.type}`))
const visitsToInsert = visitesTechniques.filter(row => !existingVisitSet.has(`${row.vehicule_id}:${row.type}`))

if (visitsToInsert.length) {
  const { error: insertVisitsError } = await supabase.from('documents').insert(visitsToInsert)
  if (insertVisitsError) throw insertVisitsError
}

report.visitesTechniques = {
  existing: (existingVisits || []).filter(row => visitesTechniques.some(visit => visit.vehicule_id === row.vehicule_id)).length,
  inserted: visitsToInsert.length,
  totalRequested: visitesTechniques.length,
}

console.log(JSON.stringify(report, null, 2))

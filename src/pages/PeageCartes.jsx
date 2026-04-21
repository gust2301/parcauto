import { useEffect, useMemo, useState } from 'react'
import { MdAdd, MdClose, MdDelete, MdHistory, MdPayments } from 'react-icons/md'
import { supabase } from '../lib/supabase'
import DataTable from '../components/DataTable'
import { useRole } from '../lib/roleContext'

function fmt(n) { return new Intl.NumberFormat('fr-FR').format(n || 0) }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('fr-FR') : '-' }

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <MdClose size={22} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export default function PeageCartes() {
  const { isAdmin } = useRole()
  const [cartes, setCartes] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [carteForm, setCarteForm] = useState({ nom: '', type: 'xeweull', seuil_alerte: '5000' })
  const [rechargeForm, setRechargeForm] = useState({ date: new Date().toISOString().split('T')[0], montant: '' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: cartesData }, { data: txData }] = await Promise.all([
      supabase.from('peage_cartes').select('*').order('created_at', { ascending: false }),
      supabase.from('peage_transactions').select('*, vehicules(immatriculation)').order('date', { ascending: false }),
    ])
    setCartes(cartesData || [])
    setTransactions(txData || [])
    setLoading(false)
  }

  function soldeCarte(carteId) {
    return transactions
      .filter(t => t.carte_id === carteId)
      .reduce((sum, t) => {
        if (t.type === 'rechargement') return sum + (t.montant || 0)
        if (t.type === 'passage_carte') return sum - (t.montant || 0)
        return sum
      }, 0)
  }

  async function createCarte(e) {
    e.preventDefault()
    if (!isAdmin) return
    setSaving(true)
    await supabase.from('peage_cartes').insert({
      nom: carteForm.nom,
      type: carteForm.type,
      seuil_alerte: carteForm.seuil_alerte ? parseInt(carteForm.seuil_alerte) : 5000,
    })
    setSaving(false)
    setModal(null)
    setCarteForm({ nom: '', type: 'xeweull', seuil_alerte: '5000' })
    window.dispatchEvent(new Event('peage-cartes-updated'))
    load()
  }

  async function rechargeCarte(e) {
    e.preventDefault()
    if (!isAdmin || !modal?.carte) return
    setSaving(true)
    await supabase.from('peage_transactions').insert({
      carte_id: modal.carte.id,
      vehicule_id: null,
      date: rechargeForm.date,
      type: 'rechargement',
      montant: rechargeForm.montant ? parseInt(rechargeForm.montant) : 0,
    })
    setSaving(false)
    setModal(null)
    setRechargeForm({ date: new Date().toISOString().split('T')[0], montant: '' })
    window.dispatchEvent(new Event('peage-cartes-updated'))
    load()
  }

  async function deleteCarte(carteId) {
    if (!isAdmin) return
    await supabase.from('peage_cartes').delete().eq('id', carteId)
    window.dispatchEvent(new Event('peage-cartes-updated'))
    load()
  }

  const historyRows = useMemo(() => {
    if (modal?.type !== 'history') return []
    return transactions.filter(t => t.carte_id === modal.carte.id)
  }, [modal, transactions])

  const historyCols = [
    { label: 'Date', key: 'date', render: r => fmtDate(r.date) },
    { label: 'Type', key: 'type', render: r => ({
      rechargement: 'Rechargement',
      passage_carte: 'Passage carte',
      passage_cash: 'Passage cash',
    }[r.type] || r.type) },
    { label: 'Véhicule', key: 'vehicule', render: r => r.vehicules?.immatriculation || '-' },
    { label: 'Axe', key: 'axe', render: r => r.axe || '-' },
    { label: 'Montant', key: 'montant', render: r => `${fmt(r.montant)} FCFA` },
  ]

  if (loading) return <div className="flex h-64 items-center justify-center text-gray-400">Chargement...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Gestion des cartes de péage</h1>
        {isAdmin && (
          <button className="btn-primary flex items-center justify-center gap-2" onClick={() => setModal({ type: 'create' })}>
            <MdAdd size={18} /> Créer une carte
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {cartes.map(carte => {
          const solde = soldeCarte(carte.id)
          const isLow = solde < (carte.seuil_alerte || 0)
          return (
            <div key={carte.id} className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-800">{carte.nom}</p>
                  <p className="text-xs uppercase text-gray-400">{carte.type}</p>
                </div>
                {isLow && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Solde bas</span>}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-400">Solde actuel</p>
                  <p className={`text-lg font-bold ${isLow ? 'text-red-600' : 'text-[#1A3C6B]'}`}>{fmt(solde)} FCFA</p>
                </div>
                <div className="rounded-lg bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-400">Seuil alerte</p>
                  <p className="text-lg font-bold text-gray-800">{fmt(carte.seuil_alerte)} FCFA</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {isAdmin && (
                  <button className="btn-primary flex items-center gap-1 px-3 py-1.5 text-xs" onClick={() => setModal({ type: 'recharge', carte })}>
                    <MdPayments size={15} /> Recharger
                  </button>
                )}
                <button className="btn-secondary flex items-center gap-1 px-3 py-1.5 text-xs" onClick={() => setModal({ type: 'history', carte })}>
                  <MdHistory size={15} /> Historique
                </button>
                {isAdmin && (
                  <button className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50" onClick={() => deleteCarte(carte.id)}>
                    <MdDelete size={15} className="inline" /> Supprimer
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {cartes.length === 0 && <p className="text-sm italic text-gray-400">Aucune carte enregistrée</p>}
      </div>

      {modal?.type === 'create' && (
        <Modal title="Créer une carte" onClose={() => setModal(null)}>
          <form onSubmit={createCarte} className="space-y-4">
            <div>
              <label className="form-label">Nom</label>
              <input className="form-input" value={carteForm.nom} onChange={e => setCarteForm(f => ({ ...f, nom: e.target.value }))} required />
            </div>
            <div>
              <label className="form-label">Type</label>
              <select className="form-input" value={carteForm.type} onChange={e => setCarteForm(f => ({ ...f, type: e.target.value }))}>
                <option value="xeweull">Xeweull</option>
                <option value="rapido">Rapido</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="form-label">Seuil d'alerte FCFA</label>
              <input type="number" className="form-input" value={carteForm.seuil_alerte} onChange={e => setCarteForm(f => ({ ...f, seuil_alerte: e.target.value }))} min="0" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Annuler</button>
              <button className="btn-primary" disabled={saving}>{saving ? 'Création...' : 'Créer'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === 'recharge' && (
        <Modal title={`Recharger ${modal.carte.nom}`} onClose={() => setModal(null)}>
          <form onSubmit={rechargeCarte} className="space-y-4">
            <div>
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={rechargeForm.date} onChange={e => setRechargeForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div>
              <label className="form-label">Montant</label>
              <input type="number" className="form-input" value={rechargeForm.montant} onChange={e => setRechargeForm(f => ({ ...f, montant: e.target.value }))} min="0" required />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Annuler</button>
              <button className="btn-primary" disabled={saving}>{saving ? 'Enregistrement...' : 'Recharger'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === 'history' && (
        <Modal title={`Historique ${modal.carte.nom}`} onClose={() => setModal(null)}>
          <DataTable colonnes={historyCols} donnees={historyRows} vide="Aucune transaction" />
        </Modal>
      )}
    </div>
  )
}

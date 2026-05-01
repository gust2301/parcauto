import { useEffect, useMemo, useState } from 'react'
import { MdAdd, MdClose, MdDelete, MdDownload, MdEdit, MdEmail, MdHistory, MdPayments } from 'react-icons/md'
import DataTable from '../components/DataTable'
import { supabase } from '../lib/supabase'
import { useRole } from '../lib/roleContext'

const fmt = n => new Intl.NumberFormat('fr-FR').format(n || 0)
const dmy = d => d ? new Date(d).toLocaleDateString('fr-FR') : '-'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <button type="button" onClick={onClose}>
            <MdClose />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function sheetName(value, fallback) {
  const cleaned = String(value || fallback || 'Carte')
    .replace(/[\\/*?:[\]]/g, ' ')
    .trim()
  return (cleaned || fallback || 'Carte').slice(0, 31)
}

function sortTransactions(a, b) {
  const dateCmp = String(a.date || '').localeCompare(String(b.date || ''))
  if (dateCmp !== 0) return dateCmp
  const createdCmp = String(a.created_at || '').localeCompare(String(b.created_at || ''))
  if (createdCmp !== 0) return createdCmp
  if (a.type === b.type) return 0
  return a.type === 'approvisionnement' ? -1 : 1
}

function buildWorkbookXml(cartes, txs) {
  const workbookStyles = `
    <Styles>
      <Style ss:ID="Default" ss:Name="Normal">
        <Alignment ss:Vertical="Center"/>
        <Borders/>
        <Font ss:FontName="Calibri" ss:Size="11"/>
        <Interior/>
        <NumberFormat/>
        <Protection/>
      </Style>
      <Style ss:ID="title">
        <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1"/>
      </Style>
      <Style ss:ID="header">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
        <Font ss:Bold="1"/>
        <Interior ss:Color="#D9EAF7" ss:Pattern="Solid"/>
        <Borders>
          <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
          <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
          <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
          <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
        </Borders>
      </Style>
      <Style ss:ID="subheader">
        <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
        <Font ss:Bold="1"/>
        <Interior ss:Color="#EDF5FB" ss:Pattern="Solid"/>
        <Borders>
          <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
          <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
          <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
          <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
        </Borders>
      </Style>
      <Style ss:ID="cell">
        <Borders>
          <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
          <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
          <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
          <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
        </Borders>
      </Style>
      <Style ss:ID="money">
        <Borders>
          <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
          <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
          <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
          <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
        </Borders>
        <NumberFormat ss:Format="#,##0"/>
      </Style>
    </Styles>
  `

  const worksheets = cartes.map((carte, index) => {
    const carteTxs = txs
      .filter(tx => tx.carte_id === carte.id)
      .slice()
      .sort(sortTransactions)

    let stock = 0
    const rows = carteTxs.map(tx => {
      const stockInitial = stock
      const isEntree = tx.type === 'approvisionnement'
      stock += isEntree ? Number(tx.montant || 0) : -Number(tx.montant || 0)
      return {
        date: tx.date || '',
        stockInitial,
        entree: isEntree ? Number(tx.montant || 0) : '',
        kilometrage: !isEntree ? (tx.carburant?.kilometrage ?? '') : '',
        consommation: !isEntree ? Number(tx.montant || 0) : '',
        vehicule: !isEntree ? (tx.vehicules?.immatriculation || '') : '',
        objetMission: !isEntree ? (tx.carburant?.objet_mission || '') : '',
        agentNom: !isEntree ? (tx.carburant?.agent_nom || '') : '',
        stockFinal: stock,
        observation: !isEntree ? (tx.carburant?.observation || '') : '',
      }
    })

    const worksheetRows = [
      `<Row>
        <Cell ss:StyleID="title"><Data ss:Type="String">${xmlEscape(`Carte n° ${carte.numero || ''}`)}</Data></Cell>
        <Cell/><Cell/><Cell ss:StyleID="title"><Data ss:Type="String">${xmlEscape(carte.libelle || '')}</Data></Cell>
      </Row>`,
      '<Row/>',
      `<Row>
        <Cell ss:StyleID="header"><Data ss:Type="String">Date</Data></Cell>
        <Cell ss:StyleID="header"><Data ss:Type="String">Stock initial</Data></Cell>
        <Cell ss:StyleID="header"><Data ss:Type="String">Entrees</Data></Cell>
        <Cell ss:StyleID="header"><Data ss:Type="String">Consommations</Data></Cell>
        <Cell ss:StyleID="header"/><Cell ss:StyleID="header"/><Cell ss:StyleID="header"/><Cell ss:StyleID="header"/>
        <Cell ss:StyleID="header"><Data ss:Type="String">Stock final</Data></Cell>
        <Cell ss:StyleID="header"><Data ss:Type="String">Observations</Data></Cell>
      </Row>`,
      `<Row>
        <Cell ss:StyleID="subheader"/>
        <Cell ss:StyleID="subheader"><Data ss:Type="String">Montant</Data></Cell>
        <Cell ss:StyleID="subheader"><Data ss:Type="String">Montant</Data></Cell>
        <Cell ss:StyleID="subheader"><Data ss:Type="String">Kilometrage</Data></Cell>
        <Cell ss:StyleID="subheader"><Data ss:Type="String">Montant</Data></Cell>
        <Cell ss:StyleID="subheader"><Data ss:Type="String">Vehicule</Data></Cell>
        <Cell ss:StyleID="subheader"><Data ss:Type="String">Objet de la mission</Data></Cell>
        <Cell ss:StyleID="subheader"><Data ss:Type="String">Nom/Prenoms de l'agent</Data></Cell>
        <Cell ss:StyleID="subheader"><Data ss:Type="String">Montant</Data></Cell>
        <Cell ss:StyleID="subheader"/>
      </Row>`,
      ...rows.map(row => `
        <Row>
          <Cell ss:StyleID="cell"><Data ss:Type="String">${xmlEscape(row.date)}</Data></Cell>
          <Cell ss:StyleID="money"><Data ss:Type="Number">${row.stockInitial}</Data></Cell>
          <Cell ss:StyleID="money">${row.entree === '' ? '' : `<Data ss:Type="Number">${row.entree}</Data>`}</Cell>
          <Cell ss:StyleID="cell">${row.kilometrage === '' ? '' : `<Data ss:Type="Number">${row.kilometrage}</Data>`}</Cell>
          <Cell ss:StyleID="money">${row.consommation === '' ? '' : `<Data ss:Type="Number">${row.consommation}</Data>`}</Cell>
          <Cell ss:StyleID="cell"><Data ss:Type="String">${xmlEscape(row.vehicule)}</Data></Cell>
          <Cell ss:StyleID="cell"><Data ss:Type="String">${xmlEscape(row.objetMission)}</Data></Cell>
          <Cell ss:StyleID="cell"><Data ss:Type="String">${xmlEscape(row.agentNom)}</Data></Cell>
          <Cell ss:StyleID="money"><Data ss:Type="Number">${row.stockFinal}</Data></Cell>
          <Cell ss:StyleID="cell"><Data ss:Type="String">${xmlEscape(row.observation)}</Data></Cell>
        </Row>`),
    ]

    if (rows.length === 0) {
      worksheetRows.push(`
        <Row>
          <Cell ss:StyleID="cell"><Data ss:Type="String">Aucun mouvement</Data></Cell>
          <Cell ss:StyleID="cell"/><Cell ss:StyleID="cell"/><Cell ss:StyleID="cell"/><Cell ss:StyleID="cell"/>
          <Cell ss:StyleID="cell"/><Cell ss:StyleID="cell"/><Cell ss:StyleID="cell"/><Cell ss:StyleID="cell"/><Cell ss:StyleID="cell"/>
        </Row>`)
    }

    return `
      <Worksheet ss:Name="${xmlEscape(sheetName(`${carte.numero}-${index + 1}`, `Carte ${index + 1}`))}">
        <Table>
          <Column ss:Width="85"/>
          <Column ss:Width="95"/>
          <Column ss:Width="95"/>
          <Column ss:Width="90"/>
          <Column ss:Width="95"/>
          <Column ss:Width="95"/>
          <Column ss:Width="260"/>
          <Column ss:Width="180"/>
          <Column ss:Width="95"/>
          <Column ss:Width="240"/>
          ${worksheetRows.join('')}
        </Table>
      </Worksheet>
    `
  }).join('')

  return `<?xml version="1.0"?>
    <?mso-application progid="Excel.Sheet"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
      ${workbookStyles}
      ${worksheets}
    </Workbook>`
}

export default function CarburantCartes() {
  const { isAdmin } = useRole()
  const [cartes, setCartes] = useState([])
  const [txs, setTxs] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ numero: '', libelle: '', seuil_alerte: '0', montant_initial: '' })
  const [appro, setAppro] = useState({ date: new Date().toISOString().split('T')[0], montant: '' })

  async function load() {
    setLoading(true)
    setError('')
    const [{ data: cartesData, error: cartesError }, { data: txData, error: txError }] = await Promise.all([
      supabase.from('carburant_cartes').select('*').order('created_at', { ascending: false }),
      supabase.from('carburant_carte_transactions').select('*, vehicules(immatriculation), carburant(kilometrage, objet_mission, agent_nom, observation)').order('date', { ascending: false }),
    ])
    if (cartesError || txError) {
      setError('Impossible de charger les cartes carburant.')
    }
    setCartes(cartesData || [])
    setTxs(txData || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const rows = useMemo(
    () => modal?.type === 'history'
      ? txs.filter(t => t.carte_id === modal.carte.id).slice().sort(sortTransactions).reverse()
      : [],
    [modal, txs],
  )

  function solde(id) {
    return txs
      .filter(t => t.carte_id === id)
      .reduce((sum, tx) => sum + (tx.type === 'approvisionnement' ? Number(tx.montant || 0) : -Number(tx.montant || 0)), 0)
  }

  const cols = [
    { label: 'Date', key: 'date', render: r => dmy(r.date) },
    { label: 'Type', key: 'type', render: r => r.type === 'approvisionnement' ? 'Approvisionnement' : 'Consommation' },
    { label: 'Vehicule', key: 'vehicule', render: r => r.vehicules?.immatriculation || '-' },
    { label: 'Km', key: 'kilometrage', render: r => r.carburant?.kilometrage ? fmt(r.carburant.kilometrage) : '-' },
    { label: 'Mission', key: 'objet_mission', render: r => r.carburant?.objet_mission || '-' },
    { label: 'Agent', key: 'agent_nom', render: r => r.carburant?.agent_nom || '-' },
    { label: 'Montant', key: 'montant', render: r => `${fmt(r.montant)} FCFA` },
  ]

  async function create(e) {
    e.preventDefault()
    if (!isAdmin) return
    setSaving(true)
    setError('')
    const { data: insertedCard, error: insertError } = await supabase.from('carburant_cartes').insert({
      numero: form.numero.trim(),
      libelle: form.libelle.trim() || null,
      seuil_alerte: Number(form.seuil_alerte || 0),
    }).select('id').single()
    if (insertError) {
      setSaving(false)
      setError(insertError.code === '23505' ? 'Ce numero de carte existe deja.' : "Erreur lors de l'enregistrement de la carte.")
      return
    }

    const montantInitial = Number(form.montant_initial || 0)
    if (montantInitial > 0) {
      const { error: txError } = await supabase.from('carburant_carte_transactions').insert({
        carte_id: insertedCard.id,
        date: new Date().toISOString().split('T')[0],
        type: 'approvisionnement',
        montant: montantInitial,
      })
      if (txError) {
        setSaving(false)
        setError("La carte a ete creee, mais le solde initial n'a pas pu etre enregistre.")
        await load()
        return
      }
    }

    setSaving(false)
    setModal(null)
    setForm({ numero: '', libelle: '', seuil_alerte: '0', montant_initial: '' })
    load()
  }

  async function updateCard(e) {
    e.preventDefault()
    if (!isAdmin || !modal?.carte) return
    setSaving(true)
    setError('')
    const { error: updateError } = await supabase.from('carburant_cartes').update({
      numero: form.numero.trim(),
      libelle: form.libelle.trim() || null,
      seuil_alerte: Number(form.seuil_alerte || 0),
    }).eq('id', modal.carte.id)
    setSaving(false)
    if (updateError) {
      setError(updateError.code === '23505' ? 'Ce numero de carte existe deja.' : "Erreur lors de la modification de la carte.")
      return
    }
    setModal(null)
    setForm({ numero: '', libelle: '', seuil_alerte: '0', montant_initial: '' })
    load()
  }

  async function recharge(e) {
    e.preventDefault()
    if (!isAdmin || !modal?.carte) return
    setSaving(true)
    setError('')
    const { error: insertError } = await supabase.from('carburant_carte_transactions').insert({
      carte_id: modal.carte.id,
      date: appro.date,
      type: 'approvisionnement',
      montant: Number(appro.montant || 0),
    })
    setSaving(false)
    if (insertError) {
      setError("Erreur lors de l'approvisionnement.")
      return
    }
    setModal(null)
    setAppro({ date: new Date().toISOString().split('T')[0], montant: '' })
    load()
  }

  async function deleteCard(carteId) {
    if (!isAdmin) return
    setError('')
    const { error: deleteError } = await supabase.from('carburant_cartes').delete().eq('id', carteId)
    if (deleteError) {
      setError("Erreur lors de la suppression de la carte.")
      return
    }
    if (modal?.carte?.id === carteId) {
      setModal(null)
    }
    load()
  }

  function exportWorkbook() {
    const xml = buildWorkbookXml(cartes, txs)
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `suivi_cartes_carburant_${new Date().toISOString().slice(0, 10)}.xls`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-gray-400">Chargement...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Cartes carburant</h1>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={exportWorkbook}>
            <MdDownload className="inline" /> Export Excel
          </button>
          <a className="btn-secondary" href="mailto:?subject=Rapport cartes carburant&body=Veuillez trouver le rapport exporte des cartes carburant.">
            <MdEmail className="inline" /> Envoyer
          </a>
          {isAdmin && (
            <button className="btn-primary" onClick={() => { setError(''); setForm({ numero: '', libelle: '', seuil_alerte: '0', montant_initial: '' }); setModal({ type: 'create' }) }}>
              <MdAdd className="inline" /> Creer
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {cartes.map(carte => {
          const s = solde(carte.id)
          return (
            <div key={carte.id} className="rounded-lg border bg-white p-4">
              <p className="font-semibold">{carte.numero}</p>
              <p className="text-xs text-gray-400">{carte.libelle || '-'}</p>
              <p className="mt-3 text-lg font-bold">{fmt(s)} FCFA</p>
              <div className="mt-3 flex gap-2">
                {isAdmin && (
                  <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => { setError(''); setModal({ type: 'recharge', carte }) }}>
                    <MdPayments className="inline" /> Approvisionner
                  </button>
                )}
                {isAdmin && (
                  <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => { setError(''); setForm({ numero: carte.numero || '', libelle: carte.libelle || '', seuil_alerte: String(carte.seuil_alerte || 0), montant_initial: '' }); setModal({ type: 'edit', carte }) }}>
                    <MdEdit className="inline" /> Modifier
                  </button>
                )}
                <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setModal({ type: 'history', carte })}>
                  <MdHistory className="inline" /> Historique
                </button>
                {isAdmin && (
                  <button className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50" onClick={() => deleteCard(carte.id)}>
                    <MdDelete className="inline" /> Supprimer
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {cartes.length === 0 && <p className="text-sm italic text-gray-400">Aucune carte enregistree</p>}
      </div>

      {modal?.type === 'create' && (
        <Modal title="Nouvelle carte carburant" onClose={() => setModal(null)}>
          <form onSubmit={create} className="space-y-3">
            <input className="form-input" placeholder="Numero" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} required />
            <input className="form-input" placeholder="Libelle" value={form.libelle} onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))} />
            <input type="number" className="form-input" placeholder="Seuil" value={form.seuil_alerte} onChange={e => setForm(f => ({ ...f, seuil_alerte: e.target.value }))} min="0" />
            <input type="number" className="form-input" placeholder="Montant initial" value={form.montant_initial} onChange={e => setForm(f => ({ ...f, montant_initial: e.target.value }))} min="0" />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Annuler</button>
              <button className="btn-primary" disabled={saving}>{saving ? 'Creation...' : 'Creer'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === 'recharge' && (
        <Modal title={`Approvisionner ${modal.carte.numero}`} onClose={() => setModal(null)}>
          <form onSubmit={recharge} className="space-y-3">
            <input type="date" className="form-input" value={appro.date} onChange={e => setAppro(f => ({ ...f, date: e.target.value }))} required />
            <input type="number" className="form-input" value={appro.montant} onChange={e => setAppro(f => ({ ...f, montant: e.target.value }))} min="0" required />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Annuler</button>
              <button className="btn-primary" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === 'edit' && (
        <Modal title={`Modifier ${modal.carte.numero}`} onClose={() => setModal(null)}>
          <form onSubmit={updateCard} className="space-y-3">
            <input className="form-input" placeholder="Numero" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} required />
            <input className="form-input" placeholder="Libelle" value={form.libelle} onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))} />
            <input type="number" className="form-input" placeholder="Seuil" value={form.seuil_alerte} onChange={e => setForm(f => ({ ...f, seuil_alerte: e.target.value }))} min="0" />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Annuler</button>
              <button className="btn-primary" disabled={saving}>{saving ? 'Modification...' : 'Enregistrer'}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === 'history' && (
        <Modal title={`Historique ${modal.carte.numero}`} onClose={() => setModal(null)}>
          <DataTable colonnes={cols} donnees={rows} vide="Aucun mouvement" />
        </Modal>
      )}
    </div>
  )
}

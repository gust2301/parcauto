import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MdAdd, MdArrowForward, MdEdit, MdDelete, MdCheck, MdClose } from 'react-icons/md'

const STATUT_CONFIG = {
  actif:   { label: 'Actif',    cls: 'bg-green-100 text-green-800' },
  panne:   { label: 'En panne', cls: 'bg-orange-100 text-orange-800' },
  reforme: { label: 'Réformé',  cls: 'bg-red-100 text-red-800' },
}

const FORM_VIDE = { immatriculation: '', marque: '', modele: '', annee: '', kilometrage: '', statut: 'actif' }

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><MdClose size={22} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function VehiculeForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || FORM_VIDE)

  function set(field, value) { setForm(f => ({ ...f, [field]: value })) }

  function handleSubmit(e) {
    e.preventDefault()
    onSave(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Immatriculation *</label>
          <input className="form-input" value={form.immatriculation} onChange={e => set('immatriculation', e.target.value)} required placeholder="ex: DK-1234-AB" />
        </div>
        <div>
          <label className="form-label">Statut</label>
          <select className="form-input" value={form.statut} onChange={e => set('statut', e.target.value)}>
            <option value="actif">Actif</option>
            <option value="panne">En panne</option>
            <option value="reforme">Réformé</option>
          </select>
        </div>
        <div>
          <label className="form-label">Marque</label>
          <input className="form-input" value={form.marque} onChange={e => set('marque', e.target.value)} placeholder="ex: Toyota" />
        </div>
        <div>
          <label className="form-label">Modèle</label>
          <input className="form-input" value={form.modele} onChange={e => set('modele', e.target.value)} placeholder="ex: Land Cruiser" />
        </div>
        <div>
          <label className="form-label">Année</label>
          <input type="number" className="form-input" value={form.annee} onChange={e => set('annee', e.target.value)} min="1990" max="2030" placeholder="ex: 2020" />
        </div>
        <div>
          <label className="form-label">Kilométrage actuel</label>
          <input type="number" className="form-input" value={form.kilometrage} onChange={e => set('kilometrage', e.target.value)} min="0" placeholder="ex: 45000" />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>Annuler</button>
        <button type="submit" className="btn-primary flex-1" disabled={saving}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  )
}

export default function Vehicules() {
  const navigate = useNavigate()
  const [vehicules, setVehicules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)   // ajout
  const [editVehicule, setEditVehicule] = useState(null) // édition
  const [confirmDel, setConfirmDel] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('vehicules').select('*').order('created_at', { ascending: false })
    setVehicules(data || [])
    setLoading(false)
  }

  async function handleCreate(form) {
    setSaving(true)
    await supabase.from('vehicules').insert({
      immatriculation: form.immatriculation,
      marque: form.marque || null,
      modele: form.modele || null,
      annee: form.annee ? parseInt(form.annee) : null,
      kilometrage: form.kilometrage ? parseInt(form.kilometrage) : 0,
      statut: form.statut,
    })
    setShowModal(false)
    setSaving(false)
    load()
  }

  async function handleEdit(form) {
    setSaving(true)
    await supabase.from('vehicules').update({
      immatriculation: form.immatriculation,
      marque: form.marque || null,
      modele: form.modele || null,
      annee: form.annee ? parseInt(form.annee) : null,
      kilometrage: form.kilometrage ? parseInt(form.kilometrage) : 0,
      statut: form.statut,
    }).eq('id', editVehicule.id)
    setEditVehicule(null)
    setSaving(false)
    load()
  }

  async function handleDelete(id) {
    await supabase.from('vehicules').delete().eq('id', id)
    setConfirmDel(null)
    load()
  }

  const filtered = vehicules.filter(v =>
    v.immatriculation?.toLowerCase().includes(search.toLowerCase()) ||
    v.marque?.toLowerCase().includes(search.toLowerCase()) ||
    v.modele?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Véhicules</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
          <MdAdd size={18} /> Ajouter un véhicule
        </button>
      </div>

      {/* Recherche */}
      <div className="card py-4">
        <input
          type="text"
          className="form-input max-w-xs"
          placeholder="Rechercher (immat, marque...)"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Tableau */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Chargement...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Immatriculation</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Marque / Modèle</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Année</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kilométrage</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 italic">Aucun véhicule</td>
                </tr>
              ) : filtered.map(v => {
                const sc = STATUT_CONFIG[v.statut] || STATUT_CONFIG.actif
                return (
                  <tr key={v.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-[#1A3C6B] cursor-pointer" onClick={() => navigate(`/vehicules/${v.id}`)}>
                      {v.immatriculation}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{[v.marque, v.modele].filter(Boolean).join(' ') || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{v.annee || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {v.kilometrage != null ? new Intl.NumberFormat('fr-FR').format(v.kilometrage) + ' km' : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {confirmDel === v.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-600 font-medium">Supprimer ?</span>
                          <button onClick={() => handleDelete(v.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Confirmer">
                            <MdCheck size={16} />
                          </button>
                          <button onClick={() => setConfirmDel(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded" title="Annuler">
                            <MdClose size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            className="flex items-center gap-1 text-[#1A3C6B] text-xs hover:underline mr-2"
                            onClick={() => navigate(`/vehicules/${v.id}`)}>
                            Voir <MdArrowForward size={14} />
                          </button>
                          <button
                            className="p-1 text-[#1A3C6B] hover:bg-blue-50 rounded"
                            title="Modifier"
                            onClick={() => setEditVehicule(v)}>
                            <MdEdit size={16} />
                          </button>
                          <button
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                            title="Supprimer"
                            onClick={() => setConfirmDel(v.id)}>
                            <MdDelete size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal ajout */}
      {showModal && (
        <Modal title="Nouveau véhicule" onClose={() => setShowModal(false)}>
          <VehiculeForm
            onSave={handleCreate}
            onCancel={() => setShowModal(false)}
            saving={saving}
          />
        </Modal>
      )}

      {/* Modal édition */}
      {editVehicule && (
        <Modal title={`Modifier — ${editVehicule.immatriculation}`} onClose={() => setEditVehicule(null)}>
          <VehiculeForm
            initial={{
              immatriculation: editVehicule.immatriculation,
              marque: editVehicule.marque || '',
              modele: editVehicule.modele || '',
              annee: editVehicule.annee?.toString() || '',
              kilometrage: editVehicule.kilometrage?.toString() || '',
              statut: editVehicule.statut || 'actif',
            }}
            onSave={handleEdit}
            onCancel={() => setEditVehicule(null)}
            saving={saving}
          />
        </Modal>
      )}
    </div>
  )
}

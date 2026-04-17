export default function StatCard({ titre, valeur, icone: Icone, couleur = 'blue', sous_titre }) {
  const couleurs = {
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',   text: 'text-blue-700' },
    green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600', text: 'text-green-700' },
    orange: { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-600', text: 'text-orange-700' },
    red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-600',     text: 'text-red-700' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', text: 'text-purple-700' },
  }
  const c = couleurs[couleur] || couleurs.blue

  return (
    <div className={`rounded-xl p-5 border border-gray-200 shadow-sm ${c.bg}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{titre}</p>
          <p className={`text-2xl font-bold ${c.text}`}>{valeur}</p>
          {sous_titre && <p className="text-xs text-gray-400 mt-1">{sous_titre}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.icon}`}>
          {Icone && <Icone size={22} />}
        </div>
      </div>
    </div>
  )
}

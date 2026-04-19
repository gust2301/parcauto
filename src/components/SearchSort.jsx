import { MdSearch, MdArrowUpward, MdArrowDownward, MdUnfoldMore } from 'react-icons/md'

/**
 * Barre de recherche + sélecteur de tri réutilisable
 * Props:
 *   search: string, onSearch: fn
 *   sortOptions: [{ value: 'col', label: 'Libellé' }]
 *   sortKey: string, sortDir: 'asc'|'desc'
 *   onSort: fn(key, dir)
 *   placeholder: string
 */
export default function SearchSort({ search, onSearch, sortOptions = [], sortKey, sortDir, onSort, placeholder = 'Rechercher...' }) {
  function toggleSort(key) {
    if (sortKey === key) {
      onSort(key, sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      onSort(key, 'asc')
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Recherche */}
      <div className="relative flex-1 min-w-48">
        <MdSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          className="form-input pl-9"
          placeholder={placeholder}
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
      </div>

      {/* Tri */}
      {sortOptions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">Trier par :</span>
          {sortOptions.map(opt => {
            const active = sortKey === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => toggleSort(opt.value)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-[#1A3C6B] text-white border-[#1A3C6B]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#1A3C6B] hover:text-[#1A3C6B]'
                }`}
              >
                {opt.label}
                {active
                  ? sortDir === 'asc' ? <MdArrowUpward size={13} /> : <MdArrowDownward size={13} />
                  : <MdUnfoldMore size={13} className="opacity-40" />
                }
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * Hook utilitaire pour gérer search + sort dans un composant
 */
export function useSearchSort(data, { searchFields, defaultSort, defaultDir = 'desc' } = {}) {
  return { data } // placeholder — la logique est inline dans chaque page
}

/**
 * Filtre + trie un tableau de données
 * @param {Array} data
 * @param {string} search
 * @param {string[]} searchFields
 * @param {string} sortKey
 * @param {'asc'|'desc'} sortDir
 */
export function filterSort(data, search, searchFields, sortKey, sortDir) {
  let result = [...data]

  // Filtre recherche
  if (search.trim()) {
    const q = search.toLowerCase().trim()
    result = result.filter(item =>
      searchFields.some(field => {
        const val = field.split('.').reduce((o, k) => o?.[k], item)
        return String(val ?? '').toLowerCase().includes(q)
      })
    )
  }

  // Tri
  if (sortKey) {
    result.sort((a, b) => {
      const aVal = sortKey.split('.').reduce((o, k) => o?.[k], a)
      const bVal = sortKey.split('.').reduce((o, k) => o?.[k], b)
      const aStr = String(aVal ?? '')
      const bStr = String(bVal ?? '')
      const cmp = isNaN(aStr) || isNaN(bStr)
        ? aStr.localeCompare(bStr, 'fr')
        : Number(aStr) - Number(bStr)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }

  return result
}

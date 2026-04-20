import { MdSearch, MdArrowUpward, MdArrowDownward, MdUnfoldMore } from 'react-icons/md'

export default function SearchSort({ search, onSearch, sortOptions = [], sortKey, sortDir, onSort, placeholder = 'Rechercher...' }) {
  function toggleSort(key) {
    if (sortKey === key) {
      onSort(key, sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      onSort(key, 'asc')
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      <div className="relative w-full flex-1 sm:min-w-48">
        <MdSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          className="form-input pl-9"
          placeholder={placeholder}
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
      </div>

      {sortOptions.length > 0 && (
        <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:flex-wrap sm:overflow-visible sm:pb-0">
          <span className="shrink-0 text-xs text-gray-400 font-medium">Trier par :</span>
          {sortOptions.map(option => {
            const active = sortKey === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleSort(option.value)}
                className={`flex shrink-0 items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-[#1A3C6B] text-white border-[#1A3C6B]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#1A3C6B] hover:text-[#1A3C6B]'
                }`}
              >
                {option.label}
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

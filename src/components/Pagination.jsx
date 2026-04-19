import { MdChevronLeft, MdChevronRight } from 'react-icons/md'

/**
 * Composant pagination réutilisable
 * Props:
 *   total    : nombre total d'items
 *   page     : page courante (1-based)
 *   perPage  : items par page
 *   onPage   : fn(newPage)
 */
export default function Pagination({ total, page, perPage, onPage }) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null

  const start = (page - 1) * perPage + 1
  const end = Math.min(page * perPage, total)

  // Génère la liste de pages à afficher (avec ellipses)
  function getPages() {
    const pages = []
    const delta = 2
    const left = page - delta
    const right = page + delta

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i <= right)) {
        pages.push(i)
      } else if (i === left - 1 || i === right + 1) {
        pages.push('...')
      }
    }
    return pages
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white">
      <p className="text-xs text-gray-500">
        {start}–{end} sur <span className="font-medium text-gray-700">{total}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <MdChevronLeft size={18} />
        </button>

        {getPages().map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`min-w-[30px] h-[30px] rounded-lg text-xs font-medium transition-colors ${
                p === page
                  ? 'bg-[#1A3C6B] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <MdChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}

/**
 * Découpe un tableau selon la page courante
 */
export function paginate(data, page, perPage) {
  return data.slice((page - 1) * perPage, page * perPage)
}

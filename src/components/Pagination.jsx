import { MdChevronLeft, MdChevronRight } from 'react-icons/md'
import { getTotalPages } from '../lib/pagination'

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50]

export default function Pagination({
  total,
  page,
  perPage,
  onPage,
  onPerPage,
  perPageOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}) {
  const totalPages = getTotalPages(total, perPage)
  if (totalPages <= 1) return null

  const start = (page - 1) * perPage + 1
  const end = Math.min(page * perPage, total)

  function getPages() {
    const pages = []
    const delta = 1
    const left = page - delta
    const right = page + delta
    let lastPage = 0

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i <= right)) {
        if (lastPage && i - lastPage > 1) pages.push('...')
        pages.push(i)
        lastPage = i
      }
    }

    return pages
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3 border-t border-gray-100 bg-white sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <p>
          {start}–{end} sur <span className="font-medium text-gray-700">{total}</span>
        </p>
        {onPerPage && (
          <label className="flex items-center gap-2">
            <span className="hidden sm:inline">Lignes</span>
            <select
              className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1A3C6B]"
              value={perPage}
              onChange={e => onPerPage(Number(e.target.value))}
            >
              {perPageOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Page précédente"
        >
          <MdChevronLeft size={18} />
        </button>

        {getPages().map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-gray-400">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p)}
              className={`h-8 min-w-8 rounded-lg px-2 text-xs font-medium transition-colors ${
                p === page
                  ? 'bg-[#1A3C6B] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Page suivante"
        >
          <MdChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}

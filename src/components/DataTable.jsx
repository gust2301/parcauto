import { useState } from 'react'
import Pagination from './Pagination'
import { getTotalPages, paginate } from '../lib/pagination'

export default function DataTable({ colonnes, donnees, vide = 'Aucune donnée', perPage = 10 }) {
  const dataKey = donnees.map(row => row?.id ?? row?.date ?? '').join('|')
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: perPage,
    dataKey,
    initialPerPage: perPage,
  })
  const hasChangedData = pagination.dataKey !== dataKey
  const hasChangedPerPage = pagination.initialPerPage !== perPage
  const pageSize = hasChangedPerPage ? perPage : pagination.pageSize
  const page = hasChangedData || hasChangedPerPage ? 1 : pagination.page
  const totalPages = getTotalPages(donnees.length, pageSize)
  const currentPage = Math.min(page, totalPages)
  const paginatedData = paginate(donnees, currentPage, pageSize)

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {colonnes.map((col, i) => (
              <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {donnees.length === 0 ? (
            <tr>
              <td colSpan={colonnes.length} className="px-4 py-8 text-center text-gray-400 italic">
                {vide}
              </td>
            </tr>
          ) : (
            paginatedData.map((row, i) => (
              <tr key={row?.id ?? i} className="hover:bg-gray-50 transition-colors">
                {colonnes.map((col, j) => (
                  <td key={j} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {col.render ? col.render(row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      <Pagination
        total={donnees.length}
        page={currentPage}
        perPage={pageSize}
        onPage={nextPage => setPagination({ page: nextPage, pageSize, dataKey, initialPerPage: perPage })}
        onPerPage={size => setPagination({ page: 1, pageSize: size, dataKey, initialPerPage: perPage })}
      />
    </div>
  )
}

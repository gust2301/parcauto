import { useState, useEffect } from 'react'
import Pagination, { paginate } from './Pagination'

export default function DataTable({ colonnes, donnees, vide = 'Aucune donnée', perPage = 10 }) {
  const [page, setPage] = useState(1)

  // Remet à la page 1 quand les données changent (recherche / tri)
  const dataKey = donnees.length + '-' + (donnees[0]?.id ?? donnees[0]?.date ?? '')
  useEffect(() => { setPage(1) }, [dataKey])

  const paginatedData = paginate(donnees, page, perPage)

  return (
    <div className="overflow-x-auto">
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
              <tr key={i} className="hover:bg-gray-50 transition-colors">
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
      <Pagination total={donnees.length} page={page} perPage={perPage} onPage={setPage} />
    </div>
  )
}

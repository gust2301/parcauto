export function filterSort(data, search, searchFields, sortKey, sortDir) {
  let result = [...data]

  if (search.trim()) {
    const query = search.toLowerCase().trim()
    result = result.filter(item =>
      searchFields.some(field => {
        const value = field.split('.').reduce((object, key) => object?.[key], item)
        return String(value ?? '').toLowerCase().includes(query)
      })
    )
  }

  if (sortKey) {
    result.sort((a, b) => {
      const aValue = sortKey.split('.').reduce((object, key) => object?.[key], a)
      const bValue = sortKey.split('.').reduce((object, key) => object?.[key], b)
      const aString = String(aValue ?? '')
      const bString = String(bValue ?? '')
      const comparison = isNaN(aString) || isNaN(bString)
        ? aString.localeCompare(bString, 'fr')
        : Number(aString) - Number(bString)
      return sortDir === 'asc' ? comparison : -comparison
    })
  }

  return result
}

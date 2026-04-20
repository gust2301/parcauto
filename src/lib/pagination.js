export function paginate(data, page, perPage) {
  return data.slice((page - 1) * perPage, page * perPage)
}

export function getTotalPages(total, perPage) {
  return Math.max(1, Math.ceil(total / perPage))
}

export function keywordMatchesSearch(query, keyword) {
  if (query === null || keyword == null) {
    return false
  }

  const normalizedQuery = query.toLocaleUpperCase()
  const word = keyword.word ?? ''
  const codes = Array.isArray(keyword.feacnCodes) ? keyword.feacnCodes : []

  return (
    word.toLocaleUpperCase().includes(normalizedQuery) ||
    codes.some(code => (code ?? '').toLocaleUpperCase().includes(normalizedQuery))
  )
}

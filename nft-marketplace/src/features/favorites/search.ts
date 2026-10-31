export function validateFavoritesSearch(search: Record<string, unknown>): { adicionar?: string } {
  return typeof search.adicionar === 'string' && /^[a-z0-9-]{1,100}$/.test(search.adicionar) ? { adicionar: search.adicionar } : {}
}

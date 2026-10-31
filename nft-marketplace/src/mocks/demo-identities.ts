import type { Session } from '../features/checkout/contracts'

// IDs remain stable so existing carts, orders and sessions keep their owners.
export const demoUsers = [
  { id: 'collector-alex', name: 'João Moreira', email: 'joao@kurio.test', username: 'joao.moreira', ensName: 'joao.kurio.eth' },
  { id: 'collector-sam', name: 'Ana Araújo', email: 'ana@kurio.test', username: 'ana.araujo', ensName: 'ana.kurio.eth' },
]
const legacy = [
  { id: 'collector-alex', name: 'Alex Morgan', email: 'alex@kurio.test', username: 'alex.morgan' },
  { id: 'collector-sam', name: 'Sam Rivera', email: 'sam@kurio.test', username: 'sam.rivera' },
]
export function migrateIdentity<T extends NonNullable<Session['user']> & { username?: string }>(value: T): T {
  const previous = legacy.find(user => user.id === value.id)
  const next = demoUsers.find(user => user.id === value.id)
  if (!previous || !next) return value
  return { ...value, name: value.name === previous.name ? next.name : value.name, email: value.email === previous.email ? next.email : value.email,
    ...(value.username === previous.username ? { username: next.username } : {}) }
}

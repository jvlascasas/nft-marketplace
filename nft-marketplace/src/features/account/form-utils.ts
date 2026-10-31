import type { FieldErrors } from './contracts'

export function focusAccountError(prefix: string, errors: FieldErrors) {
  const field = Object.keys(errors).find(name => errors[name])
  if (field) document.getElementById(prefix + field)?.focus()
}

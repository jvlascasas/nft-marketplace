export class CartError extends Error {
  code: string
  status: number
  constructor(code: string, message: string, status = 422) { super(message); this.code = code; this.status = status }
}
export class SettingsError extends CartError {
  fields: Record<string, string>
  constructor(code: string, message: string, status = 422, fields: Record<string, string> = {}) { super(code, message, status); this.fields = fields }
}

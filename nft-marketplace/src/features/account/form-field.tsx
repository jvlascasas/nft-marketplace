import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'


export function AccountField({ id, name, label, value, error, required = false, onChange, password = false, placeholder, type = 'text', maxLength = 100, autoComplete = 'off' }: {
  id: string; name: string; label: string; value: string; error?: string; required?: boolean
  onChange: (value: string) => void; password?: boolean; placeholder?: string; type?: string; maxLength?: number; autoComplete?: string
}) {
  const [visible, setVisible] = useState(false)
  return <div className="account-field"><label htmlFor={id}>{label}{required && <span aria-hidden="true">*</span>}</label><div className="account-input-wrap"><input id={id} name={name} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} type={password ? visible ? 'text' : 'password' : type} autoComplete={autoComplete} maxLength={maxLength} required={required} aria-invalid={!!error} aria-describedby={error ? id + '-error' : undefined} />{password && <button type="button" className="account-password-toggle" aria-label={(visible ? 'Ocultar ' : 'Mostrar ') + label.toLowerCase()} aria-pressed={visible} onClick={() => setVisible(current => !current)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button>}</div>{error && <p className="account-field-error" id={id + '-error'}>{error}</p>}</div>
}

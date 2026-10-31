import { UserRound } from 'lucide-react'

export function AccountAvatar({ avatar, name, className = '' }: { avatar?: string | null; name: string; className?: string }) {
  return avatar ? <img className={'account-avatar ' + className} src={avatar} alt={'Avatar de ' + name} /> : <span className={'account-avatar account-avatar-placeholder ' + className} role="img" aria-label={'Avatar não definido de ' + name}><UserRound strokeWidth={1.2} /></span>
}

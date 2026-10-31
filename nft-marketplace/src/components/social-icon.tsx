export function SocialIcon({ name }: { name: string }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
    {name === 'Facebook' && <path d="M14 22v-9h3l.5-4H14V7c0-1.5.5-2 2-2h2V1h-3c-4 0-5 2-5 6v2H7v4h3v9" fill="currentColor" stroke="none" />}
    {name === 'Instagram' && <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" /></>}
    {name === 'Twitter' && <path d="M22 5.9c-.7.3-1.5.5-2.3.6A4 4 0 0 0 21.5 4c-.8.5-1.6.8-2.6 1a4 4 0 0 0-6.9 3.7A11.4 11.4 0 0 1 3.7 4.5a4 4 0 0 0 1.2 5.4c-.7 0-1.3-.2-1.8-.5a4 4 0 0 0 3.2 4c-.6.2-1.2.2-1.8.1a4 4 0 0 0 3.7 2.8A8 8 0 0 1 2 18c2 1.3 4.1 2 6.5 2 7.8 0 12.1-6.5 11.8-12.3.7-.5 1.2-1.1 1.7-1.8Z" fill="currentColor" stroke="none" />}
    {name === 'LinkedIn' && <><circle cx="5" cy="5" r="1.6" fill="currentColor" stroke="none" /><path d="M5 9v11M11 20V9m0 5c0-6 8-6 8 0v6" strokeWidth="3" /></>}
    {name === 'YouTube' && <><rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 9 6 3-6 3Z" fill="currentColor" stroke="none" /></>}
  </svg>
}

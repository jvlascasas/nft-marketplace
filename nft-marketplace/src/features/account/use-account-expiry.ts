import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { isUnauthorized, sessionKey } from '../checkout/api'

export function useAccountExpiry(error: unknown) {
  const client = useQueryClient()
  useEffect(() => { if (isUnauthorized(error)) void client.invalidateQueries({ queryKey: sessionKey }) }, [error, client])
}

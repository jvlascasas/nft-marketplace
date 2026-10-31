export const specialCoupon = 'JVLasCasas Aprovado'
export function couponFor(value: string | null) {
  if (value?.trim().toLocaleLowerCase() === specialCoupon.toLocaleLowerCase()) return { code: specialCoupon, percent: 50, appliesTo: 'total' as const }
  if (value?.trim().toUpperCase() === 'KURIO10') return { code: 'KURIO10', percent: 10, appliesTo: 'subtotal' as const }
  return null
}

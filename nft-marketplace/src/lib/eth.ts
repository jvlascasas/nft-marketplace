const DECIMAL = /^\d{1,9}(?:\.\d{1,18})?$/

export function isEth(value: unknown): value is string {
  return typeof value === 'string' && DECIMAL.test(value)
}

export function ethToWei(value: string): bigint {
  if (!isEth(value)) throw new Error('Valor ETH inválido')
  const [integer, fraction = ''] = value.split('.')
  return BigInt(integer) * 10n ** 18n + BigInt(fraction.padEnd(18, '0'))
}

export function formatEth(value: string): string {
  if (!isEth(value)) throw new Error('Valor ETH inválido')
  const [integer, fraction = ''] = value.split('.')
  const significant = fraction.replace(/0+$/, '')
  return BigInt(integer).toString() + ',' + significant.padEnd(2, '0')
}

export function weiToEth(value: bigint): string {
  if (value < 0n) throw new Error('Valor ETH negativo')
  const integer = value / 10n ** 18n
  const fraction = (value % 10n ** 18n).toString().padStart(18, '0').replace(/0+$/, '')
  return integer.toString() + (fraction ? '.' + fraction : '')
}

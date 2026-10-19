import { fromNano } from '@ton/core'

/**
 * Нанотоны → строка для людей.
 * 1234567891234n → "1 234,5678"  (не больше maxDecimals знаков, без хвостовых нулей)
 */
export function formatTon(nano: bigint, maxDecimals = 4): string {
  const [intPart, fracPart = ''] = fromNano(nano).split('.')
  const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const frac = fracPart.slice(0, maxDecimals).replace(/0+$/, '')
  return frac ? `${groupedInt},${frac}` : groupedInt
}

const timeFormat = new Intl.DateTimeFormat('ru', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

/** unix-секунды → "19 окт., 15:33" */
export function formatTime(unixSeconds: number): string {
  return timeFormat.format(new Date(unixSeconds * 1000))
}

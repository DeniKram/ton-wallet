import { Address } from '@ton/core'
import { network } from '../config/network'

/**
 * Разбирает адрес из того, что ввёл пользователь.
 * Понимает user-friendly (UQ…, EQ…, 0Q…, kQ…) и raw (0:abc…) форматы.
 * Возвращает null, если строка не адрес.
 */
export function parseAddress(input: string): Address | null {
  const text = input.trim()
  if (!text) return null
  try {
    return Address.parse(text)
  } catch {
    return null
  }
}

/** Адрес в виде для показа: формат текущей сети, non-bounceable (как у кошельков) */
export function formatAddress(address: Address): string {
  return address.toString({ testOnly: network.testOnly, bounceable: false })
}

/** UQBx…k3Zp */
export function shortAddress(text: string, head = 4, tail = 4): string {
  if (text.length <= head + tail + 1) return text
  return `${text.slice(0, head)}…${text.slice(-tail)}`
}

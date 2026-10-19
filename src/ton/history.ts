import type { Address, Cell, Message, Transaction } from '@ton/core'
import { client, rateLimited } from './client'
import { formatAddress } from './address'

export type TxDirection = 'in' | 'out' | 'other'

/** Транзакция в понятном для интерфейса виде */
export interface TxItem {
  hash: string // hex, для ссылки на эксплорер
  lt: string // logical time: порядковый номер транзакции у этого адреса
  time: number // unix-время в секундах
  direction: TxDirection
  amount: bigint // нанотоны: сколько пришло или ушло
  counterparty: string | null // от кого / кому
  comment: string | null
  fee: bigint // комиссия сети в нанотонах
  bounced: boolean // деньги вернулись отправителю (например, адрес не принял перевод)
}

/**
 * Текстовый комментарий в TON: тело сообщения начинается с 32 нулевых бит (op = 0),
 * дальше идёт текст в UTF-8. Всё остальное (вызовы контрактов, jetton-переводы)
 * комментарием не считаем.
 */
function readComment(body: Cell | undefined): string | null {
  if (!body) return null
  try {
    const slice = body.beginParse()
    if (slice.remainingBits < 32) return null
    if (slice.loadUint(32) !== 0) return null
    const text = slice.loadStringTail().trim()
    return text || null
  } catch {
    return null
  }
}

/** 2 получателя, 5 получателей, 21 получатель */
function recipients(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} получатель`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} получателя`
  return `${n} получателей`
}

export function parseTransaction(tx: Transaction): TxItem {
  const base = {
    hash: tx.hash().toString('hex'),
    lt: tx.lt.toString(),
    time: tx.now,
    fee: tx.totalFees.coins,
  }

  const inInfo = tx.inMessage?.info

  // 1) Входящий перевод: внутреннее сообщение от другого контракта
  if (tx.inMessage && inInfo?.type === 'internal') {
    return {
      ...base,
      direction: 'in',
      amount: inInfo.value.coins,
      counterparty: formatAddress(inInfo.src),
      comment: readComment(tx.inMessage.body),
      bounced: inInfo.bounced,
    }
  }

  // 2) Исходящий перевод: владелец подписал внешнее сообщение,
  //    и кошелёк отправил одно или несколько внутренних сообщений
  const outs: Message[] = tx.outMessages.values()
  const internalOuts = outs.filter((m) => m.info.type === 'internal')
  if (inInfo?.type === 'external-in' && internalOuts.length > 0) {
    const first = internalOuts[0]
    const amount = internalOuts.reduce(
      (sum, m) => sum + (m.info.type === 'internal' ? m.info.value.coins : 0n),
      0n,
    )
    const firstDest = first.info.type === 'internal' ? formatAddress(first.info.dest) : null
    return {
      ...base,
      direction: 'out',
      amount,
      counterparty: internalOuts.length > 1 ? recipients(internalOuts.length) : firstDest,
      comment: readComment(first.body),
      bounced: false,
    }
  }

  // 3) Служебные транзакции (деплой кошелька, системные tick-tock и т.п.)
  return { ...base, direction: 'other', amount: 0n, counterparty: null, comment: null, bounced: false }
}

/** Последние транзакции адреса, новые сверху */
export async function getHistory(address: Address, limit = 20): Promise<TxItem[]> {
  const txs = await rateLimited(() => client.getTransactions(address, { limit }))
  return txs.map(parseTransaction)
}

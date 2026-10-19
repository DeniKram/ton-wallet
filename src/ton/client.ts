import { TonClient } from '@ton/ton'
import { API_KEY, network } from '../config/network'

// Один клиент на всё приложение
export const client = new TonClient({
  endpoint: network.endpoint,
  apiKey: API_KEY,
  timeout: 15_000,
})

// toncenter без ключа пускает 1 запрос в секунду, с ключом около 10.
// Поэтому все запросы идут через очередь с паузой между ними.
const MIN_INTERVAL_MS = API_KEY ? 120 : 1100

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

let queue: Promise<unknown> = Promise.resolve()
let lastCallAt = 0

export class RateLimitError extends Error {
  constructor() {
    super('Слишком много запросов к сети')
  }
}

function isRateLimited(error: unknown): boolean {
  // TonClient ходит в сеть через axios: при 429 в ошибке есть response.status
  const status = (error as { response?: { status?: number } } | null)?.response?.status
  return status === 429
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn()
    } catch (error) {
      if (!isRateLimited(error)) throw error
      if (i >= attempts - 1) throw new RateLimitError()
      await sleep(1500 * (i + 1)) // 1.5 с, потом 3 с
      lastCallAt = Date.now()
    }
  }
}

/** Выполняет запрос к сети в общей очереди, соблюдая лимит и повторяя при 429 */
export function rateLimited<T>(fn: () => Promise<T>): Promise<T> {
  const run = async () => {
    const wait = lastCallAt + MIN_INTERVAL_MS - Date.now()
    if (wait > 0) await sleep(wait)
    lastCallAt = Date.now()
    return withRetry(fn)
  }
  const result = queue.then(run, run)
  queue = result.catch(() => undefined) // ошибка одного запроса не ломает очередь
  return result
}

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { EXAMPLE_ADDRESS, network } from '../config/network'
import { formatAddress, parseAddress, shortAddress } from '../ton/address'
import { getAccount } from '../ton/balance'
import type { AccountInfo } from '../ton/balance'
import { getHistory } from '../ton/history'
import type { TxItem } from '../ton/history'
import { RateLimitError } from '../ton/client'
import { formatTime, formatTon } from '../ui/format'
import { openExternal } from '../telegram'

const STORAGE_KEY = 'watch.lastAddress'

function loadSaved(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function save(value: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // хранилище недоступно (приватный режим и т.п.): просто не запоминаем
  }
}

function errorText(error: unknown): string {
  if (error instanceof RateLimitError) return 'Сеть просит подождать. Попробуй ещё раз через пару секунд.'
  return 'Не получилось связаться с сетью TON. Проверь интернет и попробуй снова.'
}

type Status = 'idle' | 'loading' | 'ready' | 'error'

export default function WatchScreen() {
  const [input, setInput] = useState(loadSaved)
  const [inputError, setInputError] = useState<string | null>(null)
  const [address, setAddress] = useState<string | null>(null) // отформатированный адрес, который сейчас показываем
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [txs, setTxs] = useState<TxItem[]>([])
  const [copied, setCopied] = useState(false)

  // Номер последнего запроса: ответы на устаревшие запросы игнорируем
  const requestId = useRef(0)

  const load = useCallback(async (raw: string) => {
    const parsed = parseAddress(raw)
    if (!parsed) {
      setInputError('Это не похоже на адрес TON')
      return
    }
    setInputError(null)
    const id = ++requestId.current
    const pretty = formatAddress(parsed)
    setAddress(pretty)
    setStatus('loading')
    setError(null)
    setAccount(null)
    setTxs([])
    save(raw.trim())

    try {
      // Запросы идут по очереди (лимит toncenter), баланс показываем сразу, как придёт
      const info = await getAccount(parsed)
      if (id !== requestId.current) return
      setAccount(info)
      const history = await getHistory(parsed, 20)
      if (id !== requestId.current) return
      setTxs(history)
      setStatus('ready')
    } catch (e) {
      if (id !== requestId.current) return
      console.error(e)
      setError(errorText(e))
      setStatus('error')
    }
  }, [])

  // Если адрес уже вводили раньше, сразу показываем его
  useEffect(() => {
    const saved = loadSaved()
    if (saved) void load(saved)
  }, [load])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void load(input)
  }

  const useExample = () => {
    setInput(EXAMPLE_ADDRESS)
    void load(EXAMPLE_ADDRESS)
  }

  const copyAddress = async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // буфер обмена недоступен: ничего страшного
    }
  }

  return (
    <main className="app">
      <header className="topbar">
        <h1 className="title">Наблюдение</h1>
        <span className="badge">{network.name}</span>
      </header>

      <form className="search" onSubmit={onSubmit}>
        <label className="label" htmlFor="addr">Адрес кошелька</label>
        <div className="search-row">
          <input
            id="addr"
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="UQ… / 0Q… / 0:…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button className="btn btn-primary" type="submit" disabled={status === 'loading'}>
            Показать
          </button>
        </div>
        {inputError && <div className="error-text">{inputError}</div>}
        {!address && (
          <button className="btn-link" type="button" onClick={useExample}>
            Нет адреса под рукой? Показать пример
          </button>
        )}
      </form>

      {address && (
        <section className="card balance-card">
          <button className="address-chip" type="button" onClick={copyAddress} aria-label="Скопировать адрес">
            {copied ? 'Скопировано' : shortAddress(address, 6, 6)}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="9" width="12" height="12" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
          </button>

          {account ? (
            <>
              <div className="balance">
                {formatTon(account.balance, 2)} <span className="balance-unit">TON</span>
              </div>
              {account.state === 'uninitialized' && (
                <div className="hint">Кошелёк ещё не активирован: он станет активным после первой исходящей транзакции.</div>
              )}
              {account.state === 'frozen' && <div className="hint">Аккаунт заморожен.</div>}
            </>
          ) : status === 'loading' ? (
            <div className="skeleton balance-skeleton" />
          ) : null}

          <div className="card-actions">
            <button className="btn btn-secondary" type="button" onClick={() => void load(address)} disabled={status === 'loading'}>
              Обновить
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => openExternal(`${network.explorer}/${address}`)}>
              В эксплорере
            </button>
          </div>
        </section>
      )}

      {status === 'error' && error && <div className="card error-card">{error}</div>}

      {address && (
        <section className="history">
          <h2 className="section-title">История</h2>

          {status === 'loading' && txs.length === 0 && (
            <>
              <div className="skeleton tx-skeleton" />
              <div className="skeleton tx-skeleton" />
              <div className="skeleton tx-skeleton" />
            </>
          )}

          {status === 'ready' && txs.length === 0 && <div className="hint">Транзакций пока нет.</div>}

          {txs.map((tx) => (
            <button
              key={tx.hash}
              className="tx"
              type="button"
              onClick={() => openExternal(`${network.explorer}/transaction/${tx.hash}`)}
            >
              <span className={`tx-icon tx-icon-${tx.direction}`} aria-hidden="true">
                {tx.direction === 'in' ? '↓' : tx.direction === 'out' ? '↑' : '•'}
              </span>
              <span className="tx-main">
                <span className="tx-title">
                  {tx.direction === 'in' && `От ${tx.counterparty ? shortAddress(tx.counterparty) : '—'}`}
                  {tx.direction === 'out' && `Кому ${tx.counterparty ? shortAddress(tx.counterparty) : '—'}`}
                  {tx.direction === 'other' && 'Служебная транзакция'}
                </span>
                <span className="tx-sub">
                  {tx.comment ? `«${tx.comment}» · ` : ''}
                  {formatTime(tx.time)}
                  {tx.bounced ? ' · возврат' : ''}
                </span>
              </span>
              {tx.direction !== 'other' && (
                <span className={`tx-amount tx-amount-${tx.direction}`}>
                  {tx.direction === 'in' ? '+' : '−'}
                  {formatTon(tx.amount)} TON
                </span>
              )}
            </button>
          ))}
        </section>
      )}
    </main>
  )
}

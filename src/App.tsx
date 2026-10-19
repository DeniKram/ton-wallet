import { Buffer } from 'buffer'
import { Address, toNano, fromNano } from '@ton/core'
import { tg } from './telegram'

export default function App() {
  // Проверка 1: конвертация сумм. 1 TON = 10^9 нанотонов
  const nano = toNano('2.5') // bigint: 2500000000n
  const back = fromNano(nano) // string: "2.5"

  // Проверка 2: работа с адресами (заодно проверяет, что полифилл Buffer подключился)
  // Адрес = workchain (0) + 32 байта хеша; здесь хеш из нулей, просто для теста
  const zeroAddress = new Address(0, Buffer.alloc(32))
  const friendly = zeroAddress.toString({ testOnly: true, bounceable: false })

  const user = tg?.initDataUnsafe.user

  return (
    <main className="app">
      <h1 style={{ margin: 0, fontSize: 24 }}>TON Wallet</h1>

      <section className="card">
        <div className="label">Окружение</div>
        <div className="value">
          {tg ? `Telegram · ${tg.platform} · Bot API ${tg.version}` : 'Обычный браузер (не Telegram)'}
        </div>
        {user && <div className="value">Привет, {user.first_name}!</div>}
      </section>

      <section className="card">
        <div className="label">Проверка @ton/core</div>
        <div className="value">
          toNano('2.5') = <span className="ok">{nano.toString()}</span> нанотонов
        </div>
        <div className="value">
          fromNano(...) = <span className="ok">{back}</span> TON
        </div>
        <div className="label" style={{ marginTop: 8 }}>Нулевой адрес (testnet, non-bounceable)</div>
        <div className="value ok">{friendly}</div>
      </section>
    </main>
  )
}

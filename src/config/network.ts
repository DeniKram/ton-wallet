// Настройки сети. Пока работаем только в testnet: монеты там ненастоящие.
export type NetworkName = 'testnet' | 'mainnet'

export interface NetworkConfig {
  name: NetworkName
  endpoint: string // toncenter JSON-RPC (API v2)
  explorer: string // где смотреть адреса и транзакции
  testOnly: boolean // формат адресов: testnet-адреса начинаются на 0Q/kQ, mainnet на UQ/EQ
}

export const NETWORKS: Record<NetworkName, NetworkConfig> = {
  testnet: {
    name: 'testnet',
    endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
    explorer: 'https://testnet.tonviewer.com',
    testOnly: true,
  },
  mainnet: {
    name: 'mainnet',
    endpoint: 'https://toncenter.com/api/v2/jsonRPC',
    explorer: 'https://tonviewer.com',
    testOnly: false,
  },
}

export const ACTIVE_NETWORK: NetworkName = 'testnet'
export const network: NetworkConfig = NETWORKS[ACTIVE_NETWORK]

// Ключ toncenter необязателен: без него лимит 1 запрос/сек, с ним больше.
// Если появится, положи его в файл .env.local:  VITE_TONCENTER_API_KEY=твой_ключ
// Важно: всё, что начинается на VITE_, попадает в код сайта и видно всем.
// Для ключа, который просто поднимает лимит запросов, это нормально.
export const API_KEY: string | undefined = import.meta.env?.VITE_TONCENTER_API_KEY || undefined

// Адрес с гарантированной активностью для теста: системный контракт Elector,
// он есть и в testnet, и в mainnet, и у него постоянно идут транзакции
export const EXAMPLE_ADDRESS = 'Ef8zMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM0vF'

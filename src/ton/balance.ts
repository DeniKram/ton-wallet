import type { Address } from '@ton/core'
import { client, rateLimited } from './client'

export type AccountState = 'active' | 'uninitialized' | 'frozen'

export interface AccountInfo {
  balance: bigint // в нанотонах: 1 TON = 1_000_000_000n
  state: AccountState // 'uninitialized' = на адрес приходили деньги, но кошелёк ещё ни разу не отправлял
}

export async function getAccount(address: Address): Promise<AccountInfo> {
  const state = await rateLimited(() => client.getContractState(address))
  return { balance: state.balance, state: state.state }
}

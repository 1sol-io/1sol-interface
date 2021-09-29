import { PublicKey } from "@solana/web3.js"
import btc from '../assets/token/btc.png'
import usdt from '../assets/token/usdt.png'
import usdc from '../assets/token/usdc.png'
import srm from '../assets/token/srm.png'
import sol from '../assets/token/sol.png'
import eth from '../assets/token/eth.png'

// TODO
// prograim id is different in different net
export const TOKENSWAP_PROGRAM_ID = new PublicKey('SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8')
export const SERUM_PROGRAM_ID = new PublicKey('DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY')
export const ONESOL_PROGRAM_ID = new PublicKey('HEQQHE6U6xp4aurpZFoBNguusLWs3cyyxV9A2qUA9cQo')

export const SYMBOL_PAIRS = [
  // { name: 'AVAX/USD', key: 'DinfGKkKxJsU3kFnj173zSRdXNhZxxgZY8YC5GCQYhsi' },
  { name: 'BTC', key: '6dbkV6QCToTk6DRfuJyrGuz18kZ4rPUSHLLLVrryWdUC', token: 'BTC', icon: btc },
  { name: 'ETH', key: '8pcXGi4QoHKytv3issKdFF3XRDeYAGEgy6EEAi1ioLe7', token: 'ETH', icon: eth },
  // { name: 'LINK/USD', key: 'DKE5VrYbboAteTfzAycvtV7Hah7VwvyXC56hj2hZ8dfS' },
  // { name: 'MATIC/USD', key: '9Xzp4FjgB9UKF3tDXS1WxHTGauv4dtPmkxxTZdWZsP2x' },
  { name: 'SOL', key: 'FmAmfoyPXiA8Vhhe6MZTr3U6rZfEZ1ctEHay1ysqCqcf', token: 'SOL', icon: sol },
  { name: 'SRM', key: 'ELfANVHk7wYB3ALoxPsiTQgM3t9MXgjbNZQNZyPuBp9C', token: 'SRM', icon: srm },
  { name: 'USDC', key: 'F3Wgm7HqxnxvNznF7MmHMW7566zBQyuwzF5JWRhjhUtc', token: 'USDC', icon: usdc },
  { name: 'USDT', key: 'FG5FPJnT4ubjoNMm9Bh2uAfgbq2bwxP7aY6AKVmYou1p', token: 'USDT', icon: usdt },
]

export const PROVIDER_MAP: { [key: string]: string } = {
  '1sol': '1Sol',
  token_swap_pool: 'Token Swap',
  serum_dex_market: 'Serum Dex'
}
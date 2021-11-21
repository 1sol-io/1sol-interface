// @ts-nocheck
import { PublicKey } from "@solana/web3.js"
import { TOKEN_PROGRAM_ID as TOKENPROGRAMID } from '@solana/spl-token'

import btc from '../assets/token/btc.png'
import usdt from '../assets/token/usdt.png'
import usdc from '../assets/token/usdc.png'
import srm from '../assets/token/srm.png'
import sol from '../assets/token/sol.png'
import eth from '../assets/token/eth.png'

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

export const TOKEN_SWAP_NAME = 'Token Swap'
export const SERUM_DEX_MARKET_NAME = 'Serum'
export const ONESOL_NAME = '1Sol'
export const SABER_STABLE_SWAP_NAME = 'Saber'
export const ORCA_SWAP_NAME = 'Orca'
export const RAYDIUM_NAME = 'Raydium'

export const EXCHANGER_SPL_TOKEN_SWAP = 'SplTokenSwap'
export const EXCHANGER_SERUM_DEX = 'SerumDex'
export const EXCHANGER_SABER_STABLE_SWAP = 'SaberStableSwap'
export const EXCHANGER_ORCA_SWAP = 'OrcaSwap'
export const EXCHANGER_RAYDIUM = 'Raydium'

export const PROVIDER_MAP: { [key: string]: string } = {
  best_route: ONESOL_NAME,
  [EXCHANGER_SPL_TOKEN_SWAP]: TOKEN_SWAP_NAME,
  [EXCHANGER_SERUM_DEX]: SERUM_DEX_MARKET_NAME,
  [EXCHANGER_SABER_STABLE_SWAP]: SABER_STABLE_SWAP_NAME,
  [EXCHANGER_ORCA_SWAP]: ORCA_SWAP_NAME,
  [EXCHANGER_RAYDIUM]: RAYDIUM_NAME,
}

const {
  REACT_APP_ONESOL,
  REACT_APP_TOKEN_SWAP,
  REACT_APP_SABER,
  REACT_APP_ORCA,
  REACT_APP_RAYDIUM,
  REACT_APP_SERUM,
} = process.env

export const ONESOL_PROGRAM_ID = new PublicKey(REACT_APP_ONESOL)

export const TOKEN_SWAP_PROGRAM_ID = new PublicKey(REACT_APP_TOKEN_SWAP)
export const SABER_PROGRAM_ID = new PublicKey(REACT_APP_SABER)

export const SERUM_PROGRAM_ID = new PublicKey(REACT_APP_SERUM)
export const ORCA_PROGRAM_ID = new PublicKey(REACT_APP_ORCA)
export const RAYDIUM_PROGRAM_ID = new PublicKey(REACT_APP_RAYDIUM)

export const WRAPPED_SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112')

export const TOKEN_PROGRAM_ID = TOKENPROGRAMID
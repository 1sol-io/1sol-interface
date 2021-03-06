// @ts-nocheck
import { PublicKey } from "@solana/web3.js"

import btc from '../assets/token/btc.png'
import usdt from '../assets/token/usdt.png'
import usdc from '../assets/token/usdc.png'
import srm from '../assets/token/srm.png'
import sol from '../assets/token/sol.png'
import eth from '../assets/token/eth.png'
import ray from '../assets/token/ray.png'

export const SYMBOL_PAIRS = [
  { name: 'BTC', key: '6dbkV6QCToTk6DRfuJyrGuz18kZ4rPUSHLLLVrryWdUC', token: 'BTC', icon: btc },
  { name: 'ETH', key: '8pcXGi4QoHKytv3issKdFF3XRDeYAGEgy6EEAi1ioLe7', token: 'ETH', icon: eth },
  { name: 'SOL', key: 'FmAmfoyPXiA8Vhhe6MZTr3U6rZfEZ1ctEHay1ysqCqcf', token: 'SOL', icon: sol },
  { name: 'SRM', key: 'ELfANVHk7wYB3ALoxPsiTQgM3t9MXgjbNZQNZyPuBp9C', token: 'SRM', icon: srm },
  { name: 'USDC', key: 'F3Wgm7HqxnxvNznF7MmHMW7566zBQyuwzF5JWRhjhUtc', token: 'USDC', icon: usdc },
  { name: 'USDT', key: 'FG5FPJnT4ubjoNMm9Bh2uAfgbq2bwxP7aY6AKVmYou1p', token: 'USDT', icon: usdt },
  { name: 'RAY', key: 'HvYREVU9R1MeVp61bJFg39E7qqgnuxKnqxsuYg27T7NE', token: 'RAY', icon: ray },
]

const {
  REACT_APP_ONESOL,
  REACT_APP_TOKEN_SWAP,
  REACT_APP_SABER,
  REACT_APP_ORCA,
  REACT_APP_RAYDIUM,
  REACT_APP_SERUM,
  REACT_APP_ONEMOON,
  REACT_APP_ENDPOINTS,
  REACT_APP_CHAIN_ID,
  REACT_APP_CHAIN_NAME,
  REACT_APP_STAKE_POOLS,
  REACT_APP_STAKE_POOLS_1
} = process.env

export const ONESOL_PROGRAM_ID = new PublicKey(REACT_APP_ONESOL)

export const TOKEN_SWAP_PROGRAM_ID = new PublicKey(REACT_APP_TOKEN_SWAP)
export const SABER_PROGRAM_ID = new PublicKey(REACT_APP_SABER)

export const SERUM_PROGRAM_ID = new PublicKey(REACT_APP_SERUM)
export const ORCA_PROGRAM_ID = new PublicKey(REACT_APP_ORCA)
export const RAYDIUM_PROGRAM_ID = new PublicKey(REACT_APP_RAYDIUM)
export const ONEMOON_PROGRAM_ID = new PublicKey(REACT_APP_ONEMOON)

export const WRAPPED_SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112')

export const ENDPOINTS: string[] = REACT_APP_ENDPOINTS!.split(',')
export const CHAIN_ID: string = REACT_APP_CHAIN_ID
export const CHAIN_NAME: "mainnet-beta" | "testnet" | "devnet" | "localnet" = REACT_APP_CHAIN_NAME

export const ONESOL_MINT_ADDRESS = new PublicKey('4ThReWAbAVZjNVgs5Ui9Pk3cZ5TYaD9u6Y89fp6EFzoF')

export const STAKE_POOLS_ID = new PublicKey(REACT_APP_STAKE_POOLS)
export const STAKE_POOLS_ID_1 = new PublicKey(REACT_APP_STAKE_POOLS_1)
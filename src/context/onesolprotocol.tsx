import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef
} from 'react'
import { PublicKey } from '@solana/web3.js'
import { MintInfo, u64 } from '@solana/spl-token'

import { OnesolProtocol, Distribution, TokenInfo } from '@onesol/onesol-sdk'

import { useConnection } from '../utils/connection'
import { cache } from '../utils/accounts'
import { useLocalStorageState } from '../utils/utils'
import { useWallet } from './wallet'

export const OnesolProtocolContext = createContext<any>(null)

export function OnesolProtocolProvider({ children = null as any }){
  const connection = useConnection()
  const { wallet, connected } = useWallet()

  const [oneSolProtocol, setOneSolProtocol] = useState<OnesolProtocol | null>(
    null
  )
  const [tokens, setTokens] = useLocalStorageState('tokens', [])
  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>(new Map())
  const [protocolSwapInfo, setProtocolSwapInfo] = useLocalStorageState(
    'protocolSwapInfo',
    ''
  )

  const abortController: {
    current: AbortController | null
  } = useRef(null)

  useEffect(
    () => {
      if (connection) {
        const oneSolProtocol = new OnesolProtocol(connection)

        setOneSolProtocol(oneSolProtocol)
      }
    },
    [connection]
  )

  useEffect(
    () => {
      let knownMints = new Map<string, TokenInfo>()

      tokens.forEach((item: TokenInfo) => {
        const mint: MintInfo = {
          mintAuthority: null,
          supply: new u64(0),
          decimals: item.decimals,
          isInitialized: true,
          freezeAuthority: null
        }

        knownMints.set(item.address, item)

        cache.addMint(new PublicKey(item.address), mint)
      })

      setTokenMap(knownMints)
    },
    [tokens]
  )

  useEffect(
    () => {
      if (oneSolProtocol) {
        const fetchTokenList = async () => {
          const tokenList = await oneSolProtocol.getTokenList()

          setTokens(tokenList)
        }

        fetchTokenList()
      }
    },
    // eslint-disable-next-line
    [oneSolProtocol]
  )

  useEffect(
    () => {
      if (oneSolProtocol && connected) {
        const fetchProtocolSwapInfo = async () => {
          const swapInfo = await oneSolProtocol.findSwapInfoKey(
            wallet.publicKey
          )

          if (swapInfo) {
            setProtocolSwapInfo(swapInfo.toBase58())
          }
        }

        fetchProtocolSwapInfo()
      }
    },
    // eslint-disable-next-line
    [oneSolProtocol, wallet, connected]
  )

  const getRoutes = useCallback(
    async ({ amount, sourceMintAddress, destinationMintAddress }) => {
      if (oneSolProtocol) {
        if (abortController.current) {
          abortController.current.abort()
        }

        abortController.current = new AbortController()

        const routes = await oneSolProtocol.getRoutes({
          amount,
          sourceMintAddress,
          destinationMintAddress,
          signal: abortController.current.signal
        })

        return routes
      }

      return []
    },
    [oneSolProtocol]
  )

  const getTransactions = useCallback(
    async ({
      distribution,
      slippage = 0.005
    }: {
      distribution: Distribution
      slippage: number
    }) => {
      if (oneSolProtocol && wallet) {
        const transactions = await oneSolProtocol.getTransactions({
          wallet: wallet.publicKey,
          distribution,
          protocolSwapInfo:
            protocolSwapInfo ? new PublicKey(protocolSwapInfo) : null,
          slippage
        })

        return transactions
      }

      return []
    },
    [oneSolProtocol, wallet, protocolSwapInfo]
  )

  return (
    <OnesolProtocolContext.Provider
      value={{
        tokens,
        tokenMap,
        getRoutes,
        getTransactions
      }}
    >
      {children}
    </OnesolProtocolContext.Provider>
  )
}

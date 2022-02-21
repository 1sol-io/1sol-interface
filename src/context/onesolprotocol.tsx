import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef
} from 'react'
import { PublicKey, Signer, TransactionInstruction } from '@solana/web3.js'
import { MintInfo, u64 } from '@solana/spl-token'

import {
  OnesolProtocol,
  Route,
  TokenAccountInfo,
  TokenInfo
} from '@onesol/onesol-sdk'

import { useConnection } from '../utils/connection'
import { cache } from '../utils/accounts'
import { useLocalStorageState } from '../utils/utils'

export const OnesolProtocolContext = createContext<any>(null)

export function OnesolProtocolProvider({ children = null as any }){
  const connection = useConnection()

  const [oneSolProtocol, setOneSolProtocol] = useState<OnesolProtocol | null>(
    null
  )
  const [tokens, setTokens] = useLocalStorageState('tokens', [])
  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>(new Map())

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
    [oneSolProtocol]
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

  const composeInstructions = useCallback(
    async ({
      route,
      walletAddress,
      fromTokenAccount,
      toTokenAccount,
      setupInstructions,
      swapInstructions,
      cleanupInstructions,
      setupSigners,
      swapSigners,
      cleanupSigners,
      slippage = 0.005
    }: {
      route: Route
      walletAddress: PublicKey
      fromTokenAccount: TokenAccountInfo
      toTokenAccount: TokenAccountInfo
      setupInstructions: TransactionInstruction[]
      swapInstructions: TransactionInstruction[]
      cleanupInstructions: TransactionInstruction[]
      setupSigners: Signer[]
      swapSigners: Signer[]
      cleanupSigners: Signer[]
      slippage?: number
    }) => {
      if (oneSolProtocol) {
        const instructions = await oneSolProtocol.composeInstructions({
          route,
          walletAddress,
          fromTokenAccount,
          toTokenAccount,
          setupInstructions,
          swapInstructions,
          cleanupInstructions,
          setupSigners,
          swapSigners,
          cleanupSigners,
          slippage
        })

        return instructions
      }
    },
    [oneSolProtocol]
  )

  return (
    <OnesolProtocolContext.Provider
      value={{
        tokens,
        tokenMap,
        getRoutes,
        composeInstructions
      }}
    >
      {children}
    </OnesolProtocolContext.Provider>
  )
}

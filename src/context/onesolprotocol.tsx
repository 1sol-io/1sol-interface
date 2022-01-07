import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef
} from 'react'
import { PublicKey, Signer, TransactionInstruction } from '@solana/web3.js'
import { MintInfo, u64 } from '@solana/spl-token'

import { OnesolProtocol } from '@onesol/onesol-sdk'
import {
  RawDistribution,
  TokenAccountInfo,
  TokenInfo
} from '@onesol/onesol-sdk/types'

import { useConnection } from '../utils/connection'
import { cache } from '../utils/accounts'

export const OnesolProtocolContext = createContext<any>(null)

export function OnesolProtocolProvider({ children = null as any }){
  const connection = useConnection()

  const [oneSolProtocol, setOneSolProtocol] = useState<OnesolProtocol | null>(
    null
  )
  const [tokens, setTokens] = useState<TokenInfo[]>([])
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

  const fetchTokenList = useCallback(
    async () => {
      if (oneSolProtocol) {
        const tokenList = await oneSolProtocol.getTokenList()

        let knownMints = new Map<string, TokenInfo>()

        tokenList.forEach((item: TokenInfo) => {
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

        setTokens(tokenList)
        setTokenMap(knownMints)
      }
    },
    [oneSolProtocol]
  )

  useEffect(
    () => {
      if (oneSolProtocol) {
        fetchTokenList()
      }
    },
    [oneSolProtocol, fetchTokenList]
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
      option,
      walletAddress,
      fromTokenAccount,
      toTokenAccount,
      instructions1,
      instructions2,
      instructions3,
      signers1,
      signers2,
      signers3,
      slippage = 0.005
    }: {
      option: RawDistribution
      walletAddress: PublicKey
      fromTokenAccount: TokenAccountInfo
      toTokenAccount: TokenAccountInfo
      instructions1: TransactionInstruction[]
      instructions2: TransactionInstruction[]
      instructions3: TransactionInstruction[]
      signers1: Signer[]
      signers2: Signer[]
      signers3: Signer[]
      slippage?: number
    }) => {
      if (oneSolProtocol) {
        const instructions = await oneSolProtocol.composeInstructions({
          option,
          walletAddress,
          fromTokenAccount,
          toTokenAccount,
          instructions1,
          instructions2,
          instructions3,
          signers1,
          signers2,
          signers3,
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

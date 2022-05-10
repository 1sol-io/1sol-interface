import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef
} from 'react'
import * as Sentry from '@sentry/react'
import { PublicKey } from '@solana/web3.js'
import { MintInfo, u64 } from '@solana/spl-token'

import { OnesolProtocol, Distribution, TokenInfo } from '@onesol/onesol-sdk'

import { useConnection } from '../utils/connection'
import { cache } from '../utils/accounts'
import { useLocalStorageState } from '../utils/utils'
import { useWallet } from './wallet'
import { ONESOL_PROGRAM_ID } from '../utils/constant'

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
        const apiBase = window.localStorage.getItem('onesol-interface:api:base')
        const oneSolProtocol = new OnesolProtocol(
          connection,
          ONESOL_PROGRAM_ID,
          apiBase ? { apiBase } : undefined
        )

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

          setTokens([
            ...tokenList,
            // TODO
            // for farming test
            {
              address: '4yvEW7r1SKgMgrTFXY4XJNC6SFov5omLVRvYouUmgSK6',
              chainId: 103,
              decimals: 6,
              extensions:
                { coingeckoId: 'swanlana', coingeckoName: 'Swanlana' },
              feeAccount: 'CZaCRfx6MbEuXFZ3FjA2roNdqFAMXnPVMzaosxaCzJW1',
              logoURI:
                'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4ThReWAbAVZjNVgs5Ui9Pk3cZ5TYaD9u6Y89fp6EFzoF/logo.png',
              name: 'test-reward',
              symbol: 'test-reward'
            }
            // {
            //   address: '3ok84HKagVdh7eWVmZJiBbYHeo13TKzZtNVSwJRGpWdT',
            //   chainId: 103,
            //   decimals: 6,
            //   extensions:
            //     { coingeckoId: 'swanlana', coingeckoName: 'Swanlana' },
            //   feeAccount: 'CZaCRfx6MbEuXFZ3FjA2roNdqFAMXnPVMzaosxaCzJW1',
            //   logoURI:
            //     'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So111111111111111111111111111111011111111112/logo.png',
            //   name: 'Base',
            //   symbol: 'test1'
            // },
            // {
            //   address: 'G7AqDwUSHCUHzcn9ioXT3YrohY8jhQjZysmSzCaQ6Vid',
            //   chainId: 103,
            //   decimals: 6,
            //   extensions:
            //     { coingeckoId: 'swanlana', coingeckoName: 'Swanlana' },
            //   feeAccount: 'CZaCRfx6MbEuXFZ3FjA2roNdqFAMXnPVMzaosxaCzJW1',
            //   logoURI:
            //     'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4ThReWAbAVZjNVgs5Ui9Pk3cZ5TYaD9u6Y89fp6EFzoF/logo.png',
            //   name: 'Quote',
            //   symbol: 'test2'
            // },
            // {
            //   address: 'EmXq3Ni9gfudTiyNKzzYvpnQqnJEMRw2ttnVXoJXjLo1',
            //   chainId: 103,
            //   decimals: 6,
            //   extensions:
            //     { coingeckoId: 'swanlana', coingeckoName: 'Swanlana' },
            //   feeAccount: 'CZaCRfx6MbEuXFZ3FjA2roNdqFAMXnPVMzaosxaCzJW1',
            //   logoURI:
            //     'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4ThReWAbAVZjNVgs5Ui9Pk3cZ5TYaD9u6Y89fp6EFzoF/logo.png',
            //   name: 'Quote',
            //   symbol: 'test3'
            // },
            // {
            //   address: 'DK2dggvqxVustZMGmCuQ4hKcTrEZZRkxDWNCzhcsuXwC',
            //   chainId: 103,
            //   decimals: 6,
            //   extensions:
            //     { coingeckoId: 'swanlana', coingeckoName: 'Swanlana' },
            //   feeAccount: 'CZaCRfx6MbEuXFZ3FjA2roNdqFAMXnPVMzaosxaCzJW1',
            //   logoURI:
            //     'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4ThReWAbAVZjNVgs5Ui9Pk3cZ5TYaD9u6Y89fp6EFzoF/logo.png',
            //   name: '1Sol',
            //   symbol: '1Sol'
            // },
            // {
            //   address: 'BWZsSS4K8kzfZusaBRsJZdfDRBRKasth8q9MzPSSmLoV',
            //   chainId: 103,
            //   decimals: 6,
            //   extensions:
            //     { coingeckoId: 'swanlana', coingeckoName: 'Swanlana' },
            //   feeAccount: 'CZaCRfx6MbEuXFZ3FjA2roNdqFAMXnPVMzaosxaCzJW1',
            //   logoURI:
            //     'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4ThReWAbAVZjNVgs5Ui9Pk3cZ5TYaD9u6Y89fp6EFzoF/logo.png',
            //   name: '1Sol',
            //   symbol: '1Sol'
            // },
            // {
            //   address: '6NpjX9vYoJ4K4rLkUNzE4eSPtyFANsUeAYDwx5hdS9ub',
            //   chainId: 103,
            //   decimals: 6,
            //   extensions:
            //     { coingeckoId: 'swanlana', coingeckoName: 'Swanlana' },
            //   feeAccount: 'CZaCRfx6MbEuXFZ3FjA2roNdqFAMXnPVMzaosxaCzJW1',
            //   logoURI:
            //     'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4ThReWAbAVZjNVgs5Ui9Pk3cZ5TYaD9u6Y89fp6EFzoF/logo.png',
            //   name: 'USDC',
            //   symbol: 'USDC'
            // },
            // {
            //   address: 'orcarKHSqC5CDDsGbho8GKvwExejWHxTqGzXgcewB9L',
            //   chainId: 103,
            //   decimals: 6,
            //   extensions:
            //     { coingeckoId: 'swanlana', coingeckoName: 'Swanlana' },
            //   feeAccount: 'CZaCRfx6MbEuXFZ3FjA2roNdqFAMXnPVMzaosxaCzJW1',
            //   logoURI:
            //     'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4ThReWAbAVZjNVgs5Ui9Pk3cZ5TYaD9u6Y89fp6EFzoF/logo.png',
            //   name: 'orca',
            //   symbol: 'orca'
            // },
            // {
            //   address: 'EmXq3Ni9gfudTiyNKzzYvpnQqnJEMRw2ttnVXoJXjLo1',
            //   chainId: 103,
            //   decimals: 6,
            //   extensions:
            //     { coingeckoId: 'swanlana', coingeckoName: 'Swanlana' },
            //   feeAccount: 'CZaCRfx6MbEuXFZ3FjA2roNdqFAMXnPVMzaosxaCzJW1',
            //   logoURI:
            //     'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4ThReWAbAVZjNVgs5Ui9Pk3cZ5TYaD9u6Y89fp6EFzoF/logo.png',
            //   name: 'USDC',
            //   symbol: 'USDC'
            // }
          ])
        }

        fetchTokenList()
      }
    },
    // eslint-disable-next-line
    [oneSolProtocol]
  )

  useEffect(
    () => {
      if (oneSolProtocol && connected && wallet && wallet.publicKey) {
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
          size: 10,
          signal: abortController.current.signal,
          experiment: true
        })

        return { routes, amount, sourceMintAddress, destinationMintAddress }
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
      try {
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
      } catch (err) {
        Sentry.captureException(err)
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

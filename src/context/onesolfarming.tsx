import React, { createContext, useState, useEffect, useCallback } from 'react'

import { FarmRouter, FarmItems, FarmItem, TokenSwap } from '@onesol/farm'
import { Token, u64 } from '@solana/spl-token'

import { useConnection } from '../utils/connection'
import { useWallet } from './wallet'

export const OnesolFarmingProtocolContext = createContext<any>(null)

interface FarmMapProps {
  [id: string]: FarmItem
}

export function OnesolFarmingProtocolProvider({ children = null as any }){
  const connection = useConnection()
  const { wallet } = useWallet()

  const [farms, setFarms] = useState<FarmItem[]>([])
  const [farmMap, setFarmMap] = useState<FarmMapProps>({})

  const [
    oneSolFarmingProtocol,
    setOneSolFarmingProtocol
  ] = useState<FarmRouter | null>(null)

  useEffect(
    () => {
      if (connection) {
        const oneSolFarmingProtocol = new FarmRouter(connection)

        setOneSolFarmingProtocol(oneSolFarmingProtocol)
      }
    },
    [connection, wallet]
  )

  useEffect(() => {
    const farmMap: {
      [id: string]: FarmItem
    } = {}

    FarmItems.forEach((item: FarmItem) => {
      farmMap[item.address.toBase58()] = item
    })

    setFarms(FarmItems)
    setFarmMap(farmMap)
  }, [])

  const getFarmInfo = useCallback(
    async (farm: FarmItem) => {
      if (oneSolFarmingProtocol) {
        const info = await oneSolFarmingProtocol.getFarmInfo(farm)

        return info
      }
    },
    [oneSolFarmingProtocol]
  )

  const getUserFarmInfo = useCallback(
    async (farm: FarmItem) => {
      if (oneSolFarmingProtocol && wallet) {
        const info = await oneSolFarmingProtocol.getUserFarmInfo(
          wallet.publicKey,
          farm
        )

        console.log(`user farm info`, info)
        return info
      }
    },
    [oneSolFarmingProtocol, wallet]
  )

  const getFarmSwap = useCallback(
    async (farm) => {
      if (oneSolFarmingProtocol) {
        const swap = await oneSolFarmingProtocol.getFarmSwap(farm)

        return swap
      }
    },
    [oneSolFarmingProtocol]
  )

  const getEstimateAmount = useCallback(
    ({
      farmSwap,
      farm,
      amount,
      reverse = false
    }: {
      farmSwap: TokenSwap
      farm: FarmItem
      amount: number
      reverse?: boolean
    }) => {
      if (oneSolFarmingProtocol) {
        const { pool: { tokenA, tokenB } } = farm
        const decimal = reverse ? tokenB.mint.decimals : tokenA.mint.decimals
        const inputAmount = amount * 10 ** decimal

        const result = farmSwap.quote.estimateTokenAmountNeed(
          new u64(inputAmount),
          reverse ? tokenB : tokenA
        )

        return result.toNumber() / 10 ** decimal
      }
    },
    [oneSolFarmingProtocol]
  )

  const getDepositTransactions = useCallback(
    async ({
      farm,
      farmSwap,
      amountA,
      amountB,
      slippage = 1
    }: {
      farm: FarmItem
      farmSwap: TokenSwap
      amountA: number
      amountB: number
      slippage: number
    }) => {
      if (oneSolFarmingProtocol && wallet) {
        const transactions = await oneSolFarmingProtocol.deposit({
          farm,
          farmSwap,
          user: wallet.publicKey,
          maximumTokenA:
            new u64(amountA * 10 ** farm.pool.tokenA.mint.decimals),
          maximumTokenB:
            new u64(amountB * 10 ** farm.pool.tokenB.mint.decimals),
          slippage
        })

        return transactions.map(({ transaction }) => transaction)
      }
    },
    [oneSolFarmingProtocol, wallet]
  )

  const getWithdrawTransactions = useCallback(
    async ({
      farm,
      farmSwap,
      amount,
      slippage = 1
    }: {
      farm: FarmItem
      farmSwap: TokenSwap
      amount: u64
      slippage: number
    }) => {
      if (oneSolFarmingProtocol && wallet) {
        const transactions = await oneSolFarmingProtocol.withdraw({
          farm,
          farmSwap,
          user: wallet.publicKey,
          poolTokenAmountIn: amount,
          slippage
        })

        return transactions.map(({ transaction }) => transaction)
      }
    },
    [oneSolFarmingProtocol, wallet]
  )

  const getHarvestTransactions = useCallback(
    async (farm: FarmItem) => {
      if (oneSolFarmingProtocol && wallet) {
        const transactions = await oneSolFarmingProtocol.harvest({
          farm,
          user: wallet.publicKey
        })

        return transactions.map(({ transaction }) => transaction)
      }
    },
    [oneSolFarmingProtocol, wallet]
  )

  return (
    <OnesolFarmingProtocolContext.Provider
      value={{
        oneSolFarmingProtocol,
        farms,
        farmMap,
        getFarmInfo,
        getUserFarmInfo,
        getEstimateAmount,
        getFarmSwap,
        getDepositTransactions,
        getWithdrawTransactions,
        getHarvestTransactions
      }}
    >
      {children}
    </OnesolFarmingProtocolContext.Provider>
  )
}

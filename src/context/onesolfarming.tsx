import React, { createContext, useState, useEffect, useCallback } from 'react'

import { FarmRouter, FarmItems, FarmItem, Quote } from '@onesol/farm'
import { u64 } from '@solana/spl-token'

import { useConnection } from '../utils/connection'
import { useWallet } from './wallet'

export const OnesolFarmingProtocolContext = createContext<any>(null)

export interface FarmItemProps extends FarmItem {
  tvl: number
  apy: number
}

interface FarmMapProps {
  [id: string]: FarmItemProps
}

interface StatisticProps {
  [id: string]: {
    apy: number
    tvl: number
  }
}

export function OnesolFarmingProtocolProvider({ children = null as any }){
  const connection = useConnection()
  const { wallet } = useWallet()

  const [farms, setFarms] = useState<FarmItem[]>([])
  const [farmMap, setFarmMap] = useState<FarmMapProps>({})
  const [statistics, setStatistics] = useState<StatisticProps>({})

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
      [id: string]: FarmItemProps
    } = {}

    FarmItems.forEach((item: FarmItem) => {
      farmMap[item.address.toBase58()] = { ...item, tvl: 0, apy: 0 }
    })

    setFarms(FarmItems)
    setFarmMap(farmMap)
  }, [])

  const getStatistics = useCallback(
    async (farm: FarmItem) => {
      if (oneSolFarmingProtocol) {
        const { tvl, apy } = await oneSolFarmingProtocol.getStatistics(farm)

        farmMap[farm.address.toBase58()] = {
          ...farm,
          tvl,
          apy
        }

        setStatistics((state) => ({
          ...state,
          [farm.address.toBase58()]:
            {
              tvl,
              apy
            }
        }))
      }
    },
    [oneSolFarmingProtocol, farmMap]
  )

  useEffect(
    () => {
      farms.forEach((farm) => getStatistics(farm))
    },
    [farms, getStatistics]
  )

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

        return info
      }
    },
    [oneSolFarmingProtocol, wallet]
  )

  const getFarmSwap = useCallback(
    async (farm) => {
      if (oneSolFarmingProtocol) {
        const swap = await oneSolFarmingProtocol.getQuote(farm)

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
      farmSwap: Quote
      farm: FarmItem
      amount: number
      reverse?: boolean
    }) => {
      if (oneSolFarmingProtocol) {
        const { pool: { tokenA, tokenB } } = farm
        const decimal = reverse ? tokenB.mint.decimals : tokenA.mint.decimals
        const anotherDecimal = reverse ? tokenA.mint.decimals : tokenB.mint.decimals
        const inputAmount = amount * 10 ** decimal

        const result = farmSwap.estimateTokenAmountNeed(
          new u64(inputAmount),
          reverse ? tokenB.mint : tokenA.mint
        )

        return result.toNumber() / 10 ** anotherDecimal
      }
    },
    [oneSolFarmingProtocol]
  )

  const getDepositTransactions = useCallback(
    async ({
      farm,
      amountA,
      amountB,
      isAutoSwap = false,
      slippage = 1
    }: {
      farm: FarmItem
      amountA: number
      amountB: number
      isAutoSwap: boolean
      slippage: number
    }) => {
      if (oneSolFarmingProtocol && wallet) {
        const transactions = await oneSolFarmingProtocol.deposit({
          farm,
          user: wallet.publicKey,
          maximumTokenA:
            new u64(amountA * 10 ** farm.pool.tokenA.mint.decimals),
          maximumTokenB:
            new u64(amountB * 10 ** farm.pool.tokenB.mint.decimals),
          slippage,
          isEven: !isAutoSwap
        })
        console.log(`deposit transactions: `, transactions)

        return transactions.map(({ transaction }) => transaction)
      }
    },
    [oneSolFarmingProtocol, wallet]
  )

  const getWithdrawTransactions = useCallback(
    async ({
      farm,
      amount,
      slippage = 1
    }: {
      farm: FarmItem
      amount: u64
      slippage: number
    }) => {
      if (oneSolFarmingProtocol && wallet) {
        const transactions = await oneSolFarmingProtocol.withdraw({
          farm,
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

  const getRemoveLiquidityTransactions = useCallback(
    async (farm: FarmItem) => {
      if (oneSolFarmingProtocol && wallet) {
        console.log(`farm:`, farm)
        const transactions = await oneSolFarmingProtocol.withdrawAllTokenTypesAll(
          {
            farm,
            user: wallet.publicKey,
            slippage: 1
          }
        )

        return transactions.map(({ transaction }) => transaction)
      }
    },
    [oneSolFarmingProtocol, wallet]
  )

  const getStakeTransactions = useCallback(
    async (farm: FarmItem) => {
      if (oneSolFarmingProtocol && wallet) {
        const transactions = await oneSolFarmingProtocol.stakeAll({
          farm,
          user: wallet.publicKey
        })

        return transactions.map(({ transaction }) => transaction)
      }
    },
    [oneSolFarmingProtocol, wallet]
  )

  const getTokensToLp = useCallback(
    async ({ farm, amount }: { farm: FarmItem; amount: u64 }) => {
      if (oneSolFarmingProtocol) {
        const {
          minTokenAOut,
          minTokenBOut
        } = await oneSolFarmingProtocol.getTokensToLp({
          farm,
          poolTokenAmountIn: amount
        })

        return {
          minTokenAOut,
          minTokenBOut
        }
      }
    },
    [oneSolFarmingProtocol]
  )

  return (
    <OnesolFarmingProtocolContext.Provider
      value={{
        oneSolFarmingProtocol,
        farms,
        farmMap,
        statistics,
        getFarmInfo,
        getUserFarmInfo,
        getEstimateAmount,
        getFarmSwap,
        getDepositTransactions,
        getWithdrawTransactions,
        getHarvestTransactions,
        getRemoveLiquidityTransactions,
        getStakeTransactions,
        getTokensToLp
      }}
    >
      {children}
    </OnesolFarmingProtocolContext.Provider>
  )
}

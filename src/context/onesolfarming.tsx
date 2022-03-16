import React, { createContext, useState, useEffect, useCallback } from 'react'

import { FarmRouter, FarmItems, FarmItem, TokenSwap } from '@onesol/farm'
import { u64 } from '@solana/spl-token'

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
    [connection]
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
          farm,
          wallet.publicKey
        )

        return info
      }
    },
    [oneSolFarmingProtocol, wallet]
  )

  const getFarmSwap = useCallback(
    (farm) => {
      if (oneSolFarmingProtocol) {
        const swap = oneSolFarmingProtocol.getFarmSwap(farm)

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

  return (
    <OnesolFarmingProtocolContext.Provider
      value={{
        farms,
        farmMap,
        getFarmInfo,
        getUserFarmInfo,
        getEstimateAmount,
        getFarmSwap
      }}
    >
      {children}
    </OnesolFarmingProtocolContext.Provider>
  )
}

import React, { useState, useEffect } from 'react'
import {
  parseMappingData,
  parsePriceData,
  parseProductData
} from '@pythnetwork/client'
import { PublicKey } from '@solana/web3.js'

import { useConnection } from '../utils/connection'
import pythLogo from '../assets/pyth.svg'

const publicKey = process.env.NODE_ENV === 'development' ? new PublicKey('BmA9Z6FjioHJPpjT39QazZyhDRUdZy2ezwx4GiDdE2u2') : new PublicKey('AHtgzX45WTKfkPG53L6WYhGEXwQkN1BVknET3sVsLL8J')

const usePyth = () => {
  const connection = useConnection()

  const [loading, setLoading] = useState(true)
  const [pythMap, setPythMap] = useState<{
    [key: string]: {
      name: string
      symbol: string
      price: string
      logo: string
    }
  }>()

  useEffect(
    () => {
      let timer: ReturnType<typeof setTimeout>

      const fetchProducts = async (showLoading: boolean = false) => {
        if (showLoading) {
          setLoading(true)
        }

        try {
          const accountInfo: any = await connection.getAccountInfo(publicKey)

          const { productAccountKeys } = parseMappingData(accountInfo.data)
          const accounts = await connection.getMultipleAccountsInfo(
            productAccountKeys
          )
          const keys = accounts.map((accountInfo) => {
            if (accountInfo) {
              const { product, priceAccountKey } = parseProductData(
                accountInfo.data
              )

              return { product, priceAccountKey }
            }

            return null
          })
          // @ts-ignore
          const filterd: Array<{
            product: any
            priceAccountKey: PublicKey
          }> = keys.filter((item) => item)

          const priceAccountInfos = await connection.getMultipleAccountsInfo(
            filterd.map((item) => item.priceAccountKey)
          )

          const pythMap: {
            [key: string]: {
              symbol: string
              price: string
              name: string
              logo: string
            }
          } = {}

          priceAccountInfos.forEach((accountInfo, i) => {
            if (accountInfo) {
              const { symbol } = filterd[i].product
              const { price } = parsePriceData(accountInfo.data)
              const key = symbol.toLowerCase()

              pythMap[key] = {
                symbol: key,
                price: `${price.toFixed(2)}`,
                name: 'Pyth',
                logo: pythLogo
              }
            }
          })

          setPythMap(pythMap)

          setLoading(false)
        } catch (e) {
          console.error(e)
        }
      }

      fetchProducts(true)
      timer = setInterval(() => fetchProducts(), 10000)

      return () => {
        if (timer) {
          clearInterval(timer)
        }
      }
    },
    [connection]
  )

  return { pythMap, loading }
}

export default usePyth


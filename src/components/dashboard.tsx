import { Card, Table } from 'antd'
import React, { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { PublicKey } from '@solana/web3.js'
import {
  parseMappingData,
  parsePriceData,
  parseProductData
} from '@pythnetwork/client'

import { SYMBOL_PAIRS } from '../utils/constant'
import { useConnection } from '../utils/connection'
import useChainlink from '../hooks/useChainlink'

import { AppBar } from './appBar'
import Social from './social'

import './dashboard.less'

const publicKey = new PublicKey('BmA9Z6FjioHJPpjT39QazZyhDRUdZy2ezwx4GiDdE2u2')

const columns: Array<{
  title: string
  dataIndex: string
  key: string
  align?: 'left' | 'center' | 'right' | undefined
  render?: any
}> = [
  { title: 'Token', dataIndex: 'symbol', key: 'symbol', align: 'left' },
  {
    title: 'Chainlink',
    dataIndex: 'chainlink',
    key: 'chainlink',
    align: 'left',
    render: (value: number) => `$${value}`
  },
  {
    title: 'Pyth',
    dataIndex: 'pyth',
    key: 'pyth',
    align: 'left',
    render: (value: number) => `$${value}`
  },
  {
    title: 'Trade',
    dataIndex: 'trade',
    key: 'trade',
    render:
      (value: number, record: any) => (
        <Link to={`/?pair=SOL-${record.token}`}>Buy/Sell</Link>
      ),
    align: 'right'
  }
]

// const SYMBOLS = [
//   'BCH/USD',
//   'BNB/USD',
//   'BTC/USD',
//   'DOGE/USD',
//   'ETH/USD',
//   'GBP/USD',
//   'LTC/USD',
//   'LUNA/USD',
//   'SOL/USD',
//   'SRM/USD',
//   'USDC/USD',
//   'USDT/USD'
// ]

export const Dashboard = () => {
  const connection = useConnection()

  const location = useLocation()
  const { chainlinkMap } = useChainlink()

  const dataSource: Array<{
    symbol: string
    pyth: string
    chainlink: string
    token: string
  }> = []
  const [products, setProducts] = useState(dataSource)
  const [loading, setLoading] = useState(false)
  const [pythMap, setPythMap] = useState<{
    [key: string]: {
      name: string
      symbol: string
      price: string
    }
  }>()

  useEffect(
    () => {
      document.title = `Dashboard | 1Sol`
    },
    [location]
  )

  useEffect(
    () => {
      const dataSource: Array<{
        symbol: string
        pyth: string
        chainlink: string
        token: string
      }> = SYMBOL_PAIRS.map(
        ({ name: symbol, token }: { name: string; token: string }) => ({
          symbol,
          pyth: pythMap && pythMap[symbol] ? pythMap[symbol].price : '-',
          // chainlink: '-'
          chainlink:
            chainlinkMap && chainlinkMap[symbol]
              ? chainlinkMap[symbol].price
              : '-',
          token
        })
      )

      setProducts(dataSource)
    },
    [pythMap, chainlinkMap]
  )

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
            [key: string]: { symbol: string; price: string; name: string }
          } = {}

          priceAccountInfos.forEach((accountInfo, i) => {
            if (accountInfo) {
              const { symbol } = filterd[i].product
              const { price } = parsePriceData(accountInfo.data)

              pythMap[symbol] = {
                symbol,
                price: `${price.toFixed(2)}`,
                name: 'Pyth'
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

  return (
    <div className="page-dashboard">
      <AppBar />
      <div className="bd">
        <Card
          title="Cryptocurrency Price Realtime Dashboard"
          style={{ width: '550px', margin: '20px auto 30px' }}
        >
          <Table
            loading={loading}
            dataSource={products}
            columns={columns}
            bordered
            pagination={false}
          />
        </Card>
      </div>
      <Social />
    </div>
  )
}

import { Card, Table } from 'antd'
import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { PublicKey } from '@solana/web3.js'
import { parseMappingData, parsePriceData, parseProductData } from '@pythnetwork/client'

import { useConnection } from '../utils/connection'

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
  { title: 'Market', dataIndex: 'symbol', key: 'symbol', align: 'left' },
  {
    title: 'Price',
    dataIndex: 'price',
    key: 'price',
    align: 'left',
    render: (value: number) => `$${value}`,
  },
  {
    title: 'Uncertainty',
    dataIndex: 'confidence',
    key: 'confidence',
    render: (value: number) => `\xB1$${value}`,
    align: 'right',
  },
]

const SYMBOLS = [
  'BCH/USD',
  'BNB/USD',
  'BTC/USD',
  'DOGE/USD',
  'ETH/USD',
  'GBP/USD',
  'LTC/USD',
  'LUNA/USD',
  'SOL/USD',
  'SRM/USD',
  'USDC/USD',
  'USDT/USD',
]

export const Dashboard = () => {
  const connection = useConnection()

  const location = useLocation()

  const dataSource: Array<{ symbol: string; price: number; confidence: number; key: string }> = []
  const [products, setProducts] = useState(dataSource)
  const [loading, setLoading] = useState(false)

  useEffect(
    () => {
      document.title = `Dashboard | 1Sol`
    },
    [location]
  )

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const fetchProducts = async (showLoading: boolean = false) => {
      if (showLoading) {
        setLoading(true)
      }

      try {
        const accountInfo: any = await connection.getAccountInfo(publicKey)

        const { productAccountKeys } = parseMappingData(accountInfo.data)

        const promises = productAccountKeys.map(async (productAccountKey) => {
          try {
            const accountInfo = await connection.getAccountInfo(productAccountKey)

            if (accountInfo) {
              const { product, priceAccountKey } = parseProductData(accountInfo.data)
              const accountInfo1 = await connection.getAccountInfo(priceAccountKey)

              if (accountInfo1) {
                const { price, confidence } = parsePriceData(accountInfo1.data)

                return { symbol: product.symbol, price, confidence, key: product.symbol }
              }
            }

            return { symbol: '', price: 0, confidence: 0, key: '' }
          } catch (e) {
            return { symbol: '', price: 0, confidence: 0, key: '' }
          }
        })

        const products = await Promise.all(promises)

        setProducts(
          products
            .sort((a, b) => {
              if (a.symbol < b.symbol) {
                return -1
              }

              if (a.symbol > b.symbol) {
                return 1
              }

              return 0
            })
            .filter((d) => d.symbol && SYMBOLS.indexOf(d.symbol) > -1)
        )

        setLoading(false)
      } catch (e) {
        console.error(e)
      }
    }

    fetchProducts(true)
    timer = setInterval(() => fetchProducts(), 10000)

    return () => {
      console.log(`timer = ${timer}`)
      if (timer) {
        clearInterval(timer)
      }
    }
  }, [])

  return (
    <div className="page-dashboard">
      <AppBar />
      <div className="bd">
        <Card title="Cryptocurrency Price Realtime Dashboard" style={{ margin: '20px 30px' }}>
          <Table loading={loading} dataSource={products} columns={columns} bordered pagination={false} />
        </Card>
      </div>
      <Social />
    </div>
  )
}

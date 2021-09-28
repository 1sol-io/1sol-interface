import { Card, Table, Button } from 'antd'
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

import pythLogo from '../assets/pyth.svg'
import chainkLinkLogo from '../assets/chainlink.svg'

import './dashboard.less'

const publicKey = new PublicKey('BmA9Z6FjioHJPpjT39QazZyhDRUdZy2ezwx4GiDdE2u2')

const columns: Array<{
  title: string
  dataIndex: string
  key: string
  align?: 'left' | 'center' | 'right' | undefined
  render?: any
}> = [
  { title: 'Asset', dataIndex: 'symbol', key: 'symbol', align: 'left' },
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
    title: '',
    dataIndex: 'trade',
    key: 'trade',
    render:
      (value: number, record: any) => (
        <Link to={`/?pair=SOL-${record.token}`}>
          <Button type="primary" size="small">
            Trade
          </Button>
        </Link>
      ),
    align: 'right'
  }
]

export const Dashboard = () => {
  const connection = useConnection()

  const location = useLocation()
  const [active, setActive] = useState('btc')
  const { chainlinkMap } = useChainlink()
  console.log(chainlinkMap)

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
      logo: string
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
          pyth:
            pythMap && pythMap[`${symbol.toLowerCase()}/usd`]
              ? pythMap[`${symbol.toLowerCase()}/usd`].price
              : '-',
          chainlink:
            chainlinkMap && chainlinkMap[symbol.toLowerCase()]
              ? chainlinkMap[symbol.toLowerCase()].price
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

  const handleSwitchToken = (token: string) => {
    setActive(token.toLowerCase())
  }

  return (
    <div className="page-dashboard">
      <AppBar />
      <div className="bd">
        <div className="sidebar">
          {SYMBOL_PAIRS.map(
            ({ token, icon }: { token: string; icon: string }) => (
              <div
                className={
                  active === token.toLowerCase() ? 'token active' : 'token'
                }
                key={token}
                onClick={() => handleSwitchToken(token)}
              >
                <img className="icon" src={icon} alt={token} />
                <span>{token}</span>
              </div>
            )
          )}
        </div>
        <div className="center">
          <div className="hd">
            <Card
              className="partner-card"
              style={{ margin: '0', padding: '0 30px' }}
            >
              <div className="partner">
                <div className="hd">
                  <img style={{ width: '122px' }} src={pythLogo} alt="" />
                </div>
                <div className="bd">
                  <div style={{ color: '#797A7D' }}>Price</div>
                  <div>
                    ${pythMap && pythMap[`${active}/usd`] ? (
                      pythMap[`${active}/usd`].price
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
              </div>
            </Card>
            <Card
              className="partner-card"
              style={{ margin: '0', padding: '0 30px' }}
            >
              <div className="partner">
                <div className="hd">
                  <img style={{ width: '122px' }} src={chainkLinkLogo} alt="" />
                </div>
                <div className="bd">
                  <div style={{ color: '#797A7D' }}>Price</div>
                  <div>
                    ${chainlinkMap && chainlinkMap[active] ? (
                      chainlinkMap[active].price
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
          <div className="bd">
            <Card>
              <Table
                loading={loading}
                dataSource={products}
                columns={columns}
                bordered
                pagination={false}
              />
            </Card>
          </div>
        </div>
        <div className="right" />
      </div>
      <Social />
    </div>
  )
}

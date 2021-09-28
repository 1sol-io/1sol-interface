import { Card, Table, Button } from 'antd'
import React, { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'

import { SYMBOL_PAIRS } from '../utils/constant'

import useChainlink from '../hooks/useChainlink'
import usePyth from '../hooks/usePyth'

import { AppBar } from './appBar'
import Social from './social'

import pythLogo from '../assets/pyth.svg'
import chainkLinkLogo from '../assets/chainlink.svg'
import onesolLogo from '../assets/logo.png'

import './dashboard.less'

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
  const location = useLocation()
  const [active, setActive] = useState('btc')
  const { chainlinkMap } = useChainlink()
  const { pythMap } = usePyth()

  const dataSource: Array<{
    symbol: string
    pyth: string
    chainlink: string
    token: string
  }> = []
  const [products, setProducts] = useState(dataSource)
  const [loading, setLoading] = useState(true)

  useEffect(
    () => {
      document.title = `Dashboard | 1Sol`
    },
    [location]
  )

  useEffect(
    () => {
      if (pythMap || chainlinkMap) {
        setLoading(false)
      }

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
        <div className="right">
          <div className="trade">
            {/* <div className="hd">
              <img style={{ width: '40px' }} src={onesolLogo} alt="1sol" />
            </div> */}
            <div className="bd">
              <Link to={`/?pair=SOL-${active.toUpperCase()}&from=dashboard`}>
                <Button type="primary" size="large">
                  {/* <img style={{ width: '40px' }} src={onesolLogo} alt="1sol" /> */}
                  Trade
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Social />
    </div>
  )
}

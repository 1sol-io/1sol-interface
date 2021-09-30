import { Card, Table, Button, Spin, Tabs } from 'antd'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, Link } from 'react-router-dom'
import axios from 'axios'
import echarts from 'echarts'
import { StockOutlined, DollarCircleOutlined } from '@ant-design/icons'

import { SYMBOL_PAIRS } from '../utils/constant'
import { formatShortDate } from '../utils/utils'

import useChainlink from '../hooks/useChainlink'
import usePyth from '../hooks/usePyth'

import { AppBar } from './appBar'
import Social from './social'
import { TVL } from './tvl/tvl'

import pythLogo from '../assets/pyth.svg'
import chainkLinkLogo from '../assets/chainlink_footer.svg'
import onesole_te from '../assets/pro-te.png'

import './dashboard.less'

const COINS_MAP: { [key: string]: string } = {
  btc: 'bitcoin',
  eth: 'ethereum',
  sol: 'solana',
  srm: 'serum',
  usdc: 'usd-coin',
  usdt: 'tether'
}

const { TabPane } = Tabs

// const columns: Array<{
//   title: string
//   dataIndex: string
//   key: string
//   align?: 'left' | 'center' | 'right' | undefined
//   render?: any
// }> = [
//   { title: 'Asset', dataIndex: 'symbol', key: 'symbol', align: 'left' },
//   {
//     title: 'Chainlink',
//     dataIndex: 'chainlink',
//     key: 'chainlink',
//     align: 'left',
//     render: (value: number) => `$${value}`
//   },
//   {
//     title: 'Pyth',
//     dataIndex: 'pyth',
//     key: 'pyth',
//     align: 'left',
//     render: (value: number) => `$${value}`
//   },
//   {
//     title: '',
//     dataIndex: 'trade',
//     key: 'trade',
//     render:
//       (value: number, record: any) => (
//         <Link to={`/?pair=SOL-${record.token}`}>
//           <Button type="primary" size="small">
//             Trade
//           </Button>
//         </Link>
//       ),
//     align: 'right'
//   }
// ]

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
  const [duration, setDuration] = useState('30')
  const chartDiv = useRef<HTMLDivElement>(null)
  const echartsRef = useRef<any>(null)

  const updateChart = (data: []) => {
    if (echartsRef.current) {
      const xAxisData = data.map((data: any) =>
        formatShortDate.format(new Date(data[0]))
      )
      const yAxisData = data.map((data: any) => Number(data[1]).toFixed(3))

      echartsRef.current.setOption({
        axiosPointer:
          [
            {
              lineStyle:
                {
                  color: '#383a3e',
                  type: 'solid'
                },
              crossStyle: '#6DA5FC'
            }
          ],
        textStyle:
          {
            color: '#fff'
          },
        tooltip:
          {
            trigger: 'axis',
            axisPointer:
              {
                label:
                  {
                    backgroundColor: '#000'
                  }
              },
            // eslint-disable-next-line
            formatter: '{b}<br />${c}'
          },
        grid:
          {
            left: '2%',
            right: '2%',
            bottom: '2%',
            containLabel: true,
            borderWidth: 1,
            borderColor: '#383a3e',
            background: '#323437'
          },
        xAxis:
          [
            {
              type: 'category',
              data: xAxisData
            }
          ],
        yAxis:
          [
            {
              type: 'value',
              scale: true,
              splitLine:
                {
                  lineStyle:
                    {
                      color: '#383a3e',
                      width: 1,
                      type: 'solid'
                    },
                  show: true
                }
            }
          ],
        series:
          [
            {
              type: `line`,
              data: yAxisData,
              smooth: true,
              lineStyle:
                {
                  width: 3,
                  color: '#6DA5FC'
                },
              showSymbol: false,
              areaStyle:
                {
                  opacity: 0.8,
                  color:
                    new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                      {
                        offset: 0,
                        color: '#67b5fd'
                      },
                      {
                        offset: 0.5,
                        color: '#8944ef'
                      },
                      {
                        offset: 1,
                        color: '#5632de'
                      }
                    ])
                },
              emphasis:
                {
                  scale: true,
                  focus: 'self',
                  itemStyle:
                    {
                      color: '#323437',
                      borderColor: '#6DA5FC',
                      borderWidth: 3
                    },
                  labelLine:
                    {
                      lineStyle:
                        {
                          color: '#383a3e'
                        }
                    }
                }
            }
          ]
      })

      setLoading(false)
    }
  }

  const fetchChart = useCallback(
    async () => {
      try {
        setLoading(true)

        const { data: { prices } } = await axios.get(
          `https://api.coingecko.com/api/v3/coins/${COINS_MAP[
            active
          ]}/market_chart?vs_currency=usd&days=${duration}&interval=daily`
        )

        updateChart(prices)
      } catch (e) {}
    },
    [active, duration]
  )

  useEffect(
    () => {
      if (chartDiv.current) {
        echartsRef.current = echarts.init(chartDiv.current)
      }

      fetchChart()

      return () => echartsRef.current.dispose()
    },
    [active, fetchChart]
  )

  useEffect(
    () => {
      document.title = `Dashboard | 1Sol`
    },
    [location]
  )

  // useEffect(
  //   () => {
  //     if (pythMap || chainlinkMap) {
  //       setLoading(false)
  //     }

  //     const dataSource: Array<{
  //       symbol: string
  //       pyth: string
  //       chainlink: string
  //       token: string
  //     }> = SYMBOL_PAIRS.map(
  //       ({ name: symbol, token }: { name: string; token: string }) => ({
  //         symbol,
  //         pyth:
  //           pythMap && pythMap[`${symbol.toLowerCase()}/usd`]
  //             ? pythMap[`${symbol.toLowerCase()}/usd`].price
  //             : '-',
  //         chainlink:
  //           chainlinkMap && chainlinkMap[symbol.toLowerCase()]
  //             ? chainlinkMap[symbol.toLowerCase()].price
  //             : '-',
  //         token
  //       })
  //     )

  //     setProducts(dataSource)
  //   },
  //   [pythMap, chainlinkMap]
  // )

  const handleSwitchToken = (token: string) => {
    setActive(token.toLowerCase())
  }

  return (
    <div className="page-dashboard">
      <AppBar />
      <div className="bd">
        <Tabs tabPosition="left">
          <TabPane
            tab={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <DollarCircleOutlined style={{ fontSize: '20px' }} />Assets
              </div>
            }
            key="assets"
          >
            <div className="assets-mod">
              <div className="sidebar">
                {SYMBOL_PAIRS.map(
                  ({ token, icon }: { token: string; icon: string }) => (
                    <div
                      className={
                        active === token.toLowerCase() ? (
                          'token active'
                        ) : (
                          'token'
                        )
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
                    style={{ margin: '0', padding: '0 30px', width: '100%' }}
                  >
                    <div className="partners">
                      <div className="hd">
                        <div className="partner">
                          <div className="hd">
                            ${pythMap && pythMap[`${active}/usd`] ? (
                              pythMap[`${active}/usd`].price
                            ) : (
                              '-'
                            )}
                          </div>
                          <div className="bd">
                            <img
                              style={{ width: '50px' }}
                              src={pythLogo}
                              alt=""
                            />
                          </div>
                        </div>

                        <div className="partner">
                          <div className="hd">
                            ${chainlinkMap && chainlinkMap[active] ? (
                              chainlinkMap[active].price
                            ) : (
                              '-'
                            )}
                          </div>
                          <div className="bd">
                            <img
                              style={{ width: '50px' }}
                              src={chainkLinkLogo}
                              alt=""
                            />
                          </div>
                        </div>
                      </div>
                      <div className="bd">
                        <Link
                          to={`/?pair=SOL-${active.toUpperCase()}&from=dashboard`}
                        >
                          <Button type="primary" size="small">
                            Trade
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                </div>
                <div className="bd">
                  <Card className="chart-card">
                    {loading ? (
                      <Spin style={{ position: 'absolute', top: '200px' }} />
                    ) : null}
                    <div ref={chartDiv} className="price-chart" />
                  </Card>
                </div>
              </div>
            </div>
          </TabPane>
          <TabPane
            tab={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <StockOutlined style={{ fontSize: '20px' }} />TVL
              </div>
            }
            key="tvl"
          >
            <TVL />
          </TabPane>
        </Tabs>

        <div className="pro">
          <div className="hd">
            <img style={{ height: '50px' }} src={onesole_te} alt="" />
          </div>
          <div className="bd">1SOL Community</div>
          <div className="ft">
            <Button type="primary" size="small">
              <a
                href="https://t.me/onesolcommunity"
                target="_blank"
                rel="noopener noreferrer"
              >
                Join
              </a>
            </Button>
          </div>
        </div>
      </div>
      <Social />
    </div>
  )
}

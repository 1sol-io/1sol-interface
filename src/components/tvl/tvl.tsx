import { Card, Table, Spin } from 'antd'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import echarts from 'echarts'
import numeral from 'numeral'

import { formatShortDate } from '../../utils/utils'

import './index.less'

interface Protocal {
  name: string
  symbol: string
  mcap: number
  tvl: number
  change: number
}

const columns: {
  title: string
  dataIndex: string
  key: string
  align?: 'left' | 'center' | 'right' | undefined
  render?: any
}[] = [
  {
    title: 'Name',
    key: 'name',
    dataIndex: 'name',
    align: 'left',
    render: (value: string, record: any) => `${record.name} (${record.symbol})`
  },
  {
    title: '7d Change',
    key: 'change',
    dataIndex: 'change',
    align: 'left',
    render: (value: number) => `${value ? value.toFixed(2) : '-'}%`
  },
  {
    title: 'TVL',
    key: 'tvl',
    dataIndex: 'tvl',
    align: 'left',
    render:
      (value: number) => `${value ? `$${numeral(value).format('0.0a')}` : '-'}`
  },
  {
    title: 'Mcap/TVL',
    key: 'macp',
    dataIndex: 'macp',
    align: 'left',
    render:
      (value: number, record: any) =>
        `${record.mcap / record.tvl
          ? (record.mcap / record.tvl).toFixed(5)
          : '-'}`
  }
]

export const TVL = () => {
  const chartDiv = useRef<HTMLDivElement>(null)
  const echartsRef = useRef<any>(null)

  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(true)
  const [datasource, setDatasource] = useState<Protocal[]>([])
  const [tvl, setTvl] = useState('$-')
  const [change, setChange] = useState('-%')

  const updateChart = (data: { date: string; totalLiquidityUSD: number }[]) => {
    if (echartsRef.current) {
      const xAxisData = data.map(
        (data: { date: string; totalLiquidityUSD: number }) =>
          formatShortDate.format(new Date(Number(data.date) * 1000))
      )
      const yAxisData = data.map(
        (data: { date: string; totalLiquidityUSD: number }) =>
          data.totalLiquidityUSD.toFixed(3)
      )

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
            formatter(data: any) {
              console.log(data)

              return `${data[0].name}<br />$${numeral(data[0].value).format(
                '0.0a'
              )}`
            }
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

  const fetchChart = useCallback(async () => {
    try {
      setLoading(true)

      const { data } = await axios.get(`https://api.llama.fi/charts/solana`)

      updateChart(data)

      const tvl = data[data.length - 1].totalLiquidityUSD
      const oldTvl = data[data.length - 2].totalLiquidityUSD
      const change = `${((tvl - oldTvl) / oldTvl * 100).toFixed(2)}%`

      setTvl(`$${numeral(tvl).format('0.0a')}`)
      setChange(change)
    } catch (e) {}
  }, [])

  useEffect(
    () => {
      if (chartDiv.current) {
        echartsRef.current = echarts.init(chartDiv.current)
      }

      fetchChart()

      return () => echartsRef.current.dispose()
    },
    [fetchChart]
  )

  const fetchProtocols = useCallback(async () => {
    setTableLoading(true)

    const { data } = await axios.get(`https://api.llama.fi/protocols`)
    const datasource: Protocal[] = []

    data.forEach((item: any) => {
      const { name, symbol, tvl, mcap, change_7d, chains } = item

      if (chains.includes('Solana')) {
        datasource.push({
          name,
          symbol,
          mcap,
          tvl,
          change: change_7d
        })
      }
    })

    setDatasource(datasource)

    setTableLoading(false)
  }, [])

  useEffect(
    () => {
      fetchProtocols()
    },
    [fetchProtocols]
  )

  return (
    <div className="tvl-mod">
      <div className="hd">
        <Card>
          <div className="cards">
            <div className="tvl-mod">
              <div className="hd">Total Value Locked (USD)</div>
              <div className="bd">{tvl}</div>
            </div>
            <div className="tvl-mod change-mod">
              <div className="hd">Change (24h)</div>
              <div className="bd">{change}</div>
            </div>
          </div>
        </Card>
      </div>
      <div className="chart">
        <Card className="chart-card">
          {loading ? (
            <Spin style={{ position: 'absolute', top: '200px' }} />
          ) : null}
          <div ref={chartDiv} className="price-chart" />
        </Card>
      </div>
      <div className="bd">
        <h3>TVL Rankings</h3>
        <Table
          dataSource={datasource}
          columns={columns}
          bordered
          pagination={false}
          loading={tableLoading}
        />
      </div>
    </div>
  )
}

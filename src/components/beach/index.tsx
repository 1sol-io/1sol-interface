import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, Spin } from 'antd'
import axios from 'axios'
import numeral from 'numeral'
import echarts from 'echarts'

import { formatShortDateTime } from '../../utils/utils'

import './index.less'

export const Beach = () => {
  const chartDiv = useRef<HTMLDivElement>(null)
  const echartsRef = useRef<any>(null)

  const [loading, setLoading] = useState(true)
  const [supply, setSupply] = useState(0)
  const [circulating, setCirculating] = useState(0)
  const [stake, setStake] = useState(0)
  const [volume, setVolume] = useState(0)

  const fetchSupply = useCallback(async () => {
    const {
      data: { circulating, total }
    }: { data: { circulating: number; total: number } } = await axios({
      url: 'https://prod-api.solana.surf/v1/supply',
      method: 'get',
      headers: { Authorization: '70557c24-6d57-486a-a2eb-25e36e16e42f' }
    })

    setSupply(total)
    setCirculating(circulating)
  }, [])

  const fetchStakeHistory = useCallback(async () => {
    const { data }: { data: any[] } = await axios({
      url: 'https://prod-api.solana.surf/v1/stake-history',
      method: 'get',
      headers: { Authorization: '70557c24-6d57-486a-a2eb-25e36e16e42f' }
    })
    const [{ effective }] = data

    setStake(effective)
  }, [])

  useEffect(
    () => {
      fetchSupply()
      fetchStakeHistory()
    },
    [fetchSupply, fetchStakeHistory]
  )

  const updateChart = (
    data: { timestamp: string; price: number; volume_24h: number }[]
  ) => {
    if (echartsRef.current) {
      const xAxisData = data.map((data) =>
        formatShortDateTime.format(new Date(data.timestamp))
      )
      const yAxisData = data.map((data) => data.volume_24h)

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
              return `${data[0].name}<br />Volume $${numeral(
                data[0].value
              ).format('0.0a')}`
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

      const {
        data
      }: {
        data: { timestamp: string; price: number; volume_24h: number }[]
      } = await axios({
        url: `https://prod-api.solana.surf/v1/market-chart-data`,
        method: 'get',
        headers: { Authorization: '70557c24-6d57-486a-a2eb-25e36e16e42f' }
      })

      updateChart(data)
      setVolume(data[data.length - 1].volume_24h)
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

  return (
    <div className="page-beach">
      <div className="hd">
        <Card>
          <div className="supply-card">
            <div className="supply">
              <div className="mod">
                <div className="hd">Circulating Supply</div>
                <div className="bd">
                  {numeral(circulating / 10 ** 9).format('0.0a')}
                </div>
                <div className="ft">
                  of {numeral(supply / 10 ** 9).format('0.0a')}:{' '}
                  <strong>
                    {(circulating / supply
                      ? circulating / supply * 100
                      : 0).toFixed(1)}%
                  </strong>
                </div>
              </div>

              <div className="mod">
                <div className="hd">Active Stake</div>
                <div className="bd">
                  {numeral(stake / 10 ** 9).format('0.0a')}
                </div>
                <div className="ft">
                  of {numeral(supply / 10 ** 9).format('0.0a')}:{' '}
                  <strong>
                    {(stake / supply ? stake / supply * 100 : 0).toFixed(1)}%
                  </strong>
                </div>
              </div>

              <div className="mod">
                <div className="hd">24H VOLUME</div>
                <div className="bd">{numeral(volume).format('0.0a')}</div>
              </div>
            </div>
            <div className="chart">
              {loading ? (
                <Spin style={{ position: 'absolute', top: '200px' }} />
              ) : null}
              <div ref={chartDiv} className="price-chart" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

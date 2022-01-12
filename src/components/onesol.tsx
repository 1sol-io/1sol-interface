import React, { useCallback, useState, useEffect } from 'react'
import axios from 'axios'

import './onesol.less'

const OnesolOverview = () => {
  const [data, setData] = useState<{
    totalTransactions: number
    totalUsers: number
    totalTradeVolume: number
    dayTradeVolume: number
  }>({
    totalTransactions: 0,
    totalUsers: 0,
    totalTradeVolume: 0,
    dayTradeVolume: 0
  })

  const getData = useCallback(async () => {
    const {
      data:
        {
          total_transactions: totalTransactions,
          total_users: totalUsers,
          total_trade_volume: totalTradeVolume,
          ...rest
        }
    } = await axios.get(`https://api.1sol.io/1/trade_summary/101`)

    setData({
      totalTransactions,
      totalUsers,
      totalTradeVolume,
      dayTradeVolume: rest['24h_trade_volume']
    })
  }, [])

  useEffect(
    () => {
      getData()
    },
    [getData]
  )

  return (
    <div className="onesol-overview">
      <div className="hd">
        <div className="mod spec">
          <div className="subtitle">Overview</div>
          <div className="title">1Sol Protocol</div>
        </div>
      </div>
      <div className="bd">
        <div className="mod">
          <div className="subtitle">Total Trade Volume</div>
          <div className="title">
            $
            {data.totalTradeVolume
              .toFixed(2)
              .toString()
              .replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '-'}
          </div>
        </div>
        <div className="mod">
          <div className="subtitle">Total Users</div>
          <div className="title">
            {data.totalUsers.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') ||
              '-'}
          </div>
        </div>
        <div className="mod">
          <div className="subtitle">Total Transactions</div>
          <div className="title">
            {data.totalTransactions
              .toString()
              .replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '-'}
          </div>
        </div>

        <div className="mod">
          <div className="subtitle">24H Trade Volume</div>
          <div className="title">
            $
            {data.dayTradeVolume
              .toFixed(2)
              .toString()
              .replace(/\B(?=(\d{3})+(?!\d))/g, ',') || '-'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnesolOverview

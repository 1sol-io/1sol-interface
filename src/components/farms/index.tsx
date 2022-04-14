import React, { Fragment } from 'react'
import { Card, Button } from 'antd'
import { Link } from 'react-router-dom'

import { AppBar } from '../appBar'
import Social from '../social'

import { TokenIcon } from '../tokenIcon'
import { FarmItems } from '@onesol/farm'

import './index.less'

const Farms = () => {
  const renderFarms = () =>
    FarmItems.map(({ address, pool }, i) => (
      <Fragment key={i}>
        <Card
          className="farm-card"
          headStyle={{ padding: 0 }}
          bodyStyle={{ padding: '20px' }}
        >
          <div className="farm" key={i}>
            <div className="hd">
              <div className="tokens">
                <div className="token">
                  <TokenIcon
                    style={{
                      width: '40px',
                      height: '40px',
                      margin: '0 -10px 0 0',
                      position: 'relative',
                      zIndex: 10
                    }}
                    mintAddress={pool.tokenA.mint.address.toBase58()}
                  />
                </div>
                <div className="token">
                  <TokenIcon
                    style={{ width: '40px', height: '40px', margin: '0' }}
                    mintAddress={pool.tokenB.mint.address.toBase58()}
                  />
                </div>
              </div>
              <div className="title">Base-Quote</div>
            </div>
            <div className="bd">
              <Button type="primary" size="large">
                <Link to={`/farms/${address}`}>Deposit</Link>
              </Button>
            </div>
          </div>
        </Card>
      </Fragment>
    ))

  return (
    <div className="page-farms">
      <AppBar />
      <div className="bd">{renderFarms()}</div>
      <Social />
    </div>
  )
}

export default Farms

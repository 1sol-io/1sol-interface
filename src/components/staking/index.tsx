import React from 'react'
import { Card, Button } from 'antd'

import { AppBar } from '../appBar'
import Social from '../social'

import Pool from './pool'
import Pool1 from './pool1'

const Staking = () => {
  return (
    <div className="page-staking">
      <AppBar />
      <div className="bd">
        <Card className="airdrop-card exchange-card" headStyle={{ padding: 0 }}>
          <div
            className="airdrop"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div className="hd">Stake 1SOL/SOL on Atrix</div>
            <div className="bd">
              <Button type="primary" shape="round" style={{ minWidth: '82px' }}>
                <a
                  href="https://app.atrix.finance/#/farms/2VcH3ppvbGkSjn4N8yqEMjrPE34yduHDKeP9EASMF7hX/stake"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Stake Now
                </a>
              </Button>
            </div>
          </div>
        </Card>

        <Pool1 />
        <Pool />
      </div>
      <Social />
    </div>
  )
}

export default Staking

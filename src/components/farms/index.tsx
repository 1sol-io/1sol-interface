import React, { Fragment } from 'react'
import { Card, Button } from 'antd'
import { Link } from 'react-router-dom'

import { useOnesolFarmingProtocol } from '../../hooks/useOnesolFarmingProtocol'
import { FarmItemProps } from '../../context/onesolfarming'

import { useOnesolProtocol } from '../../hooks/useOnesolProtocol'

import { TokenInfo } from '../../utils/token-registry'

import { AppBar } from '../appBar'
import Social from '../social'

import { TokenIcon } from '../tokenIcon'
import { formatWithCommas, getTokenName } from '../../utils/utils'

import './index.less'

interface FarmItem extends FarmItemProps {
  rewardToken: TokenInfo
}

const Farms = () => {
  const { farms, farmMap } = useOnesolFarmingProtocol()
  const { tokenMap } = useOnesolProtocol()

  const renderFarms = () =>
    farms.map((farm: FarmItem, i: number) => {
      const {
        address,
        pool: { tokenA, tokenB },
        rewardTokenMint
      }: FarmItem = farm

      const { tvl, apy } = farmMap[address.toBase58()]
      const rewardToken = tokenMap.get(rewardTokenMint.address.toBase58())

      return (
        <Fragment key={i}>
          <Card
            className="farm-card"
            headStyle={{ padding: 0 }}
            bodyStyle={{ padding: '20px' }}
          >
            <div className="farm" key={i}>
              <div className="hd">
                <div className="token-mod">
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
                        mintAddress={tokenA.mint.address.toBase58()}
                      />
                    </div>
                    <div className="token">
                      <TokenIcon
                        style={{ width: '40px', height: '40px', margin: '0' }}
                        mintAddress={tokenB.mint.address.toBase58()}
                      />
                    </div>
                  </div>
                  <div className="title">
                    {getTokenName(tokenMap, tokenA.mint.address.toBase58())}-{getTokenName(tokenMap, tokenB.mint.address.toBase58())}
                  </div>
                </div>
                <div className="data-mod">
                  <div className="data">
                    {tvl ? `$${formatWithCommas(tvl, 2)}` : '-'}
                  </div>
                  <div className="data apy">
                    {apy ? (
                      `${formatWithCommas(
                        apy * 100,
                        2
                      )}% APY (${rewardToken.symbol})`
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
              </div>
              <div className="bd">
                <Button type="primary" size="large">
                  <Link to={`/farms/${address.toBase58()}`}>Deposit</Link>
                </Button>
              </div>
            </div>
          </Card>
        </Fragment>
      )
    })

  return (
    <div className="page-farms">
      <AppBar />
      <div className="bd">{renderFarms()}</div>
      <Social />
    </div>
  )
}

export default Farms

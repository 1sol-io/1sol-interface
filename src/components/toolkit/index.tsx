import React, { useCallback, useState } from 'react'
import { Card, Button } from 'antd'
import { PublicKey } from '@solana/web3.js'

import { AppBar } from '../appBar'
import Social from '../social'

import { shortenAddress } from '../../utils/utils'

import { useWallet } from '../../context/wallet'
import { useWrappedSolAccounts } from '../../hooks/useWrappedSol'

import './index.less'

const Toolkit = () => {
  const { connect, connected } = useWallet()
  const { wrappedSolAccounts, unwrapSol } = useWrappedSolAccounts()

  const [unwrapLoading, setUnwrapLoading] = useState(false)

  const handleUnwrapSol = useCallback(
    async () => {
      try {
        setUnwrapLoading(true)

        await unwrapSol(
          wrappedSolAccounts.map((account) => new PublicKey(account.address))
        )

        setUnwrapLoading(false)
      } catch (e) {
        console.error(e)
        setUnwrapLoading(false)
      }
    },
    [wrappedSolAccounts, unwrapSol]
  )

  return (
    <div className="page-toolkit">
      <AppBar />
      <div className="bd">
        <Card
          className="toolkit-card"
          headStyle={{ padding: 0 }}
          bodyStyle={{ position: 'relative', padding: '20px' }}
        >
          <div className="toolkit-item">
            <div className="hd">unwrap Wrapped SOL</div>
            <div className="bd">
              <p>
                If you have Wrapped SOL in your wallet you can easily unwrap it.
                And your Wrapped SOL will be converted back into SOL.{' '}
              </p>
            </div>
            {connected ? (
              <div className="ft">
                {wrappedSolAccounts.length ? (
                  <div className="item">
                    <div className="hd">
                      <div className="label">Address</div>
                      <div className="label">Balance</div>
                    </div>
                    {wrappedSolAccounts.map((item, index) => (
                      <div className="bd" key={index}>
                        <div className="value">
                          {shortenAddress(item.address, 10)}
                        </div>
                        <div className="value">
                          {item.balance.toFixed(9)}
                          <span style={{ fontSize: '12px' }}>
                            +(&#8776;0.02account fee)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                <Button
                  disabled={!wrappedSolAccounts.length || unwrapLoading}
                  block
                  type="primary"
                  size="large"
                  onClick={handleUnwrapSol}
                  loading={unwrapLoading}
                  style={{ marginTop: '20px' }}
                >
                  Unwrap All
                </Button>
              </div>
            ) : (
              <div className="ft">
                <Button
                  type="primary"
                  onClick={connect}
                  size="large"
                  shape="round"
                  block
                >
                  Connect Wallet
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
      <div className="ft">
        <Social />
      </div>
    </div>
  )
}

export default Toolkit

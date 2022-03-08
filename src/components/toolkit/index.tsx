import React, {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'
import { Card, Button, Spin, Popover, Modal, Tooltip } from 'antd'

import { AppBar } from '../appBar'
import Social from '../social'

import { shortenAddress } from '../../utils/utils'
import { useConnection } from '../../utils/connection'

import { WRAPPED_SOL_MINT } from '../../utils/constant'
import { useWallet } from '../../context/wallet'

import './index.less'

const Toolkit = () => {
  const { wallet, connect, connected } = useWallet()
  const connection = useConnection()

  const [wsol, setWsol] = useState([])

  useCallback(
    () => {
      // if (connected) {
      //   const wsol = []
      //   setWsol(wsol)
      // }
    },
    [connection, connected]
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
            <div className="hd">unwrap Wrapped SOL to SOL</div>
            <div className="bd">
              <p>
                If you have Wrapped SOL in your wallet you can easily unwrap it.
                And your Wrapped SOL will be converted back into SOL.{' '}
              </p>
            </div>
            {connected ? (
              <div className="ft">
                {wsol.length ? (
                  <div className="item">
                    <div className="hd">
                      <div className="label">Address</div>
                      <div className="label">Balance</div>
                    </div>
                    <div className="bd">
                      {wsol.map((item, index) => (
                        <Fragment key={index}>
                          <div className="value">
                            {shortenAddress(wallet.publicKey.toBase58(), 12)}
                          </div>
                          <div className="value">0.0</div>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                ) : null}

                <Button
                  disabled={!wsol.length}
                  block
                  type="primary"
                  size="large"
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

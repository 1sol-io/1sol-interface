import React, { useEffect, useRef, MutableRefObject } from 'react'
import { Button } from 'antd'

import { useWallet } from '../../context/wallet'

import { AppBar } from '../appBar'
import Social from '../social'

const Airdrop = () => {
  const { connected, connect } = useWallet()

  const widget: MutableRefObject<HTMLDivElement | null> = useRef(null)

  useEffect(() => {
    const dataOnauth = (user: any) => {
      console.log(`user: ${JSON.stringify(user, null, 2)}`)
    }

    // @ts-ignore
    window.TelegramLoginWidget = {
      dataOnauth: (user: any) => dataOnauth(user)
    }

    const script = document.createElement('script')

    script.src = `https://telegram.org/js/telegram-widget.js?15`

    script.setAttribute('data-telegram-login', 'OnesolMasterBot')
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-request-access', 'write')
    script.setAttribute('data-onauth', 'TelegramLoginWidget.dataOnauth(user)')
    script.async = true

    if (widget.current) {
      widget.current.appendChild(script)
    }
  }, [])

  return (
    <div className="page-airdrop">
      <AppBar />
      <div className="bd">
        {!connected ? (
          <div className="airdrop-content">
            <div ref={widget} />
          </div>
        ) : (
          <Button size="large" type="primary" onClick={connect}>
            Connect Wallet
          </Button>
        )}
      </div>
      <Social />
    </div>
  )
}

export default Airdrop

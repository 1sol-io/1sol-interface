import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  MutableRefObject
} from 'react'
import { Button } from 'antd'
import axios from 'axios'

import { useWallet } from '../../context/wallet'

import { AppBar } from '../appBar'
import Social from '../social'

const Airdrop = () => {
  const { connected, connect } = useWallet()
  const [user, setUser] = useState<any>({
    id: 145728019,
    first_name: 'Miko',
    last_name: 'Gao',
    username: 'gaowhen',
    auth_date: '1638255448',
    hash: 'b49af762fa9c4b091585fb9e28868f21146441ad381532be9ffd98ea9fd9cf41'
  })

  const widget: MutableRefObject<HTMLDivElement | null> = useRef(null)

  const callback = useCallback(
    async () => {
      const { data: { token } } = await axios.post(
        'https://airdrop-api.1sol.io/login/auth/telegram',
        user
      )

      const {
        data
      } = await axios.get('https://airdrop-api.1sol.io/api/users/self', {
        headers: { Authorization: `Bearer ${token}` }
      })
      console.log(data)
    },
    [user]
  )

  const handleMock = async () => {
    await callback()
  }

  useEffect(() => {
    const dataOnauth = (user: any) => {
      // console.log(`user: ${JSON.stringify(user, null, 2)}`)
      const u = {
        id: 145728019,
        first_name: 'Miko',
        last_name: 'Gao',
        username: 'gaowhen',
        auth_date: 1638255448,
        hash: 'b49af762fa9c4b091585fb9e28868f21146441ad381532be9ffd98ea9fd9cf41'
      }

      setUser(u)

      if (u) {
        callback()
      }
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
            <div onClick={handleMock}>Mock</div>
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

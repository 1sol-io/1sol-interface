import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  MutableRefObject
} from 'react'
import { Button, Input, Form, Card } from 'antd'
import axios from 'axios'


import { useWallet } from '../../context/wallet'

import { AppBar } from '../appBar'
import Social from '../social'

import { createTokenAccount } from '../../utils/pools'
import { useConnection } from '../../utils/connection'
import { ONESOL_MINT_ADDRESS } from '../../utils/constant'
import { useUserAccounts } from '../../utils/accounts'
import { useLocalStorageState } from '../../utils/utils'

interface UserProps {
  id: number,
  amount: number,
  channel: boolean,
  email: boolean,
  in_group: boolean,
  wallet: string,
  spam?: boolean,
  eth_address?: string,
  referral_user_id?: number,
  token_acc_address?: string,
  twitter_id?: string,
  user_id?: number,
}

const Airdrop = () => {
  const connection = useConnection();
  const { connected, connect, wallet } = useWallet()
  const { userAccounts } = useUserAccounts();

  const [auth, setAuth] = useLocalStorageState('airdrop:auth:info')

  const [user, setUser] = useState<UserProps>()

  const [form] = Form.useForm()

  const widget: MutableRefObject<HTMLDivElement | null> = useRef(null)
  const [hasTokenAccount, setHasTokenAccount] = useState(false)
  const [createTokenAccountLoading, setCreateTokenAccountLoading] = useState(false)

  const callback = useCallback(
    async () => {
      const { data: { token, exp: expireAt, user_id: uid } } = await axios.post(
        'https://airdrop-api.1sol.io/login/auth/telegram',
        {
          id: 145728019,
          first_name: 'Miko',
          last_name: 'Gao',
          username: 'gaowhen',
          auth_date: '1638255448',
          hash: 'b49af762fa9c4b091585fb9e28868f21146441ad381532be9ffd98ea9fd9cf41'
        }
      )

      setAuth({ token, expireAt, uid })

      const {
        data
      } = await axios.get('https://airdrop-api.1sol.io/api/users/self', {
        headers: { Authorization: `Bearer ${token}` }
      })

      setUser(data)
    },
    [setAuth]
  )

  useEffect(() => {
    const getTokenAccount = (mint: string) => {
      const index = userAccounts.findIndex(
        (acc: any) => acc.info.mint.toBase58() === mint
      );

      if (index !== -1) {
        return userAccounts[index];
      }

      return false;
    }

    const oneSolTokenAccount = getTokenAccount(ONESOL_MINT_ADDRESS.toBase58());

    if (connected && oneSolTokenAccount) {
      setHasTokenAccount(true)
    }
  }, [connected, userAccounts])


  const handleMock = async () => {
    await callback()
  }

  const handleCreateTokenAccount = async () => {
    try {
      setCreateTokenAccountLoading(true)

      await createTokenAccount(connection, wallet, ONESOL_MINT_ADDRESS)

      setCreateTokenAccountLoading(false)
   } catch (e) {
      setCreateTokenAccountLoading(false)
   }
  }

  useEffect(
    () => {
      if (auth && auth.expireAt > Date.now()) {
        return
      }

      const dataOnauth = (user: any) => {
        if (user) {
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
    },
    [callback, auth]
  )

  return (
    <div className="page-airdrop">
      <AppBar />
      <div className="bd">
        <Card
          className="airdrop-card"
          style={{ width: '400px', borderRadius: 20, margin: '20px auto 0' }}
        >
          {connected ? (
            <>
            <div className="airdrop-content">
              <div ref={widget} />
              <div onClick={handleMock}>Mock</div>
            </div>
            <div className="form">
              <Form
                form={form}
                labelCol={{ span: 6 }}
                wrapperCol={{ span: 16 }}
                initialValues={user}
              >
                <Form.Item label="Amount" name="amount"
                  rules={[
                    {required: true},
                  ]}
                >
                  <Input disabled suffix="1SOL" />
                </Form.Item>
                <Form.Item
                  label="Wallet"
                  name="wallet"
                  rules={[
                    {required: true},
                  ]}
                >
                  <Input disabled />
                </Form.Item>
                <Form.Item
                  label="Email"
                  name="email"
                  rules={[
                    {
                      type: 'email',
                      message: 'The input is not valid Email'
                    },
                    { required: true, message: 'Please input your Email' }
                  ]}
                >
                  <Input placeholder="email" />
                </Form.Item>

                {
                  !hasTokenAccount ? (
                  <Form.Item label="Account" name="account">
                    <Button type="primary" size="small" onClick={handleCreateTokenAccount}
                      loading={createTokenAccountLoading}
                    >
                      Create 1SOL Token Account
                    </Button>
                  </Form.Item>
                  ) : null
                }
                
                <Form.Item>
                  <Button type="primary" htmlType="submit">
                    Register
                  </Button>
                </Form.Item>
              </Form>
            </div>
            </>
        ) : (
          <Button size="large" type="primary" onClick={connect}>
            Connect Wallet
          </Button>
        )}
        </Card>
      </div>
      <Social />
    </div>
  )
}

export default Airdrop


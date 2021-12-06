import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  MutableRefObject
} from 'react'
import { Button, Input, Form, Card, Modal } from 'antd'
import axios from 'axios'


import { useWallet } from '../../context/wallet'

import { AppBar } from '../appBar'
import Social from '../social'

import { createTokenAccount } from '../../utils/pools'
import { useConnection } from '../../utils/connection'
import { ONESOL_MINT_ADDRESS } from '../../utils/constant'
import { useUserAccounts } from '../../utils/accounts'
import { useLocalStorageState } from '../../utils/utils'
import { LoadingOutlined } from '@ant-design/icons'
import { notify } from '../../utils/notifications'

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

  const [modal, setModal] = useState(false)
  const [loading, setLoading] = useState(true)

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

  const fetchUserInfo = useCallback(async () => {
    const { data } = await axios.get('https://airdrop-api.1sol.io/api/users/self', {
      headers: { Authorization: `Bearer ${auth.token}` }
    })

    setLoading(false)
    setUser(data)
    form.setFieldsValue({...data, email: data.email || ''})
  }, [auth, form])


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

  useEffect(() => {
    if (connected && auth) {
      fetchUserInfo()
    }
  }, [connected, auth, fetchUserInfo])


  const handleMock = async () => {
    await callback()
  }

  const handleCreateTokenAccount = async () => {
    try {
      setCreateTokenAccountLoading(true)

      const account = await createTokenAccount(connection, wallet, ONESOL_MINT_ADDRESS)

      setCreateTokenAccountLoading(false)
      form.setFieldsValue({ token_acc_address: account.toBase58() })
    } catch (e) {
        setCreateTokenAccountLoading(false)
    }
  }

  useEffect(
    () => {
      if (auth && auth.expireAt > Date.now()) {
        fetchUserInfo()
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
    [callback, auth, fetchUserInfo, connected]
  )

  useEffect(() => {
    if (connected && user && user.wallet !== wallet.publicKey.toBase58()) {
      setModal(true)
    }
  }, [user, wallet, setModal, connected])

  const handleOk = async () => {
    form.setFieldsValue({ 
      wallet: wallet.publicKey.toBase58() 
    })

    setModal(false)
  } 

  const handleRegister = async () => {
    form.validateFields().then(async (values: any) => {
      try {
        const {wallet, token_acc_address, email} = form.getFieldsValue()

        await axios.post(`https://airdrop-api.1sol.io/api/users/update`, 
          {
            wallet,
            token_acc_address,
            email
          }, 
          {
            headers: { Authorization: `Bearer ${auth.token}` }
          }
        )

        notify({
          message: `Token account created`,
          type: "success",
          description: ``,
        });
      } catch (e) {
        console.error(e)
        notify({
          description: "Please try again",
          message: "Registration failed",
          type: "error",
        });
      }
    })
  }

  return (
    <div className="page-airdrop">
      <AppBar />
      <div className="bd">
        <Card
          className="airdrop-card"
          style={{ width: '400px', borderRadius: 20, margin: '20px auto 0', minHeight: '398px' }}
        >
          {connected ? (
            <>
              <div className="airdrop-content">
                <div ref={widget} />
                <div onClick={handleMock}>Mock</div>
              </div>
              <div className="form">
                { !loading ? (
                  <Form
                    form={form}
                    labelCol={{ span: 6 }}
                    wrapperCol={{ span: 16 }}
                  >
                    <Form.Item label="Balance" name="amount"
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
                    { !user?.email ? (
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
                    ) : null }

                    {
                      !hasTokenAccount ? (
                      <Form.Item label="Account" name="account"
                        rules={[
                          { required: true, message: 'Please input your Email' }
                        ]}
                      >
                        <Button type="primary" size="small" onClick={handleCreateTokenAccount}
                          loading={createTokenAccountLoading}
                        >
                          Create 1SOL Token Account
                        </Button>
                      </Form.Item>
                      ) : null
                    }
                    
                    <Form.Item>
                      <Button 
                        type="primary" 
                        htmlType="submit" 
                        onClick={handleRegister}
                        disabled={!form.getFieldValue('email') || form.getFieldValue('wallet') !== wallet.publicKey.toBase58() || !form.getFieldValue('token_acc_address')}
                      >
                        Register
                      </Button>
                    </Form.Item>
                  </Form>
                ) : 
                <LoadingOutlined />
                }
              </div>
            </>
        ) : (
          <Button size="large" type="primary" onClick={connect} style={{marginTop: '155px'}}>
            Connect Wallet
          </Button>
        )}
        </Card>
      </div>
      <Social />

      <Modal title="Warning" visible={modal} closable={false}
        footer={[<Button type="primary" onClick={handleOk}>OK</Button>]}
      >
      </Modal>
    </div>
  )
}

export default Airdrop


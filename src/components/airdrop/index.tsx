import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  MutableRefObject
} from 'react'
import { Button, Input, Form, Card, Modal } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import axios from 'axios'

import { useWallet } from '../../context/wallet'

import { AppBar } from '../appBar'
import Social from '../social'

import { createTokenAccount } from '../../utils/pools'
import { useConnection } from '../../utils/connection'
import { ONESOL_MINT_ADDRESS } from '../../utils/constant'
import { useUserAccounts } from '../../utils/accounts'
import { notify } from '../../utils/notifications'

interface UserProps {
  id?: number,
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
  const { userAccounts, fetchUserTokenAccounts } = useUserAccounts();

  const [auth, setAuth] = useState<{token: string, expireAt: string, uid: string} | null>()

  const [user, setUser] = useState<UserProps>()

  const [modal, setModal] = useState(false)

  const [form] = Form.useForm()

  const widget: MutableRefObject<HTMLDivElement | null> = useRef(null)

  const [hasTokenAccount, setHasTokenAccount] = useState(false)
  const [createTokenAccountLoading, setCreateTokenAccountLoading] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchUserInfo = useCallback(async () => {
    const { data } = await axios.get('https://airdrop-api.1sol.io/api/users/self', {
      headers: { Authorization: `Bearer ${auth?.token}` }
    })

    setUser(data)

    const fields: UserProps = {
      amount: data.amount,
      channel: data.channel,
      email: data.email || '',
      in_group: data.in_group,
      wallet: data.wallet,
    }

    if (data.token_acc_address) {
      fields.token_acc_address = data.token_acc_address
    }

    form.setFieldsValue(fields)
  }, [auth, form])

  useEffect(() => {
    if (connected) {
      const auth = localStorage.getItem(`airdrop:auth:info:${wallet.publicKey.toBase58()}`)

      if (auth) {
        setAuth(JSON.parse(auth))
      }
    }
  }, [connected, wallet])

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
      form.setFieldsValue({token_acc_address: oneSolTokenAccount.pubkey.toBase58()})
    }
  }, [connected, userAccounts, form])

  useEffect(() => {
    if (connected && auth && (!user?.channel || !user?.in_group)) {
      fetchUserInfo()

      const timer = setTimeout(() => { fetchUserInfo() }, 10000)

      return () => clearTimeout(timer)
    }
  }, [user, connected, auth, fetchUserInfo])

  const handleCreateTokenAccount = async () => {
    try {
      setCreateTokenAccountLoading(true)

      const account = await createTokenAccount(connection, wallet, ONESOL_MINT_ADDRESS)

      setCreateTokenAccountLoading(false)
      form.setFieldsValue({ token_acc_address: account.toBase58() })

      fetchUserTokenAccounts()
    } catch (e) {
      setCreateTokenAccountLoading(false)
    }
  }

  useEffect(
    () => {
      if (!connected) {
        return 
      }

      if (auth && Number(auth.expireAt) > Date.now()) {
        fetchUserInfo()

        return
      }

      const callback = async (user: any) => {
        const { data: { token, exp: expireAt, user_id: uid } } = await axios.post(
          'https://airdrop-api.1sol.io/login/auth/telegram',
          {...user, auth_date: `${user.auth_date}`}
        )

        setAuth({ token, expireAt, uid })
        localStorage.setItem(`airdrop:auth:info:${wallet.publicKey.toBase58()}`, JSON.stringify({ token, expireAt, uid }))
      }

      const dataOnauth = (user: any) => {
        if (user) {
          callback(user)
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
    [auth, fetchUserInfo, connected, setAuth, wallet]
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
        setLoading(true)

        const {wallet, token_acc_address, email} = form.getFieldsValue()

        await axios.post(`https://airdrop-api.1sol.io/api/users/update`, 
          {
            wallet,
            token_acc_address,
            email
          }, 
          {
            headers: { Authorization: `Bearer ${auth?.token}` }
          }
        )

        notify({
          message: `Registration completed`,
          type: "success",
          description: ``,
        });
        setLoading(false)
      } catch (e) {
        console.error(e)

        notify({
          description: "Please try again",
          message: "Registration failed",
          type: "error",
        });
        setLoading(false)
      }
    })
  }

  return (
    <div className="page-airdrop">
      <AppBar />
      <div className="bd">
        <Card
          title="Airdrop Registration"
          className="airdrop-card"
          style={{ width: '450px', borderRadius: 20, margin: '20px auto 0', minHeight: '398px' }}
        >
          {connected ? (
            <>
              <div className="airdrop-content">
                {!auth || Number(auth.expireAt) <= Date.now() ? <div ref={widget} /> : null}
              </div>
              <div className="form" style={{marginTop: '30px'}}>
                { user?.id ? (
                  <Form
                    form={form}
                    labelCol={{ span: 8 }}
                    wrapperCol={{ span: 16 }}
                  >
                    <Form.Item label="Channel" name="channel"
                      rules={[
                        {required: true},
                      ]}
                    >
                      {
                        !user?.channel ? (
                          <Button type="primary">
                            <a
                              href="https://t.me/onesolannouncement"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Join
                            </a>
                          </Button>
                        ) : 'Joined'
                      }  
                    </Form.Item>
                    <Form.Item label="Group" name="in_group"
                      rules={[
                        {required: true},
                      ]}
                    >
                      {
                        !user?.in_group ? (
                          <Button type="primary">
                            <a
                              href="https://t.me/onesolcommunity"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Join
                            </a>
                          </Button>
                        ) : 'Joined'
                      }  
                    </Form.Item>
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

                    <Form.Item label="1SOL Account" name="token_acc_address"
                      rules={[
                        { required: true, message: 'Please create 1SOL Token Account' }
                      ]}
                    >
                      {
                        !hasTokenAccount ? (
                          <Button type="primary" size="small" onClick={handleCreateTokenAccount}
                            loading={createTokenAccountLoading}
                          >
                            Create 1SOL Token Account
                          </Button>
                        ) : <Input disabled />
                      }
                    </Form.Item>
                    
                    <Form.Item wrapperCol={{ offset: 4, span: 16 }}>
                      <Button 
                        style={{marginTop: '20px'}}
                        type="primary" 
                        size="large"
                        block
                        htmlType="submit" 
                        onClick={handleRegister}
                        loading={loading}
                        disabled={
                          !form.getFieldValue('channel') || 
                          !form.getFieldValue('in_group') || 
                          !form.getFieldValue('email') || 
                          (wallet && form.getFieldValue('wallet') !== wallet.publicKey.toBase58()) || 
                          !form.getFieldValue('token_acc_address')
                        }
                      >
                        Register
                      </Button>
                    </Form.Item>
                  </Form>
                  ) : 
                  auth ? <LoadingOutlined /> : null
                }
              </div>
            </>
        ) : (
          <Button size="large" type="primary" onClick={connect} style={{marginTop: '100px'}}>
            Connect Wallet
          </Button>
        )}
        </Card>
      </div>
      <Social />

      <Modal 
        title="Warning" 
        visible={modal} 
        closable={false}
        footer={[<Button type="primary" onClick={handleOk}>OK</Button>]}
      >
        <p>The wallet you're using is different from the one that associated with your airdrop.</p>
        <p>Do you want to change your wallet?</p>
      </Modal>
    </div>
  )
}

export default Airdrop


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

import './index.less'
import { useLocation } from 'react-router'

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
  const location = useLocation();

  const [auth, setAuth] = useState<{token: string, expireAt: string, uid: string} | null>()

  const [user, setUser] = useState<UserProps | null>()

  const [modal, setModal] = useState(false)

  const [form] = Form.useForm()

  const widget: MutableRefObject<HTMLDivElement | null> = useRef(null)

  const [hasTokenAccount, setHasTokenAccount] = useState(false)
  const [createTokenAccountLoading, setCreateTokenAccountLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [changeWallet, setChangeWallet] = useState(false)

  const timer: {current: NodeJS.Timeout | null} = useRef(null)
  const modalShowed = useRef(false)

  const fetchUserInfo = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current)
    }

    const { data } = await axios.get('https://airdrop-api.1sol.io/api/users/self', {
      headers: { Authorization: `Bearer ${auth?.token}` }
    })

    setUser(data)
    form.setFieldsValue({...data, email: data.email || '', token_acc_address: ''})

    if (wallet && wallet.publicKey && data.wallet !== wallet.publicKey.toBase58() && !modalShowed.current) {
      setModal(true)
      modalShowed.current = true
    }

    if (!data.channel || !data.in_group) {
      timer.current = setTimeout(() => fetchUserInfo(), 3000)
    }
  }, [auth, form, wallet, modalShowed])

  useEffect(() => {
    if (connected && wallet && wallet.publicKey) {
      localStorage.setItem('airdrop_wallet', wallet.publicKey.toBase58())

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
      } else {
        setUser(null)
        form.resetFields()
      }

      if (auth && Number(auth.expireAt) * 1000 > Date.now()) {
        fetchUserInfo()

        return
      }

      const callback = async (user: any) => {
        try {
          const { data: { token, exp: expireAt, user_id: uid } } = await axios.post(
            'https://airdrop-api.1sol.io/login/auth/telegram',
            user
          )

          setAuth({ token, expireAt, uid })
          localStorage.setItem(`airdrop:auth:info:${wallet.publicKey.toBase58()}`, JSON.stringify({ token, expireAt, uid }))
        } catch (e) {
          console.error(e)

          notify({
            description: "Please try again",
            message: "Telegram authorization failed",
            type: "error",
          });
        }
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
      if (window.innerWidth < 768) {
        script.setAttribute('data-onauth-url', 'https://app.1sol.io/airdrop')
      } else {
        script.setAttribute('data-onauth', 'TelegramLoginWidget.dataOnauth(user)')
      }

      script.async = true

      if (widget.current) {
        widget.current.appendChild(script)
      } 

      return () => {
        if (timer.current) {
          clearTimeout(timer.current)
        }
      }
    },
    [auth, fetchUserInfo, connected, setAuth, wallet, form]
  )

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const id = urlParams.get("id");
    const authDate = urlParams.get("auth_date");
    const firstName = urlParams.get("first_name");
    const lastName = urlParams.get("last_name");
    const hash = urlParams.get("hash");
    const username = urlParams.get("username");

    const user = {
      id: Number(id),
      auth_date: Number(authDate),
      first_name: firstName,
      last_name: lastName,
      hash,
      username
    }
    const wallet = localStorage.getItem('airdrop_wallet')

    const callback = async (user: any) => {
      try {
        const { data: { token, exp: expireAt, user_id: uid } } = await axios.post(
          'https://airdrop-api.1sol.io/login/auth/telegram',
          user
        )

        setAuth({ token, expireAt, uid })
        localStorage.setItem(`airdrop:auth:info:${wallet}`, JSON.stringify({ token, expireAt, uid }))
      } catch (e) {
        console.error(e)
      }
    }

    if (user.id && user.auth_date && user.hash) {
      callback(user)
    }

  } , [wallet, location.pathname, location.search])

  const handleOk = async () => {
    form.setFieldsValue({ 
      wallet: wallet.publicKey.toBase58() 
    })

    setChangeWallet(true)
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
          style={{ borderRadius: 20, margin: '20px auto 0', minHeight: '398px' }}
        >
          {connected ? (
            <>
              { 
                !user ?
                <div className="airdrop-content">
                  <div ref={widget} />
                </div> : 
                null
              }
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
                        ) : <div className="align">Joined</div>
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
                        ) : <div className="align">Joined</div>
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
                          <div className="align">
                            <Button type="primary" size="small" onClick={handleCreateTokenAccount}
                              loading={createTokenAccountLoading}
                            >
                              Create 1SOL Token Account
                            </Button>
                          </div>
                        ) : <Input placeholder="loading…" disabled />
                      }
                    </Form.Item>
                    
                    <div className="form-footer">
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
                          (wallet && wallet.publicKey && form.getFieldValue('wallet') !== wallet.publicKey.toBase58()) || 
                          !form.getFieldValue('token_acc_address') || 
                          (
                            form.getFieldValue('channel') && 
                            form.getFieldValue('in_group') && 
                            form.getFieldValue('email') &&
                            form.getFieldValue('wallet') &&
                            form.getFieldValue('token_acc_address') &&
                            !changeWallet
                          )
                        }
                      >
                        {
                          form.getFieldValue('channel') && 
                          form.getFieldValue('in_group') && 
                          form.getFieldValue('email') &&
                          form.getFieldValue('wallet') &&
                          form.getFieldValue('token_acc_address') &&
                          !changeWallet ? 
                          'Submitted': 
                          'Submit'
                        }
                      </Button>
                    </div>
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
        footer={[<Button type="primary" onClick={handleOk}>Ok</Button>]}
      >
        <p>The wallet you're using is different from the one that associated with your airdrop.</p>
        <p>Do you want to change your wallet?</p>
        <p>Or you need switch wallet to view your airdrop information.</p>
      </Modal>
    </div>
  )
}

export default Airdrop


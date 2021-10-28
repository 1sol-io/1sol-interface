import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Spin, Popover, Modal, Tooltip } from "antd";
import {
  LoadingOutlined,
  PlusOutlined ,
  RightOutlined,
  ArrowRightOutlined,
  SettingOutlined,
  ExpandOutlined,
  TwitterOutlined,
  ReloadOutlined,
  InfoCircleOutlined
} from "@ant-design/icons";
import axios from 'axios'
import { PublicKey } from "@solana/web3.js";

import {
  useConnection,
  useConnectionConfig,
  useSlippageConfig,
} from "../../utils/connection";
import { useWallet } from "../../context/wallet";
import { CurrencyInput } from "../currencyInput";
import { QuoteCurrencyInput } from "../quoteCurrencyInput";

import {
  PoolOperation,
  onesolProtocolSwap,
  createTokenAccount,
} from "../../utils/pools";
import { notify } from "../../utils/notifications";
import { useCurrencyPairState } from "../../utils/currencyPair";
import { generateActionLabel, POOL_NOT_AVAILABLE, SWAP_LABEL } from "../labels";
import { getTokenName } from "../../utils/utils";
import { Settings } from "../settings";

import { TokenIcon } from "../tokenIcon";

import { cache, useUserAccounts } from "../../utils/accounts";
import { PROVIDER_MAP } from "../../utils/constant";
import { AmmInfo } from "../../utils/onesol-protocol";
import { WRAPPED_SOL_MINT } from "../../utils/ids";

import timeoutIcon from '../../assets/4.gif'

import "./trade.less";

const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

interface Distribution {
  id: string,
  output: number, 
  routes: any[],
  provider: string,
  offset?: number,
}

interface Route {
  from: string,
  to: string,
  in: number,
  out: number,
  provider: string,
  ratio: number
}

export const TradeEntry = () => {
  const { wallet, connect, connected } = useWallet();
  const connection = useConnection();
  const [pendingTx, setPendingTx] = useState(false);
  const {
    A,
    B,
    setLastTypedAccount,
    setPoolOperation,
  } = useCurrencyPairState();

  const refreshBtnRef: {current: any} = useRef()

  // const [loading, setLoading] = useState(false)
  const loading: {current: boolean} = useRef(false) 
  const [timeoutLoading, setTimeoutLoading] = useState(false)
  
  // const [choice, setChoice] = useState('')
  // best swap routes
  const [amounts, setAmounts] = useState<Route[][]>([])
  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [showRoute, setShowRoute] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [routeLabel, setRouteLable] = useState<string[]>([])

  const { slippage } = useSlippageConfig();
  const { tokenMap, chainId, ammInfos } = useConnectionConfig();

  const CancelToken = axios.CancelToken;
  const cancel = useRef(function () {})

  const timer: { current: NodeJS.Timeout | null } = useRef(null)
  const choice: {current: string} = useRef('')
  const errorMessage: {current: string} = useRef('')

  const [hasTokenAccount, setHasTokenAccount] = useState(false)

  const { userAccounts } = useUserAccounts();

  useEffect(() => {
    const getTokenAccount = (mint: string) => {
      // if B is SOL, 
      if (mint === WRAPPED_SOL_MINT.toBase58()) {
        return true
      }

      const index = userAccounts.findIndex(
        (acc: any) => acc.info.mint.toBase58() === mint
      );

      if (index !== -1) {
        return userAccounts[index];
      }

      return;
    }
    
    setHasTokenAccount(false)

    const tokenMint = cache.getMint(B.mintAddress);
    const tokenAccount = getTokenAccount(B.mintAddress);

    if (connected && tokenAccount && tokenMint) {
      setHasTokenAccount(true)
    }
  }, [connected, B.mintAddress, userAccounts])

  const fetchDistrubition = useCallback(async () => {
    if (!A.mint || !B.mint) {
      loading.current = false
      setTimeoutLoading(false)

      return
    }

    loading.current = true
    setTimeoutLoading(false)

    const decimals = [A.mint.decimals, B.mint.decimals]

    const startTime = Date.now()
    try {
      const {
        data: {
          best, 
          distributions
        }
      }: {
        data: {
          best: {
            amount_out: number, 
            exchanger_flag: string, 
            routes: any[]
          } | undefined, 
          distributions: any
        }
      } = await axios({
        url: `https://api.1sol.io/1/swap/1/${chainId}`,
        method: 'post', 
        data: {
          amount_in: parseInt(`${Number(A.amount) * 10 ** A.mint.decimals}`),
          source_token_mint_key: A.mintAddress,
          destination_token_mint_key: B.mintAddress, 
          programs: [
            "SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8",
            "DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY"
          ]
        }, 
        cancelToken: new CancelToken((c) => cancel.current = c)
      })
      const endTime = Date.now()

      //@ts-ignore
      window.gtag('event', 'api_request_time', {
        time: endTime - startTime,
        url: `https://api.1sol.io/1/swap/1/${chainId}`,
        data: {
          amount_in: parseInt(`${Number(A.amount) * 10 ** A.mint.decimals}`),
          source_token_mint_key: A.mintAddress,
          destination_token_mint_key: B.mintAddress, 
          programs: [
            "SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8",
            "DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY"
          ]
        }
      })

      let amounts: Route[][] = []
      let result: Distribution[] = []

      if (best) {
        const id = best.routes.flat(2).reduce((acc, cur) =>  `${acc}-${cur.pubkey}`, best.exchanger_flag)

        result.push({
          ...best,
          output: best.amount_out / 10 ** decimals[1], 
          provider: PROVIDER_MAP[best.exchanger_flag],
          offset: 0,
          id
        })

        // swap routes
        amounts = best.routes.map((routes: any) => routes.map(({
          amount_in,
          amount_out,
          exchanger_flag,
          source_token_mint,
          destination_token_mint
        }: {
          amount_in: number, 
          amount_out: number, 
          exchanger_flag: string, 
          source_token_mint: { pubkey: string, decimals: number }
          destination_token_mint: { pubkey: string, decimals: number }
        }) => ({
            from: tokenMap.get(source_token_mint.pubkey)?.symbol,
            to: tokenMap.get(destination_token_mint.pubkey)?.symbol,
            in: amount_in / 10 ** source_token_mint.decimals,
            out: amount_out / 10 ** destination_token_mint.decimals,
            provider: PROVIDER_MAP[exchanger_flag],
            ratio: (amount_in / 10 ** source_token_mint.decimals) / routes.reduce((acc: number, cur: any) => acc + cur.amount_in / 10 ** source_token_mint.decimals , 0) * 100
          }
        )))
      }

      result = [...result, 
        ...distributions
        .sort((a: any, b: any) => b.amount_out - a.amount_out )
        .map(({ amount_out, exchanger_flag, routes, ...rest }: { amount_out: number, exchanger_flag: string, routes: any[] }) => ({
          ...rest,
          routes,
          output: amount_out / 10 ** decimals[1], 
          provider: PROVIDER_MAP[exchanger_flag],
          offset: best ? (amount_out - best.amount_out) / best.amount_out * 100 : 0,
          id: `${routes.flat(2).reduce((acc, cur) => `${acc}-${cur.pubkey}`, exchanger_flag)}`
        }))
      ]

      // result list
      setDistributions(result)

      if (!choice.current && result.length) {
        // setChoice(result[0].id)
        choice.current = result[0].id
      }

      setAmounts(amounts)
      loading.current = false

      setTimeoutLoading(true)
      timer.current = setTimeout(() => { 
        fetchDistrubition() 
      }, 10 * 1000)
    } catch(e) {
      if (axios.isAxiosError(e)) {
        console.error(e)
        // if (!e.response) {
        //   notify({
        //     message: 'Network Error',
        //     type: 'error'
        //   })
        // } else 
        if (!axios.isCancel(e) && e.response) {
          loading.current = false
          errorMessage.current = e.response.data.error || e.message || 'Error Occurred'
        }
      } 

      setAmounts([])
      setDistributions([])
    }

    refreshBtnRef.current.classList.remove('refresh-btn')
    void refreshBtnRef.current.offsetHeight
    refreshBtnRef.current.classList.add('refresh-btn')

  }, [A.mint, A.mintAddress, A.amount, B.mint, B.mintAddress, CancelToken, chainId, tokenMap])

  useEffect(() => {
    setAmounts([])
    setDistributions([])
    choice.current = ''
    errorMessage.current = ''

    if (!A.amount) {
      loading.current = false
    }

    refreshBtnRef.current.classList.remove('refresh-btn')
    void refreshBtnRef.current.offsetHeight
    refreshBtnRef.current.classList.add('refresh-btn')
    setTimeoutLoading(false)

    if (cancel.current) {
      cancel.current()
    }

    if (timer.current) {
      clearTimeout(timer.current)
    }

    if (
      A.mintAddress && 
      B.mintAddress && 
      Number(A.amount) &&
      A.mintAddress !== B.mintAddress
    ) {
      fetchDistrubition()
    } 

    return () => {
      if (timer.current) {
        clearTimeout(timer.current)
      }
    }
  }, [A.amount, A.mintAddress, B.mintAddress, fetchDistrubition])

  const swapAccounts = () => {
    const tempMint = A.mintAddress;
    // const tempAmount = A.amount;

    A.setMint(B.mintAddress);
    // A.setAmount(B.amount);
    B.setMint(tempMint);
    // B.setAmount(tempAmount);

    if (A.amount) {
      loading.current = true
    }

    // @ts-ignore
    setPoolOperation((op: PoolOperation) => {
      switch (+op) {
        case PoolOperation.SwapGivenInput:
          return PoolOperation.SwapGivenProceeds;
        case PoolOperation.SwapGivenProceeds:
          return PoolOperation.SwapGivenInput;
        case PoolOperation.Add:
          return PoolOperation.SwapGivenInput;
      }
    });
  };

  const handleSwap = async () => {
    if (!A.amount || !B.mintAddress) {
      return
    }

    if (cancel.current) {
      cancel.current()
    }

    if (timer.current) {
      clearTimeout(timer.current)
    }

    loading.current = false
    setTimeoutLoading(false)

    try {
      setPendingTx(true);

      const components = [
        {
          account: A.account,
          mintAddress: A.mintAddress,
          amount: A.convertAmount(),
        },
        {
          mintAddress: B.mintAddress,
          amount: B.convertAmount(), 
        },
      ];

      const distribution = distributions.find(({id}: {id: string}) => id === choice.current)

      if (!distribution || !distribution.routes.length) {
        return
      }

      let amms: AmmInfo[] = [] 

      distribution.routes.forEach((route: any[]) => {
        const [first] = route

        if (first) {
          const ammInfo: AmmInfo | undefined = ammInfos.find((pool: AmmInfo) => {
            const mints: string[] = [pool.tokenMintA().toBase58(), pool.tokenMintB().toBase58()]

            return mints.includes(first.source_token_mint.pubkey) && mints.includes(first.destination_token_mint.pubkey)
          })

          if (ammInfo) {
            amms.push(ammInfo)
          }
        }
      })

      await onesolProtocolSwap(connection, wallet, A, B, amms, distribution, components, slippage);

      A.setAmount('')
      setShowShare(true)
    } catch (e) {
      console.error(e)

      notify({
        description: "Please try again and approve transactions from your wallet",
        message: "Swap trade cancelled.",
        type: "error",
      });
    } finally {
      setPendingTx(false);
    }
  };

  const handleSwitchChoice = (s: string) => {
    // setChoice(choice) 
    choice.current = s
  }

  const handleRefresh = () => { 
    setDistributions([])
    setAmounts([])
    choice.current = ''

    if (A.amount) {
      loading.current = true
    }

    setTimeoutLoading(false)
  }

  const handleShowRoute = () => setShowRoute(true)

  useEffect(() => {
    let label: string[] = []

    amounts.forEach(routes => {
      const [first] = routes

      if (first) {
        label.push(first.from)
        label.push(first.to)
      }
    })

    setRouteLable([...new Set(label)])
  }, [amounts])


  const handleCreateTokenAccount = async () => {
    if (B.mintAddress) {
      try {
        setPendingTx(true);

        await createTokenAccount(connection, wallet, new PublicKey(B.mintAddress));

        setHasTokenAccount(true)
      } catch (e) {
        console.error(e)

        notify({
          description:
            "Please try again",
          message: "Create account cancelled.",
          type: "error",
        });
      } finally {
        setPendingTx(false);
      }
    }
  }

  return (
    <>
      <div className="trade-header">
        <div className="hd">Trade(Devnet)</div>
        <div className="bd">
          <Button
            ref={refreshBtnRef}
            shape="circle"
            type="text"
            onClick={handleRefresh}
            disabled={!A.amount || loading.current || pendingTx}
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center'
            }}
          >
            {
              timeoutLoading ?
              <img style={{display: 'block', width: '24px', margin: '0'}} src={timeoutIcon} alt="" /> :
              loading.current ?
              <LoadingOutlined style={{fontSize: '19px', marginTop: '-2px'}} />:
              <ReloadOutlined style={{fontSize: '19px', marginTop: '-2px'}} />
            }
          </Button>
          <Popover
            placement="rightTop"
            title="Settings"
            content={<Settings />}
            trigger="click"
          >
            <Button
              shape="circle"
              type="text"
              icon={<SettingOutlined style={{fontSize: '19px'}} />}
            />
          </Popover>
        </div>
      </div>
      <div className="input-card">
        <CurrencyInput
          title="From"
          onInputChange={(val: any) => {
            setPoolOperation(PoolOperation.SwapGivenInput);

            if (A.amount !== val) {
              setLastTypedAccount(A.mintAddress);
            }

            A.setAmount(val);
          }}
          amount={A.amount}
          mint={A.mintAddress}
          onMintChange={(item) => {
            A.setMint(item);
          }}
          onMaxClick={() => A.mintAddress === WRAPPED_SOL_MINT.toBase58() ? A.setAmount(`${A.balance - 0.05 > 0 ? A.balance - 0.05 : 0}`) : A.setAmount(`${A.balance}`)}
        />
        <Button
         type="primary" 
         className="swap-button" 
         style={{display: 'flex', justifyContent: 'space-around', margin: '-10px auto'}}
         onClick={swapAccounts}
        >
          &#10607;
        </Button>
        <Card
          style={{ borderRadius: 20, margin: 0, width: '100%' }}
          bodyStyle={{ padding: 0 }}
        >
        <QuoteCurrencyInput
          title="To(estimated)"
          onInputChange={(val: any) => {
            setPoolOperation(PoolOperation.SwapGivenProceeds);

            if (B.amount !== val) {
              setLastTypedAccount(B.mintAddress);
            }

            B.setAmount(val);
          }}
          amount={B.amount}
          mint={B.mintAddress}
          onMintChange={(item) => {
            B.setMint(item);
          }}
          disabled
        />
        <Result
         loading={loading.current && !distributions.length} 
         data={distributions} 
         active={choice.current} 
         handleSwitchChoice={handleSwitchChoice} 
         handleShowRoute={handleShowRoute} 
         routes={routeLabel}
         error={errorMessage.current}
        />
      </Card>
      </div>
      <Button
        className="trade-button"
        type="primary"
        size="large"
        shape="round"
        block
        onClick={connected ? hasTokenAccount ? handleSwap : handleCreateTokenAccount : connect}
        style={{ marginTop: '20px' }}
        disabled={
          connected &&
          (
            pendingTx ||
            !A.account ||
            !B.mintAddress ||
            A.account === B.account ||
            !A.sufficientBalance() ||
            !distributions.length
          )
        }
      >
        {generateActionLabel(
        !distributions.length && !loading
          ? POOL_NOT_AVAILABLE(
              getTokenName(tokenMap, A.mintAddress),
              getTokenName(tokenMap, B.mintAddress)
            )
        : 
        SWAP_LABEL,
        connected,
        tokenMap,
        A,
        B,
        true,
        hasTokenAccount
        )}
        {pendingTx && <Spin indicator={antIcon} className="trade-spinner" />}
      </Button>

      {
        connected &&
        A.mintAddress === WRAPPED_SOL_MINT.toBase58() &&
        (A.balance < 0.05 || A.balance - (+A.amount) < 0.05)  ?
        <div className="sol-tip">
          Caution: Your SOL balance is low
          <Tooltip title={(
            <>
              SOL is needed for Solana network fees.<br/>
              A minimum balance of 0.05 SOL is recommended to avoid failed transactions.
            </>
          )}>
            <InfoCircleOutlined style={{marginLeft: '5px'}} />
          </Tooltip>
        </div>
        : null
       }

      <Modal width={580} visible={showRoute} centered footer={null} onCancel={() => setShowRoute(false)}>
        {amounts.length ? <TradeRoute amounts={amounts} /> : null}
      </Modal>

      <Modal width={590} visible={showShare} centered footer={null} onCancel={() => setShowShare(false)}>
        <div>
          <div style={{
            fontSize: '16px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <h4 style={{fontSize: '24px', margin: '0 0 30px', color: '#B73F95'}}>Get 1 & Win 200 1SOL!</h4>
            <p style={{margin: '0 0 8px 0'}}>
              1. Tweet using this link 
            </p>
            <p>
              <Button type="primary" size="large">
                <a className="twitter-share-button"
                  href={`https://twitter.com/intent/tweet?url=${encodeURI('https://beta-app.1sol.io')}&text=${encodeURIComponent("🚀Have just successfully swapped some tokens via #1Sol the cross-chain DEX aggregator on #Solana Devnet. @1solProtocol @solana Join the test and win a 200 $1SOL daily prize here!🎁")}&via=1solProtocol&hashtags=DeFi,IGNITION,giveaway,Airdrops`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{display: 'flex', alignItems: 'center'}}
                ><TwitterOutlined /><span style={{marginLeft: '5px'}}>Tweet</span></a>
              </Button>
            </p>
            <p style={{margin: '0 0 8px 0'}}>2. Talk to <a href={`https://t.me/OnesolMasterBot?start=${wallet && wallet.publicKey ? wallet.publicKey.toBase58() : ''}`} target="_blank" rel="noopener noreferrer">1Sol’s Telegram Bot</a> to confirm the airdrop</p>
            <p style={{margin: '0'}}>3. We’ll announce the daily 200-token winner via <a href="https://discord.com/invite/juvVBKnvkj" target="_blank" rel="noopener noreferrer">Discord</a> <a href="https://t.me/onesolcommunity" target="_blank" rel="noopener noreferrer">Telegram</a> <a href="https://twitter.com/1solprotocol" target="_blank" rel="noopener noreferrer">Twitter</a></p>
          </div>
        </div>
      </Modal>
    </>
  );
};

export const Result = (props: {
  data: Distribution[], 
  loading: boolean, 
  handleSwitchChoice: (a: string) => void,
  handleShowRoute: () => void,
  error: string,
  active?: string,
  routes?: string[],
}) => {
  const { data, loading, handleSwitchChoice, active, handleShowRoute, routes, error } = props

  return (
    <div className="mod-results">
      {
        loading ?
        <LoadingOutlined style={{ fontSize: 24 }} spin /> :
        !data.length && error ?
        <div>{error}</div> :
        data.map(({provider, output, offset, id}, i) => (
          <div
            key={id}
            className={id === active ? "mod-result active": 'mod-result'}
            onClick={() => handleSwitchChoice(id)}
          >
            <div className="hd">{provider}</div>
            <div className="bd">
              <div className="number">{output}{offset ? `(${offset.toFixed(2)}%)`: ''}</div>
              {
                i === 0 ?
                <div onClick={handleShowRoute} className="route">
                  { routes ? routes.map((label: string, i: number) => (
                    <span key={i}>
                      {label}
                      {
                        i !== routes.length -1 ? <RightOutlined style={{margin: '0 2px'}} /> : null
                      }
                    </span>
                  )): null }
                  {/* {A.name} &#10148; {B.name} */}
                  <ExpandOutlined style={{marginLeft: '5px'}} /> 
                </div> : 
                null
              }
            </div>
            {i === 0 ? <div className="ft">Best</div> : null}
          </div>
        ))
      }
    </div>
  )
}

export const TradeRoute = (props: { amounts: Route[][] }) => {
  const { A, B } = useCurrencyPairState();
  const {amounts} = props

  return (
    <div className="trade-route">
      <div className="hd"><TokenIcon mintAddress={A.mintAddress} style={{width: '30px', height: '30px'}} /></div>
      <RightOutlined style={{margin: '0 5px'}} />
      <div className="bd">
        {amounts.map((routes, i: number) => (
          <>
            <div className="token-route" key={i}>
              {routes.map((route, j: number) => (
                <>
                  <div className="market-route" key={j}>
                    <div className="pool">
                      <div className="name">{route.provider}</div>
                      <div className="amount">
                        <span>{route.from}</span>
                        <ArrowRightOutlined />
                        <span>{route.to}</span>
                        <span>{route.ratio}%</span>
                      </div>
                    </div>
                  </div>
                  {
                    j !== routes.length - 1 ?
                    <PlusOutlined style={{margin: '5px 0'}} />
                    : null
                  }
                </>
              ))}
            </div>
            {
              i !== amounts.length - 1 ?
                <RightOutlined style={{margin: '0 10px'}} />
              : null
            }
          </>
        ))}  
      </div>
      <RightOutlined style={{margin: '0 5px'}} />
      <div className="ft"><TokenIcon mintAddress={B.mintAddress} style={{width: '30px', height: '30px', margin: '0.11rem 0 0 0.5rem'}} /></div>
    </div>
  )
}

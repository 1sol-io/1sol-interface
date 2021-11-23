import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Spin, Popover, Modal, Tooltip } from "antd";
import {
  LoadingOutlined,
  PlusOutlined,
  RightOutlined,
  ArrowRightOutlined,
  SettingOutlined,
  ExpandOutlined,
  TwitterOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  SwapOutlined
} from "@ant-design/icons";
import axios, { AxiosRequestConfig } from 'axios'
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
  // createTokenAccount,
} from "../../utils/pools";
import { notify } from "../../utils/notifications";
import { useCurrencyPairState } from "../../utils/currencyPair";
import { generateActionLabel, POOL_NOT_AVAILABLE, SWAP_LABEL } from "../labels";
import { getTokenName } from "../../utils/utils";
import { Settings } from "../settings";

import { TokenIcon } from "../tokenIcon";

// import { cache, useUserAccounts } from "../../utils/accounts";
import { 
  PROVIDER_MAP, 
  TOKEN_SWAP_PROGRAM_ID, 
  ORCA_PROGRAM_ID, 
  SERUM_PROGRAM_ID, 
  RAYDIUM_PROGRAM_ID, 
  SABER_PROGRAM_ID,
  WRAPPED_SOL_MINT 
} from "../../utils/constant";

import timeoutIcon from '../../assets/4.gif'

import "./trade.less";

const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

const getDecimalLength = (num: number) => {
  let length = 0

  if (`${num}`.includes('.')) {
    length = `${num}`.split('.')[1].length
  }

  return length
}
interface RawDistribution {
  id: string,
  routes: any[],
  split_tx: boolean,
  destination_token_mint: {
    decimals: number,
    pubkey: string
  },
  source_token_mint: {
    decimals: number,
    pubkey: string
  },
  amount_in: number,
  amount_out: number,
  exchanger_flag: string,
}

interface Distribution extends RawDistribution {
  providers: string[],
  input: number,
  output: number,
  swapRoute: {
    routes: SwapRoute[][],
    labels: string[]
  },
  offset?: number,
}

interface SwapRoute {
  from: string,
  to: string,
  in: number,
  out: number,
  provider: string,
  ratio: number
}

interface PriceExchange {
  from: string,
  to: string,
  input: number,
  output: number
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

  const refreshBtnRef: { current: any } = useRef()

  const loading: { current: boolean } = useRef(false)
  const [timeoutLoading, setTimeoutLoading] = useState(false)

  // best swap routes
  const [swapRoutes, setSwapRoutes] = useState<SwapRoute[][]>([])
  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [showRoute, setShowRoute] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [refresh, setRefresh] = useState(0)

  const { slippage } = useSlippageConfig();
  const { tokenMap, chainId } = useConnectionConfig();

  const CancelToken = axios.CancelToken;
  const cancel = useRef(function () { })

  const timer: { current: NodeJS.Timeout | null } = useRef(null)
  const choice: { current: string } = useRef('')
  const errorMessage: { current: string } = useRef('')

  const [active, setActive] = useState('')
  const [priceExchange, setPriceExchange] = useState<PriceExchange | undefined>()
  const [hasPriceSwapped, setHasPriceSwapped] = useState(true)

  // const [hasTokenAccount, setHasTokenAccount] = useState(false)

  // const [showSplitTip, setShowSplitTip] = useState(false)

  // const { userAccounts } = useUserAccounts();

  // useEffect(() => {
  //   const distribution = distributions.find(d => d.id === choice.current)

  //   if (distribution) {
  //     setShowSplitTip(distribution.split_tx)
  //   } else {
  //     setShowSplitTip(false)
  //   }
  // }, [distributions, choice])

  // useEffect(() => {
  //   const getTokenAccount = (mint: string) => {
  //     // if B is SOL, 
  //     if (mint === WRAPPED_SOL_MINT.toBase58()) {
  //       return true
  //     }

  //     const index = userAccounts.findIndex(
  //       (acc: any) => acc.info.mint.toBase58() === mint
  //     );

  //     if (index !== -1) {
  //       return userAccounts[index];
  //     }

  //     return;
  //   }

  //   setHasTokenAccount(false)

  //   const tokenMint = cache.getMint(B.mintAddress);
  //   const tokenAccount = getTokenAccount(B.mintAddress);

  //   if (connected && tokenAccount && tokenMint) {
  //     setHasTokenAccount(true)
  //   }
  // }, [connected, B.mintAddress, userAccounts])

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
    const axiosOption: AxiosRequestConfig = {
      url: `https://api.1sol.io/1/swap/1/${chainId}`,
      method: 'post',
      data: {
        amount_in: parseInt(`${Number(A.amount) * 10 ** A.mint.decimals}`),
        source_token_mint_key: A.mintAddress,
        destination_token_mint_key: B.mintAddress,
        programs: [
          TOKEN_SWAP_PROGRAM_ID.toBase58(),
          SERUM_PROGRAM_ID.toBase58(),
          SABER_PROGRAM_ID.toBase58(),
          ORCA_PROGRAM_ID.toBase58(),
          RAYDIUM_PROGRAM_ID.toBase58()
        ],
        support_single_route_per_tx: true,
        distribution_max_len: 4
      },
      cancelToken: new CancelToken((c) => cancel.current = c)
    }

    const getSwapRoute = (routes: any) => {
      const swapRoutes: SwapRoute[][] = routes.map((routes: any) => routes.map(({
          amount_in,
          amount_out,
          exchanger_flag,
          source_token_mint,
          destination_token_mint
        }: RawDistribution) => ({
          from: tokenMap.get(source_token_mint.pubkey)?.symbol,
          to: tokenMap.get(destination_token_mint.pubkey)?.symbol,
          in: amount_in / 10 ** source_token_mint.decimals,
          out: amount_out / 10 ** destination_token_mint.decimals,
          provider: PROVIDER_MAP[exchanger_flag],
          ratio: (amount_in / 10 ** source_token_mint.decimals) / routes.reduce((acc: number, cur: any) => acc + cur.amount_in / 10 ** source_token_mint.decimals, 0) * 100
        }
      )))

      let labels: string[] = []

      swapRoutes.forEach(routes => {
        const [first] = routes

        if (first) {
          labels.push(first.from)
          labels.push(first.to)
        }
      })

      labels = [...new Set(labels)]

      return {routes: swapRoutes, labels}
    }

    
    const setMaxPrecision = (num: number, max = 10): number => {
      if (`${num}`.length > max) {
        return +num.toPrecision(max)
      }

      return num
    }

    try {
      const {
        data: {
          distributions
        }
      }: {
        data: {
          distributions: RawDistribution[]
        }
      } = await axios({
        ...axiosOption
      })

      const endTime = Date.now()

      //@ts-ignore
      window.gtag('event', 'api_request_time', {
        ...axiosOption,
        time: endTime - startTime,
      })

      let result: Distribution[] = []

      const [best, ...others] = distributions 

      if (best) {
        const id = best.routes.flat(2).reduce((acc, cur) => `${acc}-${cur.pubkey}`, best.exchanger_flag)

        result.push({
          ...best,
          input: setMaxPrecision(best.amount_in / 10 ** decimals[0]),
          output: setMaxPrecision(best.amount_out / 10 ** decimals[1]),
          providers: ['1Sol'],
          offset: 0,
          id,
          swapRoute: getSwapRoute(best.routes),
        })
      }

      result = [...result,
        ...others.sort((a: RawDistribution, b: RawDistribution) => b.amount_out - a.amount_out)
        .map(({ amount_in, amount_out, exchanger_flag, routes, ...rest }: RawDistribution) => {
            const providers = routes.flat(2).map(route => PROVIDER_MAP[route.exchanger_flag])

            return {
              ...rest,
              amount_in,
              amount_out,
              exchanger_flag,
              routes,
              input: setMaxPrecision(amount_in / 10 ** decimals[0]),
              output: setMaxPrecision(amount_out / 10 ** decimals[1]),
              providers: [...new Set(providers)],
              offset: best ? (amount_out - best.amount_out) / best.amount_out * 100 : 0,
              id: `${routes.flat(2).reduce((acc, cur) => `${acc}-${cur.pubkey}`, exchanger_flag)}`,
              swapRoute: getSwapRoute(routes),
            }
        })
      ]

      // result list
      setDistributions(result)

      if (!choice.current && result.length) {
        choice.current = result[0].id
        setActive(result[0].id)

        const [{ input, output, swapRoute: {labels} }] = result

        setPriceExchange({
          input,
          output,
          from: labels[0],
          to: labels[labels.length - 1],
        })
      }

      loading.current = false

      setTimeoutLoading(true)
      timer.current = setTimeout(() => {
        fetchDistrubition()
      }, 60 * 1000)
    } catch (e) {
      console.error(e)

      if (axios.isAxiosError(e)) {
        if (!axios.isCancel(e) && e.response) {
          loading.current = false
          errorMessage.current = e.response.data.error || e.message || 'Error Occurred'
          // setSwapRoutes([])
          // setDistributions([])
        }
      }
    }

    refreshBtnRef.current.classList.remove('refresh-btn')
    void refreshBtnRef.current.offsetHeight
    refreshBtnRef.current.classList.add('refresh-btn')

  }, [A.mint, A.mintAddress, A.amount, B.mint, B.mintAddress, CancelToken, chainId, tokenMap])

  useEffect(() => {
    setSwapRoutes([])
    setDistributions([])
    choice.current = ''
    setActive('')
    setPriceExchange(undefined)
    setHasPriceSwapped(true)

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
  }, [A.amount, A.mintAddress, B.mintAddress, fetchDistrubition, refresh])

  const swapAccounts = () => {
    const tempMint = A.mintAddress;

    A.setMint(B.mintAddress);
    B.setMint(tempMint);

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

      const distribution = distributions.find(({ id }: { id: string }) => id === active)

      if (!distribution || !distribution.routes.length) {
        return
      }

      await onesolProtocolSwap(
        connection, 
        wallet, 
        A, 
        B, 
        distribution, 
        slippage, 
        // @ts-ignore
        new PublicKey(tokenMap.get(distribution.destination_token_mint.pubkey).feeAccount)
      );

      A.setAmount('')
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
    if (cancel.current) {
      cancel.current()
    }

    if (timer.current) {
      clearTimeout(timer.current)
    }

    loading.current = false
    setTimeoutLoading(false)
    setActive(s)

    const distribution = distributions.find(({ id }: { id: string }) => id === s)

    if (distribution) {
      const { input, output, swapRoute: {labels} } = distribution

      setPriceExchange({
        input,
        output,
        from: labels[0],
        to: labels[labels.length - 1],
      })
    }
  }

  const handleRefresh = () => {
    setRefresh(refresh + 1)

    if (A.amount) {
      loading.current = true
    }

    setTimeoutLoading(false)
  }

  const handleShowRoute = (routes: SwapRoute[][]) => {
    setShowRoute(true)
    setSwapRoutes(routes)
  }

  // useEffect(() => {
  //   let label: string[] = []

  //   swapRoutes.forEach(routes => {
  //     const [[first]] = routes

  //     if (first) {
  //       label.push(first.from)
  //       label.push(first.to)
  //     }
  //   })

  //   setRouteLable([...new Set(label)])
  // }, [swapRoutes])


  // const handleCreateTokenAccount = async () => {
  //   if (B.mintAddress) {
  //     try {
  //       setPendingTx(true);

  //       await createTokenAccount(connection, wallet, new PublicKey(B.mintAddress));

  //       setHasTokenAccount(true)
  //     } catch (e) {
  //       console.error(e)

  //       notify({
  //         description:
  //           "Please try again",
  //         message: "Create account cancelled.",
  //         type: "error",
  //       });
  //     } finally {
  //       setPendingTx(false);
  //     }
  //   }
  // }

  return (
    <>
      <div className="trade-header">
        <div className="hd">Trade</div>
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
                <img style={{ display: 'block', width: '24px', margin: '-3px 0 0' }} src={timeoutIcon} alt="" /> :
                loading.current ?
                  <LoadingOutlined style={{ fontSize: '19px', marginTop: '-2px' }} /> :
                  <ReloadOutlined style={{ fontSize: '19px', marginTop: '-2px' }} />
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
              icon={<SettingOutlined style={{ fontSize: '19px' }} />}
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
          style={{ display: 'flex', justifyContent: 'space-around', margin: '-10px auto', fontSize: '20px', alignItems: 'center' }}
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
            active={active}
            handleSwitchChoice={handleSwitchChoice}
            handleShowRoute={handleShowRoute}
            error={errorMessage.current}
          />
        </Card>
      </div>
      {
        priceExchange ?
        (
          <div style={{fontSize: '12px', color: '#777'}}>
            {
              hasPriceSwapped ?
              <>
                1 <span>{priceExchange.from}</span> <span>≈</span> { getDecimalLength(priceExchange.output / priceExchange.input) > 7 ? (priceExchange.output / priceExchange.input).toFixed(6): priceExchange.output / priceExchange.input } <span>{priceExchange.to}</span>
              </>
              : 
              <>
                1 <span>{priceExchange.to}</span> <span>≈</span> { getDecimalLength(priceExchange.input / priceExchange.output) > 7 ? (priceExchange.input / priceExchange.output).toFixed(6): priceExchange.input / priceExchange.output } <span>{priceExchange.from}</span>
              </>
            }
            <SwapOutlined style={{marginLeft: '10px', fontSize: '10px'}} onClick={() => setHasPriceSwapped(!hasPriceSwapped)} />
          </div>
        )
        : null
      }
      <Button
        className="trade-button"
        type="primary"
        size="large"
        shape="round"
        block
        onClick={connected ? handleSwap : connect}
        style={{ marginTop: '10px' }}
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
        )}
        {pendingTx && <Spin indicator={antIcon} className="trade-spinner" />}
      </Button>

      {
        connected &&
          A.mintAddress === WRAPPED_SOL_MINT.toBase58() &&
          (A.balance < 0.05 || A.balance - (+A.amount) < 0.05) ?
          <div className="sol-tip">
            Caution: Your SOL balance is low
            <Tooltip title={(
              <>
                SOL is needed for Solana network fees.<br />
                A minimum balance of 0.05 SOL is recommended to avoid failed transactions.
              </>
            )}>
              <InfoCircleOutlined style={{ marginLeft: '5px' }} />
            </Tooltip>
          </div>
          : null
      }

      {/*{ 
        showSplitTip ?
          <div className="sol-tip split-tip">
            There will be several wallet popups and transactions to be approved.
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
      }*/}

      <Modal width={580} visible={showRoute} centered footer={null} onCancel={() => setShowRoute(false)}>
        {swapRoutes.length ? <TradeRoute swapRoutes={swapRoutes} /> : null}
      </Modal>

      <Modal width={590} visible={showShare} centered footer={null} onCancel={() => setShowShare(false)}>
        <div>
          <div style={{
            fontSize: '16px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <h4 style={{ fontSize: '24px', margin: '0 0 30px', color: '#B73F95' }}>Get 1 & Win 200 1SOL!</h4>
            <p style={{ margin: '0 0 8px 0' }}>
              1. Tweet using this link
            </p>
            <p>
              <Button type="primary" size="large">
                <a className="twitter-share-button"
                  href={`https://twitter.com/intent/tweet?url=${encodeURI('https://beta-app.1sol.io')}&text=${encodeURIComponent("🚀Have just successfully swapped some tokens via #1Sol the cross-chain DEX aggregator on #Solana Devnet. @1solProtocol @solana Join the test and win a 200 $1SOL daily prize here!🎁")}&via=1solProtocol&hashtags=DeFi,IGNITION,giveaway,Airdrops`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center' }}
                ><TwitterOutlined /><span style={{ marginLeft: '5px' }}>Tweet</span></a>
              </Button>
            </p>
            <p style={{ margin: '0 0 8px 0' }}>2. Talk to <a href={`https://t.me/OnesolMasterBot?start=${wallet && wallet.publicKey ? wallet.publicKey.toBase58() : ''}`} target="_blank" rel="noopener noreferrer">1Sol’s Telegram Bot</a> to confirm the airdrop</p>
            <p style={{ margin: '0' }}>3. We’ll announce the daily 200-token winner via <a href="https://discord.com/invite/juvVBKnvkj" target="_blank" rel="noopener noreferrer">Discord</a> <a href="https://t.me/onesolcommunity" target="_blank" rel="noopener noreferrer">Telegram</a> <a href="https://twitter.com/1solprotocol" target="_blank" rel="noopener noreferrer">Twitter</a></p>
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
  handleShowRoute: (routes: SwapRoute[][]) => void,
  error: string,
  active?: string,
}) => {
  const { data, loading, handleSwitchChoice, active, handleShowRoute, error } = props

  return (
    <div className="mod-results">
      {
        loading ?
          <LoadingOutlined style={{ fontSize: 24 }} spin /> :
          !data.length && error ?
            <div>{error}</div> :
            data.map(({ providers, output, offset, id, swapRoute: {routes, labels} }, i) => (
              <div
                key={id}
                className={id === active ? "mod-result active" : 'mod-result'}
                onClick={() => handleSwitchChoice(id)}
              >
                <div className="hd" style={{lineHeight: 1.2, fontSize: providers.length > 1 ? '12px' : '14px', textAlign: 'left'}}>
                  {
                    providers.map((provider: string, i: number) => {
                      return (
                        <>
                          <div>{provider}</div>
                          {
                            i < providers.length - 1 ? <div>×</div> : ''
                          }
                        </>
                      )
                    })
                  }
                </div>
                <div className="bd">
                  <div className="number">{output}{offset ? `(${offset.toFixed(2)}%)` : ''}</div>
                  {
                    <div onClick={() => handleShowRoute(routes)} className="route">
                      {labels ? labels.map((label: string, i: number) => (
                        <span key={i}>
                          {label}
                          {
                            i !== labels.length - 1 ? <RightOutlined style={{ margin: '0 2px' }} /> : null
                          }
                        </span>
                      )) : null}
                      <ExpandOutlined style={{ marginLeft: '5px' }} />
                    </div>
                  }
                </div>
                {i === 0 ? <div className="ft">Best</div> : null}
              </div>
            ))
      }
    </div>
  )
}

export const TradeRoute = (props: { swapRoutes: SwapRoute[][] }) => {
  const { A, B } = useCurrencyPairState();
  const { swapRoutes } = props

  return (
    <div className="trade-route">
      <div className="hd"><TokenIcon mintAddress={A.mintAddress} style={{ width: '30px', height: '30px' }} /></div>
      <RightOutlined style={{ margin: '0 5px' }} />
      <div className="bd">
        {swapRoutes.map((routes, i: number) => (
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
                        <span>{route.ratio.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                  {
                    j !== routes.length - 1 ?
                      <PlusOutlined style={{ margin: '5px 0' }} />
                      : null
                  }
                </>
              ))}
            </div>
            {
              i !== swapRoutes.length - 1 ?
                <RightOutlined style={{ margin: '0 10px' }} />
                : null
            }
          </>
        ))}
      </div>
      <RightOutlined style={{ margin: '0 5px' }} />
      <div className="ft"><TokenIcon mintAddress={B.mintAddress} style={{ width: '30px', height: '30px', margin: '0.11rem 0 0 0.5rem' }} /></div>
    </div>
  )
}

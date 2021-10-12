import { Button, Card, Spin, Skeleton, Popover, Modal } from "antd";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  LoadingOutlined,
  PlusOutlined ,
  RightOutlined,
  ArrowRightOutlined,
  SettingOutlined,
  ReloadOutlined,
  ExpandOutlined
} from "@ant-design/icons";
import axios from 'axios'
import classNames from "classnames";

import {
  useConnection,
  useConnectionConfig,
  useSlippageConfig,
  TokenSwapPool
} from "../../utils/connection";
import { useWallet } from "../../context/wallet";
import { CurrencyInput } from "../currencyInput";
import { QuoteCurrencyInput } from "../quoteCurrencyInput";

import {
  onesolProtocolSwap,
  PoolOperation,
} from "../../utils/pools";
import { notify } from "../../utils/notifications";
import { useCurrencyPairState } from "../../utils/currencyPair";
import { generateActionLabel, POOL_NOT_AVAILABLE, SWAP_LABEL } from "../labels";
import { getTokenName } from "../../utils/utils";
import { Settings } from "../settings";

import { TokenIcon } from "../tokenIcon";

// import { cache, useUserAccounts } from "../../utils/accounts";
import { TokenSwapAmountProps } from '../../utils/pools'

import { PROVIDER_MAP, TOKEN_SWAP_NAME, SERUM_DEX_MARKET_NAME, ONESOL_NAME } from "../../utils/constant";

import tweetBg from '../../assets/tweet-bg.png'

import "./trade.less";

const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

interface Distribution {
  output: number, 
  provider: string,
  offset?: number
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

  const [loading, setLoading] = useState(false)
  const [timeoutLoading, setTimeoutLoading] = useState(false)

  // best routes
  const [tokenSwapAmount, setTokenSwapAmount] = useState<TokenSwapAmountProps>()
  const [serumMarketAmount, setSerumMarketAmount] = useState<TokenSwapAmountProps>()

  const [soloTokenSwapAmount, setSoloTokenSwapAmount] = useState<TokenSwapAmountProps>()
  const [soloSerumMarketAmount, setSoloSerumMarketAmount] = useState<TokenSwapAmountProps>()

  const [choice, setChoice] = useState(ONESOL_NAME)
  const [pool, setPool] = useState<TokenSwapPool | undefined>()
  const [market, setMarket] = useState<TokenSwapPool | undefined>()
  // best swap routes
  const [amounts, setAmounts] = useState<Route[][]>([])
  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [showRoute, setShowRoute] = useState(false)
  const [showShare, setShowShare] = useState(false)

  const { slippage } = useSlippageConfig();
  const { tokenMap, serumMarkets, tokenSwapPools, chainId } = useConnectionConfig();

  const CancelToken = axios.CancelToken;
  const cancel = useRef(function () {})

  const timer: { current: NodeJS.Timeout | null } = useRef(null)
  const [routeLabel, setRouteLable] = useState<string[]>([])

  // const [hasTokenAccount, setHasTokenAccount] = useState(false)

  // const { userAccounts } = useUserAccounts();

  // useEffect(() => {
  //   const getTokenAccount = (mint: string) => {
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
      setLoading(false)
      setTimeoutLoading(false)

      return
    }

    // if (cancel.current) {
    //   cancel.current()
    // }

    // if (timer.current) {
    //   clearTimeout(timer.current)
    // }

    setLoading(true)
    setTimeoutLoading(false)

    const decimals = [A.mint.decimals, B.mint.decimals]
    // const providers = []

    // if (pool) {
    //   providers.push(pool.address)
    // }

    // if (market) {
    //   providers.push(market.address)
    // }

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
          amount_in: Number(A.amount) * 10 ** A.mint.decimals,
          source_token_mint_key: A.mintAddress,
          destination_token_mint_key: B.mintAddress, 
          programs: [
            "SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8",
            "DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY"
          ]
        }, 
        cancelToken: new CancelToken((c) => cancel.current = c)
      })

      let amounts: Route[][] = []
      let result: Distribution[] = []

      if (best) {
        result.push({
          output: best.amount_out / 10 ** decimals[1], 
          provider: PROVIDER_MAP[best.exchanger_flag]
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
        .map(({ amount_out, exchanger_flag }: { amount_out: number, exchanger_flag: string }) => ({
          output: amount_out / 10 ** decimals[1], 
          provider: PROVIDER_MAP[exchanger_flag],
          offset: best ? (amount_out - best.amount_out) / best.amount_out * 100 : 0
        }))
      ]

      // result list
      setDistributions(result)

      // const tokenSwap = best.routes.find(({exchanger_flag}: {exchanger_flag: string}) => exchanger_flag === 'token_swap_pool')
      // const serumMarket = best.routes.find(({exchanger_flag}: {exchanger_flag: string}) => exchanger_flag === 'serum_dex_market')

      // if (tokenSwap) {
      //   setTokenSwapAmount({
      //     input: tokenSwap.amount_in,
      //     output: tokenSwap.amount_out,
      //   })

      //   amounts.push({
      //     name: 'Token Swap(devnet)',
      //     input: tokenSwap.amount_in / 10 ** decimals[0],
      //     output: tokenSwap.amount_out / 10 ** decimals[1],
      //   })
      // }

      // if (serumMarket) {
      //   setSerumMarketAmount({
      //     input: serumMarket.amount_in,
      //     output: serumMarket.amount_out,
      //   })

      //   amounts.push({
      //     name: 'Serum Dex(devnet)',
      //     input: serumMarket.amount_in / 10 ** decimals[0],
      //     output: serumMarket.amount_out / 10 ** decimals[1]
      //   })
      // }

      const soloTokenSwap = distributions.find(({provider_type}: {provider_type: string}) => provider_type === 'token_swap_pool')
      const soloSerumMarket = distributions.find(({provider_type}: {provider_type: string}) => provider_type === 'serum_dex_market')

      if (soloTokenSwap) {
        setSoloTokenSwapAmount({
          input: soloTokenSwap.amount_in,
          output: soloTokenSwap.amount_out
        })
      }

      if (soloSerumMarket) {
        setSoloSerumMarketAmount({
          input: soloSerumMarket.amount_in,
          output: soloSerumMarket.amount_out
        })
      }

      setAmounts(amounts)


      setTimeoutLoading(true)
      timer.current = setTimeout(() => { 
        fetchDistrubition() 
      }, 10 * 1000)
    } catch(e) {
      setAmounts([])
      setDistributions([])
    }

      refreshBtnRef.current.classList.remove('refresh-btn')
      void refreshBtnRef.current.offsetHeight
      refreshBtnRef.current.classList.add('refresh-btn')

    setLoading(false)
  }, [A.mint, A.mintAddress, A.amount, B.mint, B.mintAddress, CancelToken, chainId, tokenMap])

  useEffect(() => {
    setAmounts([])
    setDistributions([])
    setChoice(ONESOL_NAME)

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

    // const pool: TokenSwapPool | undefined = tokenSwapPools.find((pool) => {
    //   const mints: string[] = [pool.mintA, pool.mintB]

    //   return mints.includes(A.mintAddress) && mints.includes(B.mintAddress)
    // })

    // if (pool) {
    //   setPool(pool)
    // }

    // const market: TokenSwapPool | undefined = serumMarkets.find((pool) => {
    //   const mints: string[] = [pool.mintA, pool.mintB]

    //   return mints.includes(A.mintAddress) && mints.includes(B.mintAddress)
    // })

    // if (market) {
    //   setMarket(market)
    // }

    // if (!Number(A.amount)) {
    //   refreshBtnRef.current.classList.remove('timeout')
    // }

    if (
      A.mintAddress && 
      B.mintAddress && 
      Number(A.amount)  
      // && (pool || market) 
      && A.mintAddress !== B.mintAddress
    ) {
      fetchDistrubition()
    } 

    return () => {
      if (timer.current) {
        clearTimeout(timer.current)
      }
    }
  }, [A.amount, A.mintAddress, B.mintAddress, fetchDistrubition, tokenSwapPools, serumMarkets])

  const swapAccounts = () => {
    const tempMint = A.mintAddress;
    // const tempAmount = A.amount;

    A.setMint(B.mintAddress);
    // A.setAmount(B.amount);
    B.setMint(tempMint);
    // B.setAmount(tempAmount);

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
    if (!A.amount || !B.mintAddress || (!pool && !market)) {
      return
    }

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

      let tokenSwap = tokenSwapAmount
      let serumMarket = serumMarketAmount

      if (choice === TOKEN_SWAP_NAME) {
        tokenSwap = soloTokenSwapAmount
        serumMarket = undefined
      }

      if (choice === SERUM_DEX_MARKET_NAME) {
        tokenSwap = undefined
        serumMarket = soloSerumMarketAmount
      }

      await onesolProtocolSwap(connection, wallet, A, B, pool, market, slippage, components, tokenSwap, serumMarket);

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

  const handleSwitchChoice = (choice: string) => {
    setChoice(choice) 
  }

  const handleRefresh = () => { 
    setLoading(true)
    setDistributions([])
    setAmounts([])
    setChoice(ONESOL_NAME)

    setTimeoutLoading(false)
    // refreshBtnRef.current.classList.remove('timeout')
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

  return (
    <>
      <div className="trade-header">
        <div className="hd">Trade(devnet)</div>
        <div className="bd">
          <Button
            ref={refreshBtnRef}
            className={classNames('refresh-btn', {loading: loading}, {timeout: timeoutLoading})}
            shape="circle"
            size="large"
            type="text"
            onClick={handleRefresh}
            disabled={loading}
          >
            <ReloadOutlined spin={loading} />
          </Button>
          <Popover
            placement="rightTop"
            title="Settings"
            content={<Settings />}
            trigger="click"
          >
            <Button
              shape="circle"
              size="large"
              type="text"
              icon={<SettingOutlined />}
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
        />
        <Button
         type="primary" 
         className="swap-button" 
         style={{display: 'flex', justifyContent: 'space-around', margin: '-10px auto'}}
         onClick={swapAccounts}
        >
          {/* &#8595; */}
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
         loading={loading && !distributions.length} 
         data={distributions} 
         active={choice} 
         handleSwitchChoice={handleSwitchChoice} 
         handleShowRoute={handleShowRoute} 
         routes={routeLabel}
        />
      </Card>
      </div>
      <Button
        className="trade-button"
        type="primary"
        size="large"
        shape="round"
        block
        onClick={connected ? handleSwap : connect}
        style={{ marginTop: '20px' }}
        disabled={
          connected &&
          (pendingTx ||
            !A.account ||
            !B.mintAddress ||
            A.account === B.account ||
            !A.sufficientBalance() ||
            // (!pool && !market) ||
            !distributions.length ||
            (!tokenSwapAmount && !serumMarketAmount))
        }
      >
        {generateActionLabel(
        // !pool && !market
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
        true
        )}
        {pendingTx && <Spin indicator={antIcon} className="trade-spinner" />}
      </Button>

      <Modal width={580} visible={showRoute} centered footer={null} onCancel={() => setShowRoute(false)}>
        {amounts.length ? <TradeRoute amounts={amounts} /> : null}
      </Modal>

      <div className="twitter-share">
        <div className="bd">
          <div className="in">
            <h4>Get 1 & Win 200 1SOL!</h4>
            <p>1. Tweet using this link:
              <Button type="primary" size="small" style={{marginLeft: '5px'}}>
                <a className="twitter-share-button"
                  href={`https://twitter.com/intent/tweet?url=${encodeURI('https://devnet.1sol.io')}&text=${encodeURIComponent("Hey guys, I’ve successfully swapped tokens via #1SOL dex aggregator on Solana Devnet. Use #1SOL to gain more token with less swap loss. @1solProtocol @solana @SBF_FTX @ProjectSerum @RaydiumProtocol")}&via=1solProtocol&hashtags=DeFi,Solana,1SOL,SOL,Ignition`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-size="large"
                  data-url="https://devnet.1sol.io"
                  data-text="Hey guys, I’ve successfully swapped tokens via #1SOL dex aggregator on Solana Devnet. Use #1SOL to gain more token with less swap loss. @1solProtocol @solana @SBF_FTX @ProjectSerum @RaydiumProtocol"
                  data-via="1solProtocol"
                  data-hashtags={['DeFi', 'Solana', '1SOL', 'SOL', 'Ignition']}
                >Tweet</a>
              </Button>
            </p>
            <p>2. Talk to <a href="https://t.me/OnesolMasterBot" target="_blank" rel="noopener noreferrer">1Sol’s Telegram Bot</a> to confirm the airdrop</p>
            <p>3. We’re announce the daily 200-token winner via <a href="https://discord.com/invite/juvVBKnvkj" target="_blank" rel="noopener noreferrer">Discord</a> <a href="https://t.me/onesolcommunity" target="_blank" rel="noopener noreferrer">Telegram</a> <a href="https://twitter.com/1solprotocol" target="_blank" rel="noopener noreferrer">Twitter</a></p>
          </div>
        </div>
      </div>

      <Modal title="Transaction Succeed!" visible={showShare} centered footer={null} onCancel={() => setShowShare(false)}>
        <div>
          <div style={{
            fontSize: '16px',
            marginBottom: '20px'
          }}>
            <p>Tweet to tell your friends 1SOL aggregator? </p>
            <p>We’ll randomly pickup 5 tweets to send 100 1SOL airdrop.</p>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-around'}}>
            <Button type="primary">
              <a className="twitter-share-button"
                href={`https://twitter.com/intent/tweet?url=${encodeURI('https://devnet.1sol.io')}&text=${encodeURIComponent("Hey guys, I’ve successfully swapped tokens via #1SOL dex aggregator on Solana Devnet. Use #1SOL to gain more token with less swap loss. @1solProtocol @solana @SBF_FTX @ProjectSerum @RaydiumProtocol")}&via=1solProtocol&hashtags=DeFi,Solana,1SOL,SOL,Ignition`}
                target="_blank"
                rel="noopener noreferrer"
                data-size="large"
                data-url="https://devnet.1sol.io"
                data-text="Hey guys, I’ve successfully swapped tokens via #1SOL dex aggregator on Solana Devnet. Use #1SOL to gain more token with less swap loss. @1solProtocol @solana @SBF_FTX @ProjectSerum @RaydiumProtocol"
                data-via="1solProtocol"
                data-hashtags={['DeFi', 'Solana', '1SOL', 'SOL', 'Ignition']}
              >Tweet</a>
            </Button>
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
  active?: string,
  routes?: string[]
}) => {
  const {data, loading, handleSwitchChoice, active, handleShowRoute, routes} = props
  // const { A, B } = useCurrencyPairState();

  return (
    <div className="mod-results">
      <Skeleton paragraph={{rows: 1, width: '100%'}} title={false}  active loading={loading}>
        {data.map(({provider, output, offset}, i) => (
          <div
            key={provider}
            className={provider === active ? "mod-result active": 'mod-result'}
            onClick={() => handleSwitchChoice(provider)}
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
        ))}
      </Skeleton>
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

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

import "./trade.less";

const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

interface Distribution {
  output: number, 
  provider: string,
  offset?: number
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

  // best routes
  const [tokenSwapAmount, setTokenSwapAmount] = useState<TokenSwapAmountProps>()
  const [serumMarketAmount, setSerumMarketAmount] = useState<TokenSwapAmountProps>()

  const [soloTokenSwapAmount, setSoloTokenSwapAmount] = useState<TokenSwapAmountProps>()
  const [soloSerumMarketAmount, setSoloSerumMarketAmount] = useState<TokenSwapAmountProps>()

  const [choice, setChoice] = useState(ONESOL_NAME)
  const [pool, setPool] = useState<TokenSwapPool | undefined>()
  const [market, setMarket] = useState<TokenSwapPool | undefined>()
  const [amounts, setAmounts] = useState<{name: string, input: number, output: number}[]>([])
  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [showRoute, setShowRoute] = useState(false)
  const [showShare, setShowShare] = useState(false)

  const { slippage } = useSlippageConfig();
  const { tokenMap, serumMarkets, tokenSwapPools } = useConnectionConfig();

  const CancelToken = axios.CancelToken;
  const cancel = useRef(function () {})

  const timer: { current: NodeJS.Timeout | null } = useRef(null)

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

      return
    }

    // if (cancel.current) {
    //   cancel.current()
    // }

    if (timer.current) {
      clearTimeout(timer.current)
    }

    setLoading(true)

    const decimals = [A.mint.decimals, B.mint.decimals]
    const providers = []

    if (pool) {
      providers.push(pool.address)
    }

    if (market) {
      providers.push(market.address)
    }

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
            provider_type: string, 
            routes: any[]
          }, 
          distributions: any
        }
      } = await axios({
        url: 'https://api.1sol.io/distribution2',
        method: 'post', 
        data: {
          amount_in: Number(A.amount) * 10 ** A.mint.decimals,
          chain_id: pool?.chainId,
          source_token_mint_key: A.mintAddress,
          destination_token_mint_key: B.mintAddress, 
          providers,
        }, 
        cancelToken: new CancelToken((c) => cancel.current = c)
      })

      const result: Distribution[] = [
        {
          output: best.amount_out / 10 ** decimals[1], 
          provider: PROVIDER_MAP[best.provider_type]
        },
        ...distributions.sort((a: any, b: any) => b.amount_out - a.amount_out ).map(({amount_out, provider_type}: {amount_out: number, provider_type: string}) => ({
          output: amount_out / 10 ** decimals[1], 
          provider: PROVIDER_MAP[provider_type],
          offset: (amount_out - best.amount_out) / best.amount_out * 100
        }))
      ]

      setDistributions(result)

      const amounts = []

      const tokenSwap = best.routes.find(({provider_type}: {provider_type: string}) => provider_type === 'token_swap_pool')
      const serumMarket = best.routes.find(({provider_type}: {provider_type: string}) => provider_type === 'serum_dex_market')

      if (tokenSwap) {
        setTokenSwapAmount({
          input: tokenSwap.amount_in,
          output: tokenSwap.amount_out,
        })

        amounts.push({
          name: 'Token Swap(devnet)',
          input: tokenSwap.amount_in / 10 ** decimals[0],
          output: tokenSwap.amount_out / 10 ** decimals[1],
        })
      }

      if (serumMarket) {
        setSerumMarketAmount({
          input: serumMarket.amount_in,
          output: serumMarket.amount_out,
        })

        amounts.push({
          name: 'Serum Dex(devnet)',
          input: serumMarket.amount_in / 10 ** decimals[0],
          output: serumMarket.amount_out / 10 ** decimals[1]
        })
      }

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
    } catch(e) {}

    setLoading(false)

    refreshBtnRef.current.classList.remove('timeout')
    void refreshBtnRef.current.offsetWidth
    refreshBtnRef.current.classList.add('timeout')

    timer.current = setTimeout(() => { 
      fetchDistrubition() 
    }, 10 * 1000)
  }, [A.mint, A.mintAddress, A.amount, B.mint, B.mintAddress, pool, market, CancelToken])

  useEffect(() => {
    setAmounts([])
    setDistributions([])
    // setTokenSwapAmount(undefined)
    // setSerumMarketAmount(undefined)
    // setPool(undefined)
    // setMarket(undefined)
    // setSoloTokenSwapAmount(undefined)
    // setSoloSerumMarketAmount(undefined)
    setChoice(ONESOL_NAME)

    if (timer.current) {
      clearTimeout(timer.current)
    }

    const pool: TokenSwapPool | undefined = tokenSwapPools.find((pool) => {
      const mints: string[] = [pool.mintA, pool.mintB]

      return mints.includes(A.mintAddress) && mints.includes(B.mintAddress)
    })

    if (pool) {
      setPool(pool)
    }

    const market: TokenSwapPool | undefined = serumMarkets.find((pool) => {
      const mints: string[] = [pool.mintA, pool.mintB]

      return mints.includes(A.mintAddress) && mints.includes(B.mintAddress)
    })

    if (market) {
      setMarket(market)
    }

    if (!Number(A.amount)) {
      refreshBtnRef.current.classList.remove('timeout')
    }

    if (
      A.mintAddress && 
      B.mintAddress && 
      Number(A.amount) && 
      (pool || market) 
      && A.mintAddress !== B.mintAddress
    ) {
      fetchDistrubition()
    } 

    return () => {
      if (timer.current) {
        clearTimeout(timer.current)
      }
    }
  }, [A.amount, A.mintAddress, B.mintAddress, pool, market, fetchDistrubition, tokenSwapPools, serumMarkets])

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
    // setTokenSwapAmount(undefined)
    // setSerumMarketAmount(undefined)
    // setPool(undefined)
    // setMarket(undefined)
    // setSoloTokenSwapAmount(undefined)
    // setSoloSerumMarketAmount(undefined)
    setChoice(ONESOL_NAME)

    refreshBtnRef.current.classList.remove('timeout')
  }
  const handleShowRoute = () => setShowRoute(true)

  return (
    <>
      <div className="trade-header">
        <div className="hd">Trade(devnet)</div>
        <div className="bd">
          <Button
            ref={refreshBtnRef}
            className={loading ? 'loading' : ''}
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
            (!pool && !market) ||
            (!tokenSwapAmount && !serumMarketAmount))
        }
      >
        {generateActionLabel(
        !pool && !market
          ? POOL_NOT_AVAILABLE(
              getTokenName(tokenMap, A.mintAddress),
              getTokenName(tokenMap, B.mintAddress)
            )
        : SWAP_LABEL,
        connected,
        tokenMap,
        A,
        B,
        true
        )}
        {pendingTx && <Spin indicator={antIcon} className="trade-spinner" />}
      </Button>
      <Modal visible={showRoute} centered footer={null} onCancel={() => setShowRoute(false)}>
        {amounts.length ? <TradeRoute amounts={amounts} /> : null}
      </Modal>
      <Modal title="Transaction Succeed!" visible={showShare} centered footer={null} onCancel={() => setShowShare(false)}>
        <div style={{
          fontSize: '16px',
          marginBottom: '20px'
        }}><p>Tweet to tell your friends 1SOL aggregator? </p>
        <p>We’ll randomly pickup 5 tweets to send 100 1SOL airdrop.</p></div>
        <div style={{display: 'flex', justifyContent: 'space-around'}}>
          <a className="twitter-share-button"
            href="https://twitter.com/intent/tweet"
            data-size="large"
            data-url="https://devnet.1sol.io"
            data-text="Hey guys, I’ve successfully swapped tokens via #1SOL dex aggregator on Solana Devnet. Use #1SOL to gain more token with less swap loss. @1solProtocol @solana @SBF_FTX @ProjectSerum @RaydiumProtocol"
            data-via="1solProtocol"
            data-hashtags={['DeFi', 'Solana', '1SOL', 'SOL', 'Ignition']}
          >
          Tweet</a>
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
  active?: string
}) => {
  const {data, loading, handleSwitchChoice, active, handleShowRoute} = props
  const { A, B } = useCurrencyPairState();

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
              {i === 0 ?
              <div onClick={handleShowRoute} className="route">
                {A.name} &#10148; {B.name}
                <ExpandOutlined style={{marginLeft: '5px'}} /> 
              </div> : null}
            </div>
            {i === 0 ? <div className="ft">Best</div> : null}
          </div>
        ))}
      </Skeleton>
    </div>
  )
}

export const TradeRoute = (props: { amounts: {name: string, input: number, output: number}[] }) => {
  const { A, B } = useCurrencyPairState();
  const {amounts} = props

  return (
    <div className="trade-route">
      <div className="hd"><TokenIcon mintAddress={A.mintAddress} style={{width: '30px', height: '30px'}} /></div>
      <RightOutlined style={{margin: '0 5px'}} />
      <div className="bd">
        {amounts.map(({name, input, output}, i) => (
          <div key={i} style={{width: '100%'}}>
            <div className="pool">
              <div className="name">{name}</div>
              <div className="amount">
                <span>{A.name} {input}</span>
                <ArrowRightOutlined />
                <span>{output} {B.name}</span>
              </div>
            </div>
            {
              i !== amounts.length - 1 ?
              <PlusOutlined style={{margin: '10px 0'}} />
              : null
            }
          </div>
        ))}  
      </div>
      <RightOutlined style={{margin: '0 5px'}} />
      <div className="ft"><TokenIcon mintAddress={B.mintAddress} style={{width: '30px', height: '30px', margin: '0.11rem 0 0 0.5rem'}} /></div>
    </div>
  )
}

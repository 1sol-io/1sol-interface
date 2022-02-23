import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Spin, Popover, Modal, Tooltip } from "antd";
import {
  LoadingOutlined,
  PlusOutlined,
  RightOutlined,
  ArrowRightOutlined,
  ExpandOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  SwapOutlined,
  DownOutlined,
  UpOutlined,
} from "@ant-design/icons";
import { Route as RawRoute, Distribution as RawDistribution, PROVIDER_MAP } from "@onesol/onesol-sdk";
import axios from 'axios'

import {
  useConnection,
  useSlippageConfig,
} from "../../utils/connection";
import { useWallet } from "../../context/wallet";
import { CurrencyInput } from "../currencyInput";
import Warning from "../warning";

import {
  sendTransactions,
} from "../../utils/pools";
import { notify } from "../../utils/notifications";
import { useCurrencyPairState } from "../../utils/currencyPair";
import { generateActionLabel, POOL_NOT_AVAILABLE, SWAP_LABEL } from "../labels";
import { 
  getSwapRoute, 
  getTokenName, 
  setMaxPrecision, 
  SwapRoute, 
  PriceExchange, 
  getDecimalLength 
} from "../../utils/utils";
import { useUserAccounts } from "../../utils/accounts";

import { Settings } from "../settings";
import { TokenIcon } from "../tokenIcon";

import { 
  WRAPPED_SOL_MINT, 
} from "../../utils/constant";

import { useOnesolProtocol } from "../../hooks/useOnesolProtocol";

import timeoutIcon from '../../assets/4.gif'
import swapIcon from '../../assets/arrow.svg'
import settingIcon from '../../assets/setting.svg'

import "./trade.less";

export interface Route {
  from: string,
  to: string,
  in: number,
  out: number,
  provider: string,
  ratio: number
}
export interface Distribution extends RawDistribution {
  id: string,
  providers: string[],
  input: number,
  output: number,
  swapRoute: {
    routes: Route[][],
    labels: string[]
  },
  offset?: number,
}

const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

export const TradeEntry = () => {
  const { wallet, connect, connected } = useWallet();
  const connection = useConnection()

  const { getRoutes, tokenMap, getTransactions } = useOnesolProtocol()

  const [pendingTx, setPendingTx] = useState(false);
  const {
    A,
    B,
    setLastTypedAccount,
  } = useCurrencyPairState();

  const refreshBtnRef: { current: any } = useRef()

  const loading: { current: boolean } = useRef(false)
  const [timeoutLoading, setTimeoutLoading] = useState(false)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState('')

  // warning modal
  const [showWarning, setShowWarning] = useState(false)

  // best swap routes
  const [swapRoutes, setSwapRoutes] = useState<SwapRoute[][]>([])
  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [showRoute, setShowRoute] = useState(false)
  const [refresh, setRefresh] = useState(0)

  const { slippage } = useSlippageConfig();

  const timer: { current: NodeJS.Timeout | null } = useRef(null)
  const choice: { current: string } = useRef('')

  const [active, setActive] = useState('')
  const [priceExchange, setPriceExchange] = useState<PriceExchange | undefined>()
  const [hasPriceSwapped, setHasPriceSwapped] = useState(true)

  const [expanded, setExpanded] = useState(false)

  const { fetchUserTokenAccounts } = useUserAccounts();

  const fetchDistrubition = useCallback(async () => {
    if (!A.mint || !B.mint) {
      setRouteLoading(false)
      setTimeoutLoading(false)

      return
    }

    setTimeoutLoading(false)
    setRouteLoading(true)

    const decimals = [A.mint.decimals, B.mint.decimals]

    try {
      const distributions: RawDistribution[] = await getRoutes({
        amount: parseInt(`${Number(A.amount) * 10 ** A.mint.decimals}`),
        sourceMintAddress: A.mintAddress,
        destinationMintAddress: B.mintAddress,
      })  

      let result: Distribution[] = []

      const [best, ...others] = distributions 

      if (best) {
        const id = best.routes.flat(2).reduce((acc, cur: RawRoute) => `${acc}-${cur.pubkey}`, best.routeType)
        const providers = best.routes.flat(2).map(route => PROVIDER_MAP[route.exchangerFlag])

        result.push({
          ...best,
          input: setMaxPrecision(best.amountIn / 10 ** decimals[0]),
          output: setMaxPrecision(best.amountOut / 10 ** decimals[1]),
          providers: [...new Set(providers)],
          offset: 0,
          id,
          swapRoute: getSwapRoute({routes: best.routes, tokenMap }),
        })
      }

      result = [...result,
        ...others.sort((a: RawDistribution, b: RawDistribution) => b.amountOut - a.amountOut)
        .map(({ amountIn, routeType, amountOut, routes, ...rest }: RawDistribution) => {
            const providers = routes.flat(2).map(route => PROVIDER_MAP[route.exchangerFlag])

            return {
              ...rest,
              routeType,
              amountIn,
              amountOut,
              routes,
              input: setMaxPrecision(amountIn / 10 ** decimals[0]),
              output: setMaxPrecision(amountOut / 10 ** decimals[1]),
              providers: [...new Set(providers)],
              offset: best ? (amountOut - best.amountOut) / best.amountOut * 100 : 0,
              id: `${routes.flat(2).reduce((acc, cur) => `${acc}-${cur.pubkey}`, routeType)}`,
              swapRoute: getSwapRoute({routes, tokenMap }),
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

      setRouteLoading(false)

      setTimeoutLoading(true)
      timer.current = setTimeout(() => {
        fetchDistrubition()
      }, 60 * 1000)
    } catch (e) {
      console.error(e)
      
      if (axios.isAxiosError(e)) {
        if (!axios.isCancel(e) && e.response) {
          setRouteLoading(false)
          setRouteError((e as any)?.error || 'Error Occurred')
        }
      }
    }
  }, [A.mint, A.mintAddress, A.amount, B.mint, B.mintAddress, tokenMap, getRoutes])

  useEffect(() => {
    setSwapRoutes([])
    setDistributions([])
    choice.current = ''
    setActive('')
    setPriceExchange(undefined)
    setHasPriceSwapped(true)
    setExpanded(false)

    setRouteError('')

    if (!A.amount) {
      setRouteLoading(false)
    }

    refreshBtnRef.current.classList.remove('refresh-btn')
    void refreshBtnRef.current.offsetHeight
    refreshBtnRef.current.classList.add('refresh-btn')
    setTimeoutLoading(false)

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

    setExpanded(false)

    if (A.amount) {
      setRouteLoading(true)
    }
  };

  const handleSwap = async () => {
    const agreed = localStorage.getItem('agreed') === 'true' &&
    Number(localStorage.getItem('agreedExpire')) > Date.now()

    if (!agreed) {
      setShowWarning(true)

      return
    }

    if (!A.amount || !B.mintAddress) {
      return
    }

    if (timer.current) {
      clearTimeout(timer.current)
    }

    setRouteLoading(false)
    setTimeoutLoading(false)

    const distribution = distributions.find(({ id }: { id: string }) => id === active)

    try {
      setPendingTx(true);

      if (!distribution || !distribution.routes.length) {
        throw new Error('No route found')
      }

      const transactions = await getTransactions({
        distribution,
        slippage
      })

      await sendTransactions({
        connection,
        wallet,
        transactions
      })

      A.setAmount('')
      fetchUserTokenAccounts()
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
    if (timer.current) {
      clearTimeout(timer.current)
    }

    setRouteLoading(false)
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
      setRouteLoading(true)
    }

    setTimeoutLoading(false)
    setExpanded(false)
  }

  const handleShowRoute = (routes: SwapRoute[][]) => {
    setShowRoute(true)
    setSwapRoutes(routes)
  }

  const handleToggle = () => {
    setExpanded(!expanded)
  }

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
            disabled={!A.amount || routeLoading || pendingTx}
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center'
            }}
          >
            {
              timeoutLoading ?
                <img style={{ display: 'block', width: '24px' }} src={timeoutIcon} alt="" /> :
                routeLoading ?
                  <LoadingOutlined style={{ fontSize: '19px', marginTop: '3px' }} /> :
                  <ReloadOutlined style={{ fontSize: '19px', marginTop: '3px' }} />
            }
          </Button>
          <Popover
            placement="rightTop"
            content={<Settings />}
            trigger="click"
          >
            <Button
              shape="circle"
              type="text"
              icon={<img src={settingIcon} style={{ width: '24px', height: '24px' }} alt="" />}
            />
          </Popover>
        </div>
      </div>
      <div className="input-card">
        <CurrencyInput
          title="From"
          onInputChange={(val: any) => {
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
          onMaxClick={() => {
            A.mintAddress === WRAPPED_SOL_MINT.toBase58() ? A.setAmount(`${A.balance - 0.05 > 0 ? A.balance - 0.05 : 0}`) : A.setAmount(`${A.balance}`)}
          }
          bordered
        />

        <div
          className="swap-button"
          onClick={swapAccounts}
        >
          <img src={swapIcon} alt="" />
        </div>

        <div
          style={{ borderRadius: 20, margin: 0, width: '100%' }}
        >
          <CurrencyInput
            title="To(estimated)"
            onInputChange={(val: any) => {
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
            bordered={false}
          />

          {
            routeLoading || distributions.length || routeError ?
            <Result
              loading={routeLoading && !distributions.length}
              data={distributions}
              active={active}
              handleSwitchChoice={handleSwitchChoice}
              handleShowRoute={handleShowRoute}
              error={routeError}
              expanded={expanded}
              handleToggle={handleToggle}
            />
            : null
          }
        </div>
      </div>
      <div style={{fontSize: '12px', color: '#617089', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px'}}>
        <div>Slippage Tolerance</div>
        <div>{slippage * 100}%</div>
      </div>
      {
        priceExchange ?
        <div style={{fontSize: '12px', color: '#617089', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px'}}>
          <div>
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
          </div>
          <SwapOutlined style={{marginLeft: '10px', fontSize: '10px'}} onClick={() => setHasPriceSwapped(!hasPriceSwapped)} />
        </div>
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

      <Modal width={580} visible={showRoute} centered footer={null} onCancel={() => setShowRoute(false)}>
        {swapRoutes.length ? <TradeRoute swapRoutes={swapRoutes} /> : null}
      </Modal>
        
      <Warning visible={showWarning} onClick={() => setShowWarning(false)} />
    </>
  );
};

export const Result = (props: {
  data: Distribution[],
  loading: boolean,
  handleSwitchChoice: (a: string) => void,
  handleToggle: () => void,
  handleShowRoute: (routes: SwapRoute[][]) => void,
  error: string,
  active?: string,
  expanded?: boolean,
}) => {
  const { data, loading, handleSwitchChoice, active, handleShowRoute, handleToggle, expanded, error } = props


  if (loading) {
    return (
      <div className="mod-results">
        <LoadingOutlined style={{ fontSize: 24 }} spin /> 
      </div>
    )
  } else if (!data.length && error) {
    return (
      <div className="mod-results">
        <div>{error}</div>
      </div>
    )
  }

  const result = !expanded ? data.slice(0, 2) : data

  return (
    <div className="mod-results">
      <div className="bd">            
        {
          result.map(({ providers, output, offset, id, swapRoute: {routes, labels} }, i) => (
            <div
              key={id}
              className={id === active ? "mod-result active" : 'mod-result'}
              onClick={() => handleSwitchChoice(id)}
            >
              <div className="hd" style={{lineHeight: 1.2, fontWeight: 'bold', fontSize: providers.length > 1 ? '12px' : '14px', textAlign: 'left'}}>
                {
                  providers.map((provider: string, i: number) => {
                    return (
                      <React.Fragment key={provider}>
                        <div>{provider}</div>
                        {
                          i < providers.length - 1 ? <div>×</div> : ''
                        }
                      </React.Fragment>
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
      <div 
        className="ft" 
        style={{marginTop: '10px', cursor: 'pointer'}}
        onClick={handleToggle}
      >
        <Button size="small" block type="text"
         icon={
          expanded ?
          <UpOutlined style={{fontSize: '10px'}} /> :
          <DownOutlined style={{fontSize: '10px'}} />
        }></Button>
      </div>
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
          <React.Fragment key={i}>
            <div className="token-route" key={i}>
              {routes.map((route, j: number) => (
                <React.Fragment key={j}>
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
                </React.Fragment>
              ))}
            </div>
            {
              i !== swapRoutes.length - 1 ?
                <RightOutlined style={{ margin: '0 10px' }} />
                : null
            }
          </React.Fragment>
        ))}
      </div>
      <RightOutlined style={{ margin: '0 5px' }} />
      <div className="ft"><TokenIcon mintAddress={B.mintAddress} style={{ width: '30px', height: '30px', margin: '0.11rem 0 0 0.5rem' }} /></div>
    </div>
  )
}

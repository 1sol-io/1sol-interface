import { Button, Card, Spin } from "antd";
import React, { useCallback, useEffect, useRef, useState } from "react";

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
  LoadingOutlined,
  PlusOutlined ,
  RightOutlined,
  ArrowRightOutlined
} from "@ant-design/icons";
import {
  onesolProtocolSwap,
  PoolOperation,
} from "../../utils/pools";
import { notify } from "../../utils/notifications";
import { useCurrencyPairState } from "../../utils/currencyPair";
import { generateActionLabel, POOL_NOT_AVAILABLE, SWAP_LABEL } from "../labels";
import "./trade.less";
import { getTokenName } from "../../utils/utils";

import { TokenIcon } from "../tokenIcon";

// import { cache, useUserAccounts } from "../../utils/accounts";
import {TokenSwapAmountProps, SerumAmountProps } from '../../utils/pools'

import { PROVIDER_MAP } from "../../utils/constant";

const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

interface Distribution {
  output: number, 
  provider: string
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

  const [loading, setLoading] = useState(false)

  const [tokenSwapAmount, setTokenSwapAmount] = useState<TokenSwapAmountProps>()
  const [serumMarketAmount, setSerumMarketAmount] = useState<SerumAmountProps>()
  const [best, setBest] = useState<TokenSwapPool | undefined>()
  const [pool, setPool] = useState<TokenSwapPool | undefined>()
  const [market, setMarket] = useState<TokenSwapPool | undefined>()
  const [amounts, setAmounts] = useState<{name: string, input: number, output: number}[]>([])
  const [distributions, setDistributions] = useState<Distribution[]>([])

  const { slippage } = useSlippageConfig();
  const { tokenMap, serumMarkets, tokenSwapPools } = useConnectionConfig();

  const CancelToken = axios.CancelToken;
  const cancel = useRef(function () {})

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
    if (!A.mint || !B.mint || !Number(A.amount)) {
      return
    }

    if (cancel.current) {
      cancel.current()
    }

    setLoading(true)
    setAmounts([])

    const decimals = [A.mint.decimals, B.mint.decimals]
    const providers = []

    if (pool) {
      providers.push(pool.address)
    }

    if (market) {
      providers.push(market.address)
    }

    axios({
      url: 'https://api.1sol.io/distribution2',
      // url: 'http://192.168.4.11:8080/distribution2',
      method: 'post', 
      data: {
        amount_in: Number(A.amount) * 10 ** A.mint.decimals,
        chain_id: pool?.chainId,
        source_token_mint_key: A.mintAddress,
        destination_token_mint_key: B.mintAddress, 
        providers,
      }, 
      cancelToken: new CancelToken((c) => cancel.current = c)
    }).then(({data: {best, distributions}}: {data: {best: {amount_out: number, provider_type: string}, distributions: any}}) => {
      const result: Distribution[] = [
        {
          output: best.amount_out / 10 ** decimals[1], 
          provider: PROVIDER_MAP[best.provider_type]
        },
        ...distributions.map(({amount_out, provider_type}: {amount_out: number, provider_type: string}) => ({
          output: amount_out / 10 ** decimals[1], 
          provider: PROVIDER_MAP[provider_type]
        }))
      ]

      setDistributions(result)

      // const amounts = []

      // const tokenSwap = distributions.find(({provider_type}: {provider_type: string}) => provider_type === 'token_swap_pool')
      // const serumMarket = distributions.find(({provider_type}: {provider_type: string}) => provider_type === 'serum_dex_market')

      // B.setAmount(`${output / 10 ** decimals[1]}`)

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
      //     limitPrice: serumMarket.limit_price, 
      //     maxCoinQty: serumMarket.max_coin_qty,
      //     maxPcQty: serumMarket.max_pc_qty
      //   })

      //   amounts.push({
      //     name: 'Serum Dex(devnet)',
      //     input: serumMarket.amount_in / 10 ** decimals[0],
      //     output: serumMarket.amount_out / 10 ** decimals[1]
      //   })
      // }

      // setAmounts(amounts)
      setLoading(false)
    }).catch(e => {
      console.error(e)
      setLoading(false)
    })  
  }, [A.mint, A.mintAddress, A.amount, B.mint, B.mintAddress, pool, market, CancelToken])

  useEffect(() => {
    if (!Number(A.amount)) {
      setLoading(false)
    }

    B.setAmount('0.00')
    setAmounts([])
    setTokenSwapAmount(undefined)
    setSerumMarketAmount(undefined)

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

    if (A.mintAddress !== B.mintAddress && (pool || market)) {
      fetchDistrubition()
    }
  }, [A, B, pool, market, fetchDistrubition, tokenSwapPools, serumMarkets])

  // const swapAccounts = () => {
  //   const tempMint = A.mintAddress;
  //   const tempAmount = A.amount;

  //   A.setMint(B.mintAddress);
  //   A.setAmount(B.amount);
  //   B.setMint(tempMint);
  //   B.setAmount(tempAmount);

  //   // @ts-ignore
  //   setPoolOperation((op: PoolOperation) => {
  //     switch (+op) {
  //       case PoolOperation.SwapGivenInput:
  //         return PoolOperation.SwapGivenProceeds;
  //       case PoolOperation.SwapGivenProceeds:
  //         return PoolOperation.SwapGivenInput;
  //       case PoolOperation.Add:
  //         return PoolOperation.SwapGivenInput;
  //     }
  //   });
  // };

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

      await onesolProtocolSwap(connection, wallet, A, B, pool, market, slippage, components, tokenSwapAmount, serumMarketAmount);
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

  return (
    <>
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
        <Button type="primary" className="swap-button" style={{cursor: 'default', display: 'flex', justifyContent: 'space-around', margin: '5px auto'}}>&#8595;</Button>
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
      {distributions.length ? <Result data={distributions} />: null}
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
      {amounts.length ? <TradeRoute amounts={amounts} /> : null}
    </>
  );
};

export const Result = (props: {data: Distribution[]}) => {
  const {data} = props

  return (
    <div className="mod-results">
      {data.map(({provider, output}, i) => (
        <div className={i === 0 ? "mod-result active": 'mod-result'}>
          <div className="hd">{provider}</div>
          <div className="bd">{output}</div>
          {i === 0 ? <div className="ft">Best</div> : null}
        </div>
      ))}
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

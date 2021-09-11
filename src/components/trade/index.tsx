import { Button, Card, Popover, Spin, Typography } from "antd";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PublicKey,
} from "@solana/web3.js";

import axios from 'axios'

import {
  useConnection,
  useConnectionConfig,
  useSlippageConfig,
  TokenSwapPool
} from "../../utils/connection";
import { useWallet } from "../../context/wallet";
import { CurrencyInput } from "../currencyInput";
import {
  LoadingOutlined,
  SwapOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  PlusOutlined ,
  RightOutlined,
  ArrowRightOutlined
} from "@ant-design/icons";
import {
  createTokenAccount,
  onesolProtocolSwap,
  PoolOperation,
  LIQUIDITY_PROVIDER_FEE,
} from "../../utils/pools";
import { notify } from "../../utils/notifications";
import { useCurrencyPairState } from "../../utils/currencyPair";
import { generateActionLabel, POOL_NOT_AVAILABLE, SWAP_LABEL } from "../labels";
import "./trade.less";
import { colorWarning, getTokenName } from "../../utils/utils";
import { AdressesPopover } from "../pool/address";
import { TokenAccount, PoolInfo } from "../../models";
import { useEnrichedPools } from "../../context/market";
import { AppBar } from "../appBar";
import { Settings } from "../settings";

import { TokenIcon } from "../tokenIcon";

import { cache, useUserAccounts } from "../../utils/accounts";
import { WRAPPED_SOL_MINT } from "../../utils/ids";
import { stringify } from "querystring";

const { Text } = Typography;

const antIcon = <LoadingOutlined style={{ fontSize: 24 }} spin />;

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

  const [tokenSwapAmount, setTokenSwapAmount] = useState<{input: number, output: number}>()
  const [serumMarketAmount, setSerumMarketAmount] = useState<{limitPrice: number, maxCoinQty: number, maxPcQty: number}>()
  const [pool, setPool] = useState<TokenSwapPool | undefined>()
  const [market, setMarket] = useState<TokenSwapPool | undefined>()
  const [amounts, setAmounts] = useState<{name: string, input: number, output: number}[]>([])

  const { slippage } = useSlippageConfig();
  const { tokenMap, serumMarkets, tokenSwapPools  } = useConnectionConfig();

  const CancelToken = axios.CancelToken;
  const cancel = useRef(function () {})

  const [hasTokenAccount, setHasTokenAccount] = useState(false)

  const { userAccounts } = useUserAccounts();

  useEffect(() => {
    const pool: TokenSwapPool | undefined = tokenSwapPools.find((pool) => {
      const mints: string[] = [pool.mintA, pool.mintB]

      return mints.includes(A.mintAddress) && mints.includes(B.mintAddress)
    })

    if (pool) {
      setPool(pool)
    }
  }, [A.mintAddress, B.mintAddress])

  useEffect(() => {
    const market: TokenSwapPool | undefined = serumMarkets.find((pool) => {
      const mints: string[] = [pool.mintA, pool.mintB]

      return mints.includes(A.mintAddress) && mints.includes(B.mintAddress)
    })

    if (market) {
      setMarket(market)
    }
  }, [A.mintAddress, B.mintAddress])

  useEffect(() => {
    const getTokenAccount = (mint: string) => {
      // TODO
      // if token is SOL, return 
      // if (mint === WRAPPED_SOL_MINT.toString()) {
      //   return
      // }

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
        return
      }

      if (cancel.current) {
        cancel.current()
      }

        const decimals = [A.mint.decimals, B.mint.decimals]

        axios({
          // url: 'https://api.1sol.io/distribution', 
          url: 'http://192.168.4.11:8080/distribution2',
          method: 'post', 
          data: {
            amount_in: Number(A.amount) * 10 ** A.mint.decimals,
            token_swap_pool: pool?.address,
            serum_dex_market: market?.address,
            chain_id: pool?.chainId,
            source_token_mint_key: A.mintAddress,
            destination_token_mint_key: B.mintAddress 
          }, 
          cancelToken: new CancelToken((c) => cancel.current = c)
      }).then(({data: {token_swap: tokenSwap, serum_dex: serumMarket}}) => {
        const amounts = []

        if (tokenSwap) {
          setTokenSwapAmount({
            input: tokenSwap.amount_in,
            output: tokenSwap.amount_out,
          })

          amounts.push({
            name: 'Test Token Swap',
            input: tokenSwap.amount_in / 10 ** decimals[0],
            output: tokenSwap.amount_out / 10 ** decimals[1],
          })
        }

        if (serumMarket) {
          setSerumMarketAmount({
            limitPrice: serumMarket.limit_price, 
            maxCoinQty: serumMarket.max_coin_qty,
            maxPcQty: serumMarket.max_pc_qty
          })

          amounts.push({
            name: 'Test Serum Swap',
            input: serumMarket.amount_in / 10 ** decimals[0],
            output: serumMarket.amount_out / 10 ** decimals[1]
          })
        }

        setAmounts(amounts)
      })  
  }, [A.amount, A.mint, A.mintAddress, B.mint, B.mintAddress, CancelToken, cancel])

  useEffect(() => {
    if (Number(A.amount)) {
      fetchDistrubition()
    }
  }, [A.amount, fetchDistrubition])

  const swapAccounts = () => {
    const tempMint = A.mintAddress;
    const tempAmount = A.amount;
    A.setMint(B.mintAddress);
    A.setAmount(B.amount);
    B.setMint(tempMint);
    B.setAmount(tempAmount);
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
    if (A.account && B.mintAddress && pool && market) {
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

        await onesolProtocolSwap(connection, wallet, B, new PublicKey(pool.address), new PublicKey(market.address), slippage, components, {tokenSwap: tokenSwapAmount,
        serumMarket: serumMarketAmount
      });
      } catch (e) {
        console.log(e)
        notify({
          description:
            "Please try again and approve transactions from your wallet",
          message: "Swap trade cancelled.",
          type: "error",
        });
      } finally {
        setPendingTx(false);
      }
    }
  };

  const handleCreateTokenAccount = async () => {
    if (A.account && B.mintAddress) {
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

        await createTokenAccount(connection, wallet, components);

        setHasTokenAccount(true)
      } catch (e) {
        console.log(e)
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
      <div className="input-card">
        {/* <AdressesPopover pool={pool} /> */}
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
        <Button type="primary" className="swap-button" onClick={swapAccounts} style={{display: 'flex', justifyContent: 'space-around', margin: '20px auto'}}>⇅</Button>
        <CurrencyInput
          title="To (Estimate)"
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
        />
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
          (pendingTx ||
            !A.account ||
            !B.mintAddress ||
            A.account === B.account ||
            !A.sufficientBalance() ||
            !pool)
        }
      >
        {generateActionLabel(
        !pool
          ? POOL_NOT_AVAILABLE(
              getTokenName(tokenMap, A.mintAddress),
              getTokenName(tokenMap, B.mintAddress)
            )
        : SWAP_LABEL,
        connected,
        tokenMap,
        A,
        B,
        true,
        hasTokenAccount
        )}
        {pendingTx && <Spin indicator={antIcon} className="add-spinner" />}
      </Button>
      {/* <TradeInfo pool={pool} pool1={pool1} /> */}
      {amounts.length  ? <TradeRoute amounts={amounts} /> : null}
    </>
  );
};

export const TradeRoute = (props: { amounts: {name: string, input: number, output: number}[] }) => {
  const { A, B } = useCurrencyPairState();
  const {amounts} = props

  return (
    <div className="trade-route">
      <div className="hd"><TokenIcon mintAddress={A.mintAddress} style={{width: '30px', height: '30px'}} /></div>
      <RightOutlined style={{margin: '0 5px'}} />
      <div className="bd">
        {amounts.map(({name, input,output}, i) => (
          <>
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
          </>
        ))}
      </div>
      <RightOutlined style={{margin: '0 5px'}} />
      <div className="ft"><TokenIcon mintAddress={B.mintAddress} style={{width: '30px', height: '30px', margin: '0.11rem 0 0 0.5rem'}} /></div>
    </div>
  )
}

export const TradeInfo = (props: { pool?: PoolInfo, pool1?: PoolInfo }) => {
  const { A, B } = useCurrencyPairState();
  const { pool, pool1 } = props;
  const { slippage } = useSlippageConfig();
  const pools = useMemo(() => (pool ? [pool] : []), [pool]);
  const enriched = useEnrichedPools(pools);

  const [amountOut, setAmountOut] = useState(0);
  const [priceImpact, setPriceImpact] = useState(0);
  const [lpFee, setLpFee] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(0);
  const [priceAccount, setPriceAccount] = useState("");
  
  useEffect(() => {
    if (!pool || enriched.length === 0) {
      return;
    }
    if (B.amount) {
      const minAmountOut = parseFloat(B?.amount) * (1 - slippage);
      setAmountOut(minAmountOut);
    }
    const liqA = enriched[0].liquidityA;
    const liqB = enriched[0].liquidityB;
    const supplyRatio = liqA / liqB;
    // We need to make sure the order matched the pool's accounts order
    const enrichedA = A.mintAddress === enriched[0].mints[0] ? A : B;
    const enrichedB = enrichedA.mintAddress === A.mintAddress ? B : A;
    const calculatedRatio =
      parseFloat(enrichedA.amount) / parseFloat(enrichedB.amount);
    // % difference between pool ratio and  calculated ratio
    setPriceImpact(Math.abs(100 - (calculatedRatio * 100) / supplyRatio));

    // 6 decimals without trailing zeros
    const lpFeeStr = (parseFloat(A.amount) * LIQUIDITY_PROVIDER_FEE).toFixed(6);
    setLpFee(parseFloat(lpFeeStr));

    if (priceAccount === B.mintAddress) {
      setExchangeRate(parseFloat(B.amount) / parseFloat(A.amount));
    } else {
      setExchangeRate(parseFloat(A.amount) / parseFloat(B.amount));
    }
  }, [A, B, slippage, pool, enriched, priceAccount]);

  const handleSwapPriceInfo = () => {
    if (priceAccount !== B.mintAddress) {
      setPriceAccount(B.mintAddress);
    } else {
      setPriceAccount(A.mintAddress);
    }
  };
  return !!parseFloat(B.amount) ? (
    <div className="pool-card" style={{ width: "initial" }}>
      <div className="pool-card-row">
        <Text className="pool-card-cell">Price</Text>
        <div className="pool-card-cell " title={exchangeRate.toString()}>
          <Button
            shape="circle"
            size="middle"
            type="text"
            icon={<SwapOutlined />}
            onClick={handleSwapPriceInfo}
          >
            {exchangeRate.toFixed(6)}&nbsp;
            {priceAccount === B.mintAddress ? B.name : A.name} per&nbsp;
            {priceAccount === B.mintAddress ? A.name : B.name}&nbsp;
          </Button>
        </div>
      </div>
      <div className="pool-card-row">
        <Text className="pool-card-cell">
          <Popover
            trigger="hover"
            content={
              <div style={{ width: 300 }}>
                You transaction will revert if there is a large, unfavorable
                price movement before it is confirmed.
              </div>
            }
          >
            Minimum Received <QuestionCircleOutlined />
          </Popover>
        </Text>
        <div className="pool-card-cell " title={amountOut.toString()}>
          {amountOut.toFixed(6)} {B.name}
        </div>
      </div>
      <div className="pool-card-row">
        <Text className="pool-card-cell">
          <Popover
            trigger="hover"
            content={
              <div style={{ width: 300 }}>
                The difference between the market price and estimated price due
                to trade size.
              </div>
            }
          >
            Price Impact <QuestionCircleOutlined />
          </Popover>
        </Text>
        <div
          className="pool-card-cell "
          title={priceImpact.toString()}
          style={{ color: colorWarning(priceImpact) }}
        >
          {priceImpact < 0.01 ? "< 0.01%" : priceImpact.toFixed(3) + "%"}
        </div>
      </div>
      <div className="pool-card-row">
        <Text className="pool-card-cell">
          <Popover
            trigger="hover"
            content={
              <div style={{ width: 300 }}>
                A portion of each trade ({LIQUIDITY_PROVIDER_FEE * 100}%) goes
                to liquidity providers as a protocol incentive.
              </div>
            }
          >
            Liquidity Provider Fee <QuestionCircleOutlined />
          </Popover>
        </Text>
        <div className="pool-card-cell " title={lpFee.toString()}>
          {lpFee} {A.name}
        </div>
      </div>
    </div>
  ) : null;
};

export const TradeView = () => {
  return (
    <>
      <AppBar
        right={
          <Popover
            placement="topRight"
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
        }
      />
      <Card
        className="exchange-card"
        headStyle={{ padding: 0 }}
        bodyStyle={{ position: "relative" }}
      >
        <TradeEntry />
      </Card>
    </>
  );
};

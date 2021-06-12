import { Button, Card, Popover, Spin, Typography } from "antd";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from 'axios'

import {
  useConnection,
  useConnectionConfig,
  useSlippageConfig,
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
  onesolProtocolSwap,
  usePoolForBasket,
  usePool1ForBasket,
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

  const [amounts, setAmounts] = useState([])

  const pool = usePoolForBasket([A?.mintAddress, B?.mintAddress]);
  const pool1 = usePool1ForBasket([A?.mintAddress, B?.mintAddress]);

  const { slippage } = useSlippageConfig();
  const { tokenMap } = useConnectionConfig();

  const CancelToken = axios.CancelToken;
  const cancel = useRef(function () {})

  const fetchDistrubition = useCallback(async () => {
      if (!A.mint || !B.mint) {
        return
      }

      if (cancel.current) {
        cancel.current()
      }

      setAmounts([])

        const swapKeys = []

        if (pool) {
          swapKeys.push(pool.pubkeys.account.toString())
        }

        if (pool1) {
          swapKeys.push(pool1.pubkeys.account.toString())
        }

        const decimals = [A.mint.decimals, B.mint.decimals]

        axios({
          url: 'https://api.1sol.io/distribution', 
          method: 'post', 
          data: {
            amount: Number(A.amount) * 10 ** A.mint.decimals,
            rpc: "https://api.devnet.solana.com",
            tokenSwap: swapKeys,
            sourceToken: A.mintAddress,
            destinationToken: B.mintAddress 
          }, 
          cancelToken: new CancelToken((c) => cancel.current = c)
      }).then(({data: {amounts}}) => {
        setAmounts(amounts.map(({input, output}: {input: any, output: any}) => ({input: input  / 10 ** decimals[0
        ], output: output  / 10 ** decimals[1]})))
      })  
  }, [A.amount, A.mint, A.mintAddress, B.mint, B.mintAddress, CancelToken, cancel, pool, pool1])

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

        // await swap(connection, wallet, components, slippage, pool);
        await onesolProtocolSwap(connection, wallet, B, pool, pool1, slippage, components);
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

  return (
    <>
      <div className="input-card">
        <AdressesPopover pool={pool} />
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
        onClick={connected ? handleSwap : connect}
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
        true
        )}
        {pendingTx && <Spin indicator={antIcon} className="add-spinner" />}
      </Button>
      <TradeInfo pool={pool} pool1={pool1} />
      {amounts.length  ? <TradeRoute amounts={amounts} /> : null}
    </>
  );
};

export const TradeRoute = (props: { amounts: {input: any, output: any}[] }) => {
  const { A, B } = useCurrencyPairState();
  const {amounts} = props

  return (
    <div className="trade-route">
      <div className="hd"><TokenIcon mintAddress={A.mintAddress} style={{width: '30px', height: '30px'}} /></div>
      <RightOutlined style={{margin: '0 5px'}} />
      <div className="bd">
        <div className="pool">
          <div className="name">Test Swap1</div>
          <div className="amount">
            <span>{A.name} {amounts[0].input}</span>
            <ArrowRightOutlined />
            <span>{amounts[0].output} {B.name}</span>
          </div>
        </div>
        <PlusOutlined style={{margin: '10px 0'}} />
        <div className="pool">
          <div className="name">Test Swap2</div>
          <div className="amount">
            <span>{A.name} {amounts[1].input}</span>
            <ArrowRightOutlined />
            <span>{amounts[1].output} {B.name}</span>
          </div>
        </div>
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

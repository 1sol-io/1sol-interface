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
  hasAccount,
} from "../../utils/pools";
import { notify } from "../../utils/notifications";
import { useCurrencyPairState } from "../../utils/currencyPair";
import { generateActionLabel, POOL_NOT_AVAILABLE, SWAP_LABEL } from "../labels";
import "./trade.less";
import { colorWarning, getTokenName } from "../../utils/utils";
import { AdressesPopover } from "../pool/address";
import { TokenAccount, PoolInfo } from "../../models";
import { AppBar } from "../appBar";
import { Settings } from "../settings";

import { TokenIcon } from "../tokenIcon";

import { cache, useUserAccounts } from "../../utils/accounts";

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

  const [loading, setLoading] = useState(false)

  const [tokenSwapAmount, setTokenSwapAmount] = useState<{input: number, output: number}>()
  const [serumMarketAmount, setSerumMarketAmount] = useState<{limitPrice: number, maxCoinQty: number, maxPcQty: number}>()
  const [pool, setPool] = useState<TokenSwapPool | undefined>()
  const [market, setMarket] = useState<TokenSwapPool | undefined>()
  const [amounts, setAmounts] = useState<{name: string, input: number, output: number}[]>([])

  const { slippage } = useSlippageConfig();
  const { tokenMap, serumMarkets, tokenSwapPools } = useConnectionConfig();

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
      if (!A.mint || !B.mint || !Number(A.amount)) {
        return
      }

      setLoading(true)

      if (cancel.current) {
        cancel.current()
      }

      setAmounts([])

      const decimals = [A.mint.decimals, B.mint.decimals]

      axios({
        url: 'https://api.1sol.io/distribution2',
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
      }).then(({data: {amount_out: output, token_swap: tokenSwap, serum_dex: serumMarket}}) => {
        const amounts = []

        B.setAmount(`${output / 10 ** decimals[1]}`)

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
        setLoading(false)
      }).catch(e => {
        console.error(e)
        setLoading(false)
      })  
  }, [A.amount, A.mint, A.mintAddress, B.mint, B.mintAddress, CancelToken, cancel])

  useEffect(() => {
    B.setAmount('0.00')
    setAmounts([])

    if (cancel.current) {
      cancel.current()
    }

    fetchDistrubition()
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
    if (A.account && B.mintAddress && (pool || market)) {
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

        // await onesolProtocolSwap(connection, wallet, B, pool ? new PublicKey(pool.address): '', market ? new PublicKey(market.address): '', slippage, components, {tokenSwap: tokenSwapAmount | null,
        //   serumMarket: serumMarketAmount | null
        // });
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
        console.error(e)
        notify({
          description: "Please try again",
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
        <Button type="primary" className={loading ? 'swap-button loading': "swap-button"} onClick={swapAccounts} style={{display: 'flex', justifyContent: 'space-around', margin: '20px auto'}}>⇅</Button>
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
          disabled
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
        true,
        hasTokenAccount
        )}
        {pendingTx && <Spin indicator={antIcon} className="trade-spinner" />}
      </Button>
      {amounts.length ? <TradeRoute amounts={amounts} /> : null}
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
        {amounts.map(({name, input, output}, i) => (
          <div key={i}>
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

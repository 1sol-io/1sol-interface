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

  const [pool, setPool] = useState('')

  const [amounts, setAmounts] = useState([])

  const { slippage } = useSlippageConfig();
  const { tokenMap } = useConnectionConfig();

  const CancelToken = axios.CancelToken;
  const cancel = useRef(function () {})

  const [hasTokenAccount, setHasTokenAccount] = useState(false)

  const { userAccounts } = useUserAccounts();

  useEffect(() => {
    const getTokenAccount = (mint: string) => {
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

      setAmounts([])

      const decimals = [A.mint.decimals, B.mint.decimals]

      axios({
        url: 'https://api.1sol.io/distribution', 
        method: 'post', 
        data: {
          amount: Number(A.amount) * 10 ** A.mint.decimals,
          rpc: "https://api.devnet.solana.com",
          tokenSwap: [],
          sourceToken: A.mintAddress,
          destinationToken: B.mintAddress 
        }, 
        cancelToken: new CancelToken((c) => cancel.current = c)
      }).then(({data: {amounts}}) => {
        setAmounts(amounts.map(({input, output}: {input: any, output: any}) => ({input: input  / 10 ** decimals[0
        ], output: output  / 10 ** decimals[1]})))
      })  
  }, [A.amount, A.mint, A.mintAddress, B.mint, B.mintAddress, CancelToken, cancel])

  // useEffect(() => {
  //   if (Number(A.amount)) {
  //     fetchDistrubition()
  //   }
  // }, [A.amount, fetchDistrubition])

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
        // await onesolProtocolSwap(connection, wallet, B, pool, pool1, slippage, components);
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
          <div className="name">Test Raydium Swap</div>
          <div className="amount">
            <span>{A.name} {amounts[0].input}</span>
            <ArrowRightOutlined />
            <span>{amounts[0].output} {B.name}</span>
          </div>
        </div>
        <PlusOutlined style={{margin: '10px 0'}} />
        <div className="pool">
          <div className="name">Test DexLab Swap</div>
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

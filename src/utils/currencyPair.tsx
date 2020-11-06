import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  calculateDependentAmount,
  usePoolForBasket,
  PoolOperation,
} from "./pools";
import { useMint, useAccountByMint } from "./accounts";
import { MintInfo } from "@solana/spl-token";
import { ENV, useConnection, useConnectionConfig } from "./connection";
import { TokenAccount } from "../models";
import { convert } from "./utils";
import PopularTokens from "../utils/token-list.json";
import { useHistory, useLocation } from "react-router-dom";
import bs58 from 'bs58';

export interface CurrencyContextState {
  mintAddress: string;
  account?: TokenAccount;
  mint?: MintInfo;
  amount: string;
  setAmount: (val: string) => void;
  setMint: (mintAddress: string) => void;
  convertAmount: () => number;
  sufficientBalance: () => boolean;
}

export interface CurrencyPairContextState {
  A: CurrencyContextState;
  B: CurrencyContextState;
  setLastTypedAccount: (mintAddress: string) => void;
  setPoolOperation: (swapDirection: PoolOperation) => void;
}

const CurrencyPairContext = React.createContext<CurrencyPairContextState | null>(
  null
);

export function CurrencyPairProvider({ children = null as any }) {
  const connection = useConnection();
  const { env } = useConnectionConfig();
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const history = useHistory();
  const location = useLocation();
  const [mintAddressA, setMintAddressA] = useState("");
  const [mintAddressB, setMintAddressB] = useState("");
  const [lastTypedAccount, setLastTypedAccount] = useState("");
  const accountA = useAccountByMint(mintAddressA);
  const accountB = useAccountByMint(mintAddressB);
  const mintA = useMint(mintAddressA);
  const mintB = useMint(mintAddressB);
  const pool = usePoolForBasket([mintAddressA, mintAddressB]);
  const [poolOperation, setPoolOperation] = useState<PoolOperation>(
    PoolOperation.Add
  );

  // updates browser history on token changes
  useEffect(() => {
    // set history
    const base =
      PopularTokens[env].find((t) => t.mintAddress === mintAddressA)
        ?.tokenSymbol || mintAddressA;
    const quote =
      PopularTokens[env].find((t) => t.mintAddress === mintAddressB)
        ?.tokenSymbol || mintAddressB;

    if (base && quote && location.pathname.indexOf("info") < 0) {
      history.push({
        search: `?pair=${base}-${quote}`,
      });
    } else {
      if (mintAddressA && mintAddressB) {
        history.push({
          search: ``,
        });
      } else {
        return;
      }
    }
  }, [mintAddressA, mintAddressB]);

  // Updates tokens on location change
  useEffect(() => {
    if (!location.search && mintAddressA && mintAddressB) {
      return;
    }

    let { defaultBase, defaultQuote } = getDefaultTokens(env, location.search);
    if (!defaultBase || !defaultQuote) {
      return;
    }
    setMintAddressA(
      PopularTokens[env].find((t) => t.tokenSymbol === defaultBase)
        ?.mintAddress ||
      defaultBase ||
      ""
    );
    setMintAddressB(
      PopularTokens[env].find((t) => t.tokenSymbol === defaultQuote)
        ?.mintAddress ||
      defaultQuote ||
      ""
    );
  }, [location, location.search, setMintAddressA, setMintAddressB]);

  const calculateDependent = useCallback(async () => {
    if (pool && mintAddressA && mintAddressB) {
      let setDependent;
      let amount;
      let independent;
      if (lastTypedAccount === mintAddressA) {
        independent = mintAddressA;
        setDependent = setAmountB;
        amount = parseFloat(amountA);
      } else {
        independent = mintAddressB;
        setDependent = setAmountA;
        amount = parseFloat(amountB);
      }

      const result = await calculateDependentAmount(
        connection,
        independent,
        amount,
        pool,
        poolOperation
      );
      if (typeof result === "string") {
        setDependent(result);
      } else if (result !== undefined && Number.isFinite(result)) {
        setDependent(result.toFixed(6));
      } else {
        setDependent("");
      }
    }
  }, [
    pool,
    mintAddressA,
    mintAddressB,
    setAmountA,
    setAmountB,
    amountA,
    amountB,
    connection,
    lastTypedAccount,
  ]);

  useEffect(() => {
    calculateDependent();
  }, [amountB, amountA, lastTypedAccount, calculateDependent]);

  const convertAmount = (amount: string, mint?: MintInfo) => {
    return parseFloat(amount) * Math.pow(10, mint?.decimals || 0);
  };

  return (
    <CurrencyPairContext.Provider
      value={{
        A: {
          mintAddress: mintAddressA,
          account: accountA,
          mint: mintA,
          amount: amountA,
          setAmount: setAmountA,
          setMint: setMintAddressA,
          convertAmount: () => convertAmount(amountA, mintA),
          sufficientBalance: () =>
            accountA !== undefined &&
            convert(accountA, mintA) >= parseFloat(amountA),
        },
        B: {
          mintAddress: mintAddressB,
          account: accountB,
          mint: mintB,
          amount: amountB,
          setAmount: setAmountB,
          setMint: setMintAddressB,
          convertAmount: () => convertAmount(amountB, mintB),
          sufficientBalance: () =>
            accountB !== undefined &&
            convert(accountB, mintB) >= parseFloat(amountB),
        },
        setLastTypedAccount,
        setPoolOperation,
      }}
    >
      {children}
    </CurrencyPairContext.Provider>
  );
}

export const useCurrencyPairState = () => {
  const context = useContext(CurrencyPairContext);
  return context as CurrencyPairContextState;
};

const isValidAddress = (address: string) => {
  const decoded = bs58.decode(address);
  return decoded.length === 32;
};

function getDefaultTokens(env: ENV, search: string) {
  let defaultBase = "SOL";
  let defaultQuote = "USDC";

  const nameToToken = (PopularTokens[env] as any[]).reduce((map, item) => {
    map.set(item.tokenSymbol, item);
    return map;
  }, new Map<string, any>());

  if (search) {
    const urlParams = new URLSearchParams(search);
    const pair = urlParams.get("pair");
    if (pair) {
      let items = pair.split("-");

      if (items.length > 1) {
        if (nameToToken.has(items[0]) || isValidAddress(items[0])) {
          defaultBase = items[0];
        }

        if (nameToToken.has(items[1]) || isValidAddress(items[1])) {
          defaultQuote = items[1];
        }
      }
    }
  }
  return { defaultBase, defaultQuote };
}

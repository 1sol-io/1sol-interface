import React, {
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useHistory, useLocation, useParams } from "react-router-dom";
import { MintInfo } from "@solana/spl-token";
import bs58 from "bs58";
import { TokenInfo } from "@solana/spl-token-registry";
import { WRAPPED_SOL_MINT } from "@project-serum/serum/lib/token-instructions";

import {
  PoolOperation,
} from "./pools";
import { cache, useAccountByMint } from "./accounts";
import { useConnection, useConnectionConfig } from "./connection";
import {
  CurveType,
  PoolConfig,
  TokenAccount,
  DEFAULT_DENOMINATOR,
} from "../models";
import { convert, getTokenIcon, getTokenName } from "./utils";

export interface CurrencyContextState {
  mintAddress: string;
  account?: TokenAccount;
  mint?: MintInfo;
  amount: string;
  name: string;
  icon?: string;
  balance: number,
  setAmount: (val: string) => void;
  setMint: (mintAddress: string) => void;
  convertAmount: () => number;
  sufficientBalance: () => boolean;
}

export interface CurrencyPairContextState {
  A: CurrencyContextState;
  B: CurrencyContextState;
  lastTypedAccount: string;
  setLastTypedAccount: (mintAddress: string) => void;
  setPoolOperation: (swapDirection: PoolOperation) => void;
  options: PoolConfig;
  setOptions: (config: PoolConfig) => void;
}

const CurrencyPairContext = React.createContext<CurrencyPairContextState | null>(
  null
);

const convertAmount = (amount: string, mint?: MintInfo) => {
  return parseFloat(amount) * Math.pow(10, mint?.decimals || 0);
};

export const useCurrencyLeg = (config: PoolConfig, defaultMint?: string) => {
  const { tokenMap } = useConnectionConfig();
  const [amount, setAmount] = useState("");
  const [mintAddress, setMintAddress] = useState(defaultMint || "");
  const account = useAccountByMint(mintAddress);
  const mint = cache.getMint(mintAddress);

  return useMemo(
    () => ({
      mintAddress: mintAddress,
      account: account,
      mint: mint,
      amount: amount,
      name: getTokenName(tokenMap, mintAddress),
      icon: getTokenIcon(tokenMap, mintAddress),
      setAmount: setAmount,
      setMint: setMintAddress,
      convertAmount: () => convertAmount(amount, mint),
      balance: convert(account, mint),
      sufficientBalance: () =>
        account !== undefined &&
        (
          // at least 0.05 SOL is needed for paying gas
          mintAddress === WRAPPED_SOL_MINT.toBase58() ?
          convert(account, mint) - 0.05 >= parseFloat(amount): 
          convert(account, mint) >= parseFloat(amount) ||
          config.curveType === CurveType.ConstantProductWithOffset
        ),
    }),
    [
      mintAddress,
      account,
      mint,
      amount,
      tokenMap,
      setAmount,
      setMintAddress,
      config,
    ]
  );
};

export function CurrencyPairProvider({ children = null as any }) {
  const { tokens } = useConnectionConfig();

  const history = useHistory();
  const location = useLocation();

  const [lastTypedAccount, setLastTypedAccount] = useState("");
  const [poolOperation, setPoolOperation] = useState<PoolOperation>(
    PoolOperation.Add
  );

  const [options, setOptions] = useState<PoolConfig>({
    curveType: CurveType.ConstantProduct,
    fees: {
      tradeFeeNumerator: 25,
      tradeFeeDenominator: DEFAULT_DENOMINATOR,
      ownerTradeFeeNumerator: 5,
      ownerTradeFeeDenominator: DEFAULT_DENOMINATOR,
      ownerWithdrawFeeNumerator: 0,
      ownerWithdrawFeeDenominator: 0,
      hostFeeNumerator: 20,
      hostFeeDenominator: 100,
    },
  });

  const base = useCurrencyLeg(options);
  const mintAddressA = base.mintAddress;
  const setMintAddressA = base.setMint;

  const quote = useCurrencyLeg(options);
  const mintAddressB = quote.mintAddress;
  const setMintAddressB = quote.setMint;

  useEffect(() => {
    const base =
      tokens.find((t) => t.address === mintAddressA)?.symbol || mintAddressA;
    const quote =
      tokens.find((t) => t.address === mintAddressB)?.symbol || mintAddressB;

    if (location.pathname.includes('/trade/')) {
      document.title = `Trade | 1Sol (${base}/${quote})`;
    }
  }, [mintAddressA, mintAddressB, tokens, location]);

  // updates browser history on token changes
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const from = urlParams.get("from");

    // if from other page, only location change handler below can only called
    // or there will be infinite loop
    if (from) {
      return
    }

    if (location.pathname.includes('/trade/')) {
      // set history
      const base =
        tokens.find((t) => t.address === mintAddressA)?.symbol || mintAddressA;
      const quote =
        tokens.find((t) => t.address === mintAddressB)?.symbol || mintAddressB;

      if (base && quote) {
        // will trigger location change handler below
        history.push(`/trade/${base}-${quote}`);
      }
    } 
  }, [mintAddressA, mintAddressB, tokens, history, location.pathname, location.search]);

  // Updates tokens on location change
  useEffect(() => {
    if (!location.pathname.includes('/trade/') || (mintAddressA && mintAddressB)) {
      return
    }

    const pair = location.pathname.replace('/trade/', '')

    const { defaultBase, defaultQuote } = getDefaultTokens(
      tokens,
      pair
    );

    if (!defaultBase || !defaultQuote) {
      return;
    }

    setMintAddressA(
      tokens.find((t) => t.symbol === defaultBase)?.address ||
        (isValidAddress(defaultBase) ? defaultBase : "") ||
        ""
    );
    setMintAddressB(
      tokens.find((t) => t.symbol === defaultQuote)?.address ||
        (isValidAddress(defaultQuote) ? defaultQuote : "") ||
        ""
    );

    // remove query parameter so token change handler can be vaild
    history.push({
      search: ``,
    });

    // mintAddressA and mintAddressB are not included here to prevent infinite loop
    // eslint-disable-next-line
  }, [location.pathname, setMintAddressA, setMintAddressB, tokens]);

  return (
    <CurrencyPairContext.Provider
      value={{
        A: base,
        B: quote,
        lastTypedAccount,
        setLastTypedAccount,
        setPoolOperation,
        options,
        setOptions,
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
  try {
    const decoded = bs58.decode(address);
    return decoded.length === 32;
  } catch {
    return false;
  }
};

function getDefaultTokens(tokens: TokenInfo[], pair: string) {
  let defaultBase = "USDC";
  let defaultQuote = "1SOL";

  const nameToToken = tokens.reduce((map, item) => {
    map.set(item.symbol, item);
    return map;
  }, new Map<string, any>());

  if (pair) {
    const [from, to] = pair.split('-');

    if (from && (nameToToken.has(from) || isValidAddress(from))) {
        defaultBase = from;
    } else {
      defaultBase = to === "USDC" ? "SOL" : "USDC";; 
    }

    if (to && (nameToToken.has(to) || isValidAddress(to))) {
      defaultQuote = to;
    } else {
      defaultQuote = from === "USDC" ? "SOL": "USDC";
    }
  }

  return {
    defaultBase,
    defaultQuote,
  };
}

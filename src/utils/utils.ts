import BN from 'bn.js';
import { useCallback, useState } from "react";
import { MintInfo, NATIVE_MINT, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import axios from 'axios';
import { Route as RawRoute, PROVIDER_MAP } from '@onesol/onesol-sdk';
import {
  struct, u8,
} from '@solana/buffer-layout';

import { TokenInfo } from "../utils/token-registry";
import { PoolInfo, TokenAccount } from "./../models";
import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { TokenAccountLayout } from '@onesol/onesol-sdk/lib/onesolprotocol';
import bs58 from 'bs58';

export type KnownTokenMap = Map<string, TokenInfo>;

export function useLocalStorageState(key: string, defaultState?: string | object) {
  const [state, setState] = useState(() => {
    // NOTE: Not sure if this is ok
    const storedState = localStorage.getItem(key);
    if (storedState) {
      return JSON.parse(storedState);
    }
    return defaultState;
  });

  const setLocalStorageState = useCallback(
    (newState) => {
      const changed = state !== newState;
      if (!changed) {
        return;
      }
      setState(newState);
      if (newState === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(newState));
      }
    },
    [state, key]
  );

  return [state, setLocalStorageState];
}

// shorten the checksummed version of the input address to have 4 characters at start and end
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function getTokenName(
  map: KnownTokenMap,
  mintAddress: string,
  shorten = true,
  length = 5
): string {
  const knownSymbol = map.get(mintAddress)?.symbol;

  if (knownSymbol) {
    return knownSymbol;
  }

  return shorten ? `${mintAddress.substring(0, length)}...` : mintAddress;
}

export function getTokenIcon(
  map: KnownTokenMap,
  mintAddress: string
): string | undefined {
  return map.get(mintAddress)?.logoURI;
}

export function getPoolName(
  map: KnownTokenMap,
  pool: PoolInfo,
  shorten = true
) {
  const sorted = pool.pubkeys.holdingMints.map((a) => a.toBase58()).sort();
  return sorted.map((item) => getTokenName(map, item, shorten)).join("/");
}

export function isKnownMint(map: KnownTokenMap, mintAddress: string) {
  return !!map.get(mintAddress);
}

export const STABLE_COINS = new Set(["USDC", "wUSDC", "USDT", "wUSDT", "WUSDT"]);

export function chunks<T>(array: T[], size: number): T[][] {
  return Array.apply<number, T[], T[][]>(
    0,
    new Array(Math.ceil(array.length / size))
  ).map((_, index) => array.slice(index * size, (index + 1) * size));
}

export function convert(
  account?: TokenAccount | number,
  mint?: MintInfo | number,
  rate: number = 1.0
): number {
  if (!account) {
    return 0;
  }

  const amount =
    typeof account === "number" ? new BN(account) : account.info.amount;

  const decimals =
    typeof mint === "number" ? new BN(mint) : new BN(mint?.decimals || 0);

  const precision = new BN(10).pow(decimals);

  // avoid overflowing 53 bit numbers on calling toNumber()
  let div = amount.div(precision).toNumber();
  let rem = amount.mod(precision).toNumber() / precision.toNumber();
  let result = (div + rem) * rate;

  return result;
}

var SI_SYMBOL = ["", "k", "M", "G", "T", "P", "E"];

export const abbreviateNumber = (number: number, precision: number) => {
  let tier = (Math.log10(number) / 3) | 0;
  let scaled = number;
  let suffix = SI_SYMBOL[tier];
  if (tier !== 0) {
    let scale = Math.pow(10, tier * 3);
    scaled = number / scale;
  }

  return scaled.toFixed(precision) + suffix;
};

export const format = (val: number, precision: number, abbr: boolean) =>
  abbr ? abbreviateNumber(val, precision) : val.toFixed(precision);

export function formatTokenAmount(
  account?: TokenAccount,
  mint?: MintInfo,
  rate: number = 1.0,
  prefix = "",
  suffix = "",
  precision = 6,
  abbr = false
): string {
  if (!account) {
    return "";
  }

  return `${[prefix]}${format(
    convert(account, mint, rate),
    precision,
    abbr
  )}${suffix}`;
}

export const formatUSD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export const formatNumber = new Intl.NumberFormat("en-US", {
  style: "decimal",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatPct = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatPriceNumber = new Intl.NumberFormat("en-US", {
  style: "decimal",
  minimumFractionDigits: 2,
  maximumFractionDigits: 8,
});

export const formatShortDate = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
});

export const formatShortDateTime = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  hour: 'numeric', minute: 'numeric',
  // second: 'numeric',
})

// returns a Color from a 4 color array, green to red, depending on the index
// of the closer (up) checkpoint number from the value
export const colorWarning = (value = 0, valueCheckpoints = [1, 3, 5, 100]) => {
  const defaultIndex = 1;
  const colorCodes = ["#27ae60", "inherit", "#f3841e", "#ff3945"];
  if (value > valueCheckpoints[valueCheckpoints.length - 1]) {
    return colorCodes[defaultIndex];
  }
  const closest = [...valueCheckpoints].sort((a, b) => {
    const first = a - value < 0 ? Number.POSITIVE_INFINITY : a - value;
    const second = b - value < 0 ? Number.POSITIVE_INFINITY : b - value;
    if (first < second) {
      return -1;
    } else if (first > second) {
      return 1;
    }
    return 0;
  })[0];
  const index = valueCheckpoints.indexOf(closest);
  if (index !== -1) {
    return colorCodes[index];
  }
  return colorCodes[defaultIndex];
};

export const queryJsonFiles = async (files: string[]) => {
  const responses = (await Promise.all(
    files.map(async (repo) => {
      try {
        const response = await fetch(repo);
        const json = (await response.json());

        return json;
      } catch {
        return []
      }
    })
  ))

  return responses
    .map((tokenlist) => tokenlist.tokens)
    .reduce((acc, arr) => (acc as TokenInfo[]).concat(arr), []);
};

export const queryJSONFile = async (file: string) => {
  try {
    const response = await fetch(file);
    const json = (await response.json());

    return json;
  } catch {
    return []
  }
}

export function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);

  return Math.floor(Math.random() * (max - min)) + min; //不含最大值，含最小值
}

export const getClientId = () => {
  const key = '1sol-serum-client-id'
  let clientId = localStorage.getItem(key)

  if (!clientId) {
    clientId = `${getRandomInt(1000, 1000000)}`

    localStorage.setItem(key, clientId)
  }

  return Number(clientId)
}

export const getFastestEndpoint = async (endpoints: string[]) => {
  if (endpoints.length === 1 || !Promise.any) {
    return endpoints[0]
  }

  return await Promise.any(endpoints.map((endpoint) => axios.post(endpoint, { jsonrpc: '2.0', id: 1, method: 'getEpochInfo' }).then(() => endpoint)))
}

export const getDecimalLength = (num: number) => {
  let length = 0

  if (`${num}`.includes('.')) {
    length = `${num}`.split('.')[1].length
  }

  return length
}

export const getSwapRoute = ({ routes, tokenMap }: { routes: RawRoute[][], tokenMap: any }) => {
  const swapRoutes: SwapRoute[][] = routes.map((routes: any) => routes.map(({
    amountIn,
    amountOut,
    exchangerFlag,
    sourceTokenMint,
    destinationTokenMint
  }: RawRoute) => ({
    from: tokenMap.get(sourceTokenMint.address)?.symbol,
    to: tokenMap.get(destinationTokenMint.address)?.symbol,
    in: amountIn / 10 ** sourceTokenMint.decimals,
    out: amountOut / 10 ** destinationTokenMint.decimals,
    provider: PROVIDER_MAP[exchangerFlag],
    ratio: (amountIn / 10 ** sourceTokenMint.decimals) / routes.reduce((acc: number, cur: any) => acc + cur.amountIn / 10 ** sourceTokenMint.decimals, 0) * 100
  }
  )))

  let labels: string[] = []

  const [first] = swapRoutes[0]

  labels.push(first.from)
  labels.push(first.to)

  if (swapRoutes.length === 2) {
    const [first] = swapRoutes[1]

    labels.push(first.to)
  }

  return { routes: swapRoutes, labels }
}

export const setMaxPrecision = (num: number, max = 10): number => {
  if (`${num}`.length > max) {
    return +num.toPrecision(max)
  }

  return num
}
export interface SwapRoute {
  from: string,
  to: string,
  in: number,
  out: number,
  provider: string,
  ratio: number
}

export interface PriceExchange {
  from: string,
  to: string,
  input: number,
  output: number
}

export const getWrappedSolAccounts = async ({
  connection,
  wallet
}: {
  connection: Connection,
  wallet: PublicKey
}) => {
  const accounts = await connection.getProgramAccounts(
    TOKEN_PROGRAM_ID,
    {
      filters: [
        {
          dataSize: TokenAccountLayout.span,
        },
        {
          memcmp: {
            offset: TokenAccountLayout.offsetOf('mint')!,
            bytes: NATIVE_MINT.toBase58(),
          },
        },
        {
          memcmp: {
            offset: TokenAccountLayout.offsetOf('state')!,
            bytes: bs58.encode([1]),
          },
        },
        {
          memcmp: {
            offset: TokenAccountLayout.offsetOf('owner')!,
            bytes: wallet.toBase58(),
          },
        }
      ]
    }
  );

  return accounts.map(({ pubkey, account }) => {
    const { mint, owner, amount } = TokenAccountLayout.decode(account.data);

    return { pubkey, mint, owner, amount }
  })
}

export const createUnwrapSolInstructions = ({
  wallet,
  accounts,
}: {
  wallet: PublicKey,
  accounts: PublicKey[],
}) => {
  return accounts.map(account =>
    createCloseTokenAccountInstruction(account, wallet, wallet)
  )
}

export const createCloseTokenAccountInstruction = (
  account: PublicKey,
  destination: PublicKey,
  authority: PublicKey,
) => {
  const keys = [
    { pubkey: account, isSigner: false, isWritable: true },
    { pubkey: destination, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: true, isWritable: false }
  ];
  const closeAccountInstructionData = struct([u8('instruction')]);
  const data = Buffer.alloc(closeAccountInstructionData.span);
  closeAccountInstructionData.encode({
    instruction: 9,
  }, data);

  return new TransactionInstruction({
    keys,
    programId: TOKEN_PROGRAM_ID,
    data,
  });
}

export const formatWithCommas = (num: number, precision: number = 0) => {
  return num.toFixed(precision).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
import BN from 'bn.js';
import { useCallback, useState } from "react";
import { MintInfo } from "@solana/spl-token";

import { PoolInfo, TokenAccount } from "./../models";
import { TokenInfo } from "@solana/spl-token-registry";

export type KnownTokenMap = Map<string, TokenInfo>;

export function useLocalStorageState(key: string, defaultState?: string) {
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
  mint?: MintInfo,
  rate: number = 1.0
): number {
  if (!account) {
    return 0;
  }

  const amount =
    typeof account === "number" ? new BN(account) : account.info.amount;

  const precision = new BN(10).pow(new BN(mint?.decimals || 0));

  // avoid overflowing 53 bit numbers on calling toNumber()
  let div = amount.div(precision).toNumber();
  let rem = amount.mod(precision).toNumber() / precision.toNumber();
  let result = (div + rem) * rate;

  return result;
}

var SI_SYMBOL = ["", "k", "M", "G", "T", "P", "E"];

const abbreviateNumber = (number: number, precision: number) => {
  let tier = (Math.log10(number) / 3) | 0;
  let scaled = number;
  let suffix = SI_SYMBOL[tier];
  if (tier !== 0) {
    let scale = Math.pow(10, tier * 3);
    scaled = number / scale;
  }

  return scaled.toFixed(precision) + suffix;
};

const format = (val: number, precision: number, abbr: boolean) =>
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
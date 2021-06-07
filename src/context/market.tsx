import React, { useCallback, useContext, useEffect, useState } from "react";
import { POOLS_WITH_AIRDROP } from "./../models/airdrops";
import { MINT_TO_MARKET } from "./../models/marketOverrides";
import {
  convert,
  getPoolName,
  getTokenName,
  KnownTokenMap,
  STABLE_COINS,
} from "./../utils/utils";
import { useConnectionConfig } from "./../utils/connection";
import {
  cache,
  getMultipleAccounts,
  MintParser,
  ParsedAccountBase,
  useCachedPool,
} from "./../utils/accounts";
import { Market, MARKETS, Orderbook, TOKEN_MINTS } from "@project-serum/serum";
import { AccountInfo, Connection, PublicKey } from "@solana/web3.js";
import { useMemo } from "react";
import { PoolInfo } from "../models";
import { EventEmitter } from "./../utils/eventEmitter";
import { LIQUIDITY_PROVIDER_FEE, SERUM_FEE } from "../utils/pools";

interface RecentPoolData {
  pool_identifier: string;
  volume24hA: number;
}

export interface MarketsContextState {
  midPriceInUSD: (mint: string) => number;
  marketEmitter: EventEmitter;
  accountsToObserve: Map<string, number>;
  marketByMint: Map<string, SerumMarket>;

  subscribeToMarket: (mint: string) => () => void;

  dailyVolume: Map<string, RecentPoolData>;
}

const INITAL_LIQUIDITY_DATE = new Date("2020-10-27");
const REFRESH_INTERVAL = 30_000;

export const BONFIDA_POOL_INTERVAL = 30 * 60_000; // 30 min

const MarketsContext = React.createContext<MarketsContextState | null>(null);

const marketEmitter = new EventEmitter();

export function MarketProvider({ children = null as any }) {
  const { endpoint } = useConnectionConfig();
  const { pools } = useCachedPool();
  const accountsToObserve = useMemo(() => new Map<string, number>(), []);
  const [dailyVolume, setDailyVolume] = useState<Map<string, RecentPoolData>>(
    new Map()
  );

  const connection = useMemo(() => new Connection(endpoint, "recent"), [
    endpoint,
  ]);

  const marketByMint = useMemo(() => {
    return [
      ...new Set(pools.map((p) => p.pubkeys.holdingMints).flat()).values(),
    ].reduce((acc, key) => {
      const mintAddress = key.toBase58();

      const SERUM_TOKEN = TOKEN_MINTS.find(
        (a) => a.address.toBase58() === mintAddress
      );

      const marketAddress = MINT_TO_MARKET[mintAddress];
      const marketName = `${SERUM_TOKEN?.name}/USDC`;
      const marketInfo = MARKETS.filter(m => !m.deprecated).find(
        (m) => m.name === marketName || m.address.toBase58() === marketAddress
      );

      if (marketInfo) {
        acc.set(mintAddress, {
          marketInfo,
        });
      }

      return acc;
    }, new Map<string, SerumMarket>()) as Map<string, SerumMarket>;
  }, [pools]);

  useEffect(() => {
    let timer = 0;
    let bonfidaTimer = 0;

    const updateData = async () => {
      await refreshAccounts(connection, [...accountsToObserve.keys()]);
      marketEmitter.raiseMarketUpdated(new Set([...marketByMint.keys()]));

      timer = window.setTimeout(() => updateData(), REFRESH_INTERVAL);
    };

    // const bonfidaQuery = async () => {
    //   try {
    //     const resp = await window.fetch(
    //       "https://serum-api.bonfida.com/pools-recent"
    //     );
    //     const data = await resp.json();
    //     const map = (data?.data as RecentPoolData[]).reduce((acc, item) => {
    //       acc.set(item.pool_identifier, item);
    //       return acc;
    //     }, new Map<string, RecentPoolData>());

    //     setDailyVolume(map);
    //   } catch {
    //     // ignore
    //   }

    //   bonfidaTimer = window.setTimeout(
    //     () => bonfidaQuery(),
    //     BONFIDA_POOL_INTERVAL
    //   );
    // };

    const initalQuery = async () => {
      const reverseSerumMarketCache = new Map<string, string>();
      [...marketByMint.keys()].forEach((mint) => {
        const m = marketByMint.get(mint);
        if (m) {
          reverseSerumMarketCache.set(m.marketInfo.address.toBase58(), mint);
        }
      });

      const allMarkets = [...marketByMint.values()].map((m) => {
        return m.marketInfo.address.toBase58();
      });

      await getMultipleAccounts(
        connection,
        // only query for markets that are not in cahce
        allMarkets.filter((a) => cache.get(a) === undefined),
        "single"
      ).then(({ keys, array }) => {
        allMarkets.forEach(() => {});

        return array.map((item, index) => {
          const marketAddress = keys[index];
          const mintAddress = reverseSerumMarketCache.get(marketAddress);
          if (mintAddress  && item) {
            const market = marketByMint.get(mintAddress);

            if (market) {
              const programId = market.marketInfo.programId;
              const id = market.marketInfo.address;
              cache.add(id, item, (id, acc) => {
                const decoded = Market.getLayout(programId).decode(acc.data);

                const details = {
                  pubkey: id,
                  account: {
                    ...acc,
                  },
                  info: decoded,
                } as ParsedAccountBase;

                cache.registerParser(details.info.baseMint, MintParser);
                cache.registerParser(details.info.quoteMint, MintParser);
                cache.registerParser(details.info.bids, OrderBookParser);
                cache.registerParser(details.info.asks, OrderBookParser);

                return details;
              });
            }
          }

          return item;
        });
      });

      const toQuery = new Set<string>();
      allMarkets.forEach((m) => {
        const market = cache.get(m);
        if (!market) {
          return;
        }

        const decoded = market;

        if (!cache.get(decoded.info.baseMint)) {
          toQuery.add(decoded.info.baseMint.toBase58());
        }

        if (!cache.get(decoded.info.baseMint)) {
          toQuery.add(decoded.info.quoteMint.toBase58());
        }

        toQuery.add(decoded.info.bids.toBase58());
        toQuery.add(decoded.info.asks.toBase58());

        // TODO: only update when someone listnes to it
      });

      await refreshAccounts(connection, [...toQuery.keys()]);

      marketEmitter.raiseMarketUpdated(new Set([...marketByMint.keys()]));

      // start update loop
      updateData();
      // bonfidaQuery();
    };

    initalQuery();

    return () => {
      window.clearTimeout(bonfidaTimer);
      window.clearTimeout(timer);
    };
  }, [pools, marketByMint, accountsToObserve, connection]);

  const midPriceInUSD = useCallback(
    (mintAddress: string) => {
      return getMidPrice(
        marketByMint.get(mintAddress)?.marketInfo.address.toBase58(),
        mintAddress
      );
    },
    [marketByMint]
  );

  const subscribeToMarket = useCallback(
    (mintAddress: string) => {
      const info = marketByMint.get(mintAddress);
      const market = cache.get(info?.marketInfo.address.toBase58() || "");
      if (!market) {
        return () => {};
      }

      // TODO: get recent volume

      const bid = market.info.bids.toBase58();
      const ask = market.info.asks.toBase58();
      accountsToObserve.set(bid, (accountsToObserve.get(bid) || 0) + 1);
      accountsToObserve.set(ask, (accountsToObserve.get(ask) || 0) + 1);

      // TODO: add event queue to query for last trade

      return () => {
        accountsToObserve.set(bid, (accountsToObserve.get(bid) || 0) - 1);
        accountsToObserve.set(ask, (accountsToObserve.get(ask) || 0) - 1);

        // cleanup
        [...accountsToObserve.keys()].forEach((key) => {
          if ((accountsToObserve.get(key) || 0) <= 0) {
            accountsToObserve.delete(key);
          }
        });
      };
    },
    [marketByMint, accountsToObserve]
  );

  return (
    <MarketsContext.Provider
      value={{
        midPriceInUSD,
        marketEmitter,
        accountsToObserve,
        marketByMint,
        subscribeToMarket,
        dailyVolume: dailyVolume,
      }}
    >
      {children}
    </MarketsContext.Provider>
  );
}

export const useMarkets = () => {
  const context = useContext(MarketsContext);
  return context as MarketsContextState;
};

export const useMidPriceInUSD = (mint: string) => {
  const { midPriceInUSD, subscribeToMarket, marketEmitter } = useContext(
    MarketsContext
  ) as MarketsContextState;
  const [price, setPrice] = useState<number>(0);

  useEffect(() => {
    let subscription = subscribeToMarket(mint);
    const update = () => {
      if (midPriceInUSD) {
        setPrice(midPriceInUSD(mint));
      }
    };

    update();
    const dispose = marketEmitter.onMarket(update);

    return () => {
      subscription();
      dispose();
    };
  }, [midPriceInUSD, mint, marketEmitter, subscribeToMarket]);

  return { price, isBase: price === 1.0 };
};

export const useEnrichedPools = (pools: PoolInfo[]) => {
  const context = useContext(MarketsContext);
  const { tokenMap } = useConnectionConfig();
  const [enriched, setEnriched] = useState<any[]>([]);
  const subscribeToMarket = context?.subscribeToMarket;
  const marketEmitter = context?.marketEmitter;
  const marketsByMint = context?.marketByMint;
  const dailyVolume = context?.dailyVolume;

  useEffect(() => {
    if (!marketEmitter || !subscribeToMarket || !marketsByMint) {
      return;
    }

    const mints = [...new Set([...marketsByMint?.keys()]).keys()];

    const subscriptions = mints.map((m) => subscribeToMarket(m));

    const update = () => {
      setEnriched(
        createEnrichedPools(pools, marketsByMint, dailyVolume, tokenMap)
      );
    };

    const dispose = marketEmitter.onMarket(update);

    update();

    return () => {
      dispose && dispose();
      subscriptions.forEach((dispose) => dispose && dispose());
    };
  }, [
    tokenMap,
    pools,
    dailyVolume,
    subscribeToMarket,
    marketEmitter,
    marketsByMint,
  ]);

  return enriched;
};

// TODO:
// 1. useEnrichedPools
//      combines market and pools and user info
// 2. ADD useMidPrice with event to refresh price
// that could subscribe to multiple markets and trigger refresh of those markets only when there is active subscription

function createEnrichedPools(
  pools: PoolInfo[],
  marketByMint: Map<string, SerumMarket> | undefined,
  poolData: Map<string, RecentPoolData> | undefined,
  tokenMap: KnownTokenMap
) {
  const TODAY = new Date();

  if (!marketByMint) {
    return [];
  }

  const result = pools
    .filter((p) => p.pubkeys.holdingMints && p.pubkeys.holdingMints.length > 1)
    .map((p, index) => {
      const mints = (p.pubkeys.holdingMints || [])
        .map((a) => a.toBase58())
        .sort();
      const mintA = cache.getMint(mints[0]);
      const mintB = cache.getMint(mints[1]);

      const account0 = cache.getAccount(p.pubkeys.holdingAccounts[0]);
      const account1 = cache.getAccount(p.pubkeys.holdingAccounts[1]);
      
      const accountA =
        account0?.info.mint.toBase58() === mints[0] ? account0 : account1;
      const accountB =
        account1?.info.mint.toBase58() === mints[1] ? account1 : account0;

      const baseMid = getMidPrice(
        marketByMint.get(mints[0])?.marketInfo.address.toBase58() || "",
        mints[0]
      );
      const baseReserveUSD = baseMid * convert(accountA, mintA);

      const quote = getMidPrice(
        marketByMint.get(mints[1])?.marketInfo.address.toBase58() || "",
        mints[1]
      );
      const quoteReserveUSD = quote * convert(accountB, mintB);

      const poolMint = cache.getMint(p.pubkeys.mint);
      if (poolMint?.supply.eqn(0)) {
        return undefined;
      }

      let airdropYield = calculateAirdropYield(
        p,
        marketByMint,
        baseReserveUSD,
        quoteReserveUSD
      );

      let volume = 0;
      let volume24h =
        baseMid * (poolData?.get(p.pubkeys.mint.toBase58())?.volume24hA || 0);
      let fees24h = volume24h * (LIQUIDITY_PROVIDER_FEE - SERUM_FEE);
      let fees = 0;
      let apy = airdropYield;
      let apy24h = airdropYield;
      if (p.pubkeys.feeAccount) {
        const feeAccount = cache.getAccount(p.pubkeys.feeAccount);

        if (
          poolMint &&
          feeAccount &&
          feeAccount.info.mint.toBase58() === p.pubkeys.mint.toBase58()
        ) {
          const feeBalance = feeAccount?.info.amount.toNumber();
          const supply = poolMint?.supply.toNumber();

          const ownedPct = feeBalance / supply;

          const poolOwnerFees =
            ownedPct * baseReserveUSD + ownedPct * quoteReserveUSD;
          volume = poolOwnerFees / 0.0004;
          fees = volume * LIQUIDITY_PROVIDER_FEE;

          if (fees !== 0) {
            const baseVolume = (ownedPct * baseReserveUSD) / 0.0004;
            const quoteVolume = (ownedPct * quoteReserveUSD) / 0.0004;

            // Aproximation not true for all pools we need to fine a better way
            const daysSinceInception = Math.floor(
              (TODAY.getTime() - INITAL_LIQUIDITY_DATE.getTime()) /
                (24 * 3600 * 1000)
            );
            const apy0 =
              parseFloat(
                ((baseVolume / daysSinceInception) *
                  LIQUIDITY_PROVIDER_FEE *
                  356) as any
              ) / baseReserveUSD;
            const apy1 =
              parseFloat(
                ((quoteVolume / daysSinceInception) *
                  LIQUIDITY_PROVIDER_FEE *
                  356) as any
              ) / quoteReserveUSD;

            apy = apy + Math.max(apy0, apy1);

            const apy24h0 =
              parseFloat((volume24h * LIQUIDITY_PROVIDER_FEE * 356) as any) /
              baseReserveUSD;
            apy24h = apy24h + apy24h0;
          }
        }
      }

      const lpMint = cache.getMint(p.pubkeys.mint);

      const name = getPoolName(tokenMap, p);
      const link = `#/?pair=${getPoolName(tokenMap, p, false).replace(
        "/",
        "-"
      )}`;

      return {
        key: p.pubkeys.account.toBase58(),
        id: index,
        name,
        names: mints.map((m) => getTokenName(tokenMap, m)),
        accounts: [accountA?.pubkey, accountB?.pubkey],
        address: p.pubkeys.mint.toBase58(),
        link,
        mints,
        liquidityA: convert(accountA, mintA),
        liquidityAinUsd: baseReserveUSD,
        liquidityB: convert(accountB, mintB),
        liquidityBinUsd: quoteReserveUSD,
        supply:
          lpMint &&
          (
            lpMint?.supply.toNumber() / Math.pow(10, lpMint?.decimals || 0)
          ).toFixed(9),
        fees,
        fees24h,
        liquidity: baseReserveUSD + quoteReserveUSD,
        volume,
        volume24h,
        apy: Number.isFinite(apy) ? apy : 0,
        apy24h: Number.isFinite(apy24h) ? apy24h : 0,
        map: poolData,
        extra: poolData?.get(p.pubkeys.account.toBase58()),
        raw: p,
      };
    })
    .filter((p) => p !== undefined);
  return result;
}

function calculateAirdropYield(
  p: PoolInfo,
  marketByMint: Map<string, SerumMarket>,
  baseReserveUSD: number,
  quoteReserveUSD: number
) {
  let airdropYield = 0;
  let poolWithAirdrop = POOLS_WITH_AIRDROP.find((drop) =>
    drop.pool.equals(p.pubkeys.mint)
  );
  if (poolWithAirdrop) {
    airdropYield = poolWithAirdrop.airdrops.reduce((acc, item) => {
      const market = marketByMint.get(item.mint.toBase58())?.marketInfo.address;
      if (market) {
        const midPrice = getMidPrice(market?.toBase58(), item.mint.toBase58());

        acc =
          acc +
          // airdrop yield
          ((item.amount * midPrice) / (baseReserveUSD + quoteReserveUSD)) *
            (365 / 30);
      }

      return acc;
    }, 0);
  }
  return airdropYield;
}

const OrderBookParser = (id: PublicKey, acc: AccountInfo<Buffer>) => {
  const decoded = Orderbook.LAYOUT.decode(acc.data);

  const details = {
    pubkey: id,
    account: {
      ...acc,
    },
    info: decoded,
  } as ParsedAccountBase;

  return details;
};

const getMidPrice = (marketAddress?: string, mintAddress?: string) => {
  const SERUM_TOKEN = TOKEN_MINTS.find(
    (a) => a.address.toBase58() === mintAddress
  );

  if (STABLE_COINS.has(SERUM_TOKEN?.name || "")) {
    return 1.0;
  }

  if (!marketAddress) {
    return 0.0;
  }

  const marketInfo = cache.get(marketAddress);
  if (!marketInfo) {
    return 0.0;
  }

  const decodedMarket = marketInfo.info;

  const baseMintDecimals =
    cache.get(decodedMarket.baseMint)?.info.decimals || 0;
  const quoteMintDecimals =
    cache.get(decodedMarket.quoteMint)?.info.decimals || 0;

  const market = new Market(
    decodedMarket,
    baseMintDecimals,
    quoteMintDecimals,
    undefined,
    decodedMarket.programId
  );

  const bids = cache.get(decodedMarket.bids)?.info;
  const asks = cache.get(decodedMarket.asks)?.info;

  if (bids && asks) {
    const bidsBook = new Orderbook(market, bids.accountFlags, bids.slab);
    const asksBook = new Orderbook(market, asks.accountFlags, asks.slab);

    const bestBid = bidsBook.getL2(1);
    const bestAsk = asksBook.getL2(1);

    if (bestBid.length > 0 && bestAsk.length > 0) {
      return (bestBid[0][0] + bestAsk[0][0]) / 2.0;
    }
  }

  return 0;
};

const refreshAccounts = async (connection: Connection, keys: string[]) => {
  if (keys.length === 0) {
    return [];
  }

  return getMultipleAccounts(connection, keys, "single").then(
    ({ keys, array }) => {
      return array.map((item, index) => {
        if (!item) {
          return undefined;
        }

        const address = keys[index];
        return cache.add(new PublicKey(address), item);
      }).filter(a => !!a);
    }
  );
};

interface SerumMarket {
  marketInfo: {
    address: PublicKey;
    name: string;
    programId: PublicKey;
    deprecated: boolean;
  };

  // 1st query
  marketAccount?: AccountInfo<Buffer>;

  // 2nd query
  mintBase?: AccountInfo<Buffer>;
  mintQuote?: AccountInfo<Buffer>;
  bidAccount?: AccountInfo<Buffer>;
  askAccount?: AccountInfo<Buffer>;
  eventQueue?: AccountInfo<Buffer>;

  swap?: {
    dailyVolume: number;
  };

  midPrice?: (mint?: PublicKey) => number;
}

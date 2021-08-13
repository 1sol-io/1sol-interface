import {
  Account,
  AccountInfo,
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { sendTransaction, useConnection } from "./connection";
import { useEffect, useMemo, useState } from "react";
import { Token, MintLayout, AccountLayout } from "@solana/spl-token";
import { notify } from "./notifications";
import {
  cache,
  getCachedAccount,
  useUserAccounts,
  useCachedPool,
  getMultipleAccounts,
} from "./accounts";
import {
  programIds,
  SWAP_HOST_FEE_ADDRESS,
  SWAP_PROGRAM_OWNER_FEE_ADDRESS,
  WRAPPED_SOL_MINT,
} from "./ids";
import {
  LiquidityComponent,
  PoolInfo,
  TokenAccount,
  TokenSwapLayout,
  TokenSwapLayoutLegacyV0 as TokenSwapLayoutV0,
  TokenSwapLayoutV1,
  PoolConfig,
} from "./../models";
import {deserializeAccount, SerumDexMarketInfo, getOneSolProtocol, loadTokenSwapInfo, Numberu64} from '../utils/onesol-protocol'
import {
  DexInstructions,
  Market,
  MARKET_STATE_LAYOUT_V2,
  OpenOrders
} from '@project-serum/serum';
import { getClientId } from "./utils";


const LIQUIDITY_TOKEN_PRECISION = 8;

export const LIQUIDITY_PROVIDER_FEE = 0.003;
export const SERUM_FEE = 0.0005;

export const isLatest = (swap: AccountInfo<Buffer>) => {
  return swap.data.length === TokenSwapLayout.span;
};

const getHoldings = (connection: Connection, accounts: string[]) => {
  return accounts.map((acc) =>
    cache.queryAccount(connection, new PublicKey(acc))
  );
};

const toPoolInfo = (item: any, program: PublicKey) => {
  const mint = new PublicKey(item.data.tokenPool);
  return {
    pubkeys: {
      account: item.pubkey,
      program: program,
      mint,
      holdingMints: [] as PublicKey[],
      holdingAccounts: [item.data.tokenAccountA, item.data.tokenAccountB].map(
        (a) => new PublicKey(a)
      ),
    },
    legacy: false,
    raw: item,
  } as PoolInfo;
};

export const usePools = () => {
  const connection = useConnection();
  const [pools, setPools] = useState<PoolInfo[]>([]);

  // initial query
  useEffect(() => {
    setPools([]);

    const queryPools = async (swapId: PublicKey, isLegacy = false) => {
      let poolsArray: PoolInfo[] = [];
      (await connection.getProgramAccounts(swapId))
        .filter(
          (item) =>
            item.account.data.length === TokenSwapLayout.span ||
            item.account.data.length === TokenSwapLayoutV1.span ||
            item.account.data.length === TokenSwapLayoutV0.span
        )
        .map((item) => {
          let result = {
            data: undefined as any,
            account: item.account,
            pubkey: item.pubkey,
            init: async () => {},
          };

          const layout =
            item.account.data.length === TokenSwapLayout.span
              ? TokenSwapLayout
              : item.account.data.length === TokenSwapLayoutV1.span
              ? TokenSwapLayoutV1
              : TokenSwapLayoutV0;

          // handling of legacy layout can be removed soon...
          if (layout === TokenSwapLayoutV0) {
            result.data = layout.decode(item.account.data);
            let pool = toPoolInfo(result, swapId);
            pool.legacy = isLegacy;
            poolsArray.push(pool as PoolInfo);

            result.init = async () => {
              try {
                // TODO: this is not great
                // Ideally SwapLayout stores hash of all the mints to make finding of pool for a pair easier
                const holdings = await Promise.all(
                  getHoldings(connection, [
                    result.data.tokenAccountA,
                    result.data.tokenAccountB,
                  ])
                );

                pool.pubkeys.holdingMints = [
                  holdings[0].info.mint,
                  holdings[1].info.mint,
                ] as PublicKey[];
              } catch (err) {
                console.log(err);
              }
            };
          } else {
            result.data = layout.decode(item.account.data);

            let pool = toPoolInfo(result, swapId);
            pool.legacy = isLegacy;
            pool.pubkeys.feeAccount = new PublicKey(result.data.feeAccount);
            pool.pubkeys.holdingMints = [
              new PublicKey(result.data.mintA),
              new PublicKey(result.data.mintB),
            ] as PublicKey[];

            poolsArray.push(pool as PoolInfo);
          }

          return result;
        });

      const toQuery = [...poolsArray
        .map(
          (p) =>
            [
              ...p.pubkeys.holdingAccounts.map((h) => h.toBase58()),
              ...p.pubkeys.holdingMints.map((h) => h.toBase58()),
              p.pubkeys.feeAccount?.toBase58(), // used to calculate volume approximation
              p.pubkeys.mint.toBase58(),
            ].filter((p) => p) as string[]
        )
        .flat()
        .filter(acc => cache.get(acc) === undefined)
        .reduce((acc, item) => {
          acc.add(item);
          return acc;
        }, new Set<string>())
        .keys()]
        .sort();

      // This will pre-cache all accounts used by pools
      // All those accounts are updated whenever there is a change
      await getMultipleAccounts(connection, toQuery, "single").then(
        ({ keys, array }) => {
          return array.map((obj, index) => {
            if (!obj) {
              return undefined;
            }

            const pubKey = new PublicKey(keys[index]);
            if (obj.data.length === AccountLayout.span) {
              return cache.addAccount(pubKey, obj);
            } else if (obj.data.length === MintLayout.span) {
              if (!cache.getMint(pubKey)) {
                return cache.addMint(pubKey, obj);
              }
            }

            return obj;
          }).filter(a => !!a) as any[];
        }
      );

      return poolsArray;
    };

    Promise.all([
      ...programIds().swaps.map(swap => queryPools(swap)),
      ...programIds().swap_legacy.map((leg) => queryPools(leg, true)),
    ]).then((all) => {
      setPools(all.flat());
    });
  }, [connection]);

  useEffect(() => {
    const subID = connection.onProgramAccountChange(
      programIds().swap,
      async (info) => {
        const id = (info.accountId as unknown) as string;
        if (info.accountInfo.data.length === programIds().swapLayout.span) {
          const account = info.accountInfo;
          const updated = {
            data: programIds().swapLayout.decode(account.data),
            account: account,
            pubkey: new PublicKey(id),
          };

          const index =
            pools &&
            pools.findIndex((p) => p.pubkeys.account.toBase58() === id);
          if (index && index >= 0 && pools) {
            // TODO: check if account is empty?

            const filtered = pools.filter((p, i) => i !== index);
            setPools([...filtered, toPoolInfo(updated, programIds().swap)]);
          } else {
            let pool = toPoolInfo(updated, programIds().swap);

            pool.pubkeys.feeAccount = new PublicKey(updated.data.feeAccount);
            pool.pubkeys.holdingMints = [
              new PublicKey(updated.data.mintA),
              new PublicKey(updated.data.mintB),
            ] as PublicKey[];

            setPools([...pools, pool]);
          }
        }
      },
      "singleGossip"
    );

    return () => {
      connection.removeProgramAccountChangeListener(subID);
    };
  }, [connection, pools]);

  return { pools };
};

export const usePoolForBasket = (mints: (string | undefined)[]) => {
  const connection = useConnection();
  const { pools } = useCachedPool();
  const [pool, setPool] = useState<PoolInfo>();
  const sortedMints = useMemo(() => [...mints].sort(), [...mints]); // eslint-disable-line
  
  useEffect(() => {
    (async () => {
      // reset pool during query
      setPool(undefined);

      let matchingPool = pools.filter(p => p.pubkeys.program.toBase58() === programIds().swaps[0].toBase58())
        .filter((p) => !p.legacy)
        .filter((p) =>
          p.pubkeys.holdingMints
            .map((a) => a.toBase58())
            .sort()
            .every((address, i) => address === sortedMints[i])
        );

      const poolQuantities: { [pool: string]: number } = {};

      for (let i = 0; i < matchingPool.length; i++) {
        const p = matchingPool[i];

        const [account0, account1] = await Promise.all([
          cache.queryAccount(connection, p.pubkeys.holdingAccounts[0]),
          cache.queryAccount(connection, p.pubkeys.holdingAccounts[1]),
        ]);

        const amount =
          (account0.info.amount.toNumber() || 0) +
          (account1.info.amount.toNumber() || 0);

        if (amount > 0) {
          poolQuantities[i.toString()] = amount;
        }
      }

      if (Object.keys(poolQuantities).length > 0) {
        const sorted = Object.entries(
          poolQuantities
        ).sort(([pool0Idx, amount0], [pool1Idx, amount1]) =>
          amount0 > amount1 ? -1 : 1
        );
        const bestPool = matchingPool[parseInt(sorted[0][0])];
        setPool(bestPool);
        return;
      }
    })();
  }, [connection, sortedMints, pools]);

  return pool;
};

export const usePool1ForBasket = (mints: (string | undefined)[]) => {
  const connection = useConnection();
  const { pools } = useCachedPool();
  const [pool, setPool] = useState<PoolInfo>();
  const sortedMints = useMemo(() => [...mints].sort(), [...mints]); // eslint-disable-line
  
  useEffect(() => {
    (async () => {
      // reset pool during query
      setPool(undefined);

      let matchingPool = pools.filter(p => p.pubkeys.program.toBase58() === programIds().swaps[1].toBase58())
        .filter((p) => !p.legacy)
        .filter((p) =>
          p.pubkeys.holdingMints
            .map((a) => a.toBase58())
            .sort()
            .every((address, i) => address === sortedMints[i])
        );

      const poolQuantities: { [pool: string]: number } = {};

      for (let i = 0; i < matchingPool.length; i++) {
        const p = matchingPool[i];

        const [account0, account1] = await Promise.all([
          cache.queryAccount(connection, p.pubkeys.holdingAccounts[0]),
          cache.queryAccount(connection, p.pubkeys.holdingAccounts[1]),
        ]);

        const amount =
          (account0.info.amount.toNumber() || 0) +
          (account1.info.amount.toNumber() || 0);

        if (amount > 0) {
          poolQuantities[i.toString()] = amount;
        }
      }

      if (Object.keys(poolQuantities).length > 0) {
        const sorted = Object.entries(
          poolQuantities
        ).sort(([pool0Idx, amount0], [pool1Idx, amount1]) =>
          amount0 > amount1 ? -1 : 1
        );
        const bestPool = matchingPool[parseInt(sorted[0][0])];
        setPool(bestPool);
        return;
      }
    })();
  }, [connection, sortedMints, pools]);

  return pool;
}

export const useOwnedPools = (legacy = false) => {
  const { pools } = useCachedPool(legacy);
  const { userAccounts } = useUserAccounts();

  const ownedPools = useMemo(() => {
    const map = userAccounts.reduce((acc, item) => {
      const key = item.info.mint.toBase58();
      acc.set(key, [...(acc.get(key) || []), item]);
      return acc;
    }, new Map<string, TokenAccount[]>());

    return pools
      .filter((p) => map.has(p.pubkeys.mint.toBase58()) && p.legacy === legacy)
      .map((item) => {
        let feeAccount = item.pubkeys.feeAccount?.toBase58();
        return map.get(item.pubkeys.mint.toBase58())?.map((a) => {
          return {
            account: a as TokenAccount,
            isFeeAccount: feeAccount === a.pubkey.toBase58(),
            pool: item,
          };
        }) as {
          account: TokenAccount;
          isFeeAccount: boolean;
          pool: PoolInfo;
        }[];
      })
      .flat();
  }, [pools, userAccounts, legacy]);

  return ownedPools;
};

// Allow for this much price movement in the pool before adding liquidity to the pool aborts
const SLIPPAGE = 0.005;

export const hasAccount = (
  owner: PublicKey,
  mint: PublicKey, 
  excluded?: Set<string>
) => {
  console.log(owner.toBase58())
  console.log(mint.toBase58())
  const accountToFind = mint.toBase58();
  const account = getCachedAccount(
    (acc) =>
      acc.info.mint.toBase58() === accountToFind &&
      acc.info.owner.toBase58() === owner.toBase58() &&
      (excluded === undefined || !excluded.has(acc.pubkey.toBase58()))
  );
  const isWrappedSol = accountToFind === WRAPPED_SOL_MINT.toBase58();

  if (account && !isWrappedSol) {
    return true
  } else {
    return false
  }

}

function findOrCreateAccountByMint(
  payer: PublicKey,
  owner: PublicKey,
  instructions: TransactionInstruction[],
  cleanupInstructions: TransactionInstruction[],
  accountRentExempt: number,
  mint: PublicKey, // use to identify same type
  signers: Account[],
  excluded?: Set<string>
): PublicKey {
  const accountToFind = mint.toBase58();
  const account = getCachedAccount(
    (acc) =>
      acc.info.mint.toBase58() === accountToFind &&
      acc.info.owner.toBase58() === owner.toBase58() &&
      (excluded === undefined || !excluded.has(acc.pubkey.toBase58()))
  );
  const isWrappedSol = accountToFind === WRAPPED_SOL_MINT.toBase58();

  let toAccount: PublicKey;
  if (account && !isWrappedSol) {
    toAccount = account.pubkey;
  } else {
    // creating depositor pool account
    const newToAccount = createSplAccount(
      instructions,
      payer,
      accountRentExempt,
      mint,
      owner,
      AccountLayout.span
    );

    toAccount = newToAccount.publicKey;
    signers.push(newToAccount);

    if (isWrappedSol) {
      cleanupInstructions.push(
        Token.createCloseAccountInstruction(
          programIds().token,
          toAccount,
          payer,
          payer,
          []
        )
      );
    }
  }

  return toAccount;
}

function estimateProceedsFromInput(
  inputQuantityInPool: number,
  proceedsQuantityInPool: number,
  inputAmount: number
): number {
  return (
    (proceedsQuantityInPool * inputAmount) / (inputQuantityInPool + inputAmount)
  );
}

function estimateInputFromProceeds(
  inputQuantityInPool: number,
  proceedsQuantityInPool: number,
  proceedsAmount: number
): number | string {
  if (proceedsAmount >= proceedsQuantityInPool) {
    return "Not possible";
  }

  return (
    (inputQuantityInPool * proceedsAmount) /
    (proceedsQuantityInPool - proceedsAmount)
  );
}

export enum PoolOperation {
  Add,
  SwapGivenInput,
  SwapGivenProceeds,
}

export async function calculateDependentAmount(
  connection: Connection,
  independent: string,
  amount: number,
  pool: PoolInfo,
  op: PoolOperation
): Promise<number | string | undefined> {
  const poolMint = await cache.queryMint(connection, pool.pubkeys.mint);
  const accountA = await cache.queryAccount(
    connection,
    pool.pubkeys.holdingAccounts[0]
  );
  const amountA = accountA.info.amount.toNumber();

  const accountB = await cache.queryAccount(
    connection,
    pool.pubkeys.holdingAccounts[1]
  );
  let amountB = accountB.info.amount.toNumber();

  if (!poolMint.mintAuthority) {
    throw new Error("Mint doesnt have authority");
  }

  if (poolMint.supply.eqn(0)) {
    return;
  }

  let offsetAmount = 0;
  const offsetCurve = pool.raw?.data?.curve?.offset;
  if (offsetCurve) {
    offsetAmount = offsetCurve.token_b_offset;
    amountB = amountB + offsetAmount;
  }

  const mintA = await cache.queryMint(connection, accountA.info.mint);
  const mintB = await cache.queryMint(connection, accountB.info.mint);

  if (!mintA || !mintB) {
    return;
  }

  const isFirstIndependent = accountA.info.mint.toBase58() === independent;
  const depPrecision = Math.pow(
    10,
    isFirstIndependent ? mintB.decimals : mintA.decimals
  );
  const indPrecision = Math.pow(
    10,
    isFirstIndependent ? mintA.decimals : mintB.decimals
  );
  const indAdjustedAmount = amount * indPrecision;

  let indBasketQuantity = isFirstIndependent ? amountA : amountB;

  let depBasketQuantity = isFirstIndependent ? amountB : amountA;

  var depAdjustedAmount;

  const constantPrice = pool.raw?.data?.curve?.constantPrice;
  if (constantPrice) {
    if (isFirstIndependent) {
      depAdjustedAmount = (amount * depPrecision) / constantPrice.token_b_price;
    } else {
      depAdjustedAmount = (amount * depPrecision) * constantPrice.token_b_price;
    }
  } else {
    switch (+op) {
      case PoolOperation.Add:
        depAdjustedAmount =
          (depBasketQuantity / indBasketQuantity) * indAdjustedAmount;
        break;
      case PoolOperation.SwapGivenProceeds:
        depAdjustedAmount = estimateInputFromProceeds(
          depBasketQuantity,
          indBasketQuantity,
          indAdjustedAmount
        );
        break;
      case PoolOperation.SwapGivenInput:
        depAdjustedAmount = estimateProceedsFromInput(
          indBasketQuantity,
          depBasketQuantity,
          indAdjustedAmount
        );
        break;
    }
  }

  if (typeof depAdjustedAmount === "string") {
    return depAdjustedAmount;
  }
  if (depAdjustedAmount === undefined) {
    return undefined;
  }
  return depAdjustedAmount / depPrecision;
}

function approveAmount(
  instructions: TransactionInstruction[],
  cleanupInstructions: TransactionInstruction[],
  account: PublicKey,
  owner: PublicKey,
  amount: number,

  // if delegate is not passed ephemeral transfer authority is used
  delegate?: PublicKey
) {
  const tokenProgram = programIds().token;
  const transferAuthority = new Account();

  instructions.push(
    Token.createApproveInstruction(
      tokenProgram,
      account,
      delegate ?? transferAuthority.publicKey,
      owner,
      [],
      amount
    )
  );

  cleanupInstructions.push(
    Token.createRevokeInstruction(tokenProgram, account, owner, [])
  );

  return transferAuthority;
}

function getWrappedAccount(
  instructions: TransactionInstruction[],
  cleanupInstructions: TransactionInstruction[],
  toCheck: TokenAccount | undefined,
  payer: PublicKey,
  amount: number,
  signers: Account[]
) {
  if (toCheck && !toCheck.info.isNative) {
    return toCheck.pubkey;
  }

  const account = new Account();
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: account.publicKey,
      lamports: amount,
      space: AccountLayout.span,
      programId: programIds().token,
    })
  );

  instructions.push(
    Token.createInitAccountInstruction(
      programIds().token,
      WRAPPED_SOL_MINT,
      account.publicKey,
      payer
    )
  );

  cleanupInstructions.push(
    Token.createCloseAccountInstruction(
      programIds().token,
      account.publicKey,
      payer,
      payer,
      []
    )
  );

  signers.push(account);

  return account.publicKey;
}

function createSplAccount(
  instructions: TransactionInstruction[],
  payer: PublicKey,
  accountRentExempt: number,
  mint: PublicKey,
  owner: PublicKey,
  space: number
) {
  const account = new Account();
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: account.publicKey,
      lamports: accountRentExempt,
      space,
      programId: programIds().token,
    })
  );

  instructions.push(
    Token.createInitAccountInstruction(
      programIds().token,
      mint,
      account.publicKey,
      owner
    )
  );

  return account;
}

export async function createTokenAccount (
  connection: Connection, 
  wallet: any, 
  components: LiquidityComponent[]
) {
  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span
  );

  const toAccountInstructions: TransactionInstruction[] = [];
  const cleanupToAccountInstructions: TransactionInstruction[] = [];
  const toAccountigners: Account[] = [];

  findOrCreateAccountByMint(
    wallet.publicKey,
    wallet.publicKey,
    toAccountInstructions,
    cleanupToAccountInstructions,
    accountRentExempt,
    new PublicKey(components[1].mintAddress),
    toAccountigners
  );

    await sendTransaction(
      connection,
      wallet,
      toAccountInstructions,
      toAccountigners
    )

  notify({
    message: `Token account created`,
    type: "success",
    description: ``,
  });
}

// TODO
// prograim id is different in different net
const TOKENSWAP_PROGRAM_ID = new PublicKey('SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8')
const SERUM_PROGRAM_ID = new PublicKey('DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY')
const ONESOL_PROGRAM_ID =  new PublicKey('26XgL6X46AHxcMkfDNfnfQHrqZGzYEcTLj9SmAV5dLrV')

interface TokenSwapAmountProps {
  input: number,
  output: number
}

interface SerumAmountProps {
  input: number,
  output: number
}

export async function onesolProtocolSwap (
  connection: Connection, 
  wallet: any, 
  B: any, 
  pool: PublicKey | null, 
  marketPublicKey: PublicKey | null, 
  slippage: number, 
  components: LiquidityComponent[],
  amounts: {
    tokenSwap: TokenSwapAmountProps,
    serumMarket: SerumAmountProps
  }
) {

  const fetchOnesolProtocol = async () => {
    const accounts = await connection.getProgramAccounts(ONESOL_PROGRAM_ID)
    const [deserialized] = accounts.map((info: any) => deserializeAccount(info)).filter((account: any) =>  new PublicKey(account.info.mint).toString() === B.mintAddress)

    let onesolProtocol 

    if (deserialized) {
      onesolProtocol = getOneSolProtocol(deserialized.info, connection, deserialized.pubkey, ONESOL_PROGRAM_ID, wallet.publicKey)
    }

    return onesolProtocol
  }


  const onesolProtocol = await fetchOnesolProtocol()

  if (!onesolProtocol) {
    return
  }

  let tokenSwapInfo = null
  let serumMarketInfo = null

  if (pool) {
    tokenSwapInfo = await loadTokenSwapInfo(connection, pool, TOKENSWAP_PROGRAM_ID, new Numberu64(amounts.tokenSwap.input), new Numberu64(amounts.tokenSwap.output), null)
  }

  if (marketPublicKey) {
    const market = await Market.load(connection, marketPublicKey, {}, SERUM_PROGRAM_ID)

    serumMarketInfo = new SerumDexMarketInfo(
      SERUM_PROGRAM_ID,
      market,
      new Numberu64(1),
      new Numberu64(51000),
      new Numberu64(51000),
      new Numberu64(getClientId()) 
    );
  }

  const amountIn = components[0].amount; // these two should include slippage
  const minAmountOut = components[1].amount * (1 - slippage);

  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span
  );

  const toAccountInstructions: TransactionInstruction[] = [];
  const cleanupToAccountInstructions: TransactionInstruction[] = [];
  const toAccountigners: Account[] = [];

  let toAccount = findOrCreateAccountByMint(
    wallet.publicKey,
    wallet.publicKey,
    toAccountInstructions,
    cleanupToAccountInstructions,
    accountRentExempt,
    new PublicKey(components[1].mintAddress),
    toAccountigners
  );

  const instructions: TransactionInstruction[] = [];
  const cleanupInstructions: TransactionInstruction[] = [];
  const signers: Account[] = [];

  const fromAccount = getWrappedAccount(
    instructions,
    cleanupInstructions,
    components[0].account,
    wallet.publicKey,
    amountIn + accountRentExempt,
    signers
  );

  const transferAuthority = approveAmount(
    instructions,
    cleanupInstructions,
    fromAccount,
    wallet.publicKey,
    amountIn,
    undefined
  );

  signers.push(transferAuthority);

  const swapInstruction = await onesolProtocol.createSwapInstruction(
    fromAccount,
    new PublicKey(components[0].mintAddress),
    toAccount,
    minAmountOut,
    tokenSwapInfo,
    serumMarketInfo,
    signers
  )

  instructions.push(swapInstruction)

  let tx = await sendTransaction(
    connection,
    wallet,
    instructions.concat(cleanupInstructions),
    signers
  );

  notify({
    message: "Trade executed.",
    type: "success",
    description: `Transaction - ${tx}`,
  });
  
}

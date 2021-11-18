import {
  AccountInfo,
  Connection,
  PublicKey,
  SystemProgram,
  Signer,
  Keypair,
  TransactionInstruction,
} from "@solana/web3.js";
import BN from 'bn.js';
import { sendTransaction, useConnection } from "./connection";
import { useEffect, useMemo, useState } from "react";
import { Token, MintLayout, AccountLayout, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";

import { notify } from "./notifications";
import {
  cache,
  getCachedAccount,
  useUserAccounts,
  getMultipleAccounts,
  useAccountByMint,
  getAccountInfo,
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
import {
  loadTokenSwapInfo,
  loadSerumDexMarket,
  OneSolProtocol,
  TokenSwapInfo,
  SerumDexMarketInfo,
  AmmInfo,
  Numberu64,
  loadSaberStableSwap,
  loadRaydiumAmmInfo
} from '../utils/onesol-protocol'
import { CurrencyContextState, useCurrencyLeg } from '../utils/currencyPair'
import {
  EXCHANGER_SERUM_DEX,
  EXCHANGER_SPL_TOKEN_SWAP,
  EXCHANGER_SABER_STABLE_SWAP,
  EXCHANGER_ORCA_SWAP,
  EXCHANGER_RAYDIUM
} from "./constant";
import { convert } from "../utils/utils";

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
            init: async () => { },
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

// Allow for this much price movement in the pool before adding liquidity to the pool aborts
const SLIPPAGE = 0.005;

export const hasAccount = (
  owner: PublicKey,
  mint: PublicKey,
  excluded?: Set<string>
) => {
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

export async function findOrCreateTokenAssociatedAccountByMint(
  payer: PublicKey,
  owner: PublicKey,
  instructions: TransactionInstruction[],
  cleanupInstructions: TransactionInstruction[],
  mint: PublicKey, // use to identify same type
  signers: Signer[],
  excluded?: Set<string>
): Promise<PublicKey> {
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
    toAccount = await createSplAssociatedTokenAccount(
      instructions,
      payer,
      mint,
      owner,
    );

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

function findOrCreateAccountByMint(
  payer: PublicKey,
  owner: PublicKey,
  instructions: TransactionInstruction[],
  cleanupInstructions: TransactionInstruction[],
  accountRentExempt: number,
  mint: PublicKey, // use to identify same type
  signers: Signer[],
  excluded?: Set<string>
): { tokenAccount: PublicKey, isNew: boolean } {
  const accountToFind = mint.toBase58();
  const account = getCachedAccount(
    (acc) =>
      acc.info.mint.toBase58() === accountToFind &&
      acc.info.owner.toBase58() === owner.toBase58() &&
      (excluded === undefined || !excluded.has(acc.pubkey.toBase58()))
  );
  const isWrappedSol = accountToFind === WRAPPED_SOL_MINT.toBase58();

  let toAccount: PublicKey;
  let isNew = false;

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
    isNew = true;

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

  return { tokenAccount: toAccount, isNew };
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
  const transferAuthority = Keypair.generate();

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
  signers: Signer[]
) {
  if (toCheck && !toCheck.info.isNative) {
    return toCheck.pubkey;
  }

  const account = Keypair.generate();

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
  const account = Keypair.generate();

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

export async function createSplAssociatedTokenAccount(
  instructions: TransactionInstruction[],
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
) {
  const associatedAddress = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    programIds().token,
    mint,
    owner,
  );

  instructions.push(
    Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      programIds().token,
      mint,
      associatedAddress,
      owner,
      payer,
    ))

  return associatedAddress;
}

export async function createTokenAccount(
  connection: Connection,
  wallet: any,
  mint: PublicKey,
) {
  const toAccountInstructions: TransactionInstruction[] = [];
  const cleanupToAccountInstructions: TransactionInstruction[] = [];
  const toAccountigners: Signer[] = [];

  await findOrCreateTokenAssociatedAccountByMint(
    wallet.publicKey,
    wallet.publicKey,
    toAccountInstructions,
    cleanupToAccountInstructions,
    mint,
    toAccountigners
  )

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

export interface TokenSwapAmountProps {
  input: number,
  output: number
}

export interface SerumAmountProps {
  input: number,
  output: number
  limitPrice: number,
  maxCoinQty: number
  maxPcQty: number
}

export interface DistributionRoute {
  amount_in: number,
  amount_out: number,
  source_token_mint: {
    decimals: number,
    pubkey: string,
  },
  destination_token_mint: {
    decimals: number,
    pubkey: string,
  },
  exchanger_flag: string,
  program_id: string,
  pubkey: string,
  ext_pubkey: string,
  ext_program_id: string,
}

async function swap(
  {
    onesolProtocol,
    connection,
    wallet,
    fromMintKey,
    toMintKey,
    fromAccount,
    toAccount,
    ammInfo,
    route,
    slippage,
    instructions,
    signers,
    useFull = false,
  }:
    {
      onesolProtocol: OneSolProtocol,
      connection: Connection,
      wallet: any,
      fromMintKey: PublicKey,
      toMintKey: PublicKey,
      fromAccount: PublicKey,
      toAccount: PublicKey,
      ammInfo: AmmInfo,
      route: DistributionRoute,
      slippage: number,
      instructions: TransactionInstruction[],
      signers: Signer[],
      useFull?: boolean,
    }
) {
  const { exchanger_flag, pubkey, program_id, amount_in, amount_out, ext_program_id, ext_pubkey } = route

  const amountIn = new Numberu64(amount_in)
  const expectAmountOut = new Numberu64(amount_out)
  const minimumAmountOut = new Numberu64(amount_out * (1 - slippage))

  if ([EXCHANGER_SPL_TOKEN_SWAP, EXCHANGER_ORCA_SWAP].includes(exchanger_flag)) {
    const splTokenSwapInfo = await loadTokenSwapInfo(connection, new PublicKey(pubkey), new PublicKey(program_id), null)

    await onesolProtocol.createSwapByTokenSwapInstruction({
      fromTokenAccountKey: fromAccount,
      toTokenAccountKey: toAccount,
      fromMintKey,
      toMintKey,
      userTransferAuthority: wallet.publicKey,
      ammInfo,
      amountIn,
      expectAmountOut,
      minimumAmountOut,
      splTokenSwapInfo,
      useFull,
    }, instructions, signers)
  } else if (exchanger_flag === EXCHANGER_SERUM_DEX) {
    const dexMarketInfo = await loadSerumDexMarket(connection, new PublicKey(pubkey), new PublicKey(program_id), new PublicKey(ext_pubkey), new PublicKey(ext_program_id))

    await onesolProtocol.createSwapBySerumDexInstruction({
      fromTokenAccountKey: fromAccount,
      toTokenAccountKey: toAccount,
      fromMintKey,
      toMintKey,
      userTransferAuthority: wallet.publicKey,
      ammInfo,
      amountIn,
      expectAmountOut,
      minimumAmountOut,
      dexMarketInfo,
      useFull,
    }, instructions, signers)
  } else if (exchanger_flag === EXCHANGER_SABER_STABLE_SWAP) {
    const stableSwapInfo = await loadSaberStableSwap({ connection, address: new PublicKey(pubkey), programId: new PublicKey(program_id) })

    await onesolProtocol.createSwapBySaberStableSwapInstruction({
      fromTokenAccountKey: fromAccount,
      toTokenAccountKey: toAccount,
      fromMintKey,
      toMintKey,
      userTransferAuthority: wallet.publicKey,
      ammInfo,
      amountIn,
      expectAmountOut,
      minimumAmountOut,
      stableSwapInfo,
      useFull,
    }, instructions, signers)
  } else if (exchanger_flag === EXCHANGER_RAYDIUM) {
    const raydiumInfo = await loadRaydiumAmmInfo({ connection, address: new PublicKey(pubkey), programId: new PublicKey(program_id) })

    await onesolProtocol.createSwapByRaydiumSwapInstruction({
      fromTokenAccountKey: fromAccount,
      toTokenAccountKey: toAccount,
      fromMintKey,
      toMintKey,
      userTransferAuthority: wallet.publicKey,
      ammInfo,
      amountIn,
      expectAmountOut,
      minimumAmountOut,
      raydiumInfo,
      useFull,
    }, instructions, signers)
  }
}

async function oneStepSwap(
  {
    onesolProtocol,
    connection,
    wallet,
    A,
    B,
    ammInfo,
    component,
    route,
    slippage,
    step,
    steps,
    useFull = false,
  }:
    {
      onesolProtocol: any,
      connection: Connection,
      wallet: any,
      A: { mintAddress: string, account: TokenAccount | undefined },
      B: { mintAddress: string, account: TokenAccount | undefined },
      ammInfo: AmmInfo,
      component: LiquidityComponent,
      route: DistributionRoute,
      slippage: number,
      step: number,
      steps: number,
      useFull?: boolean
    }
): Promise<boolean> {
  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span
  );

  const instructions: TransactionInstruction[] = [];
  const cleanupInstructions: TransactionInstruction[] = [];
  const signers: Signer[] = [];

  const { exchanger_flag, pubkey, program_id, amount_in, amount_out, ext_program_id, ext_pubkey } = route

  const fromMintKey = new PublicKey(A.mintAddress)
  const toMintKey = new PublicKey(B.mintAddress)

  const amountIn = new Numberu64(amount_in)
  const expectAmountOut = new Numberu64(amount_out)
  const minimumAmountOut = new Numberu64(amount_out * (1 - slippage))

  const fromAccount = getWrappedAccount(
    instructions,
    cleanupInstructions,
    A.account,
    wallet.publicKey,
    component.amount + accountRentExempt,
    signers
  );

  const { tokenAccount: toAccount, isNew } = findOrCreateAccountByMint(
    wallet.publicKey,
    wallet.publicKey,
    instructions,
    cleanupInstructions,
    accountRentExempt,
    toMintKey,
    signers
  )

  if ([EXCHANGER_SPL_TOKEN_SWAP, EXCHANGER_ORCA_SWAP].includes(exchanger_flag)) {
    const splTokenSwapInfo = await loadTokenSwapInfo(connection, new PublicKey(pubkey), new PublicKey(program_id), null)

    await onesolProtocol.createSwapByTokenSwapInstruction({
      fromTokenAccountKey: fromAccount,
      toTokenAccountKey: toAccount,
      fromMintKey,
      toMintKey,
      userTransferAuthority: wallet.publicKey,
      ammInfo,
      amountIn,
      expectAmountOut,
      minimumAmountOut,
      splTokenSwapInfo,
      useFull,
    }, instructions, signers)
  } else if (exchanger_flag === EXCHANGER_SERUM_DEX) {
    const dexMarketInfo = await loadSerumDexMarket(connection, new PublicKey(pubkey), new PublicKey(program_id), new PublicKey(ext_pubkey), new PublicKey(ext_program_id))

    await onesolProtocol.createSwapBySerumDexInstruction({
      fromTokenAccountKey: fromAccount,
      toTokenAccountKey: toAccount,
      fromMintKey,
      toMintKey,
      userTransferAuthority: wallet.publicKey,
      ammInfo,
      amountIn,
      expectAmountOut,
      minimumAmountOut,
      dexMarketInfo,
      useFull
    }, instructions, signers)
  } else if (exchanger_flag === EXCHANGER_SABER_STABLE_SWAP) {
    const stableSwapInfo = await loadSaberStableSwap({ connection, address: new PublicKey(pubkey), programId: new PublicKey(program_id) })

    await onesolProtocol.createSwapBySaberStableSwapInstruction({
      fromTokenAccountKey: fromAccount,
      toTokenAccountKey: toAccount,
      fromMintKey,
      toMintKey,
      userTransferAuthority: wallet.publicKey,
      ammInfo,
      amountIn,
      expectAmountOut,
      minimumAmountOut,
      stableSwapInfo,
      useFull
    }, instructions, signers)
  } else if (exchanger_flag === EXCHANGER_RAYDIUM) {
    const raydiumInfo = await loadRaydiumAmmInfo({ connection, address: new PublicKey(pubkey), programId: new PublicKey(program_id) })

    await onesolProtocol.createSwapByRaydiumSwapInstruction({
      fromTokenAccountKey: fromAccount,
      toTokenAccountKey: toAccount,
      fromMintKey,
      toMintKey,
      userTransferAuthority: wallet.publicKey,
      ammInfo,
      amountIn,
      expectAmountOut,
      minimumAmountOut,
      raydiumInfo,
      useFull,
    }, instructions, signers)
  }

  const tx = await sendTransaction(
    connection,
    wallet,
    instructions.concat(cleanupInstructions),
    signers
  )

  notify({
    message: `${step} of ${steps} transaction succeed${step === steps ? '.' : ', waiting for the next one...'}`,
    type: "success",
    description: `Transaction - ${tx}`,
  });

  return isNew
}

export async function onesolProtocolSwap(
  connection: Connection,
  wallet: any,
  A: CurrencyContextState,
  B: CurrencyContextState,
  ammInfos: AmmInfo[],
  distribution: any,
  components: LiquidityComponent[],
  slippage: number
) {
  const onesolProtocol: OneSolProtocol = await OneSolProtocol.createOneSolProtocol({ connection, wallet: wallet.publicKey })

  if (!onesolProtocol) {
    return
  }

  // indirect exchange(SOL -> USDC -> ETH) and need to split transactions
  if (ammInfos.length === 2 && distribution.split_tx) {
    const [oneRoutes, twoRoutes] = distribution.routes
    const [one] = oneRoutes
    const [two] = twoRoutes

    await oneStepSwap({
      onesolProtocol,
      connection,
      wallet,
      A: { mintAddress: A.mintAddress, account: A.account },
      B: { mintAddress: one.destination_token_mint.pubkey, account: undefined },
      ammInfo: ammInfos[0],
      component: components[0],
      route: one,
      slippage,
      step: 1,
      steps: 2,
    })

    const tokenAccountC = getCachedAccount(
      (acc) =>
        acc.info.mint.toBase58() === one.destination_token_mint.pubkey &&
        acc.info.owner.toBase58() === wallet.publicKey.toBase58()
    )

    if (tokenAccountC) {
      const balance = tokenAccountC.info.amount
      const amount = balance.gt(two.amount_in) ? two.amount_in : balance.toNumber()

      await oneStepSwap({
        onesolProtocol,
        connection,
        wallet,
        A: { mintAddress: one.destination_token_mint.pubkey, account: tokenAccountC },
        B: { mintAddress: B.mintAddress, account: B.account },
        ammInfo: ammInfos[1],
        component: { mintAddress: one.destination_token_mint.pubkey, amount },
        route: { ...two, amount_in: amount },
        slippage,
        step: 2,
        steps: 2,
      })
    }
  } else {
    const instructions: TransactionInstruction[] = [];
    const cleanupInstructions: TransactionInstruction[] = [];
    const signers: Signer[] = [];

    const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
      AccountLayout.span
    );

    const fromMintKey = new PublicKey(A.mintAddress)
    const toMintKey = new PublicKey(B.mintAddress)

    const fromAccount = getWrappedAccount(
      instructions,
      cleanupInstructions,
      A.account,
      wallet.publicKey,
      components[0].amount + accountRentExempt,
      signers
    );

    const { tokenAccount: toAccount } = findOrCreateAccountByMint(
      wallet.publicKey,
      wallet.publicKey,
      instructions,
      cleanupInstructions,
      accountRentExempt,
      toMintKey,
      signers
    )

    // indirect exchange(SOL -> USDC -> ETH)
    if (ammInfos.length === 2) {
      const [oneRoutes, twoRoutes] = distribution.routes
      const [one] = oneRoutes
      const [two] = twoRoutes

      const middleMintKey = new PublicKey(one.destination_token_mint.pubkey)

      const { tokenAccount: middleAccount, isNew: useFull } = findOrCreateAccountByMint(
        wallet.publicKey,
        wallet.publicKey,
        instructions,
        cleanupInstructions,
        accountRentExempt,
        middleMintKey,
        signers
      )

      await swap({
        onesolProtocol,
        connection,
        wallet,
        fromMintKey,
        toMintKey: middleMintKey,
        fromAccount,
        toAccount: middleAccount,
        ammInfo: ammInfos[0],
        route: one,
        slippage,
        instructions,
        signers,
        useFull: false,
      })

      await swap({
        onesolProtocol,
        connection,
        wallet,
        fromMintKey: middleMintKey,
        toMintKey,
        fromAccount: middleAccount,
        toAccount: toAccount,
        ammInfo: ammInfos[1],
        route: two,
        slippage,
        instructions,
        signers,
        useFull
      })
    } else if (ammInfos.length === 1) {
      // direct exchange(SOL -> USDC)
      const [routes] = distribution.routes

      const promises = routes.map(async (route: any) => swap({
        onesolProtocol,
        connection,
        wallet,
        fromMintKey,
        toMintKey,
        fromAccount,
        toAccount: toAccount,
        ammInfo: ammInfos[0],
        route,
        slippage,
        instructions,
        signers,
      }))

      await Promise.all(promises)
    } else {
      return
    }

    const tx = await sendTransaction(
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
}

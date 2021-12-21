import {
  AccountInfo,
  Connection,
  PublicKey,
  SystemProgram,
  Signer,
  Keypair,
  TransactionInstruction,
} from "@solana/web3.js";
import { Token, AccountLayout, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

import { sendTransaction, Transactions, signAllTransactions, sendSignedTransaction } from "./connection";
import { notify } from "./notifications";
import {
  cache,
  getCachedAccount,
} from "./accounts";
import {
  programIds,
} from "./ids";
import {
  PoolInfo,
  TokenAccount,
  TokenSwapLayout,
} from "./../models";
import {
  loadTokenSwapInfo,
  loadSerumDexMarket,
  OneSolProtocol,
  loadSaberStableSwap,
  loadRaydiumAmmInfo
} from '../utils/onesol-protocol'
import {
  u64,
} from '@solana/spl-token';
import { CurrencyContextState } from '../utils/currencyPair'
import {
  EXCHANGER_SERUM_DEX,
  EXCHANGER_SPL_TOKEN_SWAP,
  EXCHANGER_SABER_STABLE_SWAP,
  EXCHANGER_ORCA_SWAP,
  EXCHANGER_RAYDIUM,
  ONESOL_PROGRAM_ID, WRAPPED_SOL_MINT,
  SERUM_PROGRAM_ID,
  EXCHANGER_ONEMOON
} from "./constant";

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

async function findOrCreateAccountByMint(
  payer: PublicKey,
  owner: PublicKey,
  instructions: TransactionInstruction[],
  cleanupInstructions: TransactionInstruction[],
  accountRentExempt: number,
  mint: PublicKey, // use to identify same type
  signers: Signer[],
  excluded?: Set<string>
): Promise<PublicKey> {
  const accountToFind = mint.toBase58();
  const isWrappedSol = accountToFind === WRAPPED_SOL_MINT.toBase58();

  if (isWrappedSol) {
    // creating depositor pool account
    const newToAccount = createSplAccount(
      instructions,
      payer,
      accountRentExempt,
      mint,
      owner,
      AccountLayout.span
    );

    const toAccount = newToAccount.publicKey;
    signers.push(newToAccount);
    cleanupInstructions.push(
      Token.createCloseAccountInstruction(
        programIds().token,
        toAccount,
        payer,
        payer,
        []
      )
    );
    return toAccount
  } else {
    const associateTokenAddress = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, mint, owner)
    const account = getCachedAccount(
      (acc) =>
        acc.pubkey.equals(associateTokenAddress) &&
        acc.info.mint.toBase58() === accountToFind &&
        acc.info.owner.toBase58() === owner.toBase58() &&
        (excluded === undefined || !excluded.has(acc.pubkey.toBase58()))
    );

    if (account) {
      return account.pubkey;
    }
    return await createSplAssociatedTokenAccount(
      instructions,
      payer,
      mint,
      owner
    )
  }
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
  const toAccountigners: Signer[] = [];

  const account = await findOrCreateAccountByMint(
    wallet.publicKey,
    wallet.publicKey,
    toAccountInstructions,
    [],
    0,
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

  return account;
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

// for direct exhange (SOL -> USDC)
async function swap(
  {
    onesolProtocol,
    connection,
    fromMintKey,
    toMintKey,
    fromAccount,
    toAccount,
    route,
    slippage,
    instructions,
    signers,
    userTransferAuthority,
    feeTokenAccount,
    openOrders
  }:
    {
      onesolProtocol: OneSolProtocol,
      connection: Connection,
      wallet: any,
      fromMintKey: PublicKey,
      toMintKey: PublicKey,
      fromAccount: PublicKey,
      toAccount: PublicKey,
      route: DistributionRoute,
      slippage: number,
      instructions: TransactionInstruction[],
      signers: Signer[],
      userTransferAuthority: PublicKey,
      feeTokenAccount: PublicKey,
      openOrders?: PublicKey
    },
) {
  const {
    exchanger_flag,
    pubkey,
    program_id,
    amount_in,
    amount_out,
  } = route

  const amountIn = new u64(amount_in)
  const expectAmountOut = new u64(amount_out)
  const minimumAmountOut = new u64(amount_out * (1 - slippage))

  if ([EXCHANGER_SPL_TOKEN_SWAP, EXCHANGER_ORCA_SWAP, EXCHANGER_ONEMOON].includes(exchanger_flag)) {
    const splTokenSwapInfo = await loadTokenSwapInfo(
      connection,
      new PublicKey(pubkey),
      new PublicKey(program_id),
      null
    )

    await onesolProtocol.createSwapByTokenSwapInstruction({
      fromTokenAccountKey: fromAccount,
      toTokenAccountKey: toAccount,
      fromMintKey,
      toMintKey,
      userTransferAuthority,
      feeTokenAccount,
      amountIn,
      expectAmountOut,
      minimumAmountOut,
      splTokenSwapInfo,
    }, instructions, signers)
  } else if (exchanger_flag === EXCHANGER_SERUM_DEX) {
    if (!openOrders) {
      throw new Error('Open orders not found')
    }

    const dexMarketInfo = await loadSerumDexMarket(
      connection,
      new PublicKey(pubkey),
      new PublicKey(program_id),
      openOrders
    )

    await onesolProtocol.createSwapBySerumDexInstruction({
      fromTokenAccountKey: fromAccount,
      toTokenAccountKey: toAccount,
      fromMintKey,
      toMintKey,
      userTransferAuthority,
      feeTokenAccount,
      amountIn,
      expectAmountOut,
      minimumAmountOut,
      dexMarketInfo,
    }, instructions, signers)
  } else if (exchanger_flag === EXCHANGER_SABER_STABLE_SWAP) {
    const stableSwapInfo = await loadSaberStableSwap({
      connection,
      address: new PublicKey(pubkey),
      programId: new PublicKey(program_id)
    })

    await onesolProtocol.createSwapBySaberStableSwapInstruction({
      fromTokenAccountKey: fromAccount,
      toTokenAccountKey: toAccount,
      fromMintKey,
      toMintKey,
      userTransferAuthority,
      feeTokenAccount,
      amountIn,
      expectAmountOut,
      minimumAmountOut,
      stableSwapInfo,
    }, instructions, signers)
  } else if (exchanger_flag === EXCHANGER_RAYDIUM) {
    const raydiumInfo = await loadRaydiumAmmInfo({
      connection,
      address: new PublicKey(pubkey),
      programId: new PublicKey(program_id)
    })

    await onesolProtocol.createSwapByRaydiumSwapInstruction({
      fromTokenAccountKey: fromAccount,
      toTokenAccountKey: toAccount,
      fromMintKey,
      toMintKey,
      userTransferAuthority,
      feeTokenAccount,
      amountIn,
      expectAmountOut,
      minimumAmountOut,
      raydiumInfo,
    }, instructions, signers)
  }
}

// for indirect exchange (SOL -> USDC -> ETH) step 1
async function swapIn(
  {
    onesolProtocol,
    connection,
    fromMintKey,
    toMintKey,
    fromAccount,
    toAccount,
    route,
    instructions,
    signers,
    swapInfo,
    userTransferAuthority,
    openOrders
  }:
    {
      onesolProtocol: OneSolProtocol,
      connection: Connection,
      fromMintKey: PublicKey,
      toMintKey: PublicKey,
      fromAccount: PublicKey,
      toAccount: PublicKey,
      route: DistributionRoute,
      instructions: TransactionInstruction[],
      signers: Signer[],
      userTransferAuthority: PublicKey,
      swapInfo: PublicKey,
      openOrders?: PublicKey
    },
) {
  const {
    exchanger_flag,
    pubkey,
    program_id,
    amount_in,
  } = route

  const amountIn = new u64(amount_in)

  const data = {
    fromTokenAccountKey: fromAccount,
    toTokenAccountKey: toAccount,
    fromMintKey,
    toMintKey,
    userTransferAuthority,
    amountIn,
    swapInfo,
  }

  if ([EXCHANGER_SPL_TOKEN_SWAP, EXCHANGER_ORCA_SWAP, EXCHANGER_ONEMOON].includes(exchanger_flag)) {
    const splTokenSwapInfo = await loadTokenSwapInfo(
      connection,
      new PublicKey(pubkey),
      new PublicKey(program_id),
      null
    )

    await onesolProtocol.createSwapInByTokenSwapInstruction({
      ...data,
      splTokenSwapInfo,
    }, instructions, signers)
  } else if (exchanger_flag === EXCHANGER_SERUM_DEX) {
    if (!openOrders) {
      throw new Error('Open orders not found')
    }

    const dexMarketInfo = await loadSerumDexMarket(
      connection,
      new PublicKey(pubkey),
      new PublicKey(program_id),
      openOrders
    )

    await onesolProtocol.createSwapInBySerumDexInstruction({
      ...data,
      dexMarketInfo,
    }, instructions, signers)
  } else if (exchanger_flag === EXCHANGER_SABER_STABLE_SWAP) {
    const stableSwapInfo = await loadSaberStableSwap({
      connection,
      address: new PublicKey(pubkey),
      programId: new PublicKey(program_id)
    })

    await onesolProtocol.createSwapInBySaberStableSwapInstruction({
      ...data,
      stableSwapInfo,
    }, instructions, signers)
  } else if (exchanger_flag === EXCHANGER_RAYDIUM) {
    const raydiumInfo = await loadRaydiumAmmInfo({
      connection,
      address: new PublicKey(pubkey),
      programId: new PublicKey(program_id)
    })

    await onesolProtocol.createSwapInByRaydiumSwap2Instruction({
      ...data,
      raydiumInfo,
    }, instructions, signers)
  }
}

// for indirect exchange (SOL -> USDC -> ETH) step 2
async function swapOut(
  {
    onesolProtocol,
    connection,
    fromMintKey,
    toMintKey,
    fromAccount,
    toAccount,
    route,
    instructions,
    signers,
    userTransferAuthority,
    swapInfo,
    feeTokenAccount,
    slippage,
    amountOut,
    openOrders,
  }:
    {
      onesolProtocol: OneSolProtocol,
      connection: Connection,
      wallet: any,
      fromMintKey: PublicKey,
      toMintKey: PublicKey,
      fromAccount: PublicKey,
      toAccount: PublicKey,
      route: DistributionRoute,
      instructions: TransactionInstruction[],
      signers: Signer[],
      userTransferAuthority: PublicKey,
      swapInfo: PublicKey,
      feeTokenAccount: PublicKey,
      slippage: number,
      amountOut: number,
      openOrders?: PublicKey
    },
) {
  const {
    exchanger_flag,
    pubkey,
    program_id,
  } = route

  const expectAmountOut = new u64(amountOut)
  const minimumAmountOut = new u64(amountOut * (1 - slippage))

  const data = {
    fromTokenAccountKey: fromAccount,
    toTokenAccountKey: toAccount,
    fromMintKey,
    toMintKey,
    userTransferAuthority,
    swapInfo,
    expectAmountOut,
    minimumAmountOut,
    feeTokenAccount
  }

  if ([EXCHANGER_SPL_TOKEN_SWAP, EXCHANGER_ORCA_SWAP, EXCHANGER_ONEMOON].includes(exchanger_flag)) {
    const splTokenSwapInfo = await loadTokenSwapInfo(
      connection,
      new PublicKey(pubkey),
      new PublicKey(program_id),
      null
    )

    await onesolProtocol.createSwapOutByTokenSwapInstruction({
      ...data,
      splTokenSwapInfo,
    }, instructions, signers)
  } else if (exchanger_flag === EXCHANGER_SERUM_DEX) {
    if (!openOrders) {
      throw new Error('Open orders not found')
    }

    const dexMarketInfo = await loadSerumDexMarket(
      connection,
      new PublicKey(pubkey),
      new PublicKey(program_id),
      openOrders
    )

    await onesolProtocol.createSwapOutBySerumDexInstruction({
      ...data,
      dexMarketInfo,
    }, instructions, signers)
  } else if (exchanger_flag === EXCHANGER_SABER_STABLE_SWAP) {
    const stableSwapInfo = await loadSaberStableSwap({
      connection,
      address: new PublicKey(pubkey),
      programId: new PublicKey(program_id)
    })

    await onesolProtocol.createSwapOutBySaberStableSwapInstruction({
      ...data,
      stableSwapInfo,
    }, instructions, signers)
  } else if (exchanger_flag === EXCHANGER_RAYDIUM) {
    const raydiumInfo = await loadRaydiumAmmInfo({
      connection,
      address: new PublicKey(pubkey),
      programId: new PublicKey(program_id)
    })

    await onesolProtocol.createSwapOutByRaydiumSwap2Instruction({
      ...data,
      raydiumInfo,
    }, instructions, signers)
  }
}

export async function findOrCreateOnesolSwapInfo({
  onesolProtocol,
  wallet,
  signers,
  instructions,
}: {
  onesolProtocol: OneSolProtocol,
  wallet: any,
  instructions: Array<TransactionInstruction>,
  signers: Signer[],

}): Promise<PublicKey> {
  let pubkey
  let swapInfo = await onesolProtocol.findSwapInfo({ wallet: wallet.publicKey })

  if (!swapInfo) {
    pubkey = await onesolProtocol.createSwapInfo({
      owner: wallet.publicKey,
      instructions,
      signers
    })
  } else {
    pubkey = swapInfo.pubkey
  }

  return pubkey
}

export async function createAccountsTransaction(
  onesolProtocol: OneSolProtocol,
  connection: Connection,
  wallet: any,
  A: { mintAddress: string, account: TokenAccount | undefined },
  B: { mintAddress: string },
  C: { mintAddress: string },
  amount: number,
  routes: DistributionRoute[][],
) {
  const instructions: TransactionInstruction[] = [];
  const cleanupInstructions: TransactionInstruction[] = [];
  const signers: Signer[] = [];

  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span
  );

  const fromMintKey = new PublicKey(A.mintAddress)
  const toMintKey = new PublicKey(B.mintAddress)

  let middleAccount
  let middleMintKey

  const fromAccount = getWrappedAccount(
    instructions,
    cleanupInstructions,
    A.account,
    wallet.publicKey,
    amount + accountRentExempt,
    signers
  );

  const toAccount = await findOrCreateAccountByMint(
    wallet.publicKey,
    wallet.publicKey,
    instructions,
    cleanupInstructions,
    accountRentExempt,
    toMintKey,
    signers
  )

  middleMintKey = new PublicKey(C.mintAddress)

  middleAccount = await findOrCreateAccountByMint(
    wallet.publicKey,
    wallet.publicKey,
    instructions,
    cleanupInstructions,
    accountRentExempt,
    middleMintKey,
    signers
  )

  const swapInfo = await findOrCreateOnesolSwapInfo({
    onesolProtocol,
    wallet,
    instructions,
    signers
  })

  const [swapInRoutes, swapOutRoutes] = routes

  let swapInOpenOrders

  const swapInSerum = swapInRoutes.find((r: DistributionRoute) => r.exchanger_flag === EXCHANGER_SERUM_DEX)

  if (swapInSerum) {
    swapInOpenOrders = await onesolProtocol.findOrCreateOpenOrdersAccount({
      market: new PublicKey(swapInSerum.pubkey),
      owner: wallet.publicKey,
      serumProgramId: SERUM_PROGRAM_ID,
      instructions,
      signers
    })
  }

  let swapOutOpenOrders

  const swapOutSerum = swapOutRoutes.find((r: DistributionRoute) => r.exchanger_flag === EXCHANGER_SERUM_DEX)

  if (swapOutSerum) {
    swapOutOpenOrders = await onesolProtocol.findOrCreateOpenOrdersAccount({
      market: new PublicKey(swapOutSerum.pubkey),
      owner: wallet.publicKey,
      serumProgramId: SERUM_PROGRAM_ID,
      instructions,
      signers
    })
  }

  return {
    swapInfo,
    fromAccount,
    toAccount,
    middleAccount,
    fromMintKey,
    toMintKey,
    middleMintKey,
    swapInOpenOrders,
    swapOutOpenOrders,
    transaction: {
      instructions,
      signers,
    },
    cleanupTransaction: {
      instructions: cleanupInstructions,
      signers: [],
    }
  }
}

export async function createSwapTransactions({
  onesolProtocol,
  connection,
  swapInfo,
  routes,
  fromAccount,
  toAccount,
  middleAccount,
  fromMintKey,
  toMintKey,
  middleMintKey,
  wallet,
  amountOut,
  slippage,
  feeTokenAccount,
  swapInOpenOrders,
  swapOutOpenOrders,
}: {
  onesolProtocol: OneSolProtocol,
  connection: Connection,
  swapInfo: PublicKey,
  routes: DistributionRoute[][],
  fromAccount: PublicKey,
  toAccount: PublicKey,
  middleAccount: PublicKey,
  fromMintKey: PublicKey,
  toMintKey: PublicKey,
  middleMintKey: PublicKey,
  wallet: any,
  amountOut: number,
  slippage: number,
  feeTokenAccount: PublicKey,
  swapInOpenOrders?: PublicKey,
  swapOutOpenOrders?: PublicKey,
}): Promise<Transactions> {
  const instructions: TransactionInstruction[] = [];
  const signers: Signer[] = [];

  const [routesOne, routesTwo] = routes
  const [one] = routesOne
  const [two] = routesTwo

  await onesolProtocol.setupSwapInfo({
    swapInfo,
    tokenAccount: middleAccount,
    instructions, signers
  })

  await swapIn({
    onesolProtocol,
    connection,
    fromAccount,
    toAccount: middleAccount,
    fromMintKey,
    toMintKey: middleMintKey,
    swapInfo,
    route: one,
    instructions,
    signers,
    userTransferAuthority: wallet.publicKey,
    openOrders: swapInOpenOrders,
  })

  await swapOut({
    onesolProtocol,
    connection,
    fromAccount: middleAccount,
    toAccount,
    fromMintKey: middleMintKey,
    toMintKey,
    swapInfo,
    route: two,
    instructions,
    signers,
    userTransferAuthority: wallet.publicKey,
    slippage,
    amountOut,
    feeTokenAccount,
    wallet,
    openOrders: swapOutOpenOrders,
  })

  return { instructions, signers }
}

export async function onesolProtocolSwap(
  connection: Connection,
  wallet: any,
  A: CurrencyContextState,
  B: CurrencyContextState,
  distribution: any,
  slippage: number,
  feeTokenAccount: PublicKey,
) {
  const onesolProtocol: OneSolProtocol = await OneSolProtocol.createOneSolProtocol({
    connection,
    wallet: wallet.publicKey,
    programId: ONESOL_PROGRAM_ID
  })

  if (!onesolProtocol) {
    return
  }

  const { routes } = distribution

  // indirect exchange(SOL -> USDC -> ETH)
  if (routes.length === 2) {
    const [oneRoutes] = routes
    const [one] = oneRoutes

    const transactions: Transactions[] = []

    const {
      swapInfo,
      fromAccount,
      toAccount,
      fromMintKey,
      toMintKey,
      middleAccount,
      middleMintKey,
      transaction: createAccountsTransactions,
      cleanupTransaction,
      swapInOpenOrders,
      swapOutOpenOrders
    } = await createAccountsTransaction(
      onesolProtocol,
      connection,
      wallet,
      {
        mintAddress: A.mintAddress,
        account: A.account
      },
      B,
      {
        mintAddress: one.destination_token_mint.pubkey
      },
      distribution.amount_in,
      routes
    )

    if (createAccountsTransactions.instructions.length > 0) {
      transactions.push(createAccountsTransactions)
    }

    // create swap transactions
    const swapTransactions = await createSwapTransactions({
      onesolProtocol,
      connection,
      wallet,
      swapInfo,
      routes: distribution.routes,
      fromAccount,
      toAccount,
      middleAccount,
      fromMintKey,
      toMintKey,
      middleMintKey,
      amountOut: distribution.amount_out,
      feeTokenAccount,
      slippage,
      swapInOpenOrders,
      swapOutOpenOrders
    })
    if (swapTransactions.instructions.length <= 0) {
      // TODO notify error message
      return
    }

    transactions.push(swapTransactions)

    if (cleanupTransaction.instructions.length > 0) {
      transactions.push(cleanupTransaction)
    }

    const signedTransactions = await signAllTransactions(connection, wallet, transactions)

    for (let i = 0; i < signedTransactions.length; i++) {
      try {
        const txid = await sendSignedTransaction(
          connection,
          wallet,
          signedTransactions[i]
        )

        notify({
          message: `${i + 1} of ${signedTransactions.length} transaction succeed${i === signedTransactions.length - 1 ? '.' : ', waiting for the next one...'}`,
          description: `Transaction - ${txid}`,
          type: 'success',
          duration: 10,
          txid
        });
      } catch (e) {
        const error = e as Error
        //@ts-ignore
        window.gtag('event', 'swap_error', {
          data: error?.message
        })

        if (signedTransactions.length === 3 && i === 1) {
          console.log('swap step error: ', e)

          notify({
            description: "Please try again",
            message: "Swap trade cancelled.",
            type: "error",
            duration: 10 
          });
        } else {
          throw(e)
        }
      }
    }
  } else if (routes.length === 1) {
    // direct exchange(SOL -> USDC)
    const [routes] = distribution.routes

    const instructions: TransactionInstruction[] = [];
    const cleanupInstructions: TransactionInstruction[] = [];
    const signers: Signer[] = [];

    const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
      AccountLayout.span
    );

    const serum = routes.find((r: DistributionRoute) => r.exchanger_flag === EXCHANGER_SERUM_DEX)

    let openOrders: PublicKey

    if (serum) {
      openOrders = await onesolProtocol.findOrCreateOpenOrdersAccount({
        market: new PublicKey(serum.pubkey),
        owner: wallet.publicKey,
        serumProgramId: SERUM_PROGRAM_ID,
        instructions,
        signers
      })
    }

    const fromMintKey = new PublicKey(A.mintAddress)
    const toMintKey = new PublicKey(B.mintAddress)

    const fromAccount = getWrappedAccount(
      instructions,
      cleanupInstructions,
      A.account,
      wallet.publicKey,
      distribution.amount_in + accountRentExempt,
      signers
    );

    const toAccount = await findOrCreateAccountByMint(
      wallet.publicKey,
      wallet.publicKey,
      instructions,
      cleanupInstructions,
      accountRentExempt,
      toMintKey,
      signers
    )

    const promises = routes.map(async (route: any) => swap({
      onesolProtocol,
      connection,
      wallet,
      fromMintKey,
      toMintKey,
      fromAccount,
      toAccount,
      route,
      slippage,
      instructions,
      signers,
      userTransferAuthority: wallet.publicKey,
      feeTokenAccount,
      openOrders
    }))

    await Promise.all(promises)

    const txid = await sendTransaction(
      connection,
      wallet,
      instructions.concat(cleanupInstructions),
      signers
    );

    notify({
      message: "Trade executed.",
      type: "success",
      description: `Transaction - ${txid}`,
      txid
    });
  } else {
    return
  }
}

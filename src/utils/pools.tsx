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
  getCachedAccount,
} from "./accounts";
import {
  programIds,
} from "./ids";
import {
  TokenSwapLayout,
} from "./../models";
import { WRAPPED_SOL_MINT } from "./constant";

export const isLatest = (swap: AccountInfo<Buffer>) => {
  return swap.data.length === TokenSwapLayout.span;
};

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

export enum PoolOperation {
  Add,
  SwapGivenInput,
  SwapGivenProceeds,
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

export async function makeSwapTransactions({
  connection,
  wallet,
  setupInstructions,
  swapInstructions,
  cleanupInstructions,
  setupSigners,
  swapSigners,
  cleanupSigners,
}: {
  connection: Connection,
  wallet: any,
  setupInstructions: TransactionInstruction[]
  swapInstructions: TransactionInstruction[]
  cleanupInstructions: TransactionInstruction[]
  setupSigners: Signer[]
  swapSigners: Signer[]
  cleanupSigners: Signer[]
}
) {
   const transactions: Transactions[] = []

   if (setupInstructions.length) {
     transactions.push({
       instructions: setupInstructions,
       signers: setupSigners
     })
   }

   if (swapInstructions.length) {
     transactions.push({
       instructions: swapInstructions,
       signers: swapSigners
     })
   }
   
   if (cleanupInstructions.length) {
     transactions.push({
       instructions: cleanupInstructions,
       signers: cleanupSigners
     })
   }

  if (!transactions.length) {
    throw new Error('No instructions to send')
  } else if (transactions.length === 1) {
    const { instructions, signers } = transactions[0]

    const txid = await sendTransaction(
      connection,
      wallet,
      instructions,
      signers
    );

    notify({
      message: "Trade executed.",
      type: "success",
      description: `Transaction - ${txid}`,
      txid
    });
  } else {
    const signedTransactions = await signAllTransactions(connection, wallet, transactions)

    for (let i = 0; i < signedTransactions.length; i++) {
      try {
        const txid = await sendSignedTransaction(
          connection,
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
  }
}
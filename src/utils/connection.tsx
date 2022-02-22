
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Connection,
  Transaction,
  Signer,
  TransactionInstruction,
} from "@solana/web3.js";

import { useLocalStorageState, getFastestEndpoint } from './utils'
import { setProgramIds } from "./ids";
import { ENDPOINTS, CHAIN_ID, CHAIN_NAME} from '../utils/constant'

import { notify } from "./notifications";
import { ExplorerLink } from "../components/explorerLink";

export type ENV = "mainnet-beta" | "testnet" | "devnet" | "localnet";

const DEFAULT = ENDPOINTS[0];
const DEFAULT_SLIPPAGE = 0.005;

interface ConnectionConfig {
  connection: Connection;
  // sendConnection: Connection;
  endpoint: string;
  slippage: number;
  setSlippage: (val: number) => void;
  env: ENV;
  setEndpoint: (val: string) => void;
  chainId: number,
}

const ConnectionContext = React.createContext<ConnectionConfig>({
  endpoint: DEFAULT,
  setEndpoint: () => { },
  slippage: DEFAULT_SLIPPAGE,
  setSlippage: (val: number) => { },
  connection: new Connection(DEFAULT, "recent"),
  // sendConnection: new Connection(DEFAULT, "recent"),
  env: CHAIN_NAME,
  chainId: Number(CHAIN_ID),
});

export function ConnectionProvider({ children = undefined as any }) {
  const [endpoint, setEndpoint] = useState(DEFAULT);

  const [slippage, setSlippage] = useLocalStorageState(
    "slippage",
    DEFAULT_SLIPPAGE.toString()
  );

  const connection = useMemo(() => new Connection(endpoint, "recent"), [
    endpoint,
  ]);
  // const sendConnection = useMemo(() => new Connection(endpoint, "recent"), [
  //   endpoint,
  // ]);

  const env = CHAIN_NAME;
  const chainId = Number(CHAIN_ID); 

  useEffect(() => {
    if (!['mainnet-beta', 'devnet'].includes(env)) {
      notify({
        message: 'Wrong Network',
        description: `${env} is avaliable for now.`
      })
    }
  }, [env])

  useEffect(() => {
    (async () => {
      const endpoint = await getFastestEndpoint(ENDPOINTS);

      setEndpoint(endpoint);
    })(); 
  }, []);

  setProgramIds(env);

  return (
    <ConnectionContext.Provider
      value={{
        endpoint,
        setEndpoint,
        slippage: parseFloat(slippage),
        setSlippage: (val) => setSlippage(val.toString()),
        connection,
        // sendConnection,
        env,
        chainId,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  return useContext(ConnectionContext).connection as Connection;
}

// export function useSendConnection() {
//   return useContext(ConnectionContext)?.sendConnection;
// }

export function useConnectionConfig() {
  const context = useContext(ConnectionContext);
  return {
    endpoint: context.endpoint,
    setEndpoint: context.setEndpoint,
    env: context.env,
    chainId: context.chainId,
  };
}

export function useSlippageConfig() {
  const { slippage, setSlippage } = useContext(ConnectionContext);
  return { slippage, setSlippage };
}

const getErrorForTransaction = async (connection: Connection, txid: string) => {
  // wait for all confirmation before geting transaction
  await connection.confirmTransaction(txid, "max");

  const tx = await connection.getParsedConfirmedTransaction(txid, 'confirmed');

  const errors: string[] = [];

  if (tx?.meta && tx.meta.logMessages) {
    tx.meta.logMessages.forEach((log) => {
      const regex = /Error: (.*)/gm;
      let m;
      while ((m = regex.exec(log)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
          regex.lastIndex++;
        }

        if (m.length > 1) {
          errors.push(m[1]);
        }
      }
    });
  }

  return errors;
};

export const signAllTransactions = async (
  connection: Connection,
  wallet: any,
  transactions: Transaction[],
) => {
  const blockhash = (await connection.getRecentBlockhash('max')).blockhash;

  const _transactions = transactions.map(transaction => {
    transaction.recentBlockhash = blockhash
    transaction.feePayer = wallet.publicKey

    return transaction
  })

    console.log(_transactions)
  const signedTransactions = await wallet.signAllTransactions(_transactions);

  return signedTransactions
}

export const sendSwapTransaction = async({
  connection,
  wallet,
  transaction,
  awaitConfirmation = true
}: {
  connection: Connection,
  wallet: any,
  transaction: Transaction,
  awaitConfirmation?: boolean
}) => {
  transaction.recentBlockhash = (
    await connection.getRecentBlockhash("max")
  ).blockhash;

  transaction.feePayer = wallet.publicKey 

  transaction = await wallet.signTransaction(transaction);

  const rawTransaction = transaction.serialize();

  const options = {
    skipPreflight: true,
    commitment: "confirmed",
  };

  const txid = await connection.sendRawTransaction(rawTransaction, options);

  if (awaitConfirmation) {
    const status = (
      await connection.confirmTransaction(
        txid,
        options && (options.commitment as any)
      )
    ).value;

    if (status?.err) {
      const errors = await getErrorForTransaction(connection, txid);

      notify({
        message: "Transaction failed...",
        description: (
          <>
            {errors.map((err, i) => (
              <div key={i}>{err}</div>
            ))}
            <ExplorerLink address={txid} type="tx" />
          </>
        ),
        type: "error",
      });

      throw new Error(
        `Raw transaction ${txid} failed (${JSON.stringify(status)})`
      );
    }
  }

  return txid;
}

export const sendTransaction = async (
  connection: Connection,
  wallet: any,
  instructions: TransactionInstruction[],
  signers: Signer[],
  awaitConfirmation = true
) => {
  let transaction = new Transaction();

  instructions.forEach((instruction) => transaction.add(instruction));

  transaction.recentBlockhash = (
    await connection.getRecentBlockhash("max")
  ).blockhash;

  transaction.feePayer = wallet.publicKey

  if (signers.length > 0) {
    transaction.partialSign(...signers);
  }

  transaction = await wallet.signTransaction(transaction);

  const rawTransaction = transaction.serialize();

  const options = {
    skipPreflight: true,
    commitment: "confirmed",
  };

  const txid = await connection.sendRawTransaction(rawTransaction, options);

  if (awaitConfirmation) {
    const status = (
      await connection.confirmTransaction(
        txid,
        options && (options.commitment as any)
      )
    ).value;

    if (status?.err) {
      const errors = await getErrorForTransaction(connection, txid);

      notify({
        message: "Transaction failed...",
        description: (
          <>
            {errors.map((err, i) => (
              <div key={i}>{err}</div>
            ))}
            <ExplorerLink address={txid} type="tx" />
          </>
        ),
        type: "error",
      });

      throw new Error(
        `Raw transaction ${txid} failed (${JSON.stringify(status)})`
      );
    }
  }

  return txid;
};

export const sendSignedTransaction = async (
  connection: Connection,
  transaction: Transaction,
  awaitConfirmation = true
) => {
  const options = {
    skipPreflight: true,
    commitment: "confirmed",
  };

  const txid = await connection.sendRawTransaction(transaction.serialize(), options);

  if (awaitConfirmation) {
    const status = (
      await connection.confirmTransaction(
        txid,
        options && (options.commitment as any)
      )
    ).value;

    if (status?.err) {
      const errors = await getErrorForTransaction(connection, txid);

      notify({
        message: "Transaction failed...",
        description: (
          <>
            {errors.map((err, i) => (
              <div key={i}>{err}</div>
            ))}
            <ExplorerLink address={txid} type="tx" />
          </>
        ),
        type: "error",
      });

      throw new Error(
        `Raw transaction ${txid} failed (${JSON.stringify(status)})`
      );
    }
  }

  return txid;
}
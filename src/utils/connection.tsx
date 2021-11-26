
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  Transaction,
  Signer,
  Keypair,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  TokenInfo,
  TokenListContainer
} from "@solana/spl-token-registry";

import { cache, getMultipleAccounts } from "./accounts";
import { queryJsonFiles, useLocalStorageState, getFastestEndpoint } from './utils'
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
  tokens: TokenInfo[];
  tokenMap: Map<string, TokenInfo>;
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
  tokens: [],
  tokenMap: new Map<string, TokenInfo>(),
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

  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>(new Map());

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

  useEffect(() => {
    (async () => {
      const customTokenJSON = await queryJsonFiles([
        "https://cdn.jsdelivr.net/gh/1sol-io/token-list@main/src/tokens/solana.tokenlist.json",
      ]);
      const customTokenList = new TokenListContainer(customTokenJSON);

      const customList = customTokenList
        .filterByChainId(chainId)
        .excludeByTag("nft")
        .getList();

      const knownMints = customList.reduce((map, item) => {
        map.set(item.address, item);
        return map;
      }, new Map<string, TokenInfo>());

      const accounts = await getMultipleAccounts(connection, [...knownMints.keys()], 'single');

      accounts.keys.forEach((key, index) => {
        const account = accounts.array[index];

        if (!account) {
          knownMints.delete(accounts.keys[index]);

          return;
        }

        try {
          cache.addMint(new PublicKey(key), account);
        } catch {
          // ignore
        }
      });

      setTokenMap(knownMints);
      setTokens([...knownMints.values()]);
    })();
  }, [chainId, connection]);

  setProgramIds(env);

  // The websocket library solana/web3.js uses closes its websocket connection when the subscription list
  // is empty after opening its first time, preventing subsequent subscriptions from receiving responses.
  // This is a hack to prevent the list from every getting empty
  useEffect(() => {
    const id = connection.onAccountChange(Keypair.generate().publicKey, () => { });

    return () => {
      connection.removeAccountChangeListener(id);
    };
  }, [connection]);

  useEffect(() => {
    const id = connection.onSlotChange(() => null);

    return () => {
      connection.removeSlotChangeListener(id);
    };
  }, [connection]);

  // useEffect(() => {
  //   const id = sendConnection.onAccountChange(
  //     new Account().publicKey,
  //     () => {}
  //   );
  //   return () => {
  //     sendConnection.removeAccountChangeListener(id);
  //   };
  // }, [sendConnection]);

  // useEffect(() => {
  //   const id = sendConnection.onSlotChange(() => null);
  //   return () => {
  //     sendConnection.removeSlotChangeListener(id);
  //   };
  // }, [sendConnection]);

  return (
    <ConnectionContext.Provider
      value={{
        endpoint,
        setEndpoint,
        slippage: parseFloat(slippage),
        setSlippage: (val) => setSlippage(val.toString()),
        connection,
        // sendConnection,
        tokens,
        tokenMap,
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
    tokens: context.tokens,
    tokenMap: context.tokenMap,
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

export interface Transactions {
  instructions: TransactionInstruction[],
  signers: Signer[],
  cleanInstructions?: TransactionInstruction[],
}

export const signAllTransactions = async (
  connection: Connection,
  wallet: any,
  transactions: {
    instructions: TransactionInstruction[],
    signers: Signer[],
  }[]
) => {
  const blockhash = (await connection.getRecentBlockhash('max')).blockhash;

  const _transactions = transactions.map(({ instructions, signers }) => {
    let transaction = new Transaction();

    instructions.forEach((instruction) => transaction.add(instruction));

    transaction.recentBlockhash = blockhash;

    transaction.feePayer = wallet.publicKey

    if (signers.length > 0) {
      transaction.partialSign(...signers);
    }

    return transaction;
  })

  const signedTransactions = await wallet.signAllTransactions(_transactions);

  return signedTransactions

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

  let options = {
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
  wallet: any,
  transaction: Transaction,
  awaitConfirmation = true
) => {
  let options = {
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
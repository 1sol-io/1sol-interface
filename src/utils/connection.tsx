import { useLocalStorageState } from "./utils";
import {
  Account,
  clusterApiUrl,
  Connection,
  PublicKey,
  Transaction,
  Signer,
  TransactionInstruction,
} from "@solana/web3.js";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { setProgramIds } from "./ids";
import { notify } from "./notifications";
import { ExplorerLink } from "../components/explorerLink";
import {
  ENV as ChainID,
  TokenInfo,
  TokenListContainer
} from "@solana/spl-token-registry";
import { cache, getMultipleAccounts } from "./accounts";
import { queryJsonFiles, queryJSONFile } from './utils'

import {OneSolProtocol, AmmInfo} from '../utils/onesol-protocol'

export type ENV = "mainnet-beta" | "testnet" | "devnet" | "localnet";

export const ENDPOINTS = [
  {
    name: "mainnet-beta" as ENV,
    endpoint: "https://solana-api.projectserum.com/",
    chainID: ChainID.MainnetBeta,
  },
  {
    name: "testnet" as ENV,
    endpoint: clusterApiUrl("testnet"),
    chainID: ChainID.Testnet,
  },
  {
    name: "devnet" as ENV,
    endpoint: clusterApiUrl("devnet"),
    chainID: ChainID.Devnet,
  },
  {
    name: "localnet" as ENV,
    endpoint: "http://127.0.0.1:8899",
    chainID: ChainID.Devnet,
  },
];

const DEFAULT = ENDPOINTS[0].endpoint;
const DEFAULT_SLIPPAGE = 0.5;

export interface TokenSwapPool {
  address: string,
  chainId: number,
  deprecated: boolean,
  mintA: string,
  mintB: string,
  name: string,
  programId: string,
}

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
  // tokenSwapPools: TokenSwapPool[],
  // serumMarkets: TokenSwapPool[],
  chainId: number,
  ammInfos: AmmInfo[]
}

const ConnectionContext = React.createContext<ConnectionConfig>({
  endpoint: DEFAULT,
  setEndpoint: () => {},
  slippage: DEFAULT_SLIPPAGE,
  setSlippage: (val: number) => {},
  connection: new Connection(DEFAULT, "recent"),
  // sendConnection: new Connection(DEFAULT, "recent"),
  env: ENDPOINTS[0].name,
  tokens: [],
  tokenMap: new Map<string, TokenInfo>(),
  // tokenSwapPools: [],
  // serumMarkets: [],
  chainId: 103,
  ammInfos: []
});

export function ConnectionProvider({ children = undefined as any }) {
  const [endpoint, setEndpoint] = useLocalStorageState(
    "connectionEndpts",
    ENDPOINTS[2].endpoint
  );

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

  const chain =
    ENDPOINTS.find((end) => end.endpoint === endpoint) || ENDPOINTS[2];

  const env = chain.name;
  const chainId = chain.chainID

  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>(new Map());

  // const [tokenSwapPools, setTokenSwapPools] = useState([])
  // const [serumMarkets, setSerumMarkets] = useState([])
  const [ammInfos, setAmmInfos] = useState<AmmInfo[]>([])

  useEffect(() => {
    if (chain.endpoint !== ENDPOINTS[2].endpoint) {
      notify({
        message: 'Wrong Network',
        description: `${ENDPOINTS[2].name} is avaliable for now.` 
      })
    }
  }, [chain])

  useEffect(() => {
    (async () => {
      const infos = await OneSolProtocol.loadAllAmmInfos(connection)

      setAmmInfos(infos)
    })()
  }, [connection])

  // useEffect(() => {
  //   (async () => {
  //     const json = await queryJSONFile(
  //       "https://cdn.jsdelivr.net/gh/1sol-io/token-list@main/src/pools/1sol.pools.json",
  //     );

  //     setTokenSwapPools(json)
  //   })();
  // }, [chain, connection])

  // useEffect(() => {
  //   (async () => {
  //     const json = await queryJSONFile(
  //       "https://cdn.jsdelivr.net/gh/1sol-io/token-list@main/src/markets/1sol.markets.json",
  //     );

  //     setSerumMarkets(json)
  //   })();
  // }, [chain, connection])

  useEffect(() => {
    (async () => {

      const customTokenJSON = await queryJsonFiles([
        "https://cdn.jsdelivr.net/gh/1sol-io/token-list@main/src/tokens/solana.tokenlist.json",
      ]);
      const customTokenList = new TokenListContainer(customTokenJSON);

      const customList = customTokenList
        .filterByChainId(chain.chainID)
        .excludeByTag("nft")
        .getList();

      const knownMints = customList.reduce((map, item) => {
        map.set(item.address, item);
        return map;
      }, new Map<string, TokenInfo>());

      const accounts = await getMultipleAccounts(connection, [...knownMints.keys()], 'single');
      
      accounts.keys.forEach((key, index) => {
        const account = accounts.array[index];

        if(!account) {
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
  }, [chain, connection]);

  setProgramIds(env);

  // The websocket library solana/web3.js uses closes its websocket connection when the subscription list
  // is empty after opening its first time, preventing subsequent subscriptions from receiving responses.
  // This is a hack to prevent the list from every getting empty
  useEffect(() => {
    const id = connection.onAccountChange(new Account().publicKey, () => {});

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
        // tokenSwapPools,
        // serumMarkets,
        chainId,
        ammInfos
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
    // tokenSwapPools: context.tokenSwapPools,
    // serumMarkets: context.serumMarkets,
    chainId: context.chainId,
    ammInfos: context.ammInfos
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

  // transaction.setSigners(
  //   // fee payied by the wallet owner
  //   wallet.publicKey,
  //   ...signers.map((s) => s.publicKey)
  // );

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
            <ExplorerLink address={txid} type="transaction" />
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

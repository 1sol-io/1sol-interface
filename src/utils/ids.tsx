import { PublicKey } from "@solana/web3.js";
import { TokenSwapLayout, TokenSwapLayoutV1 } from "../models";

export const WRAPPED_SOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
);
let TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

let SWAP_PROGRAM_ID: PublicKey;
let SWAP_PROGRAM_LEGACY_IDS: PublicKey[];
let SWAP_PROGRAM_LAYOUT: any;

export const SWAP_PROGRAM_OWNER_FEE_ADDRESS = new PublicKey(
  "HfoTxFR1Tm6kGmWgYWD6J7YHVy1UwqSULUGVLXkJqaKN"
);

export const SWAP_HOST_FEE_ADDRESS = process.env.REACT_APP_SWAP_HOST_FEE_ADDRESS
  ? new PublicKey(`${process.env.REACT_APP_SWAP_HOST_FEE_ADDRESS}`)
  : SWAP_PROGRAM_OWNER_FEE_ADDRESS;

export const ENABLE_FEES_INPUT = false;

console.debug(`Host address: ${SWAP_HOST_FEE_ADDRESS?.toBase58()}`);
console.debug(`Owner address: ${SWAP_PROGRAM_OWNER_FEE_ADDRESS?.toBase58()}`);

// legacy pools are used to show users contributions in those pools to allow for withdrawals of funds
export const PROGRAM_IDS = [
  {
    name: "mainnet-beta",
    swap: () => ({
      current: {
        pubkey: new PublicKey("SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8"),
        layout: TokenSwapLayout,
      },
      legacy: [new PublicKey("9qvG1zUp8xF1Bi4m6UdRNby1BAAuaDrUxSpv4CmRRMjL")],
    }),
  },
  {
    name: "testnet",
    swap: () => ({
      current: {
        pubkey: new PublicKey("SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8"),
        layout: TokenSwapLayout,
      },
      legacy: [],
    }),
  },
  {
    name: "devnet",
    swap: () => ({
      current: {
        pubkey: new PublicKey("SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8"),
        layout: TokenSwapLayout,
      },
      legacy: [new PublicKey("BSfTAcBdqmvX5iE2PW88WFNNp2DHhLUaBKk5WrnxVkcJ")],
    }),
  },
  {
    name: "localnet",
    swap: () => ({
      current: {
        pubkey: new PublicKey("369YmCWHGxznT7GGBhcLZDRcRoGWmGKFWdmtiPy78yj7"),
        layout: TokenSwapLayoutV1,
      },
      legacy: [],
    }),
  },
];

export const setProgramIds = (envName: string) => {
  let instance = PROGRAM_IDS.find((env) => env.name === envName);
  if (!instance) {
    return;
  }

  let swap = instance.swap();

  SWAP_PROGRAM_ID = swap.current.pubkey;
  SWAP_PROGRAM_LAYOUT = swap.current.layout;
  SWAP_PROGRAM_LEGACY_IDS = swap.legacy;
};

export const programIds = () => {
  return {
    token: TOKEN_PROGRAM_ID,
    swap: SWAP_PROGRAM_ID,
    swapLayout: SWAP_PROGRAM_LAYOUT,
    swap_legacy: SWAP_PROGRAM_LEGACY_IDS,
  };
};

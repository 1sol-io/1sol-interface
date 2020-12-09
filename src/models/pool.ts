import { PublicKey } from "@solana/web3.js";
import { TokenAccount } from "./account";

export interface PoolInfo {
  pubkeys: {
    program: PublicKey;
    account: PublicKey;
    holdingAccounts: PublicKey[];
    holdingMints: PublicKey[];
    mint: PublicKey;
    feeAccount?: PublicKey;
  };
  legacy: boolean;
  raw: any;
}

export interface LiquidityComponent {
  amount: number;
  account?: TokenAccount;
  mintAddress: string;
}

export enum CurveType {
  ConstantProduct = 0,
  ConstantPrice = 1,
  ConstantProductWithOffset = 2
}

export interface PoolConfig {
  curveType: CurveType;
  fees: {
    tradeFeeNumerator: number;
    tradeFeeDenominator: number;
    ownerTradeFeeNumerator: number;
    ownerTradeFeeDenominator: number;
    ownerWithdrawFeeNumerator: number;
    ownerWithdrawFeeDenominator: number;
    hostFeeNumerator: number;
    hostFeeDenominator: number;
  };

  token_b_offset?: number;
}

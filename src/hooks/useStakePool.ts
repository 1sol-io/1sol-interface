import { useState, useEffect, useCallback } from "react";

import { TokenInfo } from "@solana/spl-token-registry";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import BN from "bn.js";

import { useWallet } from "../context/wallet";
import { StakePool, StakePoolV1Info, PROGRAM_ID } from '../utils/stake-pools'
import { STAKE_POOLS_ID } from '../utils/constant'
import { sendTransaction, useConnection, useConnectionConfig } from "../utils/connection";
import { notify } from "../utils/notifications";

export interface StakePoolProps {
  token: TokenInfo | undefined;
  rewardToken: TokenInfo | undefined;
  enableDeposit: boolean;
  enableWithdraw: boolean;
  total: BN,
  uiTotal: number,
  poolMint: PublicKey,
  stakePoolInfo: StakePoolV1Info;
  poolTokenSupply: BN;
  poolMintDecimals: number;
  stakeMintDecimals: number;
  stakeMint: PublicKey;
  capacity: number,
  uiMax: number
  max: BN,
  uiMin: number
}

export const useStakePool = () => {
  const connection = useConnection();
  const { connected, wallet } = useWallet();
  const { tokenMap } = useConnectionConfig()

  const [stakePoolInfo, setStakePoolInfo] = useState<StakePoolV1Info | null>();
  const [pool, setPool] = useState<StakePoolProps>();

  const stakePool = new StakePool(PROGRAM_ID, connection);

  const fetchStakePool = useCallback(async () => {
    const pool: StakePoolV1Info | null = await StakePool.loadStakePoolV1Info({
      pubkey: STAKE_POOLS_ID,
      connection
    });
    setStakePoolInfo(pool);

    if (pool) {
      const {
        stakeMint,
        enableDeposit,
        enableWithdraw,
        poolMint,
        totalDepositAmount,
        poolMintDecimals,
        poolTokenSupply,
        depositOffset,
        stakeMintDecimals,
        depositCapacity,
        rewardMint,
        maximumDepositAmount,
        minimumDepositAmount,
      } = pool

      setPool({
        token: tokenMap.get(stakeMint.toBase58()),
        rewardToken: tokenMap.get(rewardMint.toBase58()),
        enableDeposit,
        enableWithdraw,
        total: totalDepositAmount.sub(depositOffset),
        uiTotal: totalDepositAmount.isZero() ? 0 : totalDepositAmount.sub(depositOffset).div(new BN(10).pow(new BN(stakeMintDecimals))).toNumber(),
        poolMint,
        stakePoolInfo: pool,
        poolTokenSupply,
        poolMintDecimals,
        stakeMintDecimals,
        stakeMint,
        capacity: depositCapacity.div(new BN(10).pow(new BN(stakeMintDecimals))).toNumber(),
        uiMax: maximumDepositAmount.div(new BN(10).pow(new BN(stakeMintDecimals))).toNumber(),
        max: maximumDepositAmount,
        // TODO
        // if minimum is less than 1
        uiMin: minimumDepositAmount.div(new BN(10).pow(new BN(stakeMintDecimals))).toNumber(),
      });
    }
  }, [connection, tokenMap]);

  useEffect(() => {
    fetchStakePool()
  }, [connected, wallet, fetchStakePool]);

  const handleDeposit = useCallback(async ({
    amount,
    sourceTokenAccount,
  }: {
    amount: number,
    sourceTokenAccount: PublicKey,
  }) => {
    try {
      if (!stakePoolInfo) {
        return
      }

      const instructions: TransactionInstruction[] = [];

      await stakePool.createDepositV1({
        stakePoolInfo,
        sourceTokenAccount,
        amount,
        wallet: wallet.publicKey,
        instructions
      })

      const txid = await sendTransaction(
        connection,
        wallet,
        instructions,
        []
      )

      notify({
        message: "Stake completed.",
        type: "success",
        description: `Transaction - ${txid}`,
        txid
      });
    } catch (e) {
      console.error(e)

      notify({
        description: "Please try again and approve transactions from your wallet",
        message: "Stake cancelled.",
        type: "error",
      });
    }
  }, [wallet, stakePool, connection, stakePoolInfo])

  const handleWithdraw = useCallback(async ({
    amount,
  }: {
    amount: number,
  }) => {
    try {
      if (!stakePoolInfo) {
        return
      }

      const instructions: TransactionInstruction[] = [];

      await stakePool.createWithdrawV1({
        stakePoolInfo,
        amount,
        wallet: wallet.publicKey,
        instructions
      })

      const txid = await sendTransaction(
        connection,
        wallet,
        instructions,
        []
      )

      notify({
        message: "Withdraw completed.",
        type: "success",
        description: `Transaction - ${txid}`,
        txid
      });
    } catch (e) {
      console.error(e)

      notify({
        description: "Please try again and approve transactions from your wallet",
        message: "Withdraw cancelled.",
        type: "error",
      });
    }
  }, [wallet, stakePool, connection, stakePoolInfo])

  return {
    pool,
    handleDeposit,
    handleWithdraw,
    fetchStakePool,
  }
}
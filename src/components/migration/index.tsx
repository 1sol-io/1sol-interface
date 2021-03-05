import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useSlippageConfig } from "../../utils/connection";
import { Button, Modal } from "antd";
import { cache, useCachedPool } from "../../utils/accounts";
import {
  addLiquidity,
  removeLiquidity,
  useOwnedPools,
} from "../../utils/pools";
import { useWallet } from "../../context/wallet";
import { PoolAccounts } from "../pool/quickView";
import { LiquidityComponent } from "../../models";

export const MigrationModal = () => {
  const [visible, setVisable] = useState(false);
  const [ack, setAck] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const { wallet, connected } = useWallet();
  const connection = useConnection();
  const { slippage } = useSlippageConfig();

  const activePools = useCachedPool();
  const legacyOwned = useOwnedPools(true);

  const poolsToMigrate = useMemo(() => {
    return legacyOwned
      .map((item) => {
        const account = item.account;
        const fromPool = item.pool;

        const toPool = activePools.pools.find(
          (p) =>
            (p.pubkeys.holdingMints[0].equals(
              fromPool.pubkeys.holdingMints[0]
            ) &&
              p.pubkeys.holdingMints[1].equals(
                fromPool.pubkeys.holdingMints[1]
              )) ||
            (p.pubkeys.holdingMints[0].equals(
              fromPool.pubkeys.holdingMints[1]
            ) &&
              p.pubkeys.holdingMints[1].equals(
                fromPool.pubkeys.holdingMints[0]
              ))
        );

        return {
          account,
          fromPool,
          toPool,
        };
      })
      .filter((item) => item.toPool !== undefined);
  }, [activePools, legacyOwned]);

  const handleOk = useCallback(async () => {
    setAck(true);
    setExecuting(true);
    for (let i = 0; i < poolsToMigrate.length; i++) {
      try {
        const item = poolsToMigrate[i];
        const account = item.account;
        const fromPool = item.fromPool;
        const toPool = item.toPool;

        let liquidityAmount = account.info.amount.toNumber();
        const poolMint = await cache.queryMint(
          connection,
          fromPool.pubkeys.mint
        );
        const baseAccount = await cache.queryAccount(
          connection,
          fromPool.pubkeys.holdingAccounts[0]
        );
        const quoteAccount = await cache.queryAccount(
          connection,
          fromPool.pubkeys.holdingAccounts[1]
        );

        const ownershipRatio = liquidityAmount / poolMint.supply.toNumber();

        const baseAmount = Math.floor(
          baseAccount.info.amount.toNumber() * ownershipRatio
        );
        const quoteAmount = Math.floor(
          quoteAccount.info.amount.toNumber() * ownershipRatio
        );

        const toAccounts = await removeLiquidity(
          connection,
          wallet,
          liquidityAmount,
          account,
          fromPool
        );

        const sameMintOrder =
          fromPool.pubkeys.holdingMints[0].toBase58() ===
          toPool?.pubkeys.holdingMints[0].toBase58();
        if (!sameMintOrder) {
          toAccounts.reverse();
        }

        const components: LiquidityComponent[] = [
          {
            amount: baseAmount,
            account: cache.getAccount(toAccounts[0]),
            mintAddress: toPool?.pubkeys.holdingMints[0].toBase58() || "",
          },
          {
            amount: quoteAmount,
            account: cache.getAccount(toAccounts[1]),
            mintAddress: toPool?.pubkeys.holdingMints[1].toBase58() || "",
          },
        ];
        await addLiquidity(connection, wallet, components, slippage, toPool);
      } catch {
        // TODO:
      }
    }
    setExecuting(false);
    setCompleted(true);
  }, [connection, wallet, slippage, setAck, poolsToMigrate]);

  const handleCancel = useCallback(() => {
    setAck(true);

    if (!executing) {
      setVisable(false);
    }
  }, [executing, setVisable, setAck]);

  useEffect(() => {
    if (poolsToMigrate.length > 0 && !ack) {
      setVisable(true);
    }
  }, [poolsToMigrate, connected, ack]);

  return (
    <Modal
      visible={visible}
      title="Liquidity migration"
      onOk={handleOk}
      onCancel={handleCancel}
      closable={!executing}
      footer={
        completed
          ? []
          : [
              <Button key="back" onClick={handleCancel} disabled={executing}>
                Ask me later
              </Button>,
              <Button
                key="submit"
                type="primary"
                loading={executing}
                onClick={handleOk}
              >
                Migrate
              </Button>,
            ]
      }
    >
      {completed ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-around",
            alignItems: "center",
          }}
        >
          <h2>Congratulations!</h2>
          <div>Your migration has been successful.</div>
          <Button type="primary" onClick={handleOk}>
            Close
          </Button>
        </div>
      ) : (
        <>
          <p>
            You are identified as liquidity provider that used v1 of Serum Swap.
          </p>
          <p>
            Please click migrate button to move to new version of the contract
          </p>
          <p>During migration your wallet will ask for multiple approvals.</p>
          <PoolAccounts legacy={true} />
        </>
      )}
    </Modal>
  );
};

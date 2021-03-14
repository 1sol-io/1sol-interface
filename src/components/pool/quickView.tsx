import React, { useMemo } from "react";
import { ConfigProvider, Empty } from "antd";
import { useOwnedPools } from "../../utils/pools";
import { cache } from "../../utils/accounts";
import { PoolIcon } from "../tokenIcon";
import { PoolInfo, TokenAccount } from "../../models";
import "./quickView.less";
import { useEnrichedPools } from "../../context/market";
import { formatUSD } from "../../utils/utils";

const PoolItem = (props: {
  item: { pool: PoolInfo; isFeeAccount: boolean; account: TokenAccount };
  poolDetails: any;
}) => {
  const item = props.item;
  const mint = cache.getMint(item.account.info.mint.toBase58());
  const amount =
    item.account.info.amount.toNumber() / Math.pow(10, mint?.decimals || 0);

  const supply = mint?.supply.toNumber() || 0;
  const poolContribution = item.account.info.amount.toNumber() / supply;
  const contributionInUSD = poolContribution * props.poolDetails?.liquidity;
  const feesInUSD = poolContribution * props.poolDetails?.fees;

  // amount / supply * liquidity

  if (!amount) {
    return null;
  }

  const sorted = item.pool.pubkeys.holdingMints.map((a) => a.toBase58()).sort();

  if (item) {
    return (
      <div
        className="pool-item-row"
        title={`LP Token: ${props.item.pool.pubkeys.mint.toBase58()}, account: ${props.item.account.pubkey.toBase58()}`}
      >
        <PoolIcon
          mintA={sorted[0]}
          mintB={sorted[1]}
          style={{ marginLeft: "0.5rem" }}
        />
        <div className="pool-item-name">{props.poolDetails?.name}</div>
        <div className="pool-item-amount">
          {formatUSD.format(contributionInUSD)}
        </div>
        <div className="pool-item-amount">{formatUSD.format(feesInUSD)}</div>
        <div className="pool-item-type" title="Fee account">
          {item.isFeeAccount ? " (F) " : " "}
        </div>
      </div>
    );
  }

  return null;
};

export const PoolAccounts = (props: { legacy: boolean }) => {
  const pools = useOwnedPools(props.legacy);
  const userPools = useMemo(() => {
    return pools.map((p) => p.pool);
  }, [pools]);

  const enriched = useEnrichedPools(userPools);

  return (
    <>
      <div>Your Liquidity</div>
      <ConfigProvider
        renderEmpty={() => (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No liquidity found."
          />
        )}
      >
        <div className="pools-grid">
          <div className="pool-item-header">
            <div style={{ width: 48 }} />
            <div className="pool-item-name">Pool</div>
            <div className="pool-item-amount">Liquidity</div>
            <div className="pool-item-amount">Fees</div>
            <div className="pool-item-type" />
            <div />
          </div>
          {pools.map((p) => (
            <PoolItem
              key={p?.account.pubkey.toBase58()}
              item={p as any}
              poolDetails={enriched.find((e) => e.raw === p.pool)}
            />
          ))}
        </div>
      </ConfigProvider>
    </>
  );
};

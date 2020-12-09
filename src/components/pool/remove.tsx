import React, { useMemo, useState } from "react";
import { Button, Card, Col, Row, Slider, Typography } from "antd";

import { removeLiquidity } from "../../utils/pools";
import { useWallet } from "../../utils/wallet";
import { useConnection } from "../../utils/connection";
import { PoolInfo, TokenAccount } from "../../models";
import { notify } from "../../utils/notifications";
import { TokenIcon } from "../tokenIcon";
import { YourPosition } from "./add";
import { useEnrichedPools } from "../../context/market";
import { useMint } from "../../utils/accounts";
import { formatPriceNumber } from "../../utils/utils";

export const RemoveLiquidity = (props: {
  instance: { account: TokenAccount; pool: PoolInfo };
  removeRatio: number;
}) => {
  const { account, pool } = props.instance;
  const removeRatio = props.removeRatio;
  const [pendingTx, setPendingTx] = useState(false);
  const { wallet } = useWallet();
  const connection = useConnection();

  const onRemove = async () => {
    try {
      setPendingTx(true);
      let liquidityAmount = account.info.amount.toNumber() * removeRatio;
      await removeLiquidity(connection, wallet, liquidityAmount, account, pool);
    } catch {
      notify({
        description:
          "Please try again and approve transactions from your wallet",
        message: "Removing liquidity cancelled.",
        type: "error",
      });
    } finally {
      setPendingTx(false);
      // TODO: force refresh of pool accounts?
    }
  };

  return (
    <Button
      className="add-button"
      type="primary"
      size="large"
      onClick={onRemove}
      disabled={pendingTx || !account}
    >
      {account ? "Remove Liquidity" : "Connect Wallet"}
    </Button>
  );
};

export const RemoveLiquidityEntry = (props: {
  instance: { account?: TokenAccount; pool: PoolInfo };
}) => {
  const { account, pool } = props.instance;
  const [liquidityPercentage, setLiquidityPercentage] = useState(100);

  const pools = useMemo(() => [pool].filter((p) => p) as PoolInfo[], [pool]);
  const enriched = useEnrichedPools(pools)[0];
  const lpMint = useMint(pool?.pubkeys.mint);

  if (!pool || !enriched) {
    return null;
  }
  const baseMintAddress = pool.pubkeys.holdingMints[0].toBase58();
  const quoteMintAddress = pool.pubkeys.holdingMints[1].toBase58();

  const ratio =
    (account?.info.amount.toNumber() || 0) / (lpMint?.supply.toNumber() || 0);

  return (
    <>
      <div className="input-card">
        Remove Liquidity
        <Card
          className="ccy-input"
          style={{ borderRadius: 20, width: "100%" }}
          size="small"
        >
          <div className="pool-card" style={{ width: "initial" }}>
            <div className="pool-card-row">
              <div className="pool-card-cell">Amount</div>
            </div>
            <div className="pool-card-row">
              <div className="pool-card-cell">
                <Typography.Text style={{ fontSize: "42px" }}>
                  {liquidityPercentage}%
                </Typography.Text>
              </div>
            </div>
            <div className="pool-card-row">
              <Slider
                style={{ width: "100%" }}
                value={liquidityPercentage}
                tipFormatter={(amount?: number) => `${amount}%`}
                min={0}
                max={100}
                onChange={(amount: number) => setLiquidityPercentage(amount)}
              />
            </div>
            <Row>
              <Col span={6}>
                <Button onClick={() => setLiquidityPercentage(25)}>25%</Button>
              </Col>
              <Col span={6}>
                <Button onClick={() => setLiquidityPercentage(50)}>50%</Button>
              </Col>
              <Col span={6}>
                <Button onClick={() => setLiquidityPercentage(75)}>75%</Button>
              </Col>
              <Col span={6}>
                <Button onClick={() => setLiquidityPercentage(100)}>
                  100%
                </Button>
              </Col>
            </Row>
          </div>
        </Card>
        ↓
        <Card
          className="ccy-input"
          style={{ borderRadius: 20, width: "100%" }}
          size="small"
        >
          <div className="pool-card" style={{ width: "initial" }}>
            <div className="pool-card-row">
              <div className="pool-card-cell">
                {formatPriceNumber.format(
                  ratio * enriched.liquidityA * (liquidityPercentage / 100)
                )}
              </div>
              <div className="pool-card-cell">
                <div style={{ display: "flex", alignItems: "center" }}>
                  <TokenIcon mintAddress={baseMintAddress} />
                  <h3 style={{ margin: 0 }}>{enriched?.name}</h3>
                </div>
              </div>
            </div>
            <div className="pool-card-row">
              <div className="pool-card-cell">
                {formatPriceNumber.format(
                  ratio * enriched.liquidityA * (liquidityPercentage / 100)
                )}
              </div>
              <div className="pool-card-cell">
                <div style={{ display: "flex", alignItems: "center" }}>
                  <TokenIcon mintAddress={quoteMintAddress} />
                  <h3 style={{ margin: 0 }}>{enriched.names[1]}</h3>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
      {account && (
        <RemoveLiquidity
          instance={{ pool: pool, account: account }}
          removeRatio={liquidityPercentage / 100}
        />
      )}
      <YourPosition pool={pool} />
    </>
  );
};

import React, { useEffect, useState } from "react";
import { Button, Card, Col, Row, Slider, Spin, Typography } from "antd";

import { removeLiquidity } from "../../utils/pools";
import { useWallet } from "../../utils/wallet";
import { useConnection, useConnectionConfig } from "../../utils/connection";
import { PoolInfo, TokenAccount } from "../../models";
import { notify } from "../../utils/notifications";
import { TokenIcon } from "../tokenIcon";
import { YourPosition } from "./add";
import { useMint } from "../../utils/accounts";
import { formatPriceNumber } from "../../utils/utils";
import { PoolCurrencyInput } from "../currencyInput";
import { LoadingOutlined } from "@ant-design/icons";
import { generateRemoveLabel } from "../labels";

export const RemoveLiquidity = (props: {
  instance: { account: TokenAccount; pool: PoolInfo };
  removeRatio: number;
}) => {
  const { account, pool } = props.instance;
  const { removeRatio } = props;
  const [pendingTx, setPendingTx] = useState(false);
  const { wallet, connected } = useWallet();
  const connection = useConnection();
  const { tokenMap } = useConnectionConfig();
  let liquidityAmount: number = removeRatio * account.info.amount.toNumber();
  const hasSufficientBalance =
    liquidityAmount <= account.info.amount.toNumber();

  const onRemove = async () => {
    try {
      setPendingTx(true);
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
      disabled={
        connected &&
        (pendingTx || !hasSufficientBalance || !account || !liquidityAmount)
      }
    >
      {generateRemoveLabel(
        connected,
        liquidityAmount,
        pool,
        tokenMap,
        hasSufficientBalance
      )}
      {pendingTx && (
        <Spin
          indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
          className="add-spinner"
        />
      )}
    </Button>
  );
};

export const RemoveLiquidityEntry = (props: {
  instance: { account?: TokenAccount; pool: PoolInfo };
  enriched: any;
}) => {
  const { account, pool } = props.instance;
  const { enriched } = props;
  const [inputType, setInputType] = useState("slider");

  const lpMint = useMint(pool?.pubkeys.mint);

  const ratio =
    (account?.info.amount.toNumber() || 0) / (lpMint?.supply.toNumber() || 1);

  const [inputInfo, setInputInfo] = useState({
    amount: "initial",
    lastTyped: "pool",
    liquidityPercentage: 100,
  });

  const [inputsDescription, setInputsDescription] = useState({
    pool: "Input",
    poolAmount: formatPriceNumber.format(
      ratio * (enriched?.supply || 0) * (inputInfo.liquidityPercentage / 100)
    ),
    tokenA: "Output (estimated)",
    tokenAAmount: formatPriceNumber.format(
      ratio *
        (enriched?.liquidityA || 0) *
        (inputInfo.liquidityPercentage / 100)
    ),
    tokenB: "Output (estimated)",
    tokenBAmount: formatPriceNumber.format(
      ratio *
        (enriched?.liquidityB || 0) *
        (inputInfo.liquidityPercentage / 100)
    ),
  });

  useEffect(() => {
    switch (inputInfo.lastTyped) {
      case "pool": {
        setInputsDescription({
          pool: "Input",
          poolAmount:
            inputInfo.amount !== "initial"
              ? inputInfo.amount
              : formatPriceNumber.format(
                  ratio *
                    (enriched?.supply || 0) *
                    (inputInfo.liquidityPercentage / 100)
                ),
          tokenA: "Output (Estimated)",
          tokenAAmount: formatPriceNumber.format(
            ratio *
              (enriched?.liquidityA || 0) *
              (inputInfo.liquidityPercentage / 100)
          ),
          tokenB: "Output (Estimated)",
          tokenBAmount: formatPriceNumber.format(
            ratio *
              (enriched?.liquidityB || 0) *
              (inputInfo.liquidityPercentage / 100)
          ),
        });
        break;
      }
      case "tokenA": {
        setInputsDescription({
          pool: "Input",
          poolAmount: formatPriceNumber.format(
            ratio *
              (enriched?.supply || 0) *
              (inputInfo.liquidityPercentage / 100)
          ),
          tokenA: "Output (Estimated)",
          tokenAAmount: inputInfo.amount,
          tokenB: "Output (Estimated)",
          tokenBAmount: formatPriceNumber.format(
            ratio *
              (enriched?.liquidityB || 0) *
              (inputInfo.liquidityPercentage / 100)
          ),
        });
        break;
      }
      case "tokenB": {
        setInputsDescription({
          pool: "Input",
          poolAmount: formatPriceNumber.format(
            ratio *
              (enriched?.supply || 0) *
              (inputInfo.liquidityPercentage / 100)
          ),
          tokenA: "Output (Estimated)",
          tokenAAmount: formatPriceNumber.format(
            ratio *
              (enriched?.liquidityA || 0) *
              (inputInfo.liquidityPercentage / 100)
          ),
          tokenB: "Output (Estimated)",
          tokenBAmount: inputInfo.amount,
        });
        break;
      }
      case "slider": {
        setInputsDescription({
          pool: "Input",
          poolAmount: formatPriceNumber.format(
            ratio *
              (enriched?.supply || 0) *
              (inputInfo.liquidityPercentage / 100)
          ),
          tokenA: "Output (Estimated)",
          tokenAAmount: formatPriceNumber.format(
            ratio *
              (enriched?.liquidityA || 0) *
              (inputInfo.liquidityPercentage / 100)
          ),
          tokenB: "Output (Estimated)",
          tokenBAmount: formatPriceNumber.format(
            ratio *
              (enriched?.liquidityB || 0) *
              (inputInfo.liquidityPercentage / 100)
          ),
        });
        break;
      }
    }
  }, [inputInfo, enriched, ratio, inputInfo.liquidityPercentage]);

  if (!pool || !enriched) {
    return null;
  }
  const baseMintAddress = enriched.mints[0];
  const quoteMintAddress = enriched.mints[1];

  const handleInputChange = (val: any, inputSource: string) => {
    switch (inputSource) {
      case "pool": {
        setInputInfo({
          liquidityPercentage: (val * 100) / (enriched.supply * ratio),
          amount: val,
          lastTyped: "pool",
        });
        break;
      }
      case "tokenA": {
        setInputInfo({
          liquidityPercentage: (val * 100) / (enriched.liquidityA * ratio),
          amount: val,
          lastTyped: "tokenA",
        });
        break;
      }
      case "tokenB": {
        setInputInfo({
          liquidityPercentage: (val * 100) / (enriched.liquidityB * ratio),
          amount: val,
          lastTyped: "tokenB",
        });
        break;
      }
    }
  };

  return (
    <>
      {inputType === "slider" && (
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
                <div className="pool-card-cell">
                  <Button onClick={() => setInputType("input")}>
                    Detailed
                  </Button>
                </div>
              </div>
              <div className="pool-card-row">
                <div className="pool-card-cell">
                  <Typography.Text style={{ fontSize: "42px" }}>
                    {formatPriceNumber.format(inputInfo.liquidityPercentage)}%
                  </Typography.Text>
                </div>
              </div>
              <div className="pool-card-row">
                <Slider
                  style={{ width: "100%" }}
                  value={inputInfo.liquidityPercentage}
                  tipFormatter={(amount?: number) => `${amount}%`}
                  min={0}
                  max={100}
                  onChange={(amount: number) =>
                    setInputInfo({
                      ...inputInfo,
                      liquidityPercentage: amount,
                      lastTyped: "slider",
                    })
                  }
                />
              </div>
              <Row>
                <Col span={6}>
                  <Button
                    onClick={() =>
                      setInputInfo({
                        ...inputInfo,
                        liquidityPercentage: 25,
                        lastTyped: "slider",
                      })
                    }
                  >
                    25%
                  </Button>
                </Col>
                <Col span={6}>
                  <Button
                    onClick={() =>
                      setInputInfo({
                        ...inputInfo,
                        liquidityPercentage: 50,
                        lastTyped: "slider",
                      })
                    }
                  >
                    50%
                  </Button>
                </Col>
                <Col span={6}>
                  <Button
                    onClick={() =>
                      setInputInfo({
                        ...inputInfo,
                        liquidityPercentage: 75,
                        lastTyped: "slider",
                      })
                    }
                  >
                    75%
                  </Button>
                </Col>
                <Col span={6}>
                  <Button
                    onClick={() =>
                      setInputInfo({
                        ...inputInfo,
                        liquidityPercentage: 100,
                        lastTyped: "slider",
                      })
                    }
                  >
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
                    ratio *
                      enriched.liquidityA *
                      (inputInfo.liquidityPercentage / 100)
                  )}
                </div>
                <div className="pool-card-cell">
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <TokenIcon mintAddress={baseMintAddress} />
                    <h3 style={{ margin: 0 }}>{enriched?.names[0]}</h3>
                  </div>
                </div>
              </div>
              <div className="pool-card-row">
                <div className="pool-card-cell">
                  {formatPriceNumber.format(
                    ratio *
                      enriched.liquidityB *
                      (inputInfo.liquidityPercentage / 100)
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
      )}
      {inputType === "input" && (
        <div className="input-card">
          Remove Liquidity
          <Card
            className="ccy-input"
            style={{ borderRadius: 20, width: "100%" }}
            size="small"
          >
            <div className="pool-card" style={{ width: "initial" }}>
              <div className="pool-card-row">
                <div className="pool-card-cell">Amount Estimated</div>
                <div className="pool-card-cell">
                  <Button onClick={() => setInputType("slider")}>Simple</Button>
                </div>
              </div>
              <div className="pool-card-row">
                <div className="pool-card-cell">
                  <Typography.Text style={{ fontSize: "42px" }}>
                    {formatPriceNumber.format(inputInfo.liquidityPercentage)}%
                  </Typography.Text>
                </div>
              </div>
            </div>
            <div className="pool-card-row">
              <Slider
                style={{ width: "100%" }}
                value={inputInfo.liquidityPercentage}
                tipFormatter={(amount?: number) => `${amount}%`}
                min={0}
                max={100}
                onChange={(amount: number) =>
                  setInputInfo({
                    ...inputInfo,
                    liquidityPercentage: amount,
                    lastTyped: "slider",
                  })
                }
              />
            </div>
            <Row>
              <Col span={6}>
                <Button
                  onClick={() =>
                    setInputInfo({
                      ...inputInfo,
                      liquidityPercentage: 25,
                      lastTyped: "slider",
                    })
                  }
                >
                  25%
                </Button>
              </Col>
              <Col span={6}>
                <Button
                  onClick={() =>
                    setInputInfo({
                      ...inputInfo,
                      liquidityPercentage: 50,
                      lastTyped: "slider",
                    })
                  }
                >
                  50%
                </Button>
              </Col>
              <Col span={6}>
                <Button
                  onClick={() =>
                    setInputInfo({
                      ...inputInfo,
                      liquidityPercentage: 75,
                      lastTyped: "slider",
                    })
                  }
                >
                  75%
                </Button>
              </Col>
              <Col span={6}>
                <Button
                  onClick={() =>
                    setInputInfo({
                      ...inputInfo,
                      liquidityPercentage: 100,
                      lastTyped: "slider",
                    })
                  }
                >
                  100%
                </Button>
              </Col>
            </Row>
          </Card>
          <PoolCurrencyInput
            mint={pool.pubkeys.mint.toBase58()}
            pool={pool}
            title={inputsDescription.pool}
            amount={inputsDescription.poolAmount}
            onInputChange={(val: any) => {
              handleInputChange(val, "pool");
            }}
          />
          ↓
          <PoolCurrencyInput
            mint={pool.pubkeys.holdingMints[0].toBase58()}
            title={inputsDescription.tokenA}
            amount={inputsDescription.tokenAAmount}
            onInputChange={(val: any) => {
              handleInputChange(val, "tokenA");
            }}
          />
          +
          <PoolCurrencyInput
            mint={pool.pubkeys.holdingMints[1].toBase58()}
            title={inputsDescription.tokenB}
            amount={inputsDescription.tokenBAmount}
            onInputChange={(val: any) => {
              handleInputChange(val, "tokenB");
            }}
          />
        </div>
      )}
      {account && (
        <RemoveLiquidity
          instance={{ pool: pool, account: account }}
          removeRatio={inputInfo.liquidityPercentage / 100}
        />
      )}
      <YourPosition pool={pool} />
    </>
  );
};

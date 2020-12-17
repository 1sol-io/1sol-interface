import React, { useEffect, useState } from "react";
import {Button, Card, Col, Popover, Row, Select, Slider, Spin, Typography} from "antd";

import { removeLiquidity } from "../../utils/pools";
import { useWallet } from "../../utils/wallet";
import { useConnection, useConnectionConfig } from "../../utils/connection";
import {PoolInfo, TokenAccount, TokenSwapLayout} from "../../models";
import { notify } from "../../utils/notifications";
import {PoolIcon, TokenIcon} from "../tokenIcon";
import { YourPosition } from "./add";
import { useMint } from "../../utils/accounts";
import {formatPriceNumber, getPoolName, getTokenName} from "../../utils/utils";
import {PoolCurrencyInput, TokenDisplay} from "../currencyInput";
import {LoadingOutlined, QuestionCircleOutlined} from "@ant-design/icons";
import { generateRemoveLabel } from "../labels";
import {programIds} from "../../utils/ids";
import {PublicKey} from "@solana/web3.js";
const { Option } = Select;

export const RemoveLiquidity = (props: {
  instance: { account: TokenAccount; pool: PoolInfo };
  removeRatio: number;
  withdrawType: string;
  amount?: number;
}) => {
  const { account, pool } = props.instance;
  const { removeRatio, withdrawType, amount } = props;
  const [pendingTx, setPendingTx] = useState(false);
  const { wallet, connected } = useWallet();
  const connection = useConnection();
  const { tokenMap } = useConnectionConfig();

  const isLatestLayout = programIds().swapLayout === TokenSwapLayout;

  let liquidityAmount: number = removeRatio * account.info.amount.toNumber();
  const hasSufficientBalance =
    liquidityAmount <= account.info.amount.toNumber();

  const onRemove = async () => {
    try {
      setPendingTx(true);
      if (withdrawType === "one" && isLatestLayout){
        //await removeExactOneLiquidity(connection, wallet, account, liquidityAmount, amount, pool)
      } else {
        await removeLiquidity(connection, wallet, liquidityAmount, account, pool);
      }
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
  const { tokenMap } = useConnectionConfig();
  const isLatestLayout = programIds().swapLayout === TokenSwapLayout;
  const lpMint = useMint(pool?.pubkeys.mint);

  const [withdrawType, setWithdrawType] = useState("both");
  const [withdrawToken, setWithdrawToken] = useState<string>(
    pool?.pubkeys.mint.toBase58()
  );

  const ratio =
    (account?.info.amount.toNumber() || 0) / (lpMint?.supply.toNumber() || 1);

  const baseMintAddress = enriched.mints[0];
  const quoteMintAddress = enriched.mints[1];

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
          pool: withdrawType === "both" ? "Input" : "Output (Estimated)",
          poolAmount:
            inputInfo.amount !== "initial"
              ? inputInfo.amount
              : formatPriceNumber.format(
                  ratio *
                    (enriched?.supply || 0) *
                    (inputInfo.liquidityPercentage / 100)
                ),
          tokenA: withdrawType === "one" ? "Input" : "Output (Estimated)",
          tokenAAmount: formatPriceNumber.format(
            ratio *
              (enriched?.liquidityA || 0) *
              (inputInfo.liquidityPercentage / 100)
          ),
          tokenB: withdrawType === "one" ? "Input" : "Output (Estimated)",
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
          pool: withdrawType === "both" ? "Input" : "Output (Estimated)",
          poolAmount: formatPriceNumber.format(
            ratio *
              (enriched?.supply || 0) *
              (inputInfo.liquidityPercentage / 100)
          ),
          tokenA: withdrawType === "one" ? "Input" : "Output (Estimated)",
          tokenAAmount: inputInfo.amount,
          tokenB: withdrawType === "one" ? "Input" : "Output (Estimated)",
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
          pool: withdrawType === "both" ? "Input" : "Output (Estimated)",
          poolAmount: formatPriceNumber.format(
            ratio *
              (enriched?.supply || 0) *
              (inputInfo.liquidityPercentage / 100)
          ),
          tokenA: withdrawType === "one" ? "Input" : "Output (Estimated)",
          tokenAAmount: formatPriceNumber.format(
            ratio *
              (enriched?.liquidityA || 0) *
              (inputInfo.liquidityPercentage / 100)
          ),
          tokenB: withdrawType === "one" ? "Input" : "Output (Estimated)",
          tokenBAmount: inputInfo.amount,
        });
        break;
      }
      case "slider": {
        setInputsDescription({
          pool: withdrawType === "both" ? "Input" : "Output (Estimated)",
          poolAmount: formatPriceNumber.format(
            ratio *
              (enriched?.supply || 0) *
              (inputInfo.liquidityPercentage / 100)
          ),
          tokenA: withdrawType === "one" ? "Input" : "Output (Estimated)",
          tokenAAmount: formatPriceNumber.format(
            ratio *
              (enriched?.liquidityA || 0) *
              (inputInfo.liquidityPercentage / 100)
          ),
          tokenB: withdrawType === "one" ? "Input" : "Output (Estimated)",
          tokenBAmount: formatPriceNumber.format(
            ratio *
              (enriched?.liquidityB || 0) *
              (inputInfo.liquidityPercentage / 100)
          ),
        });
        break;
      }
    }
  }, [inputInfo, enriched, ratio, inputInfo.liquidityPercentage, withdrawType]);

  useEffect(() => {
    if (withdrawType === "one") {
      if (withdrawToken === baseMintAddress && inputInfo.amount !== inputsDescription.tokenAAmount) {
        setInputInfo({
          ...inputInfo,
          lastTyped: "tokenA",
          amount: inputsDescription.tokenAAmount
        })
      }else if (withdrawToken === quoteMintAddress && inputInfo.amount !== inputsDescription.tokenBAmount) {
        setInputInfo({
          ...inputInfo,
          lastTyped: "tokenB",
          amount: inputsDescription.tokenBAmount
        })
      }
    }
  }, [inputInfo, withdrawToken, withdrawType, enriched, inputsDescription, baseMintAddress, quoteMintAddress])

  if (!pool || !enriched) {
    return null;
  }

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

  const getTokenOptions = () => {
    if (pool) {
      const name = getPoolName(tokenMap, pool);
      const mint = pool.pubkeys.mint.toBase58();
      const sorted = pool.pubkeys.holdingMints
        .map((a: PublicKey) => a.toBase58())
        .sort();
      const icon = <PoolIcon mintA={sorted[0]} mintB={sorted[1]}/>;
      return (
        <>
          {pool && (
            <Option key={mint} value={mint} name={name}>
              <TokenDisplay
                key={mint}
                mintAddress={mint}
                name={name}
                icon={icon}
              />
            </Option>
          )}
          {pool.pubkeys.holdingMints.map((mint) => {
            const mintAddress = mint.toBase58();
            const tokenName = getTokenName(tokenMap, mintAddress);
            return (
              <Option
                key={mintAddress}
                value={mintAddress}
                name={tokenName}
                title={mintAddress}
              >
                <TokenDisplay
                  key={mintAddress}
                  name={tokenName}
                  mintAddress={mintAddress}
                  showBalance={true}
                />
              </Option>
            );
          })}
        </>
      );
    }
    return null;
  }

  const handleToggleWithdrawType = (item: any) => {
    if (item === pool?.pubkeys.mint.toBase58()) {
      setWithdrawType("both");
      setWithdrawToken(pool?.pubkeys.mint.toBase58());
    } else if (item === enriched.mints[0]) {
      if (withdrawType !== "one") {
        setWithdrawType("one");
      }
      setWithdrawToken(enriched.mints[0]);
    } else if (item === enriched.mints[1]) {
      if (withdrawType !== "one") {
        setWithdrawType("one");
      }
      setWithdrawToken(enriched.mints[1]);
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
          { isLatestLayout && pool && (
            <div className="flex-row-center">
              <Select
                size="large"
                showSearch
                style={{ minWidth: 150 }}
                placeholder="Remove Token"
                value={withdrawToken}
                onChange={(item) => {
                  handleToggleWithdrawType(item);
                }}
                filterOption={(input, option) =>
                  option?.name?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {getTokenOptions()}
              </Select>
              <Popover
              placement="topRight"
              trigger="hover"
              content={
                <div style={{width: 300}}>
                  You can select a one of the tokens to remove liquidity from
                  the pool or both as default.
                </div>
              }
            >
              <Button
                shape="circle"
                size="large"
                type="text"
                icon={<QuestionCircleOutlined />}
              />
            </Popover>
            </div>
          )}
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
          {(withdrawType === "both" || withdrawToken === baseMintAddress) && (
            <PoolCurrencyInput
              mint={baseMintAddress}
              title={inputsDescription.tokenA}
              amount={inputsDescription.tokenAAmount}
              onInputChange={(val: any) => {
                handleInputChange(val, "tokenA");
              }}
            />
          )}
          {withdrawType === "both" && "+" }
          {(withdrawType === "both" || withdrawToken === quoteMintAddress) && (
            <PoolCurrencyInput
              mint={quoteMintAddress}
              title={inputsDescription.tokenB}
              amount={inputsDescription.tokenBAmount}
              onInputChange={(val: any) => {
                handleInputChange(val, "tokenB");
              }}
            />
          )}
        </div>
      )}
      {account && (
        <RemoveLiquidity
          instance={{ pool: pool, account: account }}
          removeRatio={inputInfo.liquidityPercentage / 100}
          withdrawType={withdrawType}
          amount={parseFloat(inputInfo.amount)}
        />
      )}
      <YourPosition pool={pool} />
    </>
  );
};

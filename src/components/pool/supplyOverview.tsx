import React, { useEffect, useMemo, useState } from "react";
import {Button, Card, Col, Row, Typography} from "antd";
import {
  getTokenName,
  formatTokenAmount,
  convert,
  STABLE_COINS,
} from "../../utils/utils";
import { PieChart, Pie, Cell } from "recharts";
import { useMint, useAccount } from "../../utils/accounts";
import {
  ENDPOINTS,
  useConnection,
  useConnectionConfig,
} from "../../utils/connection";
import { PoolInfo } from "../../models";
import { MARKETS, TOKEN_MINTS, Market } from "@project-serum/serum";
import {Connection, PublicKey} from "@solana/web3.js";
import { CopyOutlined } from '@ant-design/icons';

export function abbreviateAddress(address: PublicKey, size = 4) {
  const base58 = address.toBase58();
  return base58.slice(0, size) + '…' + base58.slice(-size);
}

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = (props: any, data: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, index } = props;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#FFFFFF"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
    >
      {data[index].name}
    </text>
  );
};

const useMidPriceInUSD = (mint: string) => {
  const connection = useMemo(
    () => new Connection(ENDPOINTS[0].endpoint, "recent"),
    []
  );
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [isBase, setIsBase] = useState(false);

  useEffect(() => {
    setIsBase(true);
    setPrice(undefined);

    const SERUM_TOKEN = TOKEN_MINTS.find((a) => a.address.toBase58() === mint);
    const marketName = `${SERUM_TOKEN?.name}/USDC`;
    const marketInfo = MARKETS.find((m) => m.name === marketName);

    if (STABLE_COINS.has(SERUM_TOKEN?.name || "")) {
      setIsBase(true);
      setPrice(1.0);
      return;
    }

    if (!marketInfo?.programId) {
      return;
    }

    (async () => {
      let market = await Market.load(
        connection,
        marketInfo.address,
        undefined,
        marketInfo.programId
      );

      const bids = await market.loadBids(connection);
      const asks = await market.loadAsks(connection);
      const bestBid = bids.getL2(1);
      const bestAsk = asks.getL2(1);

      setIsBase(false);

      if (bestBid.length > 0 && bestAsk.length > 0) {
        setPrice((bestBid[0][0] + bestAsk[0][0]) / 2.0);
      }
    })();
  }, [connection, mint, setIsBase, setPrice]);

  return { price, isBase };
};

export const SupplyOverview = (props: {
  mintAddress: string[];
  pool?: PoolInfo;
}) => {
  const { mintAddress, pool } = props;
  const connection = useConnection();
  const mintA = useMint(mintAddress[0]);
  const mintB = useMint(mintAddress[1]);
  const accountA = useAccount(
    pool?.pubkeys.holdingMints[0].toBase58() === mintAddress[0]
      ? pool?.pubkeys.holdingAccounts[0]
      : pool?.pubkeys.holdingAccounts[1]
  );
  const accountB = useAccount(
    pool?.pubkeys.holdingMints[0].toBase58() === mintAddress[0]
      ? pool?.pubkeys.holdingAccounts[1]
      : pool?.pubkeys.holdingAccounts[0]
  );
  const { env } = useConnectionConfig();
  const [data, setData] = useState<
    { name: string; value: number; color: string }[]
  >([]);
  const { price: priceA, isBase: isBaseA } = useMidPriceInUSD(mintAddress[0]);
  const { price: priceB, isBase: isBaseB } = useMidPriceInUSD(mintAddress[1]);

  const hasBothPrices = priceA !== undefined && priceB !== undefined;

  useEffect(() => {
    if (!mintAddress || !accountA || !accountB) {
      return;
    }

    (async () => {
      let chart = [
        {
          name: getTokenName(env, mintAddress[0]),
          value: convert(accountA, mintA, hasBothPrices ? priceA : undefined),
          color: "#6610f2",
        },
        {
          name: getTokenName(env, mintAddress[1]),
          value: convert(accountB, mintB, hasBothPrices ? priceB : undefined),
          color: "#d83aeb",
        },
      ];

      setData(chart);
    })();
  }, [
    accountA,
    accountB,
    mintA,
    mintB,
    connection,
    env,
    mintAddress,
    hasBothPrices,
    priceA,
    priceB,
  ]);

  if (!pool || !accountA || !accountB || data.length < 1) {
    return null;
  }

  return (
    <Card style={{ borderWidth: 0 }}>
      <div style={{ display: "flex" }}>
        <PieChart width={150} height={150}>
          <Pie
            dataKey="value"
            isAnimationActive={false}
            data={data}
            labelLine={false}
            cx={70}
            cy={70}
            label={(props) => renderCustomizedLabel(props, data)}
            outerRadius={60}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} stroke="" fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 20,
            flex: "1 1",
            alignItems: "flex-start",
            justifyContent: "center",
          }}
        >
          <div title={formatTokenAmount(accountA, mintA)}>
            <span>{data[0].name}:</span>{" "}
            {formatTokenAmount(
              accountA,
              mintA,
              1,
              "",
              "",
              isBaseA ? 0 : 2,
              isBaseA
            )}{" "}
            {!isBaseA &&
              formatTokenAmount(accountA, mintA, priceA, "($", ")", 0, true)}
          </div>
          <div title={formatTokenAmount(accountB, mintB)}>
            <span>{data[1].name}:</span>{" "}
            {formatTokenAmount(
              accountB,
              mintB,
              1,
              "",
              "",
              isBaseB ? 0 : 2,
              isBaseB
            )}{" "}
            {!isBaseB &&
              priceB &&
              formatTokenAmount(accountB, mintB, priceB, "($", ")", 0, true)}
          </div>
        </div>
      </div>
      {pool.pubkeys.account && (
        <div>
          <Row>
            <Col span={8}>Pool address:</Col>
            <Col span={13}>
              <a
                href={`https://explorer.solana.com/address/${pool.pubkeys.account.toBase58()}`}
                // eslint-disable-next-line react/jsx-no-target-blank
                target="_blank"
              >
                <Typography.Text code>
                  {abbreviateAddress(pool.pubkeys.account, 11)}
                </Typography.Text>
              </a>
            </Col>
            <Col span={2} offset={1}>
              <Button
                shape="round"
                icon={<CopyOutlined />}
                size={'small'}
                onClick={() => navigator.clipboard.writeText(pool.pubkeys.account.toBase58())}
              />
            </Col>
          </Row>
        </div>
      )}
    </Card>
  );
};

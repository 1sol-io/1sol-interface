import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "antd";
import {
  getTokenName,
  formatTokenAmount,
  convert,
} from "../../utils/utils";
import { useMint, useAccount } from "../../utils/accounts";
import {
  useConnection,
  useConnectionConfig,
} from "../../utils/connection";
import { PoolInfo } from "../../models";
import { useMidPriceInUSD } from "./../../context/market";
import echarts from "echarts";

export const SupplyOverview = (props: {
  mintAddress: string[];
  pool?: PoolInfo;
}) => {
  const { mintAddress, pool } = props;
  const connection = useConnection();
  const mintA = useMint(mintAddress[0]);
  const mintB = useMint(mintAddress[1]);
  const accountA = useAccount(
    pool?.pubkeys.holdingMints[0]?.toBase58() === mintAddress[0]
      ? pool?.pubkeys.holdingAccounts[0]
      : pool?.pubkeys.holdingAccounts[1]
  );
  const accountB = useAccount(
    pool?.pubkeys.holdingMints[0]?.toBase58() === mintAddress[0]
      ? pool?.pubkeys.holdingAccounts[1]
      : pool?.pubkeys.holdingAccounts[0]
  );
  const { env } = useConnectionConfig();
  const [data, setData] = useState<
    { name: string; value: number; color: string }[]
  >([]);
  const { price: priceA, isBase: isBaseA } = useMidPriceInUSD(mintAddress[0]);
  const { price: priceB, isBase: isBaseB } = useMidPriceInUSD(mintAddress[1]);
  const chartDiv = useRef<HTMLDivElement>(null);
  const echartsRef = useRef<any>(null);

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

  useEffect(() => {
    if (chartDiv.current) {
      echartsRef.current = echarts.init(chartDiv.current);
    }

    return () => {
      echartsRef.current && echartsRef.current.dispose();
    };
  }, [echartsRef, chartDiv]);

  useEffect(() => {
    echartsRef.current?.setOption({
      series: [
        {
          name: "Liquidity",
          type: "pie",
          top: 0,
          bottom: 10,
          left: 30,
          right: 30,
          // visibleMin: 300,
          label: {
            show: true,
            formatter: "{b}",
          },
          itemStyle: {
            normal: {
              borderColor: "#000",
            },
          },
          data: data,
        },
      ],
    });
  }, [echartsRef.current, data]);


  if (!pool || !accountA || !accountB || data.length < 1) {
    return null;
  }

  return (
    <Card style={{ borderWidth: 0 }}>
      <div style={{ display: "flex" }}>
        <div ref={chartDiv} style={{ height: 150, width: 150 }} />
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
    </Card>
  );
};

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

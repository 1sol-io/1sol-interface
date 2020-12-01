import React, { useEffect, useRef } from "react";
import { Card } from "antd";
import "./styles.less";
import echarts from "echarts";
import { PoolInfo } from "../../models";
import { PoolIcon } from "../tokenIcon";
import { formatShortDate, getPoolName } from "../../utils/utils";
import { useConnectionConfig } from "../../utils/connection";

export const VOLUME_API = "https://serum-api.bonfida.com/pools/volumes";
export const LIQUIDITY_API = "https://serum-api.bonfida.com/pools/liquidity";

interface VolumeData {
  volume: number;
  time: number;
}

interface LiquidityData {
  liquidityAinUsd: number;
  liquidityBinUsd: number;
  time: number;
}

export const HistoricalVolume = React.memo(
  (props: { pool: PoolInfo; poolName?: any }) => {
    const pool = props.pool;
    const chartDiv = useRef<HTMLDivElement>(null);
    const echartsRef = useRef<any>(null);

    const baseMintAddress = pool.pubkeys.holdingMints[0].toBase58();
    const quoteMintAddress = pool.pubkeys.holdingMints[1].toBase58();

    const bonfidaVolumeQuery = async () => {
      try {
        const resp = await window.fetch(
          `${VOLUME_API}?mintA=${baseMintAddress}&mintB=${quoteMintAddress}`
        );
        const data = await resp.json();
        const volumeData = data?.data.slice(0, 7) as VolumeData[];

        updateChart(volumeData);
      } catch {
        // ignore
      }
    };
    const updateChart = (volumeData: VolumeData[]) => {
      if (echartsRef.current) {
        echartsRef.current.setOption({
          title: {
            text: `Historical Volume ${props.poolName}`,
            color: "#fff",
            textStyle: {
              color: "#fff",
            },
          },
          textStyle: {
            color: "#fff",
          },
          tooltip: {
            trigger: "axis",
            axisPointer: {
              type: "shadow",
            },
          },
          grid: {
            containLabel: true,
            left: 0,
            right: 0,
          },
          xAxis: [
            {
              name: "Date",
              nameLocation: "middle",
              type: "category",
              data: volumeData.map((d) =>
                formatShortDate.format(new Date(d.time))
              ),
            },
          ],
          yAxis: [
            {
              name: "Volume",
              type: "value",
              scale: true,
              splitLine: false,
            },
          ],
          series: [
            {
              type: "bar",
              barWidth: "50%",
              data: volumeData.map((d) => d.volume),
            },
          ],
        });
      }
    };

    useEffect(() => {
      if (chartDiv.current) {
        echartsRef.current = echarts.init(chartDiv.current);
      }
      bonfidaVolumeQuery();
      return () => {
        echartsRef.current.dispose();
      };
    }, []);
    return <div ref={chartDiv} style={{ height: "250px", width: "100%" }} />;
  }
);

export const HistoricalLiquidity = React.memo(
  (props: { pool: PoolInfo; poolName?: any }) => {
    const pool = props.pool;
    const chartDiv = useRef<HTMLDivElement>(null);
    const echartsRef = useRef<any>(null);

    const baseMintAddress = pool.pubkeys.holdingMints[0].toBase58();
    const quoteMintAddress = pool.pubkeys.holdingMints[1].toBase58();

    const bonfidaLiquidityQuery = async () => {
      try {
        const resp = await window.fetch(
          `${LIQUIDITY_API}?mintA=${baseMintAddress}&mintB=${quoteMintAddress}`
        );
        const data = await resp.json();
        const liquidityData = data?.data.slice(0, 7) as LiquidityData[];

        updateChart(liquidityData);
      } catch {
        // ignore
      }
    };
    const updateChart = (liquidityData: LiquidityData[]) => {
      if (echartsRef.current) {
        echartsRef.current.setOption({
          title: {
            text: `Historical Liquidity ${props.poolName}`,
            color: "#fff",
            textStyle: {
              color: "#fff",
            },
          },
          textStyle: {
            color: "#fff",
          },
          tooltip: {
            trigger: "axis",
            axisPointer: {
              type: "shadow",
            },
          },
          grid: {
            containLabel: true,
            left: 0,
            right: 0,
          },
          xAxis: [
            {
              name: "Date",
              nameLocation: "middle",
              type: "category",
              data: liquidityData.map((d) =>
                formatShortDate.format(new Date(d.time))
              ),
            },
          ],
          yAxis: [
            {
              name: "Liquidity",
              type: "value",
              scale: true,
              splitLine: false,
            },
          ],
          series: [
            {
              type: "bar",
              barWidth: "50%",
              data: liquidityData.map(
                (d) => d.liquidityAinUsd + d.liquidityBinUsd
              ),
            },
          ],
        });
      }
    };

    useEffect(() => {
      if (chartDiv.current) {
        echartsRef.current = echarts.init(chartDiv.current);
      }
      bonfidaLiquidityQuery();
      return () => {
        echartsRef.current.dispose();
      };
    }, []);
    return <div ref={chartDiv} style={{ height: "250px", width: "100%" }} />;
  }
);

export const HitoricalPoolData = React.memo((props: { pool: PoolInfo }) => {
  const { tokenMap } = useConnectionConfig();
  const pool = props.pool;
  const baseMintAddress = pool.pubkeys.holdingMints[0].toBase58();
  const quoteMintAddress = pool.pubkeys.holdingMints[1].toBase58();
  const name = getPoolName(tokenMap, pool);
  return (
    <Card
      className="pool-card"
      title={
        <>
          <PoolIcon
            mintA={baseMintAddress}
            mintB={quoteMintAddress}
            className="left-icon"
          />
          {name}
        </>
      }
    >
      <HistoricalLiquidity pool={pool} poolName="" />
      <HistoricalVolume pool={pool} poolName="" />
    </Card>
  );
});

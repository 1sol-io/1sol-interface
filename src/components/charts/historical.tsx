import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card, Spin, Typography } from "antd";
import "./styles.less";
import echarts from "echarts";
import { PoolInfo } from "../../models";
import { PoolIcon } from "../tokenIcon";
import { formatShortDate, getPoolName } from "../../utils/utils";
import { useConnectionConfig } from "../../utils/connection";
import { BONFIDA_POOL_INTERVAL } from "../../context/market";

export const VOLUME_API = "https://serum-api.bonfida.com/pools/volumes";
export const LIQUIDITY_API = "https://serum-api.bonfida.com/pools/liquidity";

const API_ENDPOINTS: EndpointOptions = {
  volume: VOLUME_API,
  liquidity: LIQUIDITY_API,
};
type EndpointOptions = {
  [key: string]: string;
};
interface VolumeData {
  volume: number;
  time: number;
}

interface LiquidityData {
  liquidityAinUsd: number;
  liquidityBinUsd: number;
  time: number;
}

export const PoolLineChart = React.memo(
  (props: {
    pool?: PoolInfo;
    limit?: number;
    api: string;
    chartName: string;
    current?: string;
    type?: string;
    getComputedData: (item: any) => Array<number>;
    getComputedTime: (item: any) => Array<string>;
  }) => {
    const { pool, api, limit, chartName, current } = props;
    const chartDiv = useRef<HTMLDivElement>(null);
    const echartsRef = useRef<any>(null);
    const [loading, setLoading] = useState<boolean>(true);

    let apiFilter: string = "";
    let apiUrl: string = "";
    const bonfidaTimer = useRef<number>(0);
    if (pool) {
      const baseMintAddress = pool.pubkeys.holdingMints[0].toBase58();
      const quoteMintAddress = pool.pubkeys.holdingMints[1].toBase58();
      apiFilter = `?mintA=${baseMintAddress}&mintB=${quoteMintAddress}`;
    }
    apiUrl = API_ENDPOINTS[api];

    const bonfidaDataChartQuery = useCallback(async () => {
      try {
        const resp = await window.fetch(`${apiUrl}${apiFilter}`);
        const data = await resp.json();
        let finalData = data?.data || [];
        if (limit && finalData) {
          finalData = finalData.slice(0, limit);
        }
        updateChart(finalData);
      } catch {
        // ignore
      }
      bonfidaTimer.current = window.setTimeout(
        () => bonfidaDataChartQuery(),
        BONFIDA_POOL_INTERVAL
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // needs to only be called on mount an unmount

    const updateChart = (data: any) => {
      setLoading(false);
      if (echartsRef.current) {
        echartsRef.current.setOption({
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
              inverse: true,
              type: "category",
              data: props.getComputedTime(data),
            },
          ],
          yAxis: [
            {
              type: "value",
              scale: true,
              splitLine: false,
            },
          ],
          series: [
            {
              type: `${props.type || "line"}`,
              data: props.getComputedData(data),
            },
          ],
        });
      }
    };
    useEffect(() => {
      if (chartDiv.current) {
        echartsRef.current = echarts.init(chartDiv.current);
      }
      bonfidaDataChartQuery();
      return () => {
        echartsRef.current.dispose();
        window.clearTimeout(bonfidaTimer.current);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // needs to only be called on mount an unmount
    return (
      <>
        {loading && <Spin tip="Loading..." />}
        {!loading && (
          <Typography.Title level={4}>
            {chartName} {current || ""}
          </Typography.Title>
        )}
        <div ref={chartDiv} style={{ height: "250px", width: "100%" }} />
      </>
    );
  }
);

export const HistoricalVolume = React.memo(
  (props: { pool?: PoolInfo; current?: string }) => {
    const getComputedData = (data: VolumeData[]) => {
      return data.map((d) => d.volume);
    };
    const getComputedTime = (data: VolumeData[]) => {
      return data.map((d: any) => formatShortDate.format(new Date(d.time)));
    };
    let name: string = "Volume";
    if (props.current) {
      name = "Volume (24H)";
    }
    return (
      <PoolLineChart
        pool={props.pool}
        limit={props.pool ? 7 : 0}
        api="volume"
        type="bar"
        chartName={name}
        current={props.current}
        getComputedData={getComputedData}
        getComputedTime={getComputedTime}
      />
    );
  }
);

type GrupedData = {
  [key: number]: number;
};

export const HistoricalLiquidity = React.memo(
  (props: { pool?: PoolInfo; current?: string }) => {
    const groupByTime = (data: LiquidityData[]) => {
      const groupedData: GrupedData = {};
      for (const d of data) {
        if (!groupedData[d.time]) {
          groupedData[d.time] = 0;
        }
        groupedData[d.time] =
          groupedData[d.time] + d.liquidityAinUsd + d.liquidityBinUsd;
      }
      return groupedData;
    };
    const getComputedData = (data: LiquidityData[]) => {
      const groupedData = groupByTime(data);
      return Object.values(groupedData);
    };
    const getComputedTime = (data: LiquidityData[]) => {
      const groupedData = groupByTime(data);
      return Object.keys(groupedData).map((key) =>
        formatShortDate.format(new Date(parseInt(key)))
      );
    };
    let name: string = "Liquidity";
    if (props.current) {
      name = "Total Liquidity";
    }
    return (
      <PoolLineChart
        pool={props.pool}
        limit={props.pool ? 7 : 0}
        api="liquidity"
        type="line"
        chartName={name}
        current={props.current}
        getComputedData={getComputedData}
        getComputedTime={getComputedTime}
      />
    );
  }
);

export const HistoricalPoolData = React.memo((props: { pool: PoolInfo }) => {
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
      <HistoricalLiquidity pool={pool} />
      <HistoricalVolume pool={pool} />
    </Card>
  );
});

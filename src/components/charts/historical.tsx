import React, { useEffect, useRef } from "react";
import { Card } from "antd";
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
    current?: number;
    getCalculatedNumber: (item: any) => number;
  }) => {
    const { pool, api, limit, chartName, current } = props;
    const chartDiv = useRef<HTMLDivElement>(null);
    const echartsRef = useRef<any>(null);

    let apiFilter: string = "";
    let apiUrl: string = "";
    if (pool) {
      const baseMintAddress = pool.pubkeys.holdingMints[0].toBase58();
      const quoteMintAddress = pool.pubkeys.holdingMints[1].toBase58();
      apiFilter = `?mintA=${baseMintAddress}&mintB=${quoteMintAddress}`;
    }
    apiUrl = API_ENDPOINTS[api];

    const bonfidaDataChartQuery = async () => {
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
    };

    const updateChart = (data: any) => {
      if (echartsRef.current) {
        echartsRef.current.setOption({
          title: {
            text: `Historical ${chartName} ${current || ""}`,
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
              inverse: true,
              name: "Date",
              nameLocation: "middle",
              type: "category",
              data: data.map((d: any) =>
                formatShortDate.format(new Date(d.time))
              ),
            },
          ],
          yAxis: [
            {
              name: chartName,
              type: "value",
              scale: true,
              splitLine: false,
            },
          ],
          series: [
            {
              type: "line",
              data: data.map((d: any) => props.getCalculatedNumber(d)),
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
      let bonfidaTimer = 0;
      bonfidaTimer = window.setInterval(
        () => bonfidaDataChartQuery(),
        BONFIDA_POOL_INTERVAL
      );
      return () => {
        echartsRef.current.dispose();
        window.clearInterval(bonfidaTimer);
      };
    });
    return <div ref={chartDiv} style={{ height: "250px", width: "100%" }} />;
  }
);

export const HistoricalVolume = React.memo((props: { pool: PoolInfo }) => {
  const getCalculatedNumber = (item: VolumeData) => {
    return item.volume;
  };
  return (
    <PoolLineChart
      pool={props.pool}
      limit={7}
      api="volume"
      chartName="Volume"
      getCalculatedNumber={getCalculatedNumber}
    />
  );
});

export const HistoricalLiquidity = React.memo((props: { pool: PoolInfo }) => {
  const getCalculatedNumber = (item: LiquidityData) => {
    return item.liquidityAinUsd + item.liquidityBinUsd;
  };
  return (
    <PoolLineChart
      pool={props.pool}
      limit={7}
      api="liquidity"
      chartName="Liquidity"
      getCalculatedNumber={getCalculatedNumber}
    />
  );
});

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
      <HistoricalLiquidity pool={pool} />
      <HistoricalVolume pool={pool} />
    </Card>
  );
});

import React, { useEffect, useMemo, useRef } from "react";
import { PoolInfo } from "../../models";
import { useEnrichedPools } from "./../../context/market";
import echarts from "echarts";
import { formatUSD } from "../../utils/utils";

export const SupplyOverview = (props: {
  mintAddress: string[];
  pool?: PoolInfo;
}) => {
  const { pool } = props;
  const pools = useMemo(() => (pool ? [pool] : []), [pool]);
  const enriched = useEnrichedPools(pools);
  const chartDiv = useRef<HTMLDivElement>(null);

  // dispose chart
  useEffect(() => {
    const div = chartDiv.current;
    return () => {
      let instance = div && echarts.getInstanceByDom(div);
      instance && instance.dispose();
    };
  }, []);

  useEffect(() => {
    if (!chartDiv.current || enriched.length === 0) {
      return;
    }

    let instance = echarts.getInstanceByDom(chartDiv.current);
    if (!instance) {
      instance = echarts.init(chartDiv.current as any);
    }

    const data = [
      {
        name: enriched[0].names[0],
        value: enriched[0].liquidityAinUsd,
      },
      {
        name: enriched[0].names[1],
        value: enriched[0].liquidityBinUsd,
      },
    ];

    instance.setOption({
      tooltip: {
        trigger: "item",
        formatter: function (params: any) {
          var val = formatUSD.format(params.value);
          return `${params.name}: \n${val}`;
        },
      },
      series: [
        {
          name: "Liquidity",
          type: "pie",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          label: {
            fontSize: 14,
            show: true,
            formatter: function (params: any) {
              var val = formatUSD.format(params.value);
              return `${params.name}\n${val}`;
            },
            color: "rgba(255, 255, 255, 0.5)",
          },
          itemStyle: {
            normal: {
              borderColor: "#000",
            },
          },
          data,
        },
      ],
    });
  }, [enriched]);

  if (enriched.length === 0) {
    return null;
  }

  return <div ref={chartDiv} style={{ height: 150, width: "100%" }} />;
};

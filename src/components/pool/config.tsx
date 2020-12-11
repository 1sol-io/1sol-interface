import React, { useState } from "react";
import { Card, Select } from "antd";
import { NumericInput } from "../numericInput";
import "./add.less";
import { CurveType, DEFAULT_DENOMINATOR, PoolConfig } from "../../models";
import { ENABLE_FEES_INPUT } from "./../../utils/ids";

const Option = Select.Option;

const FeeInput = (props: {
  numerator: number;
  denominator: number;
  set: (numerator: number, denominator: number) => void;
}) => {
  const [value, setValue] = useState(
    ((props.numerator / props.denominator) * 100).toString()
  );

  return (
    <div style={{ padding: "3px 10px 3px 3px", border: "1px solid #434343" }}>
      <NumericInput
        className="slippage-input"
        size="small"
        value={value}
        style={{
          width: 50,
          fontSize: 14,
          boxShadow: "none",
          borderColor: "transparent",
          outline: "transpaernt",
        }}
        onChange={(x: any) => {
          setValue(x);

          const val = parseFloat(x);
          if (Number.isFinite(val)) {
            const numerator = (val * DEFAULT_DENOMINATOR) / 100;
            props.set(numerator, DEFAULT_DENOMINATOR);
          }
        }}
      />
      %
    </div>
  );
};

const PriceParameters = (props: {
  options: PoolConfig;
  setOptions: (config: PoolConfig) => void;
}) => {
  const [value, setValue] = useState("0");
  return (
    <>
      <>
        <span>Token B constant price:</span>
        <div
          style={{ padding: "3px 10px 3px 3px", border: "1px solid #434343" }}
        >
          <NumericInput
            className="slippage-input"
            size="small"
            value={value}
            style={{
              width: 50,
              fontSize: 14,
              boxShadow: "none",
              borderColor: "transparent",
              outline: "transpaernt",
            }}
            onChange={(x: any) => {
              setValue(x);

              props.setOptions({
                ...props.options,
                token_b_price: parseInt(x),
              });
            }}
          />
        </div>
      </>
    </>
  );
};

export const PoolConfigCard = (props: {
  options: PoolConfig;
  setOptions: (config: PoolConfig) => void;
  action?: JSX.Element;
}) => {
  const {
    tradeFeeNumerator,
    tradeFeeDenominator,
    ownerTradeFeeNumerator,
    ownerTradeFeeDenominator,
    ownerWithdrawFeeNumerator,
    ownerWithdrawFeeDenominator,
  } = props.options.fees;

  const feesInput = (
    <>
      <>
        <span>LPs Trading Fee:</span>
        <FeeInput
          numerator={tradeFeeNumerator}
          denominator={tradeFeeDenominator}
          set={(numerator, denominator) =>
            props.setOptions({
              ...props.options,
              fees: {
                ...props.options.fees,
                tradeFeeNumerator: numerator,
                tradeFeeDenominator: denominator,
              },
            })
          }
        />
      </>
      <>
        <span>Owner Trading Fee:</span>
        <FeeInput
          numerator={ownerTradeFeeNumerator}
          denominator={ownerTradeFeeDenominator}
          set={(numerator, denominator) =>
            props.setOptions({
              ...props.options,
              fees: {
                ...props.options.fees,
                ownerTradeFeeNumerator: numerator,
                ownerTradeFeeDenominator: denominator,
              },
            })
          }
        />
      </>
      <>
        <span>Withdraw Fee:</span>
        <FeeInput
          numerator={ownerWithdrawFeeNumerator}
          denominator={ownerWithdrawFeeDenominator}
          set={(numerator, denominator) =>
            props.setOptions({
              ...props.options,
              fees: {
                ...props.options.fees,
                ownerWithdrawFeeNumerator: numerator,
                ownerWithdrawFeeDenominator: denominator,
              },
            })
          }
        />
      </>
    </>
  );

  return (
    <Card title="Pool configuration">
      <div className="pool-settings-grid">
        {ENABLE_FEES_INPUT && feesInput}
        <>
          <span>Curve Type:</span>
          <Select
            defaultValue="0"
            style={{ width: 200 }}
            onChange={(val) =>
              props.setOptions({
                ...props.options,
                curveType: parseInt(val),
              })
            }
          >
            <Option value={CurveType.ConstantProduct.toString()}>
              Constant Product
            </Option>
            <Option value={CurveType.ConstantPrice.toString()}>
              Constant Price
            </Option>
            <Option value={CurveType.ConstantProductWithOffset.toString()}>
              Offset Constant Product
            </Option>
          </Select>
        </>
        {props.options.curveType === CurveType.ConstantPrice && (
          <PriceParameters {...props} />
        )}
      </div>
      {props.action}
    </Card>
  );
};

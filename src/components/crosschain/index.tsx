import React, {useEffect, useState} from "react";
import { Button, Card, Popover, Spin, Typography, Select } from "antd";

import {
  LoadingOutlined,
  SwapOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  PlusOutlined ,
  RightOutlined,
  ArrowRightOutlined
} from "@ant-design/icons";

import {AppBar} from '../appBar'
import { Settings } from "../settings";
import { NumericInput } from "../numericInput";
import { PoolIcon, TokenIcon } from "../tokenIcon";

import { useWallet } from "../../context/wallet";

import './index.less'

const { Option } = Select;

export const TokenDisplay = (props: {
  name: string;
  mintAddress: string;
  icon?: JSX.Element;
}) => {
  const { mintAddress, name, icon } = props;

return (
    <>
      <div
        title={mintAddress}
        key={mintAddress}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {icon || <TokenIcon mintAddress={mintAddress} />}
          {name}
        </div>
      </div>
    </>
  )
}

export const CurrencyInput = (props: {
  amount?: string;
  title?: string;
  onInputChange?: (val: number) => void;
  hideSelect?: boolean;
}) => {
	const tokens: Array<{address: any, symbol: any}> = []

	const renderPopularTokens = tokens.map((item) => {
    return (
      <Option
        key={item.address}
        value={item.address}
        name={item.symbol}
        title={item.address}
      >
        <TokenDisplay
          key={item.address}
          name={item.symbol}
          mintAddress={item.address}
        />
      </Option>
    );
  })

	return (
    <Card
      className="ccy-input"
      style={{ borderRadius: 20 }}
      bodyStyle={{ padding: 0 }}
    >
      <div className="ccy-input-header">
        <div className="ccy-input-header-left">{props.title}</div>
      </div>
      <div className="ccy-input-header" style={{ padding: "0px 10px 5px 7px" }}>
        <NumericInput
          value={props.amount}
          onChange={(val: any) => {
            if (props.onInputChange) {
              props.onInputChange(val);
            }
          }}
          style={{
            fontSize: 20,
            boxShadow: "none",
            borderColor: "transparent",
            outline: "transpaernt",
          }}
          placeholder="0.00"
        />
        <div className="ccy-input-header-right" style={{ display: "felx" }}>
            <Select
              size="large"
              showSearch
              style={{ minWidth: 150 }}
              placeholder="CCY"
              value={'a'}
              onChange={(item) => {
              }}
              filterOption={(input, option) =>
                option?.name?.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {renderPopularTokens}
            </Select>
        </div>
      </div>
    </Card>
  )
}

export const TradeEntry = () => {
  const { connect, connected } = useWallet();
	return (
		<>
			<div className="input-card">
				<CurrencyInput
          title="From"
          onInputChange={(val: any) => {
          }}
          amount={'0'}
        />
        <Button type="primary" className="swap-button" style={{display: 'flex', justifyContent: 'space-around', margin: '20px auto'}}>⇅</Button>
        <CurrencyInput
          title="To (Estimate)"
          onInputChange={(val: any) => {
          }}
          amount={''}
        />
			</div>
			<Button 
				type="primary" 
				size="large" 
				shape="round" 
				block 
				disabled={connected}
        onClick={connect}
			>
				{connected ? 'Swap' : 'Connect Wallet'}
			</Button>
		</>
	)
}

export const CrossChain = () => {
	return (
		<div className="pange-crosschain">
			<AppBar
        right={
          <Popover
            placement="topRight"
            title="Settings"
            content={<Settings />}
            trigger="click"
          >
            <Button
              shape="circle"
              size="large"
              type="text"
              icon={<SettingOutlined />}
            />
          </Popover>
        }
      />
      <Card
        className="exchange-card"
        headStyle={{ padding: 0 }}
        bodyStyle={{ position: "relative" }}
        title="CrossChain(devnet)"
      >
        <TradeEntry />
      </Card>
		</div>
	)
}
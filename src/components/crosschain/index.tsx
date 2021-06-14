import React, {useCallback, useEffect, useState, useRef} from "react";
import axios from 'axios'
import { Button, Card, Popover, Spin, Typography, Select } from "antd";

import { ChainId, Token, WETH, Fetcher, Route } from '@uniswap/sdk'

import {
  LoadingOutlined,
  SwapOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  PlusOutlined ,
  RightOutlined,
  ArrowRightOutlined,
	ArrowDownOutlined
} from "@ant-design/icons";

import {AppBar} from '../appBar'
import { Settings } from "../settings";
import { NumericInput } from "../numericInput";
import { PoolIcon, TokenIcon } from "../tokenIcon";

import { useWallet } from "../../context/wallet";

import './index.less'

const { Option } = Select;

const USDT = new Token(ChainId.MAINNET, '0xdAC17F958D2ee523a2206206994597C13D831ec7', 6)

export const TokenDisplay = (props: {
  name: string;
  icon: string;
}) => {
  const { name, icon } = props;

return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
					<img width={20} style={{marginRight: '0.5rem'}} src={icon} alt={name} />
          {name}
        </div>
      </div>
    </>
  )
}

export const CurrencyInput = (props: {
  amount?: string;
	token: string;
	tokens: Array<{address: any, symbol: any}>;
  title?: string;
  onInputChange?: (val: number) => void;
	onOptionChange?: (val: string) => void;
  hideSelect?: boolean;
}) => {
	const renderPopularTokens = props.tokens.map((item) => {
    return (
      <Option
        key={item.address}
        value={item.address}
        title={item.address}
      >
        <TokenDisplay
          key={item.address}
          name={item.address}
					icon={item.symbol}
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
              placeholder=""
              value={props.token}
              onChange={(item) => {
								if (props.onOptionChange) {
									props.onOptionChange(item)
								}
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

	const ts: Array<{address: string, symbol: string}> = [
			{
			name: "USDT",
			logo: "https://cdn.jsdelivr.net/gh/solana-labs/explorer/public/tokens/usdt.svg"
			},
			{
			name: "BTC",
			logo: "https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/bitcoin/info/logo.png"
			},
			{
			name: "ETH",
			logo: "https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png"
			}
			].map(({name, logo}: {name: string, logo: string}) => ({
			address: name,
			symbol: logo
		}))

	const [tokens, setTokens] = useState(ts)
	const [tokenA, setTokenA] = useState({address: 'USDT', symbol: "https://cdn.jsdelivr.net/gh/solana-labs/explorer/public/tokens/usdt.svg"})
	const [tokenB, setTokenB] = useState({address: 'BTC', symbol: 'https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/bitcoin/info/logo.png'})

	const fetchTokens = useCallback(async () => {
		const {data: {data}} = await axios.get('http://192.168.4.11:8080/crosschain/token-list')

		// console.log(data)
		setTokens(data.map(({name, logo}: {name: string, logo: string}) => ({
			address: name,
			symbol: logo
		})))
	}, [])

	// useEffect(() => {fetchTokens()}, [fetchTokens])

	const [amountA, setAmountA] = useState('10000')
	const [amountB, setAmountB] = useState('')

	const defaultChains : Array<{chain: string, amount: number}> = []
	const [chains, setChains] = useState(defaultChains)

  const CancelToken = axios.CancelToken;
  const cancel = useRef(function () {})

	const fetchData = useCallback(async () => {
		setChains([])
		setAmountB('')
		// const token = tokenB.address === 'BTC' ? '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599' : WETH[USDT.chainId]
		const pair = await Fetcher.fetchPairData(USDT, WETH[USDT.chainId])
		const route = new Route([pair], WETH[USDT.chainId])

		const amountB = Number(route.midPrice.invert().toSignificant(6)) * Number(amountA) 

		setAmountB(`${amountB}`)

      if (cancel.current) {
        cancel.current()
      }

			const {data: {data}} = await axios({
				url: 'https://api.1sol.io/crosschain/calculate-swap',
				method: 'post',
				data: {
					token_a: tokenA.address,
					token_b: tokenB.address,
					amount_in: Number(amountA)
				},
        cancelToken: new CancelToken((c) => cancel.current = c)
			})

			setChains([...data.map(({chain, amount_out, decimals}: {chain: string, amount_out: number, decimals: number}) => ({
				chain,
				amount: amount_out / (10 ** decimals)
			}))])
	}, [CancelToken, amountA, tokenA.address, tokenB.address])

	useEffect(() => {
		if(amountA) {
			fetchData()
		}
	}, [amountA, fetchData, tokenA])

	const [usdt, ...rest] = tokens

	return (
		<>
			<div className="input-card">
				<CurrencyInput
          title="From"
					token={tokenA.address}
					tokens={[usdt]}
          onInputChange={(val: any) => {
						setAmountA(val)
          }}
          amount={amountA}
					onOptionChange={(val: string) => {
						const token = tokens.find(token => token.address === val)

						if (token) {
							setTokenA(token)
						}
					}}
        />
        <Button type="primary" className="swap-button" style={{display: 'flex', justifyContent: 'space-around', margin: '20px auto', alignItems: 'center'}}>
					<ArrowDownOutlined />
				</Button>
        <CurrencyInput
          title="To (Estimate)"
					token={tokenB.address}
					tokens={[...rest]}
          amount={amountB}
					onOptionChange={(val: string) => {
						const token = tokens.find(token => token.address === val)

						if (token) {
							setTokenB(token)
						}
					}}
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
			<div className="chains">
				{chains.length ? chains.map(({chain, amount}) => (
					<div className="chain">
						<div>{chain}</div>
						<div className="hd">{tokenA.address} {amountA}</div>
            <ArrowRightOutlined />
						<div className="bd">{amount} {tokenB.address}</div>
					</div>
				)) : null}
			</div>
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
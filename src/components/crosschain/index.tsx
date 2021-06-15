import React, {useCallback, useEffect, useState, useRef} from "react";
import axios from 'axios'
import { Button, Card, Popover, Spin, Typography, Select } from "antd";

import Web3 from 'web3'
import {AbiItem} from 'web3-utils';

import {
  SettingOutlined,
  ArrowRightOutlined,
	ArrowDownOutlined
} from "@ant-design/icons";

import {AppBar} from '../appBar'
import { Settings } from "../settings";
import { NumericInput } from "../numericInput";

import { useWallet } from "../../context/wallet";

import './index.less'

const { Option } = Select;

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

		const uniRouterV2ABI: Array<AbiItem> = [{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"reserveIn","type":"uint256"},{"internalType":"uint256","name":"reserveOut","type":"uint256"}],"name":"getAmountOut","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"}],"stateMutability":"pure","type":"function"}];
		const uniV2PairABI: Array<AbiItem> = [{"constant":true,"inputs":[],"name":"getReserves","outputs":[{"internalType":"uint112","name":"_reserve0","type":"uint112"},{"internalType":"uint112","name":"_reserve1","type":"uint112"},{"internalType":"uint32","name":"_blockTimestampLast","type":"uint32"}],"payable":false,"stateMutability":"view","type":"function"}];

		const eth3 = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io/v3/c28b2300f99b4ca9a2926815f874d27e'));
		const ethRouterAddr = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d";
		const ethusdtpairAddr = '0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852';
		const wbtcusdtpairAddr = '0x0de0fa91b6dbab8c8503aaa2d1dfa91a192cb149'
		const router = new eth3.eth.Contract(uniRouterV2ABI , ethRouterAddr);
		const ethusdtpair = new eth3.eth.Contract(uniV2PairABI , ethusdtpairAddr);
		const wbtcusdtpair = new eth3.eth.Contract(uniV2PairABI, wbtcusdtpairAddr)

		const amountInNumber = Number(amountA) * 1e6;

		let ethAmount = 0

		if (tokenB.address === 'BTC') {
			ethAmount = await wbtcusdtpair.methods.getReserves().call().then((result: any) => {
				return router.methods.getAmountOut(
					amountInNumber, 
					result._reserve1,
					result._reserve0,
				).call()
			}).then((result: any) => result / 1e8)
		}

		if (tokenB.address === 'ETH') {
			ethAmount = await ethusdtpair.methods.getReserves().call().then((result: any) => {
				return router.methods.getAmountOut(
					amountInNumber, 
					result._reserve1,
					result._reserve0,
				).call()
			}).then((result: any) => result / 1e18)
		}

		const bsc3 = new Web3('https://bsc-dataseed1.binance.org:443');
		const bscRouterAddr = '0x05ff2b0db69458a0750badebc4f9e13add608c7f'
		const bscethusdtpairAddr = '0x531febfeb9a61d948c384acfbe6dcc51057aea7e'
		const bscbtcbusdtpairAddr = '0x3f803ec2b816ea7f06ec76aa2b6f2532f9892d62'
		const bscrouter = new bsc3.eth.Contract(uniRouterV2ABI , bscRouterAddr);
		const bscethusdtpair = new bsc3.eth.Contract(uniV2PairABI , bscethusdtpairAddr);
		const bscbtcbusdtpair = new bsc3.eth.Contract(uniV2PairABI, bscbtcbusdtpairAddr)

		let bscAmount = 0

		if (tokenB.address === 'BTC') {
			bscAmount = await bscbtcbusdtpair.methods.getReserves().call().then((result: any) => {
				return bscrouter.methods.getAmountOut(
					'10000000000000000000000',
					result._reserve0,
					result._reserve1,
				).call()
			}).then((result: any) => result / 1e18)
		}

		if (tokenB.address === 'ETH') {
			bscAmount = await bscethusdtpair.methods.getReserves().call().then((result: any) => {
				return bscrouter.methods.getAmountOut(
					'10000000000000000000000',
					result._reserve1,
					result._reserve0,
				).call()
			}).then((result: any) => result / 1e18)
		}

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

			setChains([{chain: 'ETH', amount: ethAmount}, {chain: 'BSC', amount: bscAmount}, ...data.map(({chain, amount_out, decimals}: {chain: string, amount_out: number, decimals: number}) => ({
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
					<div className="chain" key={chain}>
						<div>{chain}</div>
						<div className="hd">{tokenA.address} {amountA}</div>
            <ArrowRightOutlined />
						<div className="bd">{amount.toFixed(8)} {tokenB.address}</div>
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
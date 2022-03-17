import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

import { FarmItem, FarmInfo, TokenSwap, TransactionPayload, UserFarmInfo } from '@onesol/farm'

import { useOnesolFarmingProtocol } from '../../hooks/useOnesolFarmingProtocol'

import { AppBar } from '../appBar'
import Social from '../social'
import { Currency } from './currency'
import { TokenIcon } from '../tokenIcon'

import { useCurrencyLeg } from '../../utils/currencyPair'
import {WRAPPED_SOL_MINT } from '../../utils/constant'
import { TokenInfo } from '../../utils/token-registry'

import { useWallet } from '../../context/wallet'
import { useOnesolProtocol } from '../../hooks/useOnesolProtocol'

import './index.less'
import { sendSignedTransactions } from '../../utils/pools'
import { useConnection } from '../../utils/connection'
import { convert } from '../../utils/utils'
import { u64 } from '@solana/spl-token'

type FarmParams = {
  id: string
}

const Farm = () => {
  const { id } = useParams<FarmParams>()

  const { 
    farmMap, 
    getFarmInfo, 
    getUserFarmInfo,
    getEstimateAmount, 
    getFarmSwap,
    getDepositTransactions 
  } = useOnesolFarmingProtocol()

  const farm: FarmItem = farmMap[id]
  const connection = useConnection()
  const { connect, connected, wallet } = useWallet()

  const { tokens } = useOnesolProtocol();

  const base = useCurrencyLeg();
  const setMintAddressA = base.setMint;

  const quote = useCurrencyLeg();
  const setMintAddressB = quote.setMint;

  const [farmInfo, setFarmInfo] = useState<FarmInfo>()
  const [userFarmInfo, setUserFarmInfo] = useState<UserFarmInfo>()
  const [farmSwap, setFarmSwap] = useState<TokenSwap>()
  const [pool, setPool] = useState<{tokenAAmount: string, tokenBAmount: string, lpAmount: string}>()

  useEffect(() => {
    if (farm) {
      const { pool: { tokenA, tokenB }} = farm

      setMintAddressA(
        tokens.find((t: TokenInfo) => t.address === tokenA.mint.address.toBase58())?.address || ""
      );
      setMintAddressB(
        tokens.find((t: TokenInfo) => t.address === tokenB.mint.address.toBase58())?.address || ""
      );
    }
  }, [farm, tokens, setMintAddressA, setMintAddressB])

  useEffect(() => {
    if (farm) {
      const getFarm = async () => {
        const info = await getFarmInfo(farm)

        setFarmInfo(info)
      }

      getFarm()
    }
  }, [farm, getFarmInfo])

  useEffect(() => {
    if (farm) {
      const getSwap = async () => {
        const swap = await getFarmSwap(farm)
        // const { quote: {tokenAAmount, tokenBAmount, getLPSupply}} = swap
        // const lpAmount = await getLPSupply()

        setFarmSwap(swap)
        // setPool({
        //   tokenAAmount: `${convert(Number(tokenAAmount), 6)}`,
        //   tokenBAmount: `${convert(Number(tokenBAmount), 6)}`,
        //   lpAmount: `${convert(lpAmount.toNumber(), 6)}`
        // })
      }

      getSwap()
    }
  }, [farm, getFarmSwap])

  useEffect(() => {
    if (connected && farm) {
      const getUserFarm = async () => {
        const info = await getUserFarmInfo(farm)

        setUserFarmInfo(info)
      }

      getUserFarm()
    }
  }, [farm, connected, getUserFarmInfo])

  const renderTitle = () => {
    if (!farm) {
      return null
    }

    return (
      <div className="farm-title">
        <div className="tokens">
          <div className="token">
            <TokenIcon
              style={{
                width: '40px',
                height: '40px',
                margin: '0 -10px 0 0',
                position: 'relative',
                zIndex: 10
              }}
              mintAddress={farm.pool.tokenA.mint.address.toBase58()}
            />
          </div>
          <div className="token">
            <TokenIcon
              style={{ width: '40px', height: '40px', margin: '0' }}
              mintAddress={farm.pool.tokenB.mint.address.toBase58()}
            />
          </div>
        </div>
        <div className="title">
          Base-Quote
        </div>
      </div>
    )
  }

  const handleDeposit = useCallback(async () => {
    const transactions = await getDepositTransactions({
      farm,
      farmSwap,
      amountA: base.amount,
      amountB: quote.amount,
    })

    await sendSignedTransactions({
      connection,
      wallet,
      transactions: transactions.map((t: TransactionPayload) => t.transaction),
    })
  }, [farm, farmSwap, base, quote, getDepositTransactions, connection, wallet])

  const renderDeposit = () => {
    return (
      <div className="farm-deposit">
        <div className="hd">
          <Currency 
            mint={base.mintAddress} 
            amount={base.amount}
            onInputChange={ (val: number) => { 
              base.setAmount(`${val}`)
              
              const amount =  getEstimateAmount({ farmSwap, farm, amount: val })

              quote.setAmount(`${amount}`)
            }} 
            onMaxClick={ () => {
              const val = base.mintAddress === WRAPPED_SOL_MINT.toBase58() ? 
                base.balance - 0.05 > 0 ? base.balance - 0.05 : 0 : 
                base.balance

              base.setAmount(`${val}`)

              const amount = getEstimateAmount({ farmSwap, farm, amount: val })

              quote.setAmount(`${amount}`)
            }}
          />
          <div className="plus-icon">
            <PlusOutlined style={{fontSize: '18px'}} />
          </div>
          <Currency 
            mint={quote.mintAddress} 
            amount={quote.amount}
            onInputChange={ (val: number) => {
              quote.setAmount(`${val}`)
              
              const amount =  getEstimateAmount({ farmSwap, farm, amount: val, reverse: true})

              base.setAmount(`${amount}`)
            }} 
            onMaxClick={ () => {
              const val = quote.mintAddress === WRAPPED_SOL_MINT.toBase58() ? 
                quote.balance - 0.05 > 0 ? quote.balance - 0.05 : 0 : 
                quote.balance

              quote.setAmount(`${val}`)

              const amount =  getEstimateAmount({ farmSwap, farm, amount: val, reverse: true})

              base.setAmount(`${amount}`)
            }}
          />
        </div>
        <div className="ft">
          <Button
            type="primary"
            size="large"
            shape="round"
            block
            onClick={connected ? handleDeposit : connect}
            style={{ marginTop: '10px' }}
          >
            {connected ? 'Deposit' : 'Connect'}
          </Button>
        </div>
      </div>
    )
  }

  const renderLiquidity = () => {
    return (
      <div className="farm-liquidity">
        <div className="hd">Your Liquidity</div>
        <div className="bd">
          <Card
          className="liquidity-card"
          headStyle={{ padding: 0 }}
          bodyStyle={{ padding: '20px' }}
          >
            <div>Pooled(base){pool ? pool.tokenAAmount: 0}</div>
            <div>Pooled(quote){pool ? pool.tokenBAmount: 0}</div>
            <div>LP supply{pool ? pool.lpAmount: 0}</div>
            { userFarmInfo ? convert(Number(userFarmInfo.stakeTokenAmount), 6) : 0 }
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="page-farm">
      <AppBar />
      <div className="bd">
        {renderTitle()}
        <Card
          className="deposit-card"
          headStyle={{ padding: 0 }}
          bodyStyle={{ padding: '20px' }}
        >
          {renderDeposit()}
        </Card>
        {renderLiquidity()}
      </div>
      <Social />
    </div>
  )
}

export default Farm

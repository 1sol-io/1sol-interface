import React, { useCallback, useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Button, Modal, Tooltip, Progress, Switch } from 'antd'
import { PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { u64 } from '@solana/spl-token'
import CountUp from 'react-countup';

import { FarmItem, FarmInfo, Quote, UserFarmInfo } from '@onesol/farm'

import { useOnesolFarmingProtocol } from '../../hooks/useOnesolFarmingProtocol'

import { AppBar } from '../appBar'
import Social from '../social'
import { Currency } from './currency'
import { TokenIcon } from '../tokenIcon'
import { NumericInput } from '../numericInput'

import { useCurrencyLeg } from '../../utils/currencyPair'
import {WRAPPED_SOL_MINT } from '../../utils/constant'
import { TokenInfo } from '../../utils/token-registry'
import { formatWithCommas } from '../../utils/utils'
import { convert } from '../../utils/utils'

import { useWallet } from '../../context/wallet'
import { useOnesolProtocol } from '../../hooks/useOnesolProtocol'

import { sendSignedTransactions } from '../../utils/pools'
import { useConnection } from '../../utils/connection'

import { notify } from '../../utils/notifications'

import './index.less'

type FarmParams = {
  id: string
}

interface FarmItemProps extends FarmItem {
  tvl: number
  apy: number
}

interface UserFarmInfoProps extends UserFarmInfo {
 pendingReward: bigint, 
 depositTokenAmount: bigint 
 minTokenAOut: u64
 minTokenBOut: u64
}

interface FarmInfoProps extends FarmInfo {
  lpTokenAmount: bigint
}

const Farm = () => {
  const { id } = useParams<FarmParams>()

  const { 
    farmMap, 
    getFarmInfo, 
    getUserFarmInfo,
    getEstimateAmount, 
    getFarmSwap,
    getDepositTransactions,
    getWithdrawTransactions,
    getHarvestTransactions,
    getRemoveLiquidityTransactions,
    getStakeTransactions 
  } = useOnesolFarmingProtocol()

  const farm: FarmItemProps = farmMap[id]
  const connection = useConnection()
  const { connect, connected, wallet } = useWallet()

  const { tokens } = useOnesolProtocol();

  const base = useCurrencyLeg();
  const setMintAddressA = base.setMint;

  const quote = useCurrencyLeg();
  const setMintAddressB = quote.setMint;

  const [rewardToken, setRewardToken] = useState<TokenInfo | null>(null)
  const [farmInfo, setFarmInfo] = useState<FarmInfoProps>()
  const [userFarmInfo, setUserFarmInfo] = useState<UserFarmInfoProps>()
  const [farmSwap, setFarmSwap] = useState<Quote>()
  // const [pool, setPool] = useState<{tokenAAmount: string, tokenBAmount: string}>({
  //   tokenAAmount: '-',
  //   tokenBAmount: '-'
  // })

  const [depositLoading, setDepositLoading] = useState(false)
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [harvestLoading, setHarvestLoading] = useState(false)
  const [removeLoading, setRemoveLoading] = useState(false)
  const [stakeLoading, setStakeLoading] = useState(false)

  const [visible, setVisible] = useState(false)
  const [amount, setAmount] = useState('')

  const timer: { current: NodeJS.Timeout | null } = useRef(null)
  const [percent, setPercent] = useState(0)

  const [rewardStart, setRewardStart] = useState(0)
  const [rewardEnd, setRewardEnd] = useState(0)

  const [autoSwap, setAutoSwap] = useState(false)

  useEffect(() => {
    if (farm) {
      const { pool: { tokenA, tokenB } } = farm

      setMintAddressA(
        tokens.find((t: TokenInfo) => t.address === tokenA.mint.address.toBase58())?.address || ""
      );
      setMintAddressB(
        tokens.find((t: TokenInfo) => t.address === tokenB.mint.address.toBase58())?.address || ""
      );
    }
  }, [farm, tokens, setMintAddressA, setMintAddressB])

  useEffect(() => {
    if (farm && tokens.length) {
      const { rewardTokenMint: { address }} = farm

      const token = tokens.find((t: TokenInfo) => t.address === address.toBase58())

      setRewardToken(token)
    }
  }, [farm, tokens])

  const getSwap = useCallback(async () => {
    if (farm) {
      const swap: Quote = await getFarmSwap(farm)

      setFarmSwap(swap)

      // const {pool: { tokenA, tokenB }} = farm
      // const  {tokenAAmount, tokenBAmount } = swap
      // setPool({
      //   tokenAAmount: `${formatWithCommas(convert(tokenAAmount.toNumber(), tokenA.mint.decimals))}`,
      //   tokenBAmount: `${formatWithCommas(convert(tokenBAmount.toNumber(), tokenB.mint.decimals))}`,
      // })
    }
  }, [farm, getFarmSwap])

  useEffect(() => {
    if (farm) {
      getSwap()
    }
  }, [farm, getSwap])

  const getFarm = useCallback(async () => {
    if (farm) {
      const info = await getFarmInfo(farm)

      setFarmInfo(info)
    }
  } , [farm, getFarmInfo])

  const getUserFarm = useCallback(async () => {
    if (connected && farm) {
        const info = await getUserFarmInfo(farm)

        setUserFarmInfo(info)
    }
  }, [connected, farm, getUserFarmInfo])

  useEffect(() => {
    if (userFarmInfo) {
      setRewardStart(rewardEnd)
      setRewardEnd(Number(userFarmInfo.pendingReward))
    }
    // eslint-disable-next-line
  }, [userFarmInfo])

  useEffect(() => {
    if (farm) {
      getFarm()
    }
  }, [farm, getFarm])

  useEffect(() => {
    if (connected && farm) {
      getUserFarm()
    }
  }, [farm, connected, getUserFarm])

  const countDown = useCallback(() => {
    if (percent < 100) {
      setPercent(percent => percent + 1)
      timer.current = setTimeout(countDown, 1000)
    } else {
      setPercent(0)
      timer.current = setTimeout(countDown, 1000)

      if (farmSwap) {
        farmSwap.refresh()

        if (base.amount && !autoSwap) {
          const amount = getEstimateAmount({ farmSwap, farm, amount: base.amount })

          quote.setAmount(`${amount}`)
        }

        getFarm()
        getUserFarm()
      }
    }
  }, [percent, farmSwap, farm, base.amount, quote, getEstimateAmount, getFarm, getUserFarm, autoSwap])

  useEffect(() => {
    timer.current = setTimeout(countDown, 1000)

    return () => {
      if (timer.current) {
        clearTimeout(timer.current)
      }
    }
  }, [countDown])

  useEffect(() => {
    if (!autoSwap && base.amount && farm && farmSwap) {
      const amount = getEstimateAmount({ farmSwap, farm, amount: base.amount })

      quote.setAmount(`${amount}`)
    }
  }, [autoSwap, base.amount, farm, farmSwap, quote, getEstimateAmount])

  const renderTitle = () => {
    if (!farm) {
      return null
    }

    return (
      <div className="farm">
        <div className='hd'>
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
                mintAddress={base.mintAddress}
              />
            </div>
            <div className="token">
              <TokenIcon
                style={{ width: '40px', height: '40px', margin: '0' }}
                mintAddress={quote.mintAddress}
              />
            </div>
          </div>
          <div className="title">
            {base.name}-{quote.name}
          </div>
        </div>
        <div className='bd' style={{display: 'none'}}>
          <div className="mod">
            <div className='hd'>Farm emissions</div>
            <div className='bd'>
              { 
                farmInfo ? 
                `${formatWithCommas(
                  convert(Number(farmInfo.rewardPerSecondNumerator) / Number(farmInfo.rewardPerSecondDenominator), farm.rewardTokenMint.decimals) * 60 * 24
                )} ${ rewardToken?.symbol } / day` : 
                '-' 
              }
            </div>
          </div>
          <div className="mod">
            <div className='hd'>Total staked</div>
            <div className='bd'>{ farm.tvl ? `$${formatWithCommas(farm.tvl, 2)}` : '-' }</div>
          </div>
          <div className="mod">
            <div className='hd'>APY</div>
            <div className='bd'>{ farm.apy ? `${formatWithCommas(farm.apy * 100, 2)}%` : '-' }</div>
          </div>
        </div>
      </div>
    )
  }

  const handleDeposit = useCallback(async () => {
    try {
      setDepositLoading(true)

      const transactions = await getDepositTransactions({
        farm,
        farmSwap,
        amountA: base.amount,
        amountB: quote.amount,
        isAutoSwap: autoSwap
      })

      await sendSignedTransactions({
        connection,
        wallet,
        transactions,
      })

      farmSwap?.refresh()
      base.setAmount(`0`)
      quote.setAmount(`0`)

      getSwap()
      getFarm()
      getUserFarm()
    } catch (e) {
      notify({
        description: "Please try again and approve transactions from your wallet.",
        message: "Deposit trade cancelled.",
        type: "error",
      });
    } finally {
      setDepositLoading(false)
    }
  }, [farm, farmSwap, base, quote, getDepositTransactions, connection, wallet, getUserFarm, getFarm, getSwap, autoSwap])

  const handleWithdraw = useCallback(async () => {
    try {
      setWithdrawLoading(true)

      const transactions = await getWithdrawTransactions({
        farm,
        farmSwap,
        amount: new u64(Number(amount) * 10 ** farm.stakeTokenMint!.decimals),
      })

      await sendSignedTransactions({
        connection,
        wallet,
        transactions
      })

      setVisible(false)
      setAmount(`0.00`)

      getSwap()
      getFarm()
      getUserFarm()
    } catch (e) {
      notify({
        description: "Please try again and approve transactions from your wallet.",
        message: "Withdraw trade cancelled.",
        type: "error",
      });
    } finally {
      setWithdrawLoading(false)
    }
  }, [farm, farmSwap, getWithdrawTransactions, connection, wallet, getUserFarm, amount, getFarm, getSwap])

  const handleHarvest = useCallback(async () => {
    try {
      setHarvestLoading(true)

      const transactions = await getHarvestTransactions(farm)

      await sendSignedTransactions({
        connection,
        wallet,
        transactions
      })

      getSwap()
      getFarm()
      getUserFarm()
    } catch (e) {
      notify({
        description: "Please try again and approve transactions from your wallet.",
        message: "Harvest trade cancelled.",
        type: "error",
      });
    } finally {
      setHarvestLoading(false)
    }
  }, [connection, wallet, farm, getHarvestTransactions, getUserFarm, getFarm, getSwap])

  const handleRemove = useCallback(async () => {
    try {
      setRemoveLoading(true)

      const transactions = await getRemoveLiquidityTransactions(farm)

      await sendSignedTransactions({
        connection,
        wallet,
        transactions
      })

      getSwap()
      getFarm()
      getUserFarm()
    } catch (e) {
      console.error(e)
      notify({
        description: "Please try again and approve transactions from your wallet.",
        message: "Withdraw trade cancelled.",
        type: "error",
      });

    } finally {
      setRemoveLoading(false)
    }
  }, [getRemoveLiquidityTransactions, farm, wallet, connection, getSwap, getFarm, getUserFarm])

  const handleStake = useCallback(async () => {
    try {
      setStakeLoading(true)

      const transactions = await getStakeTransactions(farm)

      await sendSignedTransactions({
        connection,
        wallet,
        transactions
      })

      getSwap()
      getFarm()
      getUserFarm()
    } catch (e) {
      notify({
        description: "Please try again and approve transactions from your wallet.",
        message: "Stake trade cancelled.",
        type: "error",
      });
    } finally {
      setStakeLoading(false)
    }
  }, [getStakeTransactions, farm, wallet, connection, getSwap, getFarm, getUserFarm])

  const renderDeposit = () => {
    
    return (
      <div className="farm-deposit">
        <div className="hd">
          <Currency 
            mint={base.mintAddress} 
            amount={base.amount}
            onInputChange={ (val: number) => { 
              base.setAmount(`${val}`)
              
              if (!autoSwap) {
                const amount =  getEstimateAmount({ farmSwap, farm, amount: val })

                quote.setAmount(`${amount}`)
              }
            }} 
            onMaxClick={ () => {
              const val = base.mintAddress === WRAPPED_SOL_MINT.toBase58() ? 
                base.balance - 0.05 > 0 ? base.balance - 0.05 : 0 : 
                base.balance

              base.setAmount(`${val}`)

              if (!autoSwap) {
                const amount = getEstimateAmount({ farmSwap, farm, amount: val })

                quote.setAmount(`${amount}`)
              }
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
              
              if (!autoSwap) {
                const amount =  getEstimateAmount({ farmSwap, farm, amount: val, reverse: true})

                base.setAmount(`${amount}`)
              }
            }} 
            onMaxClick={ () => {
              const val = quote.mintAddress === WRAPPED_SOL_MINT.toBase58() ? 
                quote.balance - 0.05 > 0 ? quote.balance - 0.05 : 0 : 
                quote.balance

              quote.setAmount(`${val}`)

              if (!autoSwap) {
                const amount =  getEstimateAmount({ farmSwap, farm, amount: val, reverse: true})

                base.setAmount(`${amount}`)
              }
            }}
          />
        </div>
        <div className="ft">
          <Button
            disabled={
              connected && (
                depositLoading || 
                (
                  !autoSwap &&
                  (!Number(base.amount) || !Number(quote.amount))  
                ) ||
                (
                  autoSwap && !Number(base.amount) && !Number(quote.amount)
                ) ||
                Number(base.amount) > base.balance || 
                Number(quote.amount) > quote.balance
              )
            }
            loading={depositLoading}
            type="primary"
            size="large"
            shape="round"
            block
            onClick={connected ? handleDeposit : connect}
            style={{ marginTop: '20px' }}
          >
            {
              connected ? 
                Number(base.amount) > base.balance ?
                `Insufficient ${base.name} funds` :
                Number(quote.amount) > quote.balance ?
                `Insufficient ${quote.name} funds` :
                'Deposit' : 
              'Connect'
            }
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
            {
              userFarmInfo && Number(userFarmInfo.depositTokenAmount) ?
              <div className='mod'>
                <div className='hd'>
                  <div className='label'>
                    Deposited
                    <Tooltip title="Some are only deposited but not staked, so these aren't earning rewards now."><QuestionCircleOutlined style={{ marginLeft: '5px' }} /></Tooltip>
                  </div>
                  <div className='value'>{ userFarmInfo ? formatWithCommas(convert(Number(userFarmInfo.depositTokenAmount), farm.stakeTokenMint?.decimals), 2) : 0.00 } LP</div>
                </div>
                <div className='bd'>
                  <Button 
                    disabled={stakeLoading}
                    loading={stakeLoading}
                    type="primary" 
                    style={{ display: 'block', marginBottom: '5px' }} 
                    onClick={handleStake}
                  >
                    Stake
                  </Button>
                  <Button 
                    disabled={removeLoading}
                    loading={removeLoading}
                    type="link" 
                    size="small"
                    onClick={handleRemove}
                    style={{ fontSize: '12px' }}
                  >
                    Withdraw
                  </Button>
                </div>
              </div>
              : null
            }

            <div className='mod'>
              <div className='hd'>
                <div className='label'>Pending Rewards</div>
                <div className='value'>
                  { 
                    userFarmInfo ? 
                    <>
                    <CountUp 
                      start={convert(Number(rewardStart), farm.rewardTokenMint.decimals)} 
                      end={convert(Number(rewardEnd), farm.rewardTokenMint.decimals)} 
                      separator=","
                      decimals={2}
                    />
                    {/* {formatWithCommas(convert(Number(userFarmInfo.pendingReward), farm.rewardTokenMint.decimals), 2)} :  */}
                    </>
                    :
                    0.00 
                  }
                  { rewardToken ? <span style={{marginLeft: '5px', fontSize: '12px'}}>{ rewardToken.symbol }</span> : ''}
                </div>
              </div>
              <div className='bd'>
                { 
                  userFarmInfo ?
                  <Button 
                    disabled={harvestLoading || !Number(userFarmInfo.pendingReward)}
                    loading={harvestLoading}
                    type='primary' 
                    onClick={handleHarvest}
                  >
                    Harvest
                  </Button> :
                  null
                }
              </div>
            </div>

            <div className='mod'>
              <div className='hd'>
                <div className='label'>Staked</div>
                <div className='value'>{ userFarmInfo ? formatWithCommas(convert(Number(userFarmInfo.stakeTokenAmount), farm.stakeTokenMint?.decimals), 2) : 0.00 } LP</div>
                <div className='extra'>
                  <div className='token-item'>~ { userFarmInfo && base && base.mint && base.mint.decimals ? formatWithCommas(convert(userFarmInfo.minTokenAOut.toNumber(), base.mint.decimals), 2) : 0.00 } { base.name }</div>
                  <div className='token-item'>~ { userFarmInfo && quote && quote.mint && quote.mint.decimals ? formatWithCommas(convert(userFarmInfo.minTokenBOut.toNumber(), quote.mint.decimals), 2) : 0.00 } { quote.name }</div>
                </div>
              </div>
              <div className='bd'>
                { 
                  userFarmInfo ?
                  <Button 
                    disabled={withdrawLoading || !Number(userFarmInfo.stakeTokenAmount)}
                    loading={withdrawLoading}
                    type='primary' 
                    onClick={() => setVisible(true)}
                  >
                    Withdraw
                  </Button> :
                  null
                }
              </div>
            </div>
            
          </Card>
        </div>
      </div>
    )
  }

  const renderPool = () => {
    return (
      <div className='farm-pool'>
        <div className='hd'>Pool</div>
        <div className='bd'>
          <Card
            className="liquidity-card"
            headStyle={{ padding: 0 }}
            bodyStyle={{ padding: '20px' }}
          >
            <div className='pool-mod'>
              <div className='hd'>
                Total staked
              </div>
              <div className='bd'>{ farm.tvl ? `$${formatWithCommas(farm.tvl, 2)}` : '-' }</div>
            </div>
            <div className='pool-mod'>
              <div className='hd'>
              Farm emissions
              </div>
              <div className='bd'>
                { 
                  farmInfo ? 
                  `${formatWithCommas(
                    convert(Number(farmInfo.rewardPerSecondNumerator) / Number(farmInfo.rewardPerSecondDenominator), farm.rewardTokenMint.decimals) * 60 * 60 * 24
                  )} ${ rewardToken?.symbol } / day` : 
                  '-' 
                }
              </div>
            </div>
            <div className='pool-mod'>
              <div className='hd'>
                APY
              </div>
              <div className='bd'>{ farm.apy ? `${formatWithCommas(farm.apy * 100, 2)}%` : '-' }</div>
            </div>
            {/* <div className='pool-mod'>
              <div className='hd'>
                Pooled {base.name}
              </div>
              <div className='bd'>{pool.tokenAAmount}</div>
            </div>
            <div className='pool-mod'>
              <div className='hd'>
                Pooled { quote.name }
              </div>
              <div className='bd'>{pool.tokenBAmount}</div>
            </div> */}
            <div className='pool-mod'>
              <div className='hd'>
                LP Supply
              </div>
              <div className='bd'>{farmInfo ? formatWithCommas(convert(Number(farmInfo.lpTokenAmount), farm.stakeTokenMint?.decimals)) : '-'}</div>
            </div>
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
          title="Add Liquidity"
          className="deposit-card"
          headStyle={{ textAlign: 'left' }}
          bodyStyle={{ padding: '20px' }}
          extra={
            <div style={{display: 'flex', alignItems: 'center'}}>
              <Switch checked={autoSwap} size="small" onClick={() => setAutoSwap(!autoSwap)} />
              <Tooltip title="Liquidity must be deposited according to the ratio of tokens in the pool. Check this to auto-swap your liquidity to that ratio before depositing(may fail if the price moves more than your slippage tolerance.) When liqudidity is withdrawn, equal values of both tokens will be withdrawn.">
                <div style={{display: 'flex', alignItems: 'center'}}>
                  <span style={{fontSize: '12px', margin: '0 3px'}}>Auto-swap</span>
                  <QuestionCircleOutlined />
                </div>
              </Tooltip>
              <span style={{color: 'rgba(255, 255, 255, 0.3)', margin: '0 5px'}}>|</span>
              <Progress type="circle" showInfo={false} percent={percent} width={20} strokeWidth={15} strokeColor="#7049f6" />
            </div>
          }
        >
          {renderDeposit()}
        </Card>
        {renderLiquidity()}
        {renderPool()}

        <Modal
          closable={false}
          visible={visible}
          confirmLoading={withdrawLoading}
          footer={[
            <Button onClick={() => {
              setAmount(`0.00`)
              setVisible(false)
            }}>Cancel</Button>,
            <Button 
              loading={withdrawLoading}
              disabled={
                withdrawLoading || 
                !Number(amount) || 
                (
                  userFarmInfo && 
                  convert(Number(userFarmInfo.stakeTokenAmount), farm.stakeTokenMint?.decimals) < parseFloat(amount)
                )
              } 
              type="primary" 
              onClick={handleWithdraw}
              style={{borderRadius: '0'}}
            >OK</Button>
          ]}
        >
          <div className='modal-unsake'>
            <div 
              className='hd'
              style={{
                marginTop: '0px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px'
              }}
            >
              <div className='label'>Balance:{ userFarmInfo ? convert(Number(userFarmInfo.stakeTokenAmount), farm.stakeTokenMint?.decimals) : 0.00 }</div>
              <Button 
                type="primary" 
                size="small" 
                onClick={() => {
                  setAmount( userFarmInfo ? `${convert(Number(userFarmInfo.stakeTokenAmount), farm.stakeTokenMint?.decimals)}` : '0.00' )
                }}
                style={{
                  fontSize: '10px',
                  borderRadius: '2px',
                  height: '20px',
                  padding: '2px 5px'
                }}
              >Max</Button>
            </div>
            <div 
              className='bd'
              style={{
                background: '#090f28',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                marginTop: '8px',
                padding: '10px',
                height: '50px'
              }}
            >
              <NumericInput
                value={amount}
                onChange={(val: any) => setAmount(val)}
                style={{
                  width: '100%',
                  fontSize: 18,
                  boxShadow: "none",
                  borderColor: "transparent",
                  outline: "transpaernt",
                  color: amount !== '0.00' ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.3)'
                }}
                placeholder="0.00"
               />
            </div>
          </div>
        </Modal>
      </div>
      <Social />
    </div>
  )
}

export default Farm

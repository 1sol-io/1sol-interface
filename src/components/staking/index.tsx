import React, { useState, useEffect, useCallback } from 'react'
import { Button, Card, Input, Modal } from 'antd'
import BN from 'bn.js'
import { MintInfo } from '@solana/spl-token'

import { AppBar } from '../appBar'
import Social from '../social'
import { useWallet } from '../../context/wallet'
import { useStakePool } from '../../hooks/useStakePool'

import { cache, useUserAccounts } from '../../utils/accounts'
import { TokenAccount } from '../../models'
import { convert } from '../../utils/utils'

import './index.less'

const Staking = () => {
  const { connected, connect } = useWallet()
  const { pool, handleDeposit, handleWithdraw, fetchStakePool } = useStakePool()

  const [stakeLoading, setStakeLoading] = useState(false)
  const [unstakeLoading, setUnstakeLoading] = useState(false)

  const [stakeModalVisible, setStakeModalVisible] = useState(false)
  const [unstakeModalVisible, setUnstakeModalVisible] = useState(false)

  const [stakeValue, setStakeValue] = useState('')
  const [unstakeValue, setUnstakeValue] = useState('')

  const { userAccounts, fetchUserTokenAccounts } = useUserAccounts();

  const [oneSolTokenAccount, setOneSolTokenAccount] = useState<TokenAccount | null>()
  const [oneSolMintInfo, setOneSolMintInfo] = useState<MintInfo | null>()
  const [oneSolBalance, setOneSolBalance] = useState(0)

  const [stakedTokenAccount, setStakedTokenAccount] = useState<TokenAccount | null>()
  const [stakedMintInfo, setStakedMintInfo] = useState<MintInfo | null>()
  const [stakedBalance, setStakedBalance] = useState(0)

  const [modalStakeDisabled, setModalStakeDisabled] = useState(true)
  const [modalUnstakeDisabled, setModalUnstakeDisabled] = useState(true)

  const [userDeposit, setUserDeposit] = useState('-')

  useEffect(() => {
    const getTokenAccount = (mint: string) => {
      const index = userAccounts.findIndex(
        (acc: any) => acc.info.mint.toBase58() === mint
      );

      if (index !== -1) {
        return userAccounts[index];
      }

      return null;
    }

    if (connected && pool) {
      if (pool.token) {
        const oneSolTokenAccount = getTokenAccount(pool.token.address);

        if (oneSolTokenAccount) {
          setOneSolTokenAccount(oneSolTokenAccount);
        }

        const mint = cache.getMint(pool.token.address);

        if (mint) {
          setOneSolMintInfo(mint);
        }
      }

      if (pool.poolMint) {
        const stakedTokenAccount = getTokenAccount(pool.poolMint.toBase58());

        if (stakedTokenAccount) {
          setStakedTokenAccount(stakedTokenAccount);
        }

        const mint = cache.getMint(pool.poolMint.toBase58());

        if (mint) {
          setStakedMintInfo(mint);
        }
      }
    }
  }, [connected, userAccounts, pool])

  useEffect(() => {
    if (oneSolTokenAccount && oneSolMintInfo) {
      const balance = convert(oneSolTokenAccount, oneSolMintInfo)  

      if (balance) {
        setOneSolBalance(balance)
      }
    }
  }, [pool, oneSolTokenAccount, oneSolMintInfo])

  useEffect(() => {
    if (stakedTokenAccount && stakedMintInfo) {
      const balance = convert(stakedTokenAccount, stakedMintInfo)  

      if (balance) {
        setStakedBalance(balance)
      }
    }
  }, [pool, stakedTokenAccount, stakedMintInfo])

  useEffect(() => {
    if (
      oneSolTokenAccount &&
      oneSolMintInfo && 
      stakeValue && 
      new BN(Number(stakeValue) * 10 ** oneSolMintInfo.decimals).lte(oneSolTokenAccount.info.amount)
    ) {
      setModalStakeDisabled(false)
    } else {
      setModalStakeDisabled(true)
    }
  }, [oneSolTokenAccount, stakeValue, oneSolMintInfo, stakeLoading])

  const handleStake = useCallback(async () => {
    if (stakeValue && oneSolTokenAccount && oneSolMintInfo) {
      setStakeLoading(true)

      await handleDeposit({
        amount: Number(stakeValue) * 10 ** oneSolMintInfo!.decimals,
        sourceTokenAccount: oneSolTokenAccount.pubkey,
      })

      fetchStakePool()
      fetchUserTokenAccounts()

      setStakeValue('')
      setStakeLoading(false)
    }
  }, [stakeValue, oneSolTokenAccount, handleDeposit, oneSolMintInfo, fetchStakePool, fetchUserTokenAccounts])

  useEffect(() => {
    if (
      stakedTokenAccount &&
      stakedMintInfo && 
      unstakeValue && 
      new BN(Number(unstakeValue) * 10 ** stakedMintInfo.decimals).lte(stakedTokenAccount.info.amount)
    ) {
      setModalUnstakeDisabled(false)
    } else {
      setModalUnstakeDisabled(true)
    }
  }, [stakedTokenAccount, unstakeValue, stakedMintInfo])

  const handleUnstake = useCallback(async () => {
    if (unstakeValue && stakedTokenAccount && stakedMintInfo) {
      setUnstakeLoading(true)

      await handleWithdraw({
        amount: Number(unstakeValue) * 10 ** stakedMintInfo!.decimals,
      })

      fetchStakePool()
      fetchUserTokenAccounts()  

      setUnstakeValue('')
      setUnstakeLoading(false)
    }
  }, [unstakeValue, stakedTokenAccount, handleWithdraw, stakedMintInfo, fetchStakePool, fetchUserTokenAccounts])

  useEffect(() => {
    if (pool && connected && stakedBalance) {
      const userDeposit = pool.total.mul(new BN(stakedBalance * 10 ** pool.stakeMintDecimals)).div(pool.poolTokenSupply)

      setUserDeposit(`${userDeposit.divn(10 ** pool.stakeMintDecimals).toNumber().toFixed(2)}`)
    }
  }, [pool, connected, stakedBalance])

  return (
    <div className="page-staking">
      <AppBar />
      <div className="bd">
        <Card title="Staking" className="staking-card">
          <div className="mod-staking">
            <div className="hd">
              <div className="mod-token">
                <div className="hd">
                  <img className="token-logo" src={pool?.token?.logoURI} alt="" />
                </div>
                <div className="bd">
                  <strong>{pool?.token?.symbol}</strong>
                  <div>Reward Token: {pool?.rewardToken?.symbol}</div>
                  <div>2021-12-22 - 2022-01-21</div>
                </div>
              </div>
            </div>
            <div className="bd">
              <div className="mod-item">
                <div className="hd">Total Staking</div>
                <div className="bd">
                  { pool ? 
                    pool.enableWithdraw ? 
                    `${pool.capacity}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') :
                    `${pool.uiTotal}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : 
                    '-'
                  }
                  <span style={{color: '#999', fontSize: '12px'}}>/{pool ? `${pool.capacity}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '-'}</span>
                </div>
              </div>
              <div className="mod-item">
                <div className="hd">Your Staking</div>
                <div className="bd">
                  {userDeposit.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  <span style={{color: '#999', fontSize: '12px'}}>/{pool ? `${pool.max}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '-'}</span>
                </div>
              </div>
              <div className="mod-item">
                <div className="hd">
                  APY
                </div>
                <div className="bd">121.9%</div>
              </div>
            </div>
            <div className="ft">
              <Button 
                disabled={!pool?.enableDeposit || !oneSolBalance || !connected} 
                className="btn-stake" 
                type={!pool?.enableDeposit ? 'default' : 'primary'} 
                size="large" 
                block
                onClick={connected ? () => setStakeModalVisible(true) : connect}
              >
                Stake
              </Button>
              <Button   
                disabled={!pool?.enableWithdraw || !stakedBalance || !connected} 
                className="btn-withdraw" 
                type={!pool?.enableWithdraw ? 'default' : 'primary'} 
                size="large" block
                onClick={connected ? () => setUnstakeModalVisible(true) : connect}
              >
                Withdraw
              </Button>
            </div>
          </div>
      </Card>
      </div>
      <Social />

      <Modal 
        visible={stakeModalVisible} 
        footer={null}
        centered
        onCancel={() => setStakeModalVisible(false)}
      >
        <div className="modal-stake">
          <div className="hd">
            <div style={{fontSize: '12px', color: '#999', marginBottom: '5px'}}>Balance: {oneSolBalance}</div>
            <div className="mod-input">
              <div className="hd">
                <Input
                  onChange={(e) => setStakeValue(e.target.value)}
                  style={{height: '50px'}} 
                  value={stakeValue} 
                />
              </div>
              <div className="bd">
                <Button
                  style={{fontSize: '12px', color: '#999'}} 
                  type="text" 
                  size="large"
                  onClick={() => setStakeValue(oneSolTokenAccount && oneSolMintInfo ? `${convert(oneSolTokenAccount, oneSolMintInfo)}`: '0')}
                >
                  Max
                </Button>
              </div>
            </div>
          </div>
          <div className="bd">
            <Button 
              size="large" 
              type="primary" 
              block 
              onClick={handleStake}
              disabled={modalStakeDisabled}
              loading={stakeLoading}
            >
              Stake
            </Button>
            <Button
             type="text" 
             style={{margin: '5px auto 0', display: 'block', color: '#999'}}
             onClick={() => setStakeModalVisible(false)}
            >
              Cancel
            </Button>
          </div>
        </div>  
      </Modal>

      <Modal 
        visible={unstakeModalVisible}
        footer={null}
        centered
        onCancel={() => setUnstakeModalVisible(false)}
      >
        <div className="modal-unstake">
          <div className="hd">
            <div style={{fontSize: '12px', color: '#999', marginBottom: '5px'}}>Balance: {stakedBalance}</div>
            <div className="mod-input">
              <div className="hd">
                <Input
                  onChange={(e) => setUnstakeValue(e.target.value)}
                  style={{height: '50px'}} 
                  value={unstakeValue} 
                />
              </div>
              <div className="bd">
                <Button
                  style={{fontSize: '12px', color: '#999'}} 
                  type="text" 
                  size="large"
                  onClick={() => setUnstakeValue(stakedTokenAccount && stakedMintInfo ? `${convert(stakedTokenAccount, stakedMintInfo)}`: '0')}
                >
                  Max
                </Button>
              </div>
            </div>
          </div>
          <div className="bd">
            <Button 
              size="large" 
              type="primary" 
              block 
              onClick={handleUnstake}
              disabled={modalUnstakeDisabled}
              loading={unstakeLoading}
            >
              Withdraw
            </Button>
            <Button
             type="text" 
             style={{margin: '5px auto 0', display: 'block', color: '#999'}}
             onClick={() => setUnstakeModalVisible(false)}
            >
              Cancel
            </Button>
          </div>
        </div>  
      </Modal>
    </div>
  )
}

export default Staking

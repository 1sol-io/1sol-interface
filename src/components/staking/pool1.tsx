import React, { useState, useEffect, useCallback } from 'react'
import { Card, Button, Input, Modal } from 'antd'
import BN from 'bn.js'
import { MintInfo } from '@solana/spl-token'

import { useWallet } from '../../context/wallet'
import { useStakePool } from '../../hooks/useStakePool1'

import { cache, useUserAccounts } from '../../utils/accounts'
import { TokenAccount } from '../../models'
import { convert } from '../../utils/utils'

import './index.less'

const Pool = () => {
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
    if (stakedTokenAccount && pool) {
      const balance = convert(stakedTokenAccount, pool.poolMintDecimals)  

      if (balance) {
        setStakedBalance(balance)
      }
    }
  }, [pool, stakedTokenAccount])

  useEffect(() => {
    if (
      oneSolTokenAccount &&
      oneSolMintInfo && 
      stakeValue && 
      new BN(Number(stakeValue) * 10 ** oneSolMintInfo.decimals).lte(oneSolTokenAccount.info.amount) &&
      pool && new BN(Number(stakeValue) * 10 ** oneSolMintInfo.decimals).lte(pool.max) &&
      pool && Number(stakeValue) >= pool.uiMin
    ) {
      setModalStakeDisabled(false)
    } else {
      setModalStakeDisabled(true)
    }
  }, [oneSolTokenAccount, stakeValue, oneSolMintInfo, stakeLoading, pool])

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
      setStakeModalVisible(false)
    }
  }, [stakeValue, oneSolTokenAccount, handleDeposit, oneSolMintInfo, fetchStakePool, fetchUserTokenAccounts])

  useEffect(() => {
    if (
      stakedTokenAccount &&
      pool && 
      unstakeValue && 
      new BN(Number(unstakeValue) * 10 ** pool.poolMintDecimals).lte(stakedTokenAccount.info.amount)
    ) {
      setModalUnstakeDisabled(false)
    } else {
      setModalUnstakeDisabled(true)
    }
  }, [stakedTokenAccount, unstakeValue, pool])

  const handleUnstake = useCallback(async () => {
    if (unstakeValue && stakedTokenAccount && pool) {
      setUnstakeLoading(true)

      await handleWithdraw({
        amount: Number(unstakeValue) * 10 ** pool.poolMintDecimals,
      })

      fetchStakePool()
      fetchUserTokenAccounts()  

      setUnstakeValue('')
      setUnstakeLoading(false)
      setUnstakeModalVisible(false)
      setStakedBalance(0)
      setUserDeposit('0')
    }
  }, [unstakeValue, stakedTokenAccount, handleWithdraw, pool, fetchStakePool, fetchUserTokenAccounts])

  useEffect(() => {
    if (pool && connected && stakedBalance) {
      if (Number(stakedBalance) > 0) {
        const userDeposit = pool.total.mul(new BN(stakedBalance).mul(new BN(10).pow(new BN(pool.stakeMintDecimals)))).div(pool.poolTokenSupply)

        setUserDeposit(userDeposit.isZero() ? '0' :`${userDeposit.div(new BN(10).pow(new BN(pool.stakeMintDecimals))).toNumber().toFixed(2)}`)
      } else {
        setUserDeposit('0')
      }
    }
  }, [pool, connected, stakedBalance])

  const handleSetMaxStake = useCallback(() => {
    if (oneSolTokenAccount && pool) {
      if (oneSolTokenAccount.info.amount.lte(pool.max)) {
        setStakeValue(oneSolTokenAccount && oneSolMintInfo ? `${convert(oneSolTokenAccount, oneSolMintInfo)}`: '0')

        return
      }

      setStakeValue(`${pool?.uiMax}`)
    } 
  }, [oneSolTokenAccount, pool, oneSolMintInfo])

  return (
    <Card className="staking-card">
      <div className="mod-staking">
        <div className="hd">
          <div className="mod-token">
            <div className="hd">
              <img className="token-logo" src={pool?.token?.logoURI} alt="" />
            </div>
            <div className="bd">
              <strong>{pool?.token?.symbol}</strong>
              <div>Reward Token: {pool?.rewardToken?.symbol}</div>
              <div>2021-12-26 - 2022-01-25</div>
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
              <span style={{color: '#999', fontSize: '12px'}}>/{pool ? `${pool.uiMax}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '-'}</span>
            </div>
          </div>
          <div className="mod-item">
            <div className="hd">
              APY
            </div>
            <div className="bd">78%</div>
          </div>
        </div>
        <div className="ft">
          <Button 
            disabled={
              !pool?.enableDeposit || 
              !oneSolBalance || 
              !connected ||
              (
                pool &&
                userDeposit !== '-' && 
                Number(userDeposit) > 0 &&
                new BN(Number(userDeposit) * 10 ** pool.stakeMintDecimals).gte(pool.max)
              )
            } 
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
                  onClick={handleSetMaxStake}
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
                  onClick={() => setUnstakeValue(stakedTokenAccount && pool ? `${convert(stakedTokenAccount, 
                    pool.poolMintDecimals
                  )}`: '0')}
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
    </Card>
  )
}

export default Pool

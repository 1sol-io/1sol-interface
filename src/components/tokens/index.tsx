import React, { useState, useEffect } from 'react'
import { Modal, Input } from 'antd'

import { TokenInfo } from '@onesol/onesol-sdk'

import { useOnesolProtocol } from '../../hooks/useOnesolProtocol'
import { cache, useAccountByMint, useUserAccounts } from '../../utils/accounts'
import { convert } from '../../utils/utils'
import { TokenIcon } from '../tokenIcon'

import './index.less'

export const TokenDisplay = (props: {
  name: string
  symbol: string
  mintAddress: string
  icon?: JSX.Element
  showBalance?: boolean
  onClick?: (item: string) => void
}) => {
  const { showBalance, mintAddress, name, symbol, icon, onClick } = props
  const tokenMint = cache.getMint(mintAddress)
  const tokenAccount = useAccountByMint(mintAddress)

  let balance: number = 0
  let hasBalance: boolean = false

  if (showBalance) {
    if (tokenAccount && tokenMint) {
      balance = convert(tokenAccount, tokenMint)
      hasBalance = balance > 0
    }
  }

  return (
    <div
      className="token-display"
      title={mintAddress}
      key={mintAddress}
      onClick={() => {
        if (onClick) {
          onClick(mintAddress)
        }
      }}
      style={{ cursor: 'pointer' }}
    >
      <div className="hd">
        <div className="token">
          <div className="hd">
            {icon || (
              <TokenIcon
                style={{ width: '30px', height: '30px' }}
                mintAddress={mintAddress}
              />
            )}
          </div>
          <div className="bd">
            <div className="token-symbol">{symbol}</div>
            <div className="token-name">{name}</div>
          </div>
        </div>
      </div>
      {showBalance ? (
        <div className="bd">
          <span
            title={balance.toString()}
            key={mintAddress}
            className="token-balance"
          >
            &nbsp;{' '}
            {hasBalance ? balance < 0.001 ? '<0.001' : balance.toFixed(3) : '-'}
          </span>
        </div>
      ) : null}
    </div>
  )
}

const Tokens = ({
  visible = false,
  onCancel = () => {},
  onChange
}: {
  visible: boolean
  onCancel: () => void
  onChange: (mintAddress: string) => void
}) => {
  const { tokenMap } = useOnesolProtocol()
  const { userAccounts } = useUserAccounts()

  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [options, setOptions] = useState<TokenInfo[]>([])

  useEffect(
    () => {
      const keys = [...tokenMap.keys()]
      const sortByBalance = userAccounts.sort((a, b) => {
        return b.info.amount.gt(a.info.amount) ? 1 : -1
      })

      const tokensUserHave = [
        ...new Set(sortByBalance.map((item) => item.info.mint.toBase58()))
      ]
      const filteredKeys = keys.filter((key) => !tokensUserHave.includes(key))

      const tokens = [...tokensUserHave, ...filteredKeys]
        .map((key) => tokenMap.get(key))
        .filter((token) => token)

      setTokens(tokens)
      setOptions(tokens)
    },
    [tokenMap, userAccounts]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLocaleLowerCase()

    const filtered = tokens.filter(
      (token: TokenInfo) =>
        token.name.toLowerCase().includes(value) ||
        token.symbol.toLowerCase().includes(value) ||
        token.address.toLowerCase().includes(value)
    )

    setOptions(filtered)
  }

  return (
    <Modal
      visible={visible}
      centered
      footer={null}
      destroyOnClose
      onCancel={() => {
        if (onCancel) {
          onCancel()
        }
      }}
      bodyStyle={{
        minHeight: '550px'
      }}
    >
      <div className="modal-tokens">
        <div className="hd">
          <Input
            size="large"
            placeholder="Search by Token Name / Symbol / Address"
            onChange={handleChange}
          />
        </div>
        <div className="bd">
          {options.map((item: TokenInfo) => (
            <TokenDisplay
              key={item.address}
              name={item.name}
              symbol={item.symbol}
              mintAddress={item.address}
              showBalance={true}
              onClick={(mintAddress: string) => {
                if (onChange) {
                  onChange(mintAddress)
                }
              }}
            />
          ))}
        </div>
      </div>
    </Modal>
  )
}

export default Tokens

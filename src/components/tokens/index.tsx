import React, { useState, useEffect, useMemo } from 'react'
import debounce from 'lodash.debounce'
import { Modal, Input } from 'antd'
import { SearchOutlined } from '@ant-design/icons/lib/icons'
import InfiniteScroll from 'react-infinite-scroll-component'

import { TokenInfo } from '@onesol/onesol-sdk'

import { useOnesolProtocol } from '../../hooks/useOnesolProtocol'
import { cache, useAccountByMint, useUserAccounts } from '../../utils/accounts'
import { convert } from '../../utils/utils'
import { TokenIcon } from '../tokenIcon'

import './index.less'

interface Filtered extends TokenInfo {
  weight: number
}

export const TokenDisplay = (props: {
  name: string
  symbol: string
  mintAddress: string
  icon?: JSX.Element
  showBalance?: boolean
  onClick?: (item: string) => void
  style?: React.CSSProperties
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

  const [tokens, setTokens] = useState<Filtered[]>([])
  const [options, setOptions] = useState<Filtered[]>([])
  const [list, setList] = useState<Filtered[]>([])

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
        .map((key) => {
          const token = tokenMap.get(key)

          if (token) {
            return {
              ...token,
              weight: 0
            }
          }

          return null
        })
        .filter((token) => token)

      setTokens(tokens)
      // if user searched for one token, and when userAccounts changed, filtered results should be kept
      // or the list will be reset to all the tokens
      setOptions((options) => (options.length ? options : tokens))
    },
    [tokenMap, userAccounts]
  )

  useEffect(
    () => {
      setList(options.slice(0, 10))
    },
    [options]
  )

  const debounced = useMemo(
    () =>
      debounce((value) => {
        if (!value) {
          setOptions(tokens)

          return
        }

        const filtered: Filtered[] = []

        tokens.forEach((token: Filtered) => {
          let weight = 0

          if (token.symbol.toLowerCase().includes(value)) {
            weight +=
              value.length / token.symbol.length * 300 +
              token.symbol.length -
              token.symbol.toLowerCase().indexOf(value)
          }

          if (token.name.toLowerCase().includes(value)) {
            weight +=
              value.length / token.name.length * 100 +
              token.name.length -
              token.name.toLowerCase().indexOf(value)
          }

          if (
            value.length > 10 &&
            token.address.toLowerCase().includes(value)
          ) {
            weight +=
              value.length / token.address.length * 50 +
              token.address.length -
              token.address.toLowerCase().indexOf(value)
          }

          if (weight > 0) {
            filtered.push({ ...token, weight })
          }
        })

        setOptions(filtered.sort((a, b) => b.weight - a.weight))
      }, 300),
    [tokens]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLocaleLowerCase()

    debounced(value)
  }

  return (
    <Modal
      visible={visible}
      destroyOnClose
      centered
      footer={null}
      onCancel={() => {
        if (onCancel) {
          onCancel()
        }
      }}
      bodyStyle={{
        minHeight: '550px'
      }}
      afterClose={() => {
        setOptions(tokens)
      }}
    >
      <div className="modal-tokens">
        <div className="hd">
          <Input
            size="large"
            placeholder="Search by Token Name / Symbol / Address"
            onChange={handleChange}
            prefix={<SearchOutlined />}
            autoFocus
          />
        </div>
        <div className="bd" id="scrollableDiv">
          <InfiniteScroll
            dataLength={list.length}
            next={() => {
              setList(list.concat(options.slice(list.length, list.length + 10)))
            }}
            hasMore={options.length > list.length}
            loader={<h4>Loading...</h4>}
            scrollableTarget="scrollableDiv"
          >
            {list.map((item: TokenInfo) => (
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
          </InfiniteScroll>
        </div>
      </div>
    </Modal>
  )
}

export default Tokens

import React, { useState, useEffect } from 'react'
import { Modal, AutoComplete, Input, SelectProps } from 'antd'

import { TokenInfo } from '@onesol/onesol-sdk'

import { useOnesolProtocol } from '../hooks/useOnesolProtocol'
import { cache, useAccountByMint } from '../utils/accounts';
import { convert } from '../utils/utils';
import { TokenIcon } from './tokenIcon';

export const TokenDisplay = (props: {
  name: string;
  mintAddress: string;
  icon?: JSX.Element;
  showBalance?: boolean;
}) => {
  const { showBalance, mintAddress, name, icon } = props;
  const tokenMint = cache.getMint(mintAddress);
  const tokenAccount = useAccountByMint(mintAddress);

  let balance: number = 0;
  let hasBalance: boolean = false;

  if (showBalance) {
    if (tokenAccount && tokenMint) {
      balance = convert(tokenAccount, tokenMint);
      hasBalance = balance > 0;
    }
  }

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
        {showBalance ? (
          <span
            title={balance.toString()}
            key={mintAddress}
            className="token-balance"
          >
            &nbsp;{" "}
            {hasBalance
              ? balance < 0.001
                ? "<0.001"
                : balance.toFixed(3)
              : "-"}
          </span>
        ) : null}
      </div>
    </>
  );
};

const Tokens = ({ visible = false }) => {
  const { tokens } = useOnesolProtocol()

  const [options, setOptions] = useState<TokenInfo[]>([])

  useEffect(() => {
    if (tokens.length) {
      setOptions(tokens)
    }
  }, [tokens])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLocaleLowerCase()

    const filtered = tokens.filter((token: TokenInfo) => 
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
    >
      <div className='modal-tokens'>
        <div className='bd'>
          <Input size="large" placeholder="input here" onChange={handleChange}  />
        </div>
        <div className='bd' style={{maxHeight: '400px', overflow: 'scroll'}}>
          {
            options.map((item: TokenInfo) => 
              (
                <TokenDisplay
                  key={item.address}
                  name={item.symbol}
                  mintAddress={item.address}
                  showBalance={true}
                />
              )
            )
          }
        </div>
      </div>
    </Modal>
  )
}

export default Tokens
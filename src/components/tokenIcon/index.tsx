import { Identicon } from './../identicon'
import React, { useState } from 'react'
import { getTokenIcon } from '../../utils/utils'
import { useOnesolProtocol } from '../../hooks/useOnesolProtocol'

export const TokenIcon = (props: {
  mintAddress: string
  style?: React.CSSProperties
  className?: string
}) => {
  const { tokenMap } = useOnesolProtocol()
  const [failed, setFailed] = useState(false)
  const icon = getTokenIcon(tokenMap, props.mintAddress)

  if (icon && !failed) {
    return (
      <img
        alt="Token icon"
        className={props.className}
        key={props.mintAddress}
        onError={() => setFailed(true)}
        width="24"
        height="24"
        src={icon}
        style={{
          marginRight: '0.5rem',
          borderRadius: '50%',
          backgroundColor: 'white',
          backgroundClip: 'padding-box',
          ...props.style
        }}
      />
    )
  }

  return (
    <Identicon
      address={props.mintAddress}
      style={{
        marginRight: '0.5rem',
        display: 'flex',
        alignSelf: 'center',
        width: 20,
        height: 20,
        marginTop: 2,
        ...props.style
      }}
    />
  )
}

export const PoolIcon = (props: {
  mintA: string
  mintB: string
  style?: React.CSSProperties
  className?: string
}) => {
  return (
    <div className={props.className} style={{ display: 'flex' }}>
      <TokenIcon
        mintAddress={props.mintA}
        style={{ marginRight: '-0.5rem', ...props.style }}
      />
      <TokenIcon mintAddress={props.mintB} />
    </div>
  )
}

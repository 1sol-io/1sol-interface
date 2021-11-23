import React from 'react'
import { notification } from 'antd'
import { ExplorerLink } from '../components/explorerLink';

export function notify({
  message = '',
  description = undefined as any,
  txid = '',
  type = 'info',
  placement = 'bottomLeft',
  duration = 4.5,
}){
  if (txid) {
    description = <>
      <ExplorerLink
        address={txid}
        type="tx"
        code={!!txid}
        style={{ color: '#0000ff' }}
      />
    </>;
  }

  const config = {
    message: <span style={{ color: 'black' }}>{message}</span>,
    description:
      <span style={{ color: 'black', opacity: 0.5 }}>{description}</span>,
    placement,
    // style: {
    //   backgroundColor: "white",
    // },
    duration
  }
  ;(notification as any)[type](config)
}

import React from 'react'
import { Button, notification } from 'antd'

import { ExplorerLink } from '../components/explorerLink';

export function notify({
  message = '',
  description = undefined as any,
  txid = '',
  type = 'info',
  placement = 'bottomLeft',
  duration = 4.5,
  showUnwrapTip = false
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
    message: <span style={{ color: '#fff' }}>{message}</span>,
    description: <>
      <p style={{ color: '#fff', opacity: 0.5, marginBottom: '5px' }}>{description}</p>
      { showUnwrapTip ? <p>Wrapped SOL can be unwrapped <Button type="primary" size="small"><a href="/toolkit" style={{ color: '#fff', textDecoration: 'none' }}>here</a></Button>.</p> : null }
    </>,
    placement,
    duration
  }

  ;(notification as any)[type](config)
}

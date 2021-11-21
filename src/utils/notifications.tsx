import React from 'react'
import { notification } from 'antd'
// import Link from '../components/Link';

export function notify({
  message = '',
  description = undefined as any,
  txid = '',
  type = 'info',
  placement = 'bottomLeft',
  duration = 4.5
}){
  // if (txid) {
  //     <Link
  //       external
  //       to={'https://explorer.solana.com/tx/' + txid}
  //       style={{ color: '#0000ff' }}
  //     >
  //       View transaction {txid.slice(0, 8)}...{txid.slice(txid.length - 8)}
  //     </Link>

  //   description = <></>;
  // }

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

import React from 'react'
import { Menu } from 'antd'
import { AccountInfo } from './accountInfo'
import { WalletConnect } from './walletConnect'
import { Link, useLocation } from 'react-router-dom'

export const AppBar = (props: { left?: JSX.Element; right?: JSX.Element }) => {
  const location = useLocation()

  const TopBar = (
    <div className="App-Bar">
      <div className="App-Bar-left">
        <div className="App-logo" />
        <Menu mode="horizontal" selectedKeys={[location.pathname]}>
          <Menu.Item key="/home">
            <a href="https://1sol.io">Home</a>
          </Menu.Item>
          <Menu.Item key="/dashboard">
            <Link
              to={{
                pathname: '/dashboard'
              }}
            >
              Dashboard
            </Link>
          </Menu.Item>
          <Menu.Item key="/trade/SOL-AJN">
            <Link
              to={{
                pathname: '/trade/SOL-AJN'
              }}
            >
              Trade
            </Link>
          </Menu.Item>
          <Menu.Item disabled key="lending">
            Lending
          </Menu.Item>
          <Menu.Item disabled key="nft">
            NFT
          </Menu.Item>
        </Menu>
        {props.left}
      </div>
      <div className="App-Bar-right">
        <WalletConnect>
          <AccountInfo />
        </WalletConnect>
        {props.right}
      </div>
    </div>
  )

  return TopBar
}

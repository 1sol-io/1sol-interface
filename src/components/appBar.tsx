import React from 'react'
import { Menu } from 'antd'
import { AccountInfo } from './accountInfo'
import { WalletConnect } from './walletConnect'
import { NavLink, useLocation } from 'react-router-dom'

export const AppBar = (props: { left?: JSX.Element; right?: JSX.Element }) => {
  const location = useLocation()

  let current = location.pathname

  if (location.pathname.includes('/trade')) {
    current = '/trade'
  }

  const TopBar = (
    <div className="App-Bar">
      <div className="App-Bar-left">
        <div className="App-logo" />
        <Menu mode="horizontal" selectedKeys={[current]}>
          <Menu.Item key="/home">
            <a href="https://1sol.io">Home</a>
          </Menu.Item>
          <Menu.Item key="/dashboard">
            <NavLink
              to={{
                pathname: '/dashboard'
              }}
            >
              Dashboard
            </NavLink>
          </Menu.Item>
          <Menu.Item key="/trade">
            <NavLink
              to={{
                pathname: '/trade/USDC-1SOL'
              }}
              isActive={(match, location) => {
                return location.pathname.includes('/trade')
              }}
            >
              Trade
            </NavLink>
          </Menu.Item>
          <Menu.Item key="/dex">
            <a
              href="https://dex.1sol.io"
              target="_blank"
              rel="noopener noreferrer"
            >
              DEX
            </a>
          </Menu.Item>
          <Menu.Item key="/farms">
            <NavLink
              to={{
                pathname: '/farms'
              }}
            >
              Farms
            </NavLink>
          </Menu.Item>
          <Menu.Item key="/staking">
            <NavLink
              to={{
                pathname: '/staking'
              }}
            >
              Staking
            </NavLink>
          </Menu.Item>
          <Menu.Item key="/toolkit">
            <NavLink
              to={{
                pathname: '/toolkit'
              }}
            >
              Toolkit
            </NavLink>
          </Menu.Item>
          <Menu.Item key="/doc">
            <a
              href="https://doc.1sol.io"
              target="_blank"
              rel="noopener noreferrer"
            >
              Doc
            </a>
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

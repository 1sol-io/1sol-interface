import React from "react";
import { Button, Menu } from "antd";
import { useWallet } from "../context/wallet";
import { AccountInfo } from "./accountInfo";
import { WalletConnect } from "./walletConnect";
import { Link, useHistory, useLocation } from "react-router-dom";

export const AppBar = (props: { left?: JSX.Element; right?: JSX.Element }) => {
  const { connected } = useWallet();
  const location = useLocation();
  const history = useHistory();

  const TopBar = (
    <div className="App-Bar">
      <div className="App-Bar-left">
        <div className="App-logo" />
        <Menu mode="horizontal" selectedKeys={[location.pathname]}>
          <Menu.Item key="/">
            <Link
              to={{
                pathname: "/",
              }}
            >
              Home
            </Link>
          </Menu.Item>
          <Menu.Item key="/dashboard">
            <Link
              to={{
                pathname: "/dashboard",
              }}
            >
              Dashboard
            </Link>
          </Menu.Item>
          <Menu.Item key="/trade">
            <Link
              to={{
                pathname: "/trade",
              }}
            >
              Trade
            </Link>
          </Menu.Item>
          <Menu.Item key="/crosschain">
            <Link
              to={{
                pathname: "/crosschain",
              }}
            >
              Crosschain
            </Link>
          </Menu.Item>
          {/* <Menu.Item key="/info">
            <Link
              to={{
                pathname: "/info",
              }}
            >
              Charts
            </Link>
          </Menu.Item>
          <Menu.Item key="trade">
            <a
              href={"https://dex.projectserum.com"}
              target="_blank"
              rel="noopener noreferrer"
            >
              Trade
              <sup>↗</sup>
            </a>
          </Menu.Item>
          <Menu.Item key="help">
            <a
              href={"https://serum-academy.com/en/serum-swap/"}
              target="_blank"
              rel="noopener noreferrer"
            >
              Help
              <sup>↗</sup>
            </a>
          </Menu.Item> */}
        </Menu>
        {props.left}
      </div>
      <div className="App-Bar-right">
        <WalletConnect>
          <AccountInfo />
        </WalletConnect>
        {/* {connected && (
          <Button
            type="text"
            size="large"
            onClick={() => history.push({ pathname: "/pool" })}
          >
            My Pools
          </Button>
        )} */}
        {props.right}
      </div>
    </div>
  );

  return TopBar;
};

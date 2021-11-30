import React, { FunctionComponent } from "react";
import { Dropdown, Menu } from "antd";
import { LinkOutlined} from '@ant-design/icons'
import { useWallet } from "../context/wallet";
import { ExplorerLink } from "./explorerLink";

export const WalletConnect: FunctionComponent = ({ children }) => {
  const { connected, wallet, select, connect, disconnect } = useWallet();
  const publicKey = (connected && wallet?.publicKey?.toBase58()) || "";

  const menu = (
    <Menu style={{ textAlign: "right" }}>
      {connected && (
        <ExplorerLink
          type="account"
          address={publicKey}
          style={{ padding: 12 }}
        />
      )}
      <Menu.Item key="3" onClick={select}>
        Change Wallet
      </Menu.Item>
      {connected && (
        <Menu.Item
          key="2"
          style={{ color: "rgba(255, 0, 0, 0.7)" }}
          onClick={disconnect}
        >
          Disconnect
        </Menu.Item>
      )}
    </Menu>
  );

  if (connected) {
    return (
      <Dropdown overlay={menu} trigger={["hover"]}>
        <div style={{ cursor: "pointer" }}>{children}</div>
      </Dropdown>
    );
  }

  return (
    <Dropdown.Button type="primary" onClick={connected ? disconnect : select} overlay={menu} icon={null}>
      {
        connected ? 
        "Disconnect" : 
        <>
          <LinkOutlined />
          <span style={{marginLeft: '5px'}}>Connect Wallet</span>
        </>}
    </Dropdown.Button>
  );
};

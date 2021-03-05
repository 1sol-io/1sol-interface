import React, { FunctionComponent } from "react";
import { Dropdown, Menu } from "antd";
import { useWallet } from "../context/wallet";
import { ExplorerLink } from "./explorerLink";

export const WalletConnect: FunctionComponent = ({ children }) => {
  const { connected, wallet, select, connect, disconnect } = useWallet();
  const publicKey = (connected && wallet?.publicKey?.toBase58()) || "";

  const menu = (
    <Menu style={{ textAlign: "right" }}>
      {connected && (
        <ExplorerLink
          type="address"
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
    <Dropdown.Button onClick={connected ? disconnect : connect} overlay={menu}>
      {connected ? "Disconnect" : "Connect"}
    </Dropdown.Button>
  );
};

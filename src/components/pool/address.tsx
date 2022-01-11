import React from "react";
import { Button, Col, Popover, Row } from "antd";
import { PoolInfo } from "../../models";
import { CopyOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { ExplorerLink } from "./../explorerLink";
import { getTokenName } from "../../utils/utils";
import { useOnesolProtocol } from "../../hooks/useOnesolProtocol";

const Address = (props: {
  address: string;
  style?: React.CSSProperties;
  label?: string;
}) => {
  return (
    <Row style={{ width: "100%", ...props.style }}>
      {props.label && <Col span={4}>{props.label}:</Col>}
      <Col span={17}>
        <ExplorerLink address={props.address} code={true} type="account" />
      </Col>
      <Col span={3} style={{ display: "flex" }}>
        <Button
          shape="round"
          icon={<CopyOutlined />}
          size={"small"}
          style={{ marginLeft: "auto", marginRight: 0 }}
          onClick={() => navigator.clipboard.writeText(props.address)}
        />
      </Col>
    </Row>
  );
};

export const PoolAddress = (props: {
  pool?: PoolInfo;
  style?: React.CSSProperties;
  showLabel?: boolean;
  label?: string;
}) => {
  const { pool } = props;
  const label = props.label || "Address";

  if (!pool?.pubkeys.account) {
    return null;
  }

  return (
    <Address
      address={pool.pubkeys.account.toBase58()}
      style={props.style}
      label={label}
    />
  );
};

export const AccountsAddress = (props: {
  pool?: PoolInfo;
  style?: React.CSSProperties;
}) => {
  const { tokenMap } = useOnesolProtocol();
  const { pool } = props;

  if (!pool) {
    return null;
  }

  const account1 = pool?.pubkeys.holdingAccounts[0];
  const account2 = pool?.pubkeys.holdingAccounts[1];
  const mint1 = pool?.pubkeys.holdingMints[0];
  const mint2 = pool?.pubkeys.holdingMints[1];
  let aName, bName;
  if (mint1) {
    aName = getTokenName(tokenMap, mint1.toBase58());
  }
  if (mint2) {
    bName = getTokenName(tokenMap, mint2.toBase58());
  }

  return (
    <>
      {account1 && (
        <Address
          address={account1.toBase58()}
          style={props.style}
          label={aName}
        />
      )}
      {account2 && (
        <Address
          address={account2.toBase58()}
          style={props.style}
          label={bName}
        />
      )}
    </>
  );
};

export const AdressesPopover = (props: { pool?: PoolInfo }) => {
  const { pool } = props;

  if (!pool) {
    return null;
  }

  return (
    <Popover
      placement="topRight"
      title={"Addresses"}
      trigger="hover"
      content={
        <>
          <PoolAddress pool={pool} showLabel={true} label={"Pool"} />
          <AccountsAddress pool={pool} />
        </>
      }
    >
      <Button
        shape="circle"
        size="large"
        type="text"
        className={"trade-address-info-button"}
        icon={<InfoCircleOutlined />}
      />
    </Popover>
  );
};

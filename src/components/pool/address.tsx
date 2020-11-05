import React from "react";
import { Button, Col, Row } from "antd";
import { PoolInfo } from "../../models";
import { CopyOutlined } from "@ant-design/icons";
import { ExplorerLink } from "./../explorerLink";

export const PoolAddress = (props: {
  pool?: PoolInfo;
  style?: React.CSSProperties;
  showLabel?: boolean;
}) => {
  const { pool } = props;

  if (!pool?.pubkeys.account) {
    return null;
  }

  return (
    <Row style={{ width: "100%", ...props.style }}>
      {props.showLabel && <Col span={6}>Address:</Col>}
      <Col span={15}>
        <ExplorerLink
          address={pool.pubkeys.account.toBase58()}
          code={true}
          type="address"
        />
      </Col>
      <Col span={3} style={{ display: "flex" }}>
        <Button
          shape="round"
          icon={<CopyOutlined />}
          size={"small"}
          style={{ marginLeft: "auto", marginRight: 0 }}
          onClick={() =>
            navigator.clipboard.writeText(pool.pubkeys.account.toBase58())
          }
        />
      </Col>
    </Row>
  );
};

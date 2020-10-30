import React, { } from "react";
import { Button, Col, Row, Typography } from "antd";
import {
  shortenAddress,
} from "../../utils/utils";
import { PoolInfo } from "../../models";
import { CopyOutlined } from "@ant-design/icons";

export const PoolAddress = (props: {
  pool?: PoolInfo;
  style?: React.CSSProperties,
}) => {
  const { pool } = props;

  if (!pool?.pubkeys.account) {
    return null;
  }

  return (
    <Row style={{ width: '100%', ...props.style }}>
      <Col span={6}>Pool address:</Col>
      <Col span={15}>
        <a
          href={`https://explorer.solana.com/address/${pool.pubkeys.account.toBase58()}`}
          // eslint-disable-next-line react/jsx-no-target-blank
          target="_blank"
        >
          <Typography.Text code>
            {shortenAddress(pool.pubkeys.account.toBase58(), 11)}
          </Typography.Text>
        </a>
      </Col>
      <Col span={3} style={{ display: 'flex' }}>
        <Button
          shape="round"
          icon={<CopyOutlined />}
          size={"small"}
          style={{ marginLeft: 'auto', marginRight: 0 }}
          onClick={() =>
            navigator.clipboard.writeText(pool.pubkeys.account.toBase58())
          }
        />
      </Col>
    </Row>
  );
};

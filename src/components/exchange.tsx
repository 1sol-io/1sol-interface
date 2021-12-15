import React from "react";
import { Button, Card, Popover } from "antd";
import { SettingOutlined } from "@ant-design/icons";

import { TradeEntry } from "./trade";
import { Settings } from "./settings";
import { AppBar } from "./appBar";
import Social from "./social";

import Warning from "./warning";

import './exchange.less'
import { Link } from "react-router-dom";

export const ExchangeView = (props: {}) => {
  const tabStyle: React.CSSProperties = { width: 120 };
  const tradeTab = {
      key: "trade",
      tab: <div style={tabStyle}>Trade</div>,
      render: () => {
        return <TradeEntry />;
      },
    };

  return (
    <>
      <AppBar
        right={
          <Popover
            placement="topRight"
            title="Settings"
            content={<Settings />}
            trigger="click"
          >
            <Button
              shape="circle"
              size="large"
              type="text"
              icon={<SettingOutlined />}
            />
          </Popover>
        }
      />

      <div style={{position: 'relative', zIndex: 10}}>
        <Card
          className="airdrop-card exchange-card"
          headStyle={{ padding: 0 }}
        >
          <div className="airdrop">
            <div className="hd">Buy 1SOL</div>
            <div className="bd">
              <Button 
                type="primary" 
                shape="round"
                style={{minWidth: '70px'}}
                size="small"
              >
                <a href="https://1sol.io/buy" target="_blank" rel="noopener noreferrer">Huobi</a>
              </Button>
              <Button 
                type="primary" 
                shape="round"
                style={{minWidth: '70px', marginLeft: '15px'}}
                size="small"
              >
                <a href="https://1sol.io/buy" target="_blank" rel="noopener noreferrer">Bybit</a>
              </Button>
            </div>
          </div>
        </Card>

        <Card
          className="airdrop-card exchange-card"
          headStyle={{ padding: 0 }}
        >
          <div className="airdrop">
            <div className="hd">Stake 1SOL with <strong style={{fontSize: '22px'}}>120+</strong>% APY</div>
            <div className="bd">
              <Button 
                type="primary" 
                shape="round"
                style={{minWidth: '82px'}}
              >
                <Link to="/staking">Stake Now</Link>
              </Button>
            </div>
          </div>
        </Card>

        <Card
          className="exchange-card"
          headStyle={{ padding: 0 }}
          bodyStyle={{ position: "relative", padding: '0 20px 20px' }}
        >
          {tradeTab.render()}
        </Card>

        <Social />

        <Warning />
      </div>
    </>
  );
};

import React from "react";
import { Button, Card, Popover } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";

import { TradeEntry } from "./trade";
import { Settings } from "./settings";
import { AppBar } from "./appBar";
import Social from "./social";

import Warning from "./warning";

import HuobiLogo from '../assets/huobi.svg'
import BybitLogo from '../assets/bybit.svg'

import './exchange.less'

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
            <div className="hd">$1SOL is live on</div>
            <div className="bd">
              <Button 
                type="primary" 
                shape="round"
                style={{minWidth: '70px'}}
              >
                <a href="https://www.huobi.com/en-us/exchange/1sol_usdt/" target="_blank" rel="noopener noreferrer">
                  <img style={{display: 'block', height: '18px', marginTop: '-3px'}} src={HuobiLogo} alt="" />
                </a>
              </Button>
              <Button 
                type="primary" 
                shape="round"
                style={{minWidth: '70px', marginLeft: '15px'}}
              >
                <a href="https://www.bybit.com/en-US/trade/spot/1SOL/USDT" target="_blank" rel="noopener noreferrer">
                  <img style={{display: 'block', height: '18px', marginTop: '-3px'}} src={BybitLogo} alt="" />
                </a>
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

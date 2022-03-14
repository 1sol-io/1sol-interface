import React from "react";
import { Button, Card, Popover } from "antd";
import { SettingOutlined } from "@ant-design/icons";

import { useWrappedSolAccounts } from "../hooks/useWrappedSol";

import { TradeEntry } from "./trade";
import { Settings } from "./settings";
import { AppBar } from "./appBar";
import Social from "./social";

import HuobiLogo from '../assets/huobi.svg'
import BybitLogo from '../assets/bybit.svg'

import './exchange.less'
import { Link } from "react-router-dom";

const ExchangeView = (props: {}) => {
  const tabStyle: React.CSSProperties = { width: 120 };
  const tradeTab = {
      key: "trade",
      tab: <div style={tabStyle}>Trade</div>,
      render: () => {
        return <TradeEntry />;
      },
    };

  const { wrappedSolAccounts } = useWrappedSolAccounts();

  return (
    <>
      <AppBar
        right={
          <Popover
            placement="topRight"
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

      <div>
        { 
          wrappedSolAccounts.length ? 
          <Card 
            className="exchange-card toolkit-tip-card" 
            headStyle={{ padding: 0 }}
            bodyStyle={{ position: "relative", padding: '20px' }}
          >
            <div className="toolkit-tip">
              <div className="hd">You have Wrapped SOL, unwrap?</div>
              <div className="bd">
                <Link to="/toolkit">
                  <Button type="primary" size="small">Unwrap</Button>
                </Link>
              </div>
            </div>
          </Card>: 
          null
        }

        <Card
          className="exchange-card"
          headStyle={{ padding: 0 }}
          bodyStyle={{ position: "relative", padding: '0 20px 20px' }}
        >
          {tradeTab.render()}
        </Card>

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
            <div className="hd">Stake 1SOL/SOL on Orca</div>
            <div className="bd">
              <Button 
                type="primary" 
                shape="round"
                style={{minWidth: '82px'}}
              >
                <a href="https://www.orca.so/pools?pool=1sol/sol" target="_blank" rel="noopener noreferrer">Stake Now</a>
              </Button>
            </div>
          </div>
        </Card>

        <Social />
      </div>
    </>
  );
};

export default  ExchangeView;
import React, {useState} from "react";
import { Button, Card, Popover } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

import { TradeEntry } from "./trade";
import { Settings } from "./settings";
import { AppBar } from "./appBar";
import Social from "./social";

import { notify } from "../utils/notifications";
import { useWallet } from "../context/wallet";
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

  const {wallet, connect, connected} = useWallet()
  const [loading, setLoading] = useState(false)

  const handleRequestAirdrop = async () => {
    try {
      if (loading) {
        return
      }

      setLoading(true)

      const connection = new Connection("https://api.devnet.solana.com", "confirmed");
      const signature = await connection.requestAirdrop(new PublicKey(wallet.publicKey), LAMPORTS_PER_SOL * 1);

      await connection.confirmTransaction(signature);

      setLoading(false)

      notify({
        message: "Airdrop requested success.",
        type: "success",
      });
    } catch (e) {
      console.error(e)
      setLoading(false)

      notify({
        message: "Airdrop requested error.",
        type: "error",
      });
    }
  }

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
            <div className="hd"> Claim Your 1SOL Airdrop</div>
            <div className="bd">
              <Button 
                type="primary" 
                shape="round"
                style={{minWidth: '82px'}}
              >
                <Link to="/airdrop">Claim 1SOL</Link>
              </Button>
            </div>
          </div>
        </Card>

        {/* <Card
          className="airdrop-card exchange-card"
          headStyle={{ padding: 0 }}
        >
          <div className="airdrop">
            <div className="hd">SOL Token<strong>(Devnet)</strong></div>
            <div className="bd">
              <Button 
                type="primary" 
                shape="round"
                style={{minWidth: '82px'}}
                onClick={connected ? handleRequestAirdrop : connect}
              >
                {loading ? 'Requesting' : 'Faucet'}
              </Button>
            </div>
          </div>
        </Card> */}

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

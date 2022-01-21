import React, { useState } from "react";
import { Card } from "antd";
import { DownOutlined } from "@ant-design/icons";

import { NumericInput } from "../numericInput";
import { convert, getTokenName } from "../../utils/utils";
import {
  useUserAccounts,
  cache,
} from "../../utils/accounts";
import { TokenIcon } from "../tokenIcon";
import { useOnesolProtocol } from "../../hooks/useOnesolProtocol";

import Tokens from '../tokens'

import "./styles.less";

export const TokenDisplay = (props: {
  name: string;
  mintAddress: string;
  icon?: JSX.Element;
}) => {
  const { mintAddress, name, icon } = props;

  return (
    <>
      <div
        title={mintAddress}
        key={mintAddress}
        style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginRight: '0.5rem',
            lineHeight: 1
          }}
        >
          {icon || <TokenIcon mintAddress={mintAddress} />}
          <div style={{ marginRight: '0.5rem' }}>{name}</div>
          <DownOutlined />
        </div>
        
      </div>
    </>
  );
};

export const CurrencyInput = (props: {
  mint?: string;
  amount?: string;
  title?: string;
  hideSelect?: boolean;
  onInputChange?: (val: number) => void;
  onMintChange?: (account: string) => void;
  disabled?: boolean,
  onMaxClick?: () => void,
  bordered?: boolean,
}) => {
  const { userAccounts } = useUserAccounts();
  const mint = cache.getMint(props.mint);

  const [visible, setVisible] = useState(false);

  const { tokenMap } = useOnesolProtocol();

  const userUiBalance = () => {
    const currentAccount = userAccounts?.find(
      (a) => a.info.mint.toBase58() === props.mint
    );
    if (currentAccount && mint) {
      return convert(currentAccount, mint);
    }

    return 0;
  };

  return (
    <>
    <Card
      className="ccy-input"
      style={{ borderRadius: 20, margin: 0, width: "100%", paddingBottom: '10px' }}
      bodyStyle={{ padding: 0 }}
      bordered={props.bordered}
    >
      <div className="ccy-input-header">
        <div className="ccy-input-header-left">{props.title}</div>

        <div
          className="ccy-input-header-right"
          onClick={(e) =>
            props.onInputChange && props.onInputChange(userUiBalance())
          }
        >
          <div style={{color: '#fff', marginRight: '10px', lineHeight: 1}}>Balance: {userUiBalance().toFixed(6)}</div>
          {
            !props.disabled ?
            <div 
              style={{
                cursor: 'pointer',
                fontSize: '10px',
                background: 'rgba(0, 0, 0, 0.75)',  
                padding: '2px 8px',
                borderRadius: '5px'
              }}
              onClick={() => {
                if (props.onMaxClick) {
                  props.onMaxClick()
                }
              }}
            >
              MAX
            </div> :
            null
          }
        </div>
      </div>
      <div className="ccy-input-header">
        <div 
          className="ccy-input-header-left" 
          onClick={() => setVisible(true)}
        >
          {
            props.mint ? (
              <TokenDisplay
                key={props.mint}
                name={getTokenName(tokenMap, props.mint)}
                mintAddress={props.mint}
              />
            ) :
              // <TokenDisplay
              //   key='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
              //   name="USDC"
              //   mintAddress="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
              // />
              null
          }
        </div>

        {
          !props.disabled ?
          <div className="ccy-input-header-right">
            <NumericInput
              disabled={props.disabled}
              value={props.amount}
              onChange={(val: any) => {
                if (props.onInputChange) {
                  props.onInputChange(val);
                }
              }}
              style={{
                width: '100%',
                fontSize: 18,
                boxShadow: "none",
                borderColor: "transparent",
                outline: "transpaernt",
                color: props.amount !== '0.00' ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.3)'
              }}
              placeholder="0.00"
            />
          </div> :
          null
        }
      </div>
    </Card>

    <Tokens visible={visible} 
      onCancel={() => setVisible(false)} 
      onChange={
        (mintAddress) => {
          if (props.onMintChange) {
            setVisible(false)
            props.onMintChange(mintAddress);
          }
        }
      } 
    />
    </>
  );
};

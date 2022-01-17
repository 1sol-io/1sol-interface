import React, { useState } from "react";
import { Card } from "antd";

import { NumericInput } from "../numericInput";
import { convert, getTokenName } from "../../utils/utils";
import {
  useUserAccounts,
  useAccountByMint,
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
  showBalance?: boolean;
}) => {
  const { showBalance, mintAddress, name, icon } = props;
  const tokenMint = cache.getMint(mintAddress);
  const tokenAccount = useAccountByMint(mintAddress);

  let balance: number = 0;
  let hasBalance: boolean = false;
  if (showBalance) {
    if (tokenAccount && tokenMint) {
      balance = convert(tokenAccount, tokenMint);
      hasBalance = balance > 0;
    }
  }

  return (
    <>
      <div
        title={mintAddress}
        key={mintAddress}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {icon || <TokenIcon mintAddress={mintAddress} />}
          {name}
        </div>
        {showBalance ? (
          <span
            title={balance.toString()}
            key={mintAddress}
            className="token-balance"
          >
            &nbsp;{" "}
            {hasBalance
              ? balance < 0.001
                ? "<0.001"
                : balance.toFixed(3)
              : "-"}
          </span>
        ) : null}
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
  onMaxClick?: () => void
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
      style={{ borderRadius: 20, margin: 0, width: "100%" }}
      bodyStyle={{ padding: 0 }}
    >
      <div className="ccy-input-header">
        <div className="ccy-input-header-left">{props.title}</div>

        <div
          className="ccy-input-header-right"
          onClick={(e) =>
            props.onInputChange && props.onInputChange(userUiBalance())
          }
        >
          Balance: {userUiBalance().toFixed(6)}
        </div>
      </div>
      <div className="ccy-input-header" style={{ padding: "0px 10px 5px 7px" }}>
        <div className="ccy-input-header-left">
          <NumericInput
            disabled={props.disabled}
            value={props.amount}
            onChange={(val: any) => {
              if (props.onInputChange) {
                props.onInputChange(val);
              }
            }}
            style={{
              width: '155px',
              fontSize: 18,
              boxShadow: "none",
              borderColor: "transparent",
              outline: "transpaernt",
              color: props.amount !== '0.00' ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.3)'
            }}
            placeholder="0.00"
          />
          <div 
            style={{cursor: 'pointer'}}
            onClick={() => {
              if (props.onMaxClick) {
                props.onMaxClick()
              }
            }}
          >
            Max
          </div>
        </div>
        <div className="ccy-input-header-right" style={{ display: "felx" }}>
          {
            props.mint && (
              <div onClick={() => setVisible(true)}>
                <TokenDisplay
                  key={props.mint}
                  name={getTokenName(tokenMap, props.mint)}
                  mintAddress={props.mint}
                  showBalance={true}
                />
              </div>
            )
          }
        </div>
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

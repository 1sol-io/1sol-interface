import React from "react";

import { NumericInput } from "../numericInput";
import { convert } from "../../utils/utils";
import {
  useUserAccounts,
  cache,
} from "../../utils/accounts";
import { TokenIcon } from "../tokenIcon";
import { useOnesolProtocol } from "../../hooks/useOnesolProtocol";

import "./currency.less";

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
          color: '#fff'
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
          <div style={{ marginRight: '0.5rem', fontWeight: 'bold' }}>{name}</div>
        </div>
        
      </div>
    </>
  );
};

export const Currency = (props: {
  mint?: string;
  amount?: string;
  onMaxClick?: () => void,
  onInputChange?: (val: number) => void;
}) => {
  const { userAccounts } = useUserAccounts();
  const mint = cache.getMint(props.mint);

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
    <div
      className="ccy-input"
      style={{ borderRadius: 20, margin: 0, width: "100%" }}
    >
      <div className="ccy-input-header">
        <div className="ccy-input-header-left">
          <div style={{color: '#fff', marginRight: '10px', lineHeight: 1}}>Balance: {userUiBalance().toFixed(6)}</div>
        </div>

        <div
          className="ccy-input-header-right"
        >
                      <div 
              className="max-btn"
              onClick={() => {
                if (props.onMaxClick) {
                  props.onMaxClick()
                }
              }}
            >
              MAX
            </div> 
        </div>
      </div>
      <div className="ccy-input-body">
        <div 
          className="ccy-input-header-left" 
        >
          {
            props.mint ? (
              <TokenDisplay
                key={props.mint}
                name={tokenMap.get(props.mint)?.symbol || '-'}
                mintAddress={props.mint}
              />
            ) :
              null
          }
        </div>

          <div className="ccy-input-header-right">
            <NumericInput
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
          </div> 
      </div>
    </div>
    </>
  );
};

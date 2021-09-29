import React from "react";
import { Card, Select } from "antd";
import { NumericInput } from "../numericInput";
import { convert, getTokenName } from "../../utils/utils";
import {
  useUserAccounts,
  useAccountByMint,
  cache,
} from "../../utils/accounts";
import "./styles.less";
import { useConnectionConfig } from "../../utils/connection";
import { TokenIcon } from "../tokenIcon";

const { Option } = Select;

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

export const QuoteCurrencyInput = (props: {
  mint?: string;
  amount?: string;
  title?: string;
  hideSelect?: boolean;
  onInputChange?: (val: number) => void;
  onMintChange?: (account: string) => void;
  disabled?: boolean
}) => {
  const { userAccounts } = useUserAccounts();
  const mint = cache.getMint(props.mint);

  const { tokens, tokenMap } = useConnectionConfig();

  const renderPopularTokens = tokens.map((item) => {
    return (
      <Option
        key={item.address}
        value={item.address}
        name={item.symbol}
        title={item.address}
      >
        <TokenDisplay
          key={item.address}
          name={item.symbol}
          mintAddress={item.address}
          showBalance={true}
        />
      </Option>
    );
  });

  // // group accounts by mint and use one with biggest balance
  // const grouppedUserAccounts = userAccounts
  //   .sort((a, b) => {
  //     return b.info.amount.gt(a.info.amount) ? 1 : -1;
  //   })
  //   .reduce((map, acc) => {
  //     const mint = acc.info.mint.toBase58();

  //     if (isKnownMint(tokenMap, mint)) {
  //       return map;
  //     }

  //     map.set(mint, (map.get(mint) || []).concat([{ account: acc }]));

  //     return map;
  //   }, new Map<string, { account: TokenAccount }[]>());

  // const additionalAccounts = [...grouppedUserAccounts.keys()];

  // if (
  //   tokens.findIndex((t) => t.address === props.mint) < 0 &&
  //   props.mint &&
  //   !grouppedUserAccounts.has(props?.mint)
  // ) {
  //   additionalAccounts.push(props.mint);
  // }

  // const renderAdditionalTokens = additionalAccounts.map((mint) => {
  //   let name: string;
  //   let icon: JSX.Element;

  //   name = getTokenName(tokenMap, mint, true, 3);
  //   icon = <TokenIcon mintAddress={mint} />;

  //   return (
  //     <Option key={mint} value={mint} name={name}>
  //       <TokenDisplay
  //         key={mint}
  //         mintAddress={mint}
  //         name={name}
  //         icon={icon}
  //         showBalance={false}
  //       />
  //     </Option>
  //   );
  // });

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
    <Card
      className="ccy-input"
      style={{ borderRadius: 20, margin: 0, width: '100%' }}
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
        <div className="ccy-input-header-left" style={{ display: "felx" }}>
          {!props.hideSelect ? (
            <Select
              // size="small"
              showSearch
              style={{ minWidth: 100 }}
              placeholder="CCY"
              value={props.mint}
              onChange={(item) => {
                if (props.onMintChange) {
                  props.onMintChange(item);
                }
              }}
              filterOption={(input, option) =>
                option?.name?.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {renderPopularTokens}
            </Select>
          ) : (
            props.mint && (
              <TokenDisplay
                key={props.mint}
                name={getTokenName(tokenMap, props.mint)}
                mintAddress={props.mint}
                showBalance={true}
              />
            )
          )}
        </div>
      </div>
    </Card>
  );
};

import { BrowserRouter, Route } from "react-router-dom";
import React from "react";
import { ChartsView } from "./components/charts";

import { WalletProvider } from "./context/wallet";
import { ConnectionProvider } from "./utils/connection";
import { AccountsProvider } from "./utils/accounts";
import { CurrencyPairProvider } from "./utils/currencyPair";
import { ExchangeView } from "./components/exchange";
import { Dashboard } from './components/dashboard'
import { CrossChain } from './components/crosschain'

export function Routes() {
  return (
    <>
      <BrowserRouter basename={"/"}>
        <ConnectionProvider>
          <WalletProvider>
            <AccountsProvider>
              <CurrencyPairProvider>
                <Route exact path="/" component={ExchangeView} />
                <Route exact path="/info" component={() => <ChartsView />} />
                <Route exact path="/dashboard" component={() => <Dashboard />} />
                <Route exact path="/crosschain" component={() => <CrossChain />} />
              </CurrencyPairProvider>
            </AccountsProvider>
          </WalletProvider>
        </ConnectionProvider>
      </BrowserRouter>
    </>
  );
}

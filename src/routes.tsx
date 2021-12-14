import { BrowserRouter, Route, Redirect, Switch } from "react-router-dom";
import React from "react";

import { WalletProvider } from "./context/wallet";
import { ConnectionProvider } from "./utils/connection";
import { AccountsProvider } from "./utils/accounts";
import { CurrencyPairProvider } from "./utils/currencyPair";

import { ExchangeView } from "./components/exchange";
import { Dashboard } from './components/dashboard'
import Airdrop from "./components/airdrop";
import Staking from './components/staking'

export function Routes() {
  return (
    <>
      <BrowserRouter basename={"/"}>
        <ConnectionProvider>
          <WalletProvider>
            <AccountsProvider>
              <CurrencyPairProvider>
                <Switch>
                  <Route exact path="/">
                    <Redirect to="/trade/" />
                  </Route>
                  <Route path="/trade/:pair" component={ExchangeView} />
                  <Route exact path="/dashboard" component={() => <Dashboard />} />
                  <Route exact path="/airdrop" component={Airdrop} />
                  <Route exact path="/staking" component={Staking} />
                </Switch>
              </CurrencyPairProvider>
            </AccountsProvider>
          </WalletProvider>
        </ConnectionProvider>
      </BrowserRouter>
    </>
  );
}

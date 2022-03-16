import React, { Suspense, lazy } from "react";
import { BrowserRouter, Route, Redirect, Switch } from "react-router-dom";

import { WalletProvider } from "./context/wallet";
import { ConnectionProvider } from "./utils/connection";
import { AccountsProvider } from "./utils/accounts";
import { CurrencyPairProvider } from "./utils/currencyPair";
import { OnesolProtocolProvider } from "./context/onesolprotocol";
import { OnesolFarmingProtocolProvider } from "./context/onesolfarming";

const Exchange = lazy(() => import("./components/exchange"));
const Dashboard = lazy(() => import("./components/dashboard"));
const Staking = lazy(() => import("./components/staking"));
const Toolkit = lazy(() => import("./components/toolkit"))
const Farms = lazy(() => import("./components/farms"))
const Farm = lazy(() => import("./components/farm"))

// const loading = (
//   <div className="g-loading">
//     <img
//       className="g-loading-logo"
//       src="data:image/png;base64,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"
//       alt="1SOL Protocol Logo"
//     />
//   </div>
// )

export function Routes() {
  return (
    <>
      <BrowserRouter basename={"/"}>
        <Suspense fallback={<></>}>
        <ConnectionProvider>
          <WalletProvider>
            <AccountsProvider>
              <OnesolProtocolProvider>
                <OnesolFarmingProtocolProvider>
                  <CurrencyPairProvider>
                    <Switch>
                      <Route exact path="/">
                        <Redirect to="/trade/USDC-1SOL" />
                      </Route>
                      <Route path="/trade/:pair" component={Exchange} />
                      <Route exact path="/dashboard" component={Dashboard} />
                      <Route exact path="/airdrop">
                        <Redirect to="/trade/USDC-1SOL" />
                      </Route>
                      <Route path="/farms/:id" component={Farm} />
                      <Route exact path="/farms" component={Farms} />
                      <Route exact path="/staking" component={Staking} />
                      <Route exact path="/toolkit" component={Toolkit} />
                    </Switch>
                  </CurrencyPairProvider>
                </OnesolFarmingProtocolProvider>
              </OnesolProtocolProvider>
            </AccountsProvider>
          </WalletProvider>
        </ConnectionProvider>
        </Suspense>
      </BrowserRouter>
    </>
  );
}

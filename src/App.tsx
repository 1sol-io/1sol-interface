import React from "react";
import "./App.less";
import GitHubButton from "react-github-btn";
import { Routes } from "./routes";

function App() {
  return (
    <div className="App">
      <div className="Banner">
        <div
          className="Banner-description"
          style={{
            textAlign: 'left',
            paddingLeft: '30px',
            paddingTop: '5px'
          }}
        >
          <strong>Swap is being deprecated.</strong>
          <div
            style={{
              textAlign: 'left',
              paddingLeft: '10px'
            }}
          >
            <ul>
              <li>
                Removing liquidity is enabled through the My Pools tab
              </li>
              <li>
                The Provide Liquidity and Swap functionalities have been disabled
              </li>
              <li>
                For easy swapping using the on-chain Serum orderbook consider using
                <a href={'https://raydium.io/swap/'} target="_blank" rel="noopener noreferrer"> raydium.io</a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <Routes />
      <div className="social-buttons">
        <GitHubButton
          href="https://github.com/project-serum/oyster-swap"
          data-color-scheme="no-preference: light; light: light; dark: light;"
          data-icon="octicon-star"
          data-size="large"
          data-show-count={true}
          aria-label="Star solana-labs/oyster-swap on GitHub"
        >
          Star
        </GitHubButton>
        <GitHubButton
          href="https://github.com/project-serum/oyster-swap/fork"
          data-color-scheme="no-preference: light; light: light; dark: light;"
          data-size="large"
          aria-label="Fork project-serum/oyster-swap on GitHub"
        >
          Fork
        </GitHubButton>
      </div>
    </div>
  );
}

export default App;

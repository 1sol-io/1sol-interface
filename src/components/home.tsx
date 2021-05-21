
import React from "react";
import { Button } from "antd";

import { AppBar } from "./appBar";

import twitter from '../assets/twitter.svg'
import telegram from '../assets/telegram.svg'
import medium from '../assets/medium.svg'
import github from '../assets/github.svg'
import solana from '../assets/solana.svg'

import './home.less'

export const HomePage = () => {
  return (
    <div className="page-home">
      <AppBar />
      <div className="mod">
        <div className="hd">
          <h1>Redefining fundraising through decentralization</h1>
        </div>
        <div className="bd">
        <p>
          The Solanium platform is a decentralized platform on the Solana blockchain.
          The platform will introduce <b>decentralized fundraising</b>, <b>time-weighted token staking</b> and
          <b>governance voting</b> to the Solana ecosystem.
        </p> <p>
          We are giving high priority to both UI and UX, as we think good UI is one of the core principles
          that are currently lacking or not prioritized in the ecosystem. We feel that this is one of the most
          important factors to onboard new(bie) users to the Solana ecosystem.
        </p> <p>
          The platform will be an all-in-one solution for Solana, with integrated wallet,
          DEX and transaction management. All major Solana wallets will be supported.
          The platform will extend any connected wallet with inline wallet management.
          The user does not have to leave the platform to see token balances, send or receive tokens or manage token accounts. Experienced users can still manage their wallet through their wallet provider, and any changes will directly be reflected on the platform.
        </p>
        </div>
        <div className="ft">
          <div className="socials">
            <div className="flex">
              <div className="icon">
                <a href="/"><img src={twitter} /></a>
              </div>
              <div className="icon">
                <a href="/"><img src={telegram} /></a>
              </div>
              <div className="icon">
                <a href="/"><img src={medium} /></a>
              </div>
              <div className="icon">
                <a href="/"><img src={github} /></a>
              </div>
            </div>
          </div>
          <div className="powerby">Built on: <img src={solana} /><a href="">Solana</a></div>
          <div className="buttons">
            <div className="flex">
              <a href="/">
                <Button className="custom-btn purple-btn" type="text" size="large">Download onepager</Button>
              </a>
              <a href="/">
                <Button className="custom-btn purple-btn-outline" type="text" size="large">Read documentation</Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
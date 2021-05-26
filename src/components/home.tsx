
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
          <h1>An innovative cross-chain DeFi aggregator on Solana and more</h1>
        </div>
        <div className="bd">
        </div>
        <div className="ft">
          <div className="socials">
            <div className="flex">
              <div className="icon">
                <a href="https://twitter.com/1solprotocol"><img src={twitter} /></a>
              </div>
              <div className="icon">
                <a href="https://t.me/onesolcommunity"><img src={telegram} /></a>
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
import React from 'react'

import twitter from '../assets/twitter.svg'
import telegram from '../assets/telegram.svg'
import medium from '../assets/medium.svg'
import github from '../assets/github.svg'

import './social.less'

const Social = () => {
  return (
    <div className="socials">
      <div className="flex">
        <div className="icon">
          <a href="https://twitter.com/1solprotocol" target="_blank">
            <img src={twitter} />
          </a>
        </div>
        <div className="icon">
          <a href="https://t.me/onesolcommunity" target="_blank">
            <img src={telegram} />
          </a>
        </div>
        <div className="icon">
          <a href="https://medium.com/@1solProtocol" target="_blank">
            <img src={medium} />
          </a>
        </div>
        <div className="icon">
          <a href="https://github.com/1sol-io" target="_blank">
            <img src={github} />
          </a>
        </div>
      </div>
    </div>
  )
}

export default Social

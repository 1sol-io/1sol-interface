import React from 'react'

import { AppBar } from '../appBar'
import Social from '../social'

import Pool from './pool'
import Pool1 from './pool1'

const Staking = () => {
  return (
    <div className="page-staking">
      <AppBar />
      <div className="bd">
        <Pool1 />
        <Pool />
      </div>
      <Social />
    </div>
  )
}

export default Staking

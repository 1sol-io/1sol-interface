import React, { useState, useEffect } from 'react'

import { useConnection } from '../../utils/connection'

import { AppBar } from '../appBar'
import Social from '../social'

const Staking = () => {
  const connection = useConnection()

  return (
    <div className="page-staking">
      <AppBar />
      <div className="bd">
        <Card title="Staking" />
      </div>
      <Social />
    </div>
  )
}

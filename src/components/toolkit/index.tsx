import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Card, Spin, Popover, Modal, Tooltip } from 'antd'

import { AppBar } from '../appBar'
import Social from '../social'

import { useConnection } from '../../utils/connection'

import { WRAPPED_SOL_MINT } from '../../utils/constant'

export const Toolkit = () => {
  return (
    <div className="page-toolkit">
      <AppBar />
      <div className="bd">
        <Card
          className="toolkit-card"
          style={{ margin: '0', padding: '0 30px', width: '100%' }}
        >
          <div className="toolkit-item" />
        </Card>
      </div>
      <div className="ft">
        <Social />
      </div>
    </div>
  )
}

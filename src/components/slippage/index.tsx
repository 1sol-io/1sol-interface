import React, { useEffect, useState } from 'react'
import { Button } from 'antd'

import { useSlippageConfig } from './../../utils/connection'
import { NumericInput } from './../numericInput'

import './style.less'

const MAX_SLIPPAGE = 25.0
const DEFAULT_MIN_SLIPPAGE = 0.1

export const Slippage = () => {
  const { slippage, setSlippage } = useSlippageConfig()
  const slippagePct = slippage * 100
  const [value, setValue] = useState(slippagePct.toString())

  useEffect(
    () => {
      setValue(slippagePct.toString())
    },
    [slippage, slippagePct]
  )

  const isSelected = (val: number) => {
    return val === slippagePct ? 'primary' : 'default'
  }

  const itemStyle: React.CSSProperties = {
    margin: 5,
    border: '0 none',
    borderRadius: 6
  }

  return (
    <div className="mod-slippage">
      <div className="hd">
        <span>Slippage</span>
        <span>{slippage * 100}%</span>
      </div>
      <div className="bd">
        {[0.1, 0.5, 1.0].map((item) => {
          return (
            <Button
              key={item.toString()}
              style={itemStyle}
              type={isSelected(item)}
              onClick={() => setSlippage(item / 100.0)}
            >
              {item}%
            </Button>
          )
        })}
        <div
          style={{
            padding: '3px 10px 3px 3px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 8,
            marginRight: 10
          }}
        >
          <NumericInput
            className="slippage-input"
            size="small"
            placeholder={value}
            value={value}
            min={0.1}
            step={0.1}
            style={{
              width: 60,
              fontSize: 12,
              boxShadow: 'none',
              borderColor: 'transparent',
              outline: 'transpaernt'
            }}
            onChange={(x: any) => {
              const cappedSlippage = Math.min(parseFloat(x), MAX_SLIPPAGE)

              const safeCappedSlippage = Number.isNaN(cappedSlippage)
                ? DEFAULT_MIN_SLIPPAGE.toString()
                : cappedSlippage.toString()

              setValue(safeCappedSlippage)

              const newValue = parseFloat(safeCappedSlippage) / 100.0

              if (Number.isFinite(newValue)) {
                setSlippage(newValue)
              }
            }}
          />
          %
        </div>
      </div>
    </div>
  )
}

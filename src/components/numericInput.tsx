import React from 'react'
import { InputNumber } from 'antd'

export class NumericInput extends React.Component<any, any> {
  onChange = (value: any) => {
    // const { value } = e.target
    const reg = /^-?\d*(\.\d*)?$/

    if (reg.test(value) || value === '' || value === '-') {
      this.props.onChange(value)
    }
  }

  // '.' at the end or only '-' in the input box.
  onBlur = () => {
    const { value, onBlur, onChange } = this.props
    let valueTemp = value
    if (value.charAt(value.length - 1) === '.' || value === '-') {
      valueTemp = value.slice(0, -1)
    }
    if (value.startsWith('.') || value.startsWith('-.')) {
      valueTemp = valueTemp.replace('.', '0.')
    }
    onChange(valueTemp.replace(/0*(\d+)/, '$1'))
    if (onBlur) {
      onBlur()
    }
  }

  render() {
    return (
      <InputNumber
        {...this.props}
        onChange={this.onChange}
        onBlur={this.onBlur}
        maxLength={25}
        stringMode
      />
    )
  }
}

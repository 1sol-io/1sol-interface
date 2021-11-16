import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import BigNumber from 'bignumber.js';

import { useConnectionConfig } from "../utils/connection";

import { SYMBOL_PAIRS } from '../utils/constant'
import logo from '../assets/chainlink.svg'

const useChainlink = () => {
  const connection = useConnectionConfig();

  const [loading, setLoading] = useState(true)
  const [symbolMap, setSymbolMap] = useState<{
    [key: string]: { name: string; symbol: string; price: string, logo: string }
  }>()

  const getPrices = useCallback(async () => {
    setLoading(true)

    try {
      const { data } = await axios({
        url: 'https://api.1sol.io/chainlink/price',
        method: 'post',
        data: {
          program_id: '2yqG9bzKHD59MxD9q7ExLvnDhNycB3wkvKXFQSpBoiaE',
          accounts: SYMBOL_PAIRS.map(({ key }: { key: string }) => key),
          // chain_id: connection.chainId
          chain_id: 103
        }
      })

      const symbolMap: {
        [key: string]: { symbol: string; price: string; name: string, logo: string }
      } = {}

      SYMBOL_PAIRS.forEach(({ name: symbol }: { name: string }, i) => {
        const { price, decimals } = data[i].price

        symbolMap[symbol.toLowerCase()] = {
          symbol,
          price: new BigNumber(price).dividedBy(new BigNumber(10 ** decimals)).toFixed(2).toString(),
          name: 'Chainlink',
          logo
        }
      })

      setSymbolMap(symbolMap)

      setLoading(false)
    } catch (e) {
      setLoading(false)
    }
  }, [connection])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    getPrices()
    timer = setInterval(() => getPrices(), 10000)

    return () => {
      if (timer) {
        clearInterval(timer)
      }
    }
  }, [])

  return { chainlinkMap: symbolMap, loading }
}

export default useChainlink
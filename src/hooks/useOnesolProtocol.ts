import { useEffect, useState, useCallback } from 'react'

import { OnesolProtocol } from '@1solProtocol/sdk'

import { useConnection } from '../utils/connection'
import { TokenInfo } from '../utils/token-registry'

const useOnesolProtocol = () => {
  const connection = useConnection()
  const oneSolProtocol = new OnesolProtocol(connection)

  const [tokenList, setTokenList] = useState<TokenInfo[]>([])
  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>(new Map())

  useEffect(() => {
    const fetchTokenList = async () => {
      const tokenList = await oneSolProtocol.getTokenList()
      console.log(tokenList)
    }

    fetchTokenList()
  }, [])

  return {
    tokenList,
    tokenMap
  }
}

export default useOnesolProtocol
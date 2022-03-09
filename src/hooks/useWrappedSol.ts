import {
  useState,
  useEffect,
  useCallback,
} from 'react'
import { PublicKey } from '@solana/web3.js'

import { useWallet } from '../context/wallet'
import { useConnection } from '../utils/connection'
import { convert, getWrappedSolAccounts, createUnwrapSolInstructions } from '../utils/utils'
import { sendTransaction } from '../utils/connection'

export function useWrappedSolAccounts() {
  const connection = useConnection()
  const { wallet, connected } = useWallet()

  const [wrappedSolAccounts, setWrappedSolAccounts] = useState<{
    address: string,
    balance: number,
  }[]>([])

  useEffect(() => {
    const fetchAccounts = async () => {
      const accounts = await getWrappedSolAccounts({
        connection,
        wallet: wallet.publicKey
      })

      setWrappedSolAccounts(accounts.map(({ mint, amount }) => ({
        address: mint.toBase58(),
        balance: convert(amount.toNumber(), 9),
      })))
    }

    if (connected && wallet && connection) {
      fetchAccounts()
    }
  }, [connected, wallet, connection])

  const unwrapSol = useCallback(async (
    accounts: PublicKey[]
  ) => {
    const instructions = createUnwrapSolInstructions({ wallet: wallet.publicKey, accounts })

    await sendTransaction(connection, wallet, instructions, [])
  }, [wallet, connection])

  return { wrappedSolAccounts, unwrapSol }
}
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
import { notify } from '../utils/notifications'

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

      setWrappedSolAccounts(accounts.map(({ pubkey, amount }) => ({
        address: pubkey.toBase58(),
        balance: convert(amount.toNumber(), 9),
      })))
    }

    if (connected && wallet && wallet.publicKey && connection) {
      fetchAccounts()
    }
  }, [connected, wallet, connection])

  const unwrapSol = useCallback(async (
    accounts: PublicKey[]
  ) => {
    const instructions = createUnwrapSolInstructions({ wallet: wallet.publicKey, accounts })

    const txid = await sendTransaction(connection, wallet, instructions, [])

    setWrappedSolAccounts([])

    notify({
      message: 'Unwrap executed.',
      type: 'success',
      description: `Transaction - ${txid}`,
      txid
    })
  }, [wallet, connection])

  return { wrappedSolAccounts, unwrapSol }
}
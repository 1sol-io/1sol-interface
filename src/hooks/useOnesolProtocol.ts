import { useContext } from 'react';

import { OnesolProtocolContext } from '../context/onesolprotocol';

export function useOnesolProtocol() {
  const context = useContext(OnesolProtocolContext)

  if (!context) {
    throw new Error(
      'useOnesolProtocol must be used within a OnesolProtocolProvider'
    )
  }

  return context
}
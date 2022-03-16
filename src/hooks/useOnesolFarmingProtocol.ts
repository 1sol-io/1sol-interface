import { useContext } from 'react';

import { OnesolFarmingProtocolContext } from '../context/onesolfarming';

export function useOnesolFarmingProtocol() {
  const context = useContext(OnesolFarmingProtocolContext)

  if (!context) {
    throw new Error(
      'useOnesolFarmingProtocol must be used within a useOnesolFarmingProtocolProvider'
    )
  }

  return context
}
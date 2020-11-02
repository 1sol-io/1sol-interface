import React, { useContext } from "react";

export interface MarketsContextState {}

const MarketsContext = React.createContext<MarketsContextState | null>(null);

export function MarketProvider({ children = null as any }) {
  return (
    <MarketsContext.Provider value={{}}>{children}</MarketsContext.Provider>
  );
}

export const useMarkets = () => {
  const context = useContext(MarketsContext);
  return context as MarketsContextState;
};

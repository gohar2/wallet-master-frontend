import React, { createContext, useContext } from 'react';
import { useZeroDev } from '@/hooks/use-zerodev';

const Web3Context = createContext(undefined);

export function Web3Provider({ children }) {
  const zeroDev = useZeroDev();

  return (
    <Web3Context.Provider value={zeroDev}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
}
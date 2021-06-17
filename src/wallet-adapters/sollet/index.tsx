import Wallet from '@project-serum/sol-wallet-adapter';

export function SolletExtensionAdapter(_: any, network: string) {
  const sollet = (window as any).sollet;
  if (sollet) {
    return new Wallet(sollet, network);
  }

  return {
    on: () => {},
    connect: () => {
    }
  }
}
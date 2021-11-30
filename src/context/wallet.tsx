import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Button, Modal } from "antd";

import Wallet from "@project-serum/sol-wallet-adapter";
import { WalletAdapter } from '@solana/wallet-adapter-base'
import { SolletWalletAdapter } from "@solana/wallet-adapter-sollet";
import { SolongWalletAdapter } from "@solana/wallet-adapter-solong";
import { MathWalletWalletAdapter } from "@solana/wallet-adapter-mathwallet";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SafePalWalletAdapter } from "@solana/wallet-adapter-safepal";
import { Coin98WalletAdapter } from '@solana/wallet-adapter-coin98'
import { SlopeWalletAdapter } from '@solana/wallet-adapter-slope'
import { BloctoWalletAdapter } from '@solana/wallet-adapter-blocto'
import { BitpieWalletAdapter } from '@solana/wallet-adapter-bitpie'
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare'
import { LedgerWalletAdapter } from "@solana/wallet-adapter-ledger"

import { useConnectionConfig } from "../utils/connection";
import { useLocalStorageState } from "../utils/utils";
import { notify } from "../utils/notifications";

import PhantomLogo from "../assets/phantom.png";
import SolletLogo from "../assets/sollet.svg"
import SafePalLogo from '../assets/safepal_white.svg'
import Coin98Logo from '../assets/coin98.png'
import SlopeLogo from '../assets/slope.png'
import BitpieLogo from '../assets/bitpie.png'
import BloctoLogo from '../assets/blocto.png'
import SolflareLogo from '../assets/solflare.svg'
import LedgerLogo from '../assets/ledger.svg'
import SolongLogo from "../assets/solong.png"
import MathWalletLogo from "../assets/mathwallet.svg"

export const WALLET_PROVIDERS = [
  {
    name: "Phantom",
    url: "https://www.phantom.app",
    icon: PhantomLogo,
    adapter: PhantomWalletAdapter,
  },
  {
    key: "sollet.io",
    name: "Sollet Web",
    url: "https://www.sollet.io",
    icon: SolletLogo,
  },
  {
    key: "Sollet",
    name: "Sollet Extension",
    url: "https://www.sollet.io/extension",
    icon: SolletLogo,
    adapter: SolletWalletAdapter,
  },
  {
    key: "Solflare Web",
    name: "Solflare Web",
    url: "https://solflare.com/access-wallet",
    icon: SolflareLogo,
  },
  {
    key: "Solflare Extension",
    name: "Solflare Extension",
    url: "https://solflare.com/access-wallet/extension",
    icon: SolflareLogo,
    adapter: SolflareWalletAdapter,
  },
  {
    key: "Ledger",
    name: "Ledger",
    url: "https://www.ledger.com",
    icon: LedgerLogo,
    adapter: LedgerWalletAdapter,
  },
  {
    key: "Solong",
    name: "Solong",
    url: "https://www.solong.com",
    icon: SolongLogo,
    adapter: SolongWalletAdapter,
  },
  {
    key: "MathWallet",
    name: "MathWallet",
    url: "https://www.mathwallet.org",
    icon: MathWalletLogo,
    adapter: MathWalletWalletAdapter,
  },
  {
    key: "SafePalWallet",
    name: "SafePal",
    url: "https://www.safepal.io/",
    icon: SafePalLogo,
    adapter: SafePalWalletAdapter,
  },
  {
    key: "Coin98",
    name: "Coin98",
    url: "https://www.coin98.com",
    icon: Coin98Logo,
    adapter: Coin98WalletAdapter,
  },
  {
    key: 'Blocto',
    name: 'Blocto',
    icon: BloctoLogo,
    url: 'https://blocto.portto.io',
    adapter: BloctoWalletAdapter
  },
  {
    key: 'Slope',
    name: 'Slope',
    icon: SlopeLogo,
    url: 'https://slope.finance',
    adapter: SlopeWalletAdapter
  },
  {
    key: 'Bitpie',
    name: 'Bitpie',
    icon: BitpieLogo,
    url: 'https://bitpie.com',
    adapter: BitpieWalletAdapter
  },
];

const WalletContext = React.createContext<any>(null);

export function WalletProvider({ children = null as any }) {
  const { endpoint } = useConnectionConfig();

  const [autoConnect, setAutoConnect] = useState(false);
  const [providerUrl, setProviderUrl] = useLocalStorageState("walletProvider");

  const provider = useMemo(
    () => WALLET_PROVIDERS.find(({ url }) => url === providerUrl),
    [providerUrl]
  );

  const wallet = useMemo(
    function () {
      if (provider) {
        return new (provider.adapter || Wallet)(
          providerUrl,
          endpoint
        ) as WalletAdapter;
      }
    },
    [provider, providerUrl, endpoint]
  );

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (wallet) {
      wallet.on("connect", () => {
        if (wallet.publicKey) {
          localStorage.removeItem("feeDiscountKey");
          setConnected(true);

          const walletPublicKey = wallet.publicKey.toBase58();

          const keyToDisplay =
            walletPublicKey.length > 20
              ? `${walletPublicKey.substring(
                  0,
                  7
                )}.....${walletPublicKey.substring(
                  walletPublicKey.length - 7,
                  walletPublicKey.length
                )}`
              : walletPublicKey;

          notify({
            message: "Wallet update",
            description: "Connected to wallet " + keyToDisplay,
          });
        }
      });

      wallet.on("disconnect", () => {
        setConnected(false);

        notify({
          message: "Wallet update",
          description: "Disconnected from wallet",
        });

        localStorage.removeItem("feeDiscountKey");
      });
    }

    return () => {
      setConnected(false);

      if (wallet) {
        wallet.disconnect();
        setConnected(false);
      }
    };
  }, [wallet]);

  useEffect(() => {
    if (wallet && autoConnect) {
      try {
        wallet.connect();
        setAutoConnect(false);
      } catch (e) {
        console.error(e);
      }
    }

    return () => {
    };
  }, [wallet, autoConnect]);

  const [isModalVisible, setIsModalVisible] = useState(false);

  const select = useCallback(() => {
    setIsModalVisible(true)
  }, []);

  const close = useCallback(() => { 
    setIsModalVisible(false) 
  }, []);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        connected,
        select,
        providerUrl,
        setProviderUrl,
        providerName:
          WALLET_PROVIDERS.find(({ url }) => url === providerUrl)?.name ??
          providerUrl,
      }}
    >
      {children}
      <Modal
        title="Select Wallet"
        okText="Connect"
        visible={isModalVisible}
        okButtonProps={{ style: { display: "none" } }}
        onCancel={close}
        width={400}
      >
        {WALLET_PROVIDERS.map((provider) => {
          const onClick = function () {
            setProviderUrl(provider.url);
            setAutoConnect(true);
            close();
          };

          return (
            <Button
              key={provider.name}
              size="large"
              type={providerUrl === provider.url ? "primary" : "ghost"}
              onClick={onClick}
              icon={
                <img
                  alt={`${provider.name}`}
                  width={20}
                  height={20}
                  src={provider.icon}
                  style={{ marginRight: 8 }}
                />
              }
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                marginBottom: 8,
              }}
            >
              {provider.name}
            </Button>
          );
        })}
      </Modal>
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);

  if (!context) {
    throw new Error("Missing wallet context");
  }

  const wallet = context.wallet;

  return {
    connected: context.connected,
    wallet: wallet,
    providerUrl: context.providerUrl,
    setProvider: context.setProviderUrl,
    providerName: context.providerName,
    select: context.select,
    connect() {
      wallet ? wallet.connect() : context.select();
    },
    disconnect() {
      wallet?.disconnect();
    },
  };
}

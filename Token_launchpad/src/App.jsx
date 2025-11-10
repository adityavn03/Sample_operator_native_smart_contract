import { useState } from 'react'
import './App.css'
import { TokenLaunchpad } from './TokenLaunchpad';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import {
    WalletModalProvider,
    WalletDisconnectButton,
    WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';
import './App.css'


function App() {
  
  return (
    <>
    <ConnectionProvider endpoint={"https://solana-devnet.g.alchemy.com/v2/0E58nG-ys1413-3meSdCOl_YYiTgWMS7"}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>
          <WalletMultiButton/>
          <WalletDisconnectButton/>
        </WalletModalProvider>
        <TokenLaunchpad/>
      
      </WalletProvider>

    </ConnectionProvider>
      
    </>
  )
}

export default App

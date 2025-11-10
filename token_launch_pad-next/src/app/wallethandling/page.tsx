'use client'
import {ConnectionProvider,WalletProvider} from "@solana/wallet-adapter-react";
import {WalletModalProvider, WalletMultiButton} from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import Tokenlaunchpadlogic from "../tokenlaunchpadlogic/page";
import "@solana/wallet-adapter-react-ui/styles.css"

export default function Wallethandling(){
    const wallet=[new PhantomWalletAdapter()];
    return(

        <div>
            <ConnectionProvider endpoint="https://api.devnet.solana.com">
               <WalletProvider wallets={wallet} autoConnect>
                  <WalletModalProvider>
                    <WalletMultiButton/>
                    <Tokenlaunchpadlogic/>
                  </WalletModalProvider>

               </WalletProvider>
            </ConnectionProvider>
        
        </div>
    )
}
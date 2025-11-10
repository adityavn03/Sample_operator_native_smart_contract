'use client'
import {ConnectionProvider,WalletProvider} from "@solana/wallet-adapter-react";
import {WalletModalProvider,WalletMultiButton} from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { waitForDebugger } from "inspector";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import SecondQuest1 from "./secondQuest1/page";
import MintTokens from "./minttoken/page";
import { UpdateMetadata } from "./updatemetadata/page";
import { TokenLaunchpad } from "./token_launchpad/page";
import Nft from "./nft/page";
export default function Wallethandling(){
    const wallet=[new PhantomWalletAdapter()]
    return (
        <div>
            <ConnectionProvider endpoint="https://api.devnet.solana.com">
                <WalletProvider wallets={wallet} autoConnect>
                    <WalletModalProvider>
                        <WalletMultiButton/>
                        <SecondQuest1/>
                        <TokenLaunchpad/>
                        <MintTokens/>
                        <UpdateMetadata/>
                        <Nft/>
                    </WalletModalProvider>

                </WalletProvider>


            </ConnectionProvider>

        </div>
    )
}
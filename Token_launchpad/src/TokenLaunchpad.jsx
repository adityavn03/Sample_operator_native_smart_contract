import { useState } from "react";
import { createMint,getMinimumBalanceForRentExemptMint,TOKEN_PROGRAM_ID,MINT_SIZE,createInitializeMint2Instruction} from "@solana/spl-token";
import {  Keypair, Transaction,SystemProgram } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

export const TokenLaunchpad=()=>{
    const wallet=useWallet()
    const {connection}=useConnection()
    const createLaunchpad=async()=>{
        document.getElementById('name').value
        document.getElementById('symbol').value
        document.getElementById('img-url').value
        document.getElementById('initial-supply').value
        
        const lamports = await getMinimumBalanceForRentExemptMint(connection);
        const keypair=Keypair.generate()
        const transaction = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: wallet.publicKey,
                    newAccountPubkey: keypair.publicKey,
                    space: MINT_SIZE,
                    lamports,
                    programId:TOKEN_PROGRAM_ID,
                }),
                createInitializeMint2Instruction(keypair.publicKey, 6, wallet.publicKey, wallet.publicKey, TOKEN_PROGRAM_ID),
            );
            transaction.feePayer=wallet.publicKey
            transaction.recentBlockhash=(await connection.getLatestBlockhash()).blockhash //it will provide the latest sol block hash because miner will only add  a tranction with recent block hash
            transaction.partialSign(keypair)//it will partial sign because the keypair we know 
            wallet.sendTransaction(transaction,connection)//here the user wallet will popsup and user will sign through their private key
            console.log(keypair.publicKey.toBase58())
        
    }
    return(
        <div>
            <h1>helloe</h1>
             <div>
                   <h1>Solana LaunchPad</h1>
                    <input id='name' type='text' placeholder='name' />
                    <input id='symbol' type='text' placeholder='symbol' />
                    <input id='img-url' type='text' placeholder='img-url' />
                    <input id='initial-supply' type='text' placeholder='mint' />
                    <button onClick={createLaunchpad}>Create</button>
            
            </div>
        </div>
    )
}
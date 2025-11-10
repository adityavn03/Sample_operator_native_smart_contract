import React, { useState } from "react";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
    TOKEN_2022_PROGRAM_ID,
    createMintToInstruction,
    createAssociatedTokenAccountInstruction,
    getMintLen,
    createInitializeMetadataPointerInstruction,
    createInitializeMintInstruction,
    TYPE_SIZE,
    LENGTH_SIZE,
    ExtensionType,
    getAssociatedTokenAddressSync,
    getMinimumBalanceForRentExemptAccount
} from "@solana/spl-token";
import { createInitializeInstruction, pack } from '@solana/spl-token-metadata';
import { url } from "inspector";
import { Walter_Turncoat } from "next/font/google";

export function TokenLaunchpad() {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [mintAddress, setMintAddress] = useState(null);
    const [txSig, setTxSig] = useState(null);
    const [loading, setLoading] = useState(false);
    const [name,setname]=useState<string>("");
    const [symbol,setsymbol]=useState<string>("");
    const [url,seturl]=useState<string>("");
    const [amount,setamount]=useState<number>(0);


    async function createToken() {
        try {
            if (!wallet.publicKey) {
                alert("Please connect your wallet first!");
                return;
            }

            setLoading(true);
            setMintAddress(null);
            setTxSig(null);
            let mintkey=Keypair.generate() ;
            console.log(mintkey.publicKey);
            let metadat={
                mint:mintkey.publicKey,
                name:name,
                symbol:symbol,
                uri:url,
                additionalMetadata: [],
            }
            const mintdata=getMintLen([ExtensionType.MetadataPointer]);
            let metadata=TYPE_SIZE+LENGTH_SIZE+pack(metadat).length;
            let lamports=await connection.getMinimumBalanceForRentExemption(mintdata+metadata);


            //transaction 1 
            let tx=new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey:wallet.publicKey,
                    newAccountPubkey:mintkey.publicKey,
                    lamports,
                    space:mintdata,
                    programId:TOKEN_2022_PROGRAM_ID,
                }),
                createInitializeMetadataPointerInstruction(
                    mintkey.publicKey,
                    wallet.publicKey,
                    mintkey.publicKey,
                    TOKEN_2022_PROGRAM_ID
                ),
                createInitializeMintInstruction(
                    mintkey.publicKey,
                    9,
                    wallet.publicKey,
                    wallet.publicKey,
                    TOKEN_2022_PROGRAM_ID
                ),
                createInitializeInstruction({
                    programId:TOKEN_2022_PROGRAM_ID,
                    mint:mintkey.publicKey,
                    metadata:mintkey.publicKey,
                    name:name,
                    symbol:symbol,
                    uri:url,
                    updateAuthority:wallet.publicKey,
                    mintAuthority:wallet.publicKey,
                }

                )
            )
            tx.feePayer=wallet.publicKey;
            tx.recentBlockhash=(await connection.getLatestBlockhash()).blockhash;
            tx.partialSign(mintkey);
            let confirm=await wallet.sendTransaction(tx,connection);
            await connection.confirmTransaction(confirm,"confirmed");

            let associatedaccount=getAssociatedTokenAddressSync(
                mintkey.publicKey,
                wallet.publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
            )

            //transaction 2
            let tx_create_associated_token=new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    wallet.publicKey,
                    associatedaccount,
                    wallet.publicKey,
                    mintkey.publicKey,
                    TOKEN_2022_PROGRAM_ID,
                )
            )
            
            let confirm_transaction=await wallet.sendTransaction(tx_create_associated_token,connection);
            await connection.confirmTransaction(confirm_transaction,"confirmed");

            //transaction 3
            let mint_token_to_associated_token=new Transaction().add(
                createMintToInstruction(
                    mintkey.publicKey,
                    associatedaccount,
                    wallet.publicKey,
                    amount,
                    [],
                    TOKEN_2022_PROGRAM_ID
                    
                )
            ) 
            let tx3=await wallet.sendTransaction(mint_token_to_associated_token,connection);
            

            // ✅ Update UI
            setMintAddress(mintkey.publicKey.toBase58() as any);
            setTxSig(tx3 as any);

            console.log("✅ Token created successfully:", mintkey.publicKey.toBase58());
        } catch (err) {
            console.error("❌ Token creation failed:", err);
            alert("❌ Token creation failed. Check console for details.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column'
        }}>
            <h1>🚀 Solana Token Launchpad</h1>

            <input className='inputText' type='text' placeholder='Name' onChange={(e)=>setname(e.target.value)}/> <br />
            <input className='inputText' type='text' placeholder='Symbol' onChange={(e)=>setname(e.target.value)}/> <br />
            <input className='inputText' type='text' placeholder='Image URL' /> <br />
            <input className='inputText' type='number' placeholder='Initial Supply'  onChange={(e)=>setamount(parseInt(e.target.value))}/> <br />

            <button onClick={createToken} className='btn' disabled={loading}>
                {loading ? "Creating..." : "Create a token"}
            </button>

            {/* ✅ Explorer Links */}
            {mintAddress && (
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <p>✅ Token Created Successfully!</p>
                    <a
                        href={`https://explorer.solana.com/address/${mintAddress}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline"
                    >
                        View Mint on Solana Explorer
                    </a>
                </div>
            )}

            {txSig && (
                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    <a
                        href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline"
                    >
                        View Transaction on Solana Explorer
                    </a>
                </div>
            )}
        </div>
    );
}

"use client";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  getAssociatedTokenAddress,
  createMintToInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, Transaction } from "@solana/web3.js";
import { useState, useEffect } from "react";

const TOKEN_MINT = new PublicKey("64DXi4oiDVpS3EcaBXdL8XpNFf3Tngzp8XRaByMptkBe");

export default function MintTokens() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [mint_number,set_mint_number]=useState<number>(0);
  
  const MINT_AUTHORITY = publicKey;
  

  const fetch_total_mint=async()=>{ 
    if (!publicKey) return;
    try{
        const ata=await getAssociatedTokenAddress(
            TOKEN_MINT,
            publicKey,
            false,
            TOKEN_2022_PROGRAM_ID,
        )
        const accountinfo=await getAccount(connection,ata,"confirmed",TOKEN_2022_PROGRAM_ID);
        const amount_token=Number(accountinfo.amount);
        setBalance(amount_token);

    }
    catch(error){
        console.log("warning the error"+error)
        setBalance(0);
    }
  }

    useEffect(()=>{
        fetch_total_mint();
    },[publicKey]);


    async function handleMint(){
        try{
            if(!publicKey) return 

            const ata=await getAssociatedTokenAddress(
                TOKEN_MINT,
                publicKey,
                false,
                TOKEN_2022_PROGRAM_ID,
            )
            console.log(ata);
            console.log((await ata).toBase58);
            let transation=new Transaction();
            try{
                await getAccount(connection,ata,"confirmed",TOKEN_2022_PROGRAM_ID);
            }
            catch(error){
                console.log("creating the associated account for this toekn");
                const create_ata=createAssociatedTokenAccountInstruction(
                    publicKey,
                    ata,
                    publicKey,
                    TOKEN_MINT,
                    TOKEN_2022_PROGRAM_ID,
                )
                transation.add(create_ata);
            }
            const updating_mint=createMintToInstruction(
                TOKEN_MINT,
                ata,
                publicKey,
                mint_number,
                [],
                TOKEN_2022_PROGRAM_ID,
            )
            transation.add(updating_mint);
            transation.feePayer=publicKey;
            transation.recentBlockhash=(await connection.getLatestBlockhash()).blockhash
            const sign=await sendTransaction(transation,connection);
            const confirm=await connection.confirmTransaction(sign,"confirmed");
            console.log(confirm);
            alert("transaction"+sign);



        }
        catch(error:any){
            if (error.message?.includes("custom program error: 0x5")) {
                    alert("Error: You are not the mint authority for this token.");
                } else if (error.message?.includes("insufficient funds")) {
                    alert("Error: Insufficient SOL for transaction fees.");
                } else {
                    alert(`Mint failed: ${error.message || "Unknown error"}`);
                }


        }
    }
  

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
        <input type="number" value={mint_number} onChange={(e)=>{set_mint_number(parseInt(e.target.value))}}/>
      <button 
        onClick={handleMint} 
        disabled={!publicKey || loading}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          cursor: !publicKey || loading ? "not-allowed" : "pointer",
          opacity: !publicKey || loading ? 0.5 : 1
        }}
      >
        {loading ? "Minting..." : "Mint 1000 Tokens"}
      </button>
      
      {!publicKey && (
        <p style={{ marginTop: "10px", color: "#666" }}>
          Please connect your wallet first
        </p>
      )}
      
      {balance !== null && (
        <p style={{ marginTop: "20px" }}>
          💰 Token Balance: <b>{balance}</b>
        </p>
      )}
    </div>
  );
}

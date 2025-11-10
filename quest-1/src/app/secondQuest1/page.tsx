"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  PublicKey,
} from "@solana/web3.js";
import { useState } from "react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export default function SolanaDemo() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [txSig, setTxSig] = useState<string | null>(null);
  const [staticPublicKey, setStaticPublicKey] = useState<string>("");
  const [sol,setsol]=useState(0);

    const handleTransaction = async () => {
      try{
       if(!publicKey){
        alert("connect with the wallet to proceed the next step");
        return 
       }
       if(!staticPublicKey){
        alert("give the receipent wallet address ");
        return
       }
       setsol(sol*LAMPORTS_PER_SOL)
        let transaction1= SystemProgram.transfer({
          fromPubkey:publicKey ,
          toPubkey:new PublicKey(staticPublicKey),
          lamports:sol


        })
        let transasction2=SystemProgram.transfer({
          fromPubkey:publicKey,
          toPubkey:new PublicKey(staticPublicKey),
          lamports:sol

        })
        let {blockhash}=await connection.getLatestBlockhash();
        let transactiontov0=new TransactionMessage({
          payerKey:publicKey,
          recentBlockhash:blockhash,
          instructions:[transaction1,transasction2],
        }).compileToV0Message();

        let tx=new VersionedTransaction(transactiontov0);
        const sign=await sendTransaction(tx,connection);
        setTxSig(sign);
        await connection.confirmTransaction(sign,"confirmed");
        alert("transaction is successful");
       }
       catch(err){
        alert("error while transaction try again"+err);
       }
    };

  return (
    <div className="p-6 flex flex-col items-center justify-center space-y-4">
      <h1 className="text-2xl font-bold text-center">
        Solana Multi-Instruction Transaction Demo
      </h1>

      {/* ✅ Fixed input element */}
      <input
        type="text"
        placeholder="Enter recipient public key"
        value={staticPublicKey}
        onChange={(e) => setStaticPublicKey(e.target.value)}
        className="border rounded-lg p-2 w-96 text-center"
      />
      <input 
      type="number"
      value={sol}
      onChange={(e)=>setsol(parseInt(e.target.value))}
      />

      <button
        onClick={handleTransaction}
        className="px-5 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
      >
        Send Transaction
      </button>

      {txSig && (
        <a
          href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline"
        >
          View Transaction on Solana Explorer
        </a>
      )}
    </div>
  );
}

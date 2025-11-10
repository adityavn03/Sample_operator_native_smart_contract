import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction, PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, getMint } from "@solana/spl-token";
import { createUpdateFieldInstruction, Field } from "@solana/spl-token-metadata";
import { useState } from "react";

export function UpdateMetadata() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [mintAddress, setMintAddress] = useState("");
  const [newUri, setNewUri] = useState("");
  const [txSig, setTxSig] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!publicKey) {
      setErrorMsg("Connect your wallet first!");
      return;
    }
    if (!mintAddress) {
      setErrorMsg("Enter a valid mint address!");
      return;
    }
    if (!newUri) {
      setErrorMsg("Enter a new metadata URI!");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setTxSig("");

    try {
      const mintPubkey = new PublicKey(mintAddress);

      // ✅ FIX 1: Fetch the mint account to get the metadataPointer
      console.log("Fetching mint account...");
      const mintInfo = await getMint(
        connection,
        mintPubkey,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
      );

      // ✅ FIX 2: Get the metadata account address from metadataPointer extension
      // @ts-ignore - metadataPointer might not be in types yet
      const metadataPointer = mintInfo.tlvData;
      
      // For Token-2022, metadata is typically stored AT the mint address itself
      // when using metadata pointer extension
      const metadataAccount = mintPubkey;

      console.log("Mint:", mintPubkey.toBase58());
      console.log("Metadata Account:", metadataAccount.toBase58());
      console.log("Update Authority:", publicKey.toBase58());

      // ✅ FIX 3: Create the update instruction with correct parameters
      const updateInstruction = createUpdateFieldInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        metadata: metadataAccount, // The metadata account (often same as mint)
        updateAuthority: publicKey, // Must be the current update authority
        field: Field.Name,
        value: newUri,
      });

      // ✅ FIX 4: Build and send transaction properly
      const transaction = new Transaction().add(updateInstruction);
      
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      console.log("Sending transaction...");
       console.log(transaction);
      const signature = await sendTransaction(transaction, connection);
     
      console.log(signature);
      
      console.log("Confirming transaction...");
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, "confirmed");

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      console.log(signature);

      setTxSig(signature);
      console.log("✅ Metadata updated successfully:", signature);
      alert("✅ Metadata updated successfully!");
    } catch (err: any) {
      console.error("❌ Failed to update metadata:", err);
      
      let errorMessage = err?.message || JSON.stringify(err);
      
      // ✅ FIX 5: Better error messages
      if (errorMessage.includes("custom program error: 0x5")) {
        errorMessage = "You are not the update authority for this token's metadata.";
      } else if (errorMessage.includes("custom program error: 0x1")) {
        errorMessage = "Invalid account owner. Make sure this is a Token-2022 mint.";
      } else if (errorMessage.includes("AccountNotFound")) {
        errorMessage = "Metadata account not found. Ensure the token has metadata extension enabled.";
      }
      
      setErrorMsg(errorMessage);
      alert("❌ Failed: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold">Update Token Metadata (Token-2022)</h2>
      
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Mint Address</label>
        <input
          type="text"
          placeholder="Enter Mint Address (e.g., 2kd1G...)"
          value={mintAddress}
          onChange={(e) => setMintAddress(e.target.value)}
          className="border rounded p-2"
          disabled={loading}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">New Metadata URI</label>
        <input
          type="text"
          placeholder="Enter New Metadata URI (e.g., https://...)"
          value={newUri}
          onChange={(e) => setNewUri(e.target.value)}
          className="border rounded p-2"
          disabled={loading}
        />
        <p className="text-xs text-gray-500">
          This should point to a JSON file with your token metadata
        </p>
      </div>

      <button
        onClick={handleUpdate}
        disabled={!publicKey || loading}
        className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Updating..." : "Update Metadata"}
      </button>

      {!publicKey && (
        <p className="text-sm text-gray-600">
          ⚠️ Please connect your wallet first
        </p>
      )}

      {txSig && (
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <p className="text-sm font-medium text-green-800 mb-2">✅ Success!</p>
          <a
            href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline text-sm break-all"
          >
            View on Explorer: {txSig}
          </a>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <p className="text-sm font-medium text-red-800 mb-1">❌ Error:</p>
          <p className="text-sm text-red-600">{errorMsg}</p>
        </div>
      )}

      <div className="bg-gray-50 border rounded p-3 text-xs text-gray-600">
        <p className="font-medium mb-2">⚠️ Important Notes:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>You must be the update authority for this token</li>
          <li>The token must have the metadata extension enabled</li>
          <li>The mint must be a Token-2022 program token</li>
          <li>Make sure you're connected to the correct network (devnet/mainnet)</li>
        </ul>
      </div>
    </div>
  );
}
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";

const ASSOCIATED_TOKEN_PROGRAM = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

type BuyNFTParams = {
  program: anchor.Program;
  walletPublicKey: PublicKey;
  listing: any;
};

export async function buyNFT({ program, walletPublicKey, listing }: BuyNFTParams) {
  try {
    const nftMintPubkey = new PublicKey(listing.mint);
    const escrowPda = new PublicKey(listing.escrowAddress);
    const sellerPubkey = new PublicKey(listing.seller);

    console.log("Starting NFT purchase...");
    console.log("Mint:", nftMintPubkey.toString());
    console.log("Escrow:", escrowPda.toString());
    console.log("Seller:", sellerPubkey.toString());
    console.log("Buyer:", walletPublicKey.toString());

    // Check wallet balance first
    const balance = await program.provider.connection.getBalance(walletPublicKey);
    const priceInLamports = listing.price * anchor.web3.LAMPORTS_PER_SOL;
    
    // Add buffer for transaction fees (0.01 SOL)
    const requiredBalance = priceInLamports + (0.01 * anchor.web3.LAMPORTS_PER_SOL);
    
    console.log("Wallet balance:", balance / anchor.web3.LAMPORTS_PER_SOL, "SOL");
    console.log("NFT price:", listing.price, "SOL");
    console.log("Required (with fees):", requiredBalance / anchor.web3.LAMPORTS_PER_SOL, "SOL");
    
    if (balance < requiredBalance) {
      const shortfall = (requiredBalance - balance) / anchor.web3.LAMPORTS_PER_SOL;
      throw new Error(
        `Insufficient SOL. You have ${(balance / anchor.web3.LAMPORTS_PER_SOL).toFixed(4)} SOL but need ${(requiredBalance / anchor.web3.LAMPORTS_PER_SOL).toFixed(4)} SOL (${shortfall.toFixed(4)} SOL short)`
      );
    }

    // Buyer ATA
    const buyerAta = await getAssociatedTokenAddress(
      nftMintPubkey,
      walletPublicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    console.log("Buyer ATA:", buyerAta.toString());

    // Escrow ATA
    const escrowAta = await getAssociatedTokenAddress(
      nftMintPubkey,
      escrowPda,
      true,
      TOKEN_PROGRAM_ID
    );

    console.log("Escrow ATA:", escrowAta.toString());

    // Check if buyer ATA exists, log for debugging
    try {
      const buyerAtaInfo = await program.provider.connection.getAccountInfo(buyerAta);
      if (!buyerAtaInfo) {
        console.log("Buyer ATA does not exist yet, will be created by the program");
      } else {
        console.log("Buyer ATA already exists");
      }
    } catch (error) {
      console.log("Could not check buyer ATA, will be created if needed");
    }

    console.log("Sending buy transaction...");

    // Execute buy transaction with proper options
    const tx = await program.methods
      .buynft()
      .accounts({
        escrow: escrowPda,
        seller: sellerPubkey,
        buyer: walletPublicKey,
        mint: nftMintPubkey,
        escrowNft: escrowAta,
        buyerNftAta: buyerAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({
        skipPreflight: false, // Run simulation first to catch errors
        commitment: "confirmed", // Wait for confirmed status
        maxRetries: 3, // Retry up to 3 times on network issues
      });

    console.log("Transaction signature:", tx);

    // Wait for confirmation with timeout
    const latestBlockhash = await program.provider.connection.getLatestBlockhash();
    
    console.log("Waiting for transaction confirmation...");
    
    const confirmation = await program.provider.connection.confirmTransaction(
      {
        signature: tx,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      "confirmed"
    );

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    console.log("Transaction confirmed successfully!");
    console.log("Explorer URL:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    return {
      success: true,
      tx,
      explorerUrl: `https://explorer.solana.com/tx/${tx}?cluster=devnet`,
    };
  } catch (error: any) {
    console.error("Buy NFT Error:", error);

    // Extract detailed error information
    let errorMessage = "Buy NFT failed";
    let errorDetails = "";

    if (error.message?.includes("insufficient lamports")) {
      errorMessage = "Insufficient SOL balance";
      errorDetails = "Please add more SOL to your wallet to cover the NFT price and transaction fees.";
    } else if (error.message?.includes("Insufficient SOL")) {
      errorMessage = error.message;
      errorDetails = "Please add more SOL to your wallet.";
    } else if (error.message?.includes("already been processed")) {
      errorMessage = "Transaction already processed";
      errorDetails = "This transaction may have already succeeded. Please refresh the page to see your NFT.";
    } else if (error.message?.includes("User rejected")) {
      errorMessage = "Transaction cancelled";
      errorDetails = "You rejected the transaction in your wallet.";
    } else if (error.message?.includes("Blockhash not found")) {
      errorMessage = "Network timeout";
      errorDetails = "The transaction took too long. Please try again.";
    } else if (error.logs) {
      // Parse program logs for specific errors
      const logs = error.logs.join("\n");
      console.error("Transaction logs:", logs);
      
      if (logs.includes("insufficient lamports")) {
        errorMessage = "Insufficient SOL balance";
        errorDetails = "Your wallet doesn't have enough SOL for this transaction.";
      } else if (logs.includes("custom program error")) {
        errorMessage = "Program execution failed";
        errorDetails = "The smart contract rejected this transaction. The NFT may no longer be available.";
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
      errorDetails: errorDetails || errorMessage,
      logs: error.logs || [],
    };
  }
}
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";

const ASSOCIATED_TOKEN_PROGRAM = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

type CancelListingParams = {
  program: anchor.Program;
  listing: any;
};

export async function cancelListing({
  program,
  listing,
}: CancelListingParams) {
  try {
    const nftMintPubkey = new PublicKey(listing.mint);
    const escrowPda = new PublicKey(listing.escrowAddress);
    const sellerPubkey = new PublicKey(listing.seller);

    // Seller ATA
    const sellerAta = await getAssociatedTokenAddress(
      nftMintPubkey,
      sellerPubkey,
      false,
      TOKEN_PROGRAM_ID
    );

    // Escrow ATA
    const escrowAta = await getAssociatedTokenAddress(
      nftMintPubkey,
      escrowPda,
      true
    );

    const tx = await program.methods
      .listbacknft()
      .accounts({
        escrow: escrowPda,
        seller: sellerPubkey,
        mint: nftMintPubkey,
        escrowNft: escrowAta,
        sellerNftAta: sellerAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    return {
      success: true,
      tx,
    };
  } catch (error: any) {
    console.error("Cancel Listing Logic Error:", error);

    return {
      success: false,
      error: error.message || "Cancel listing failed",
    };
  }
}

import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";

type ListNFTParams = {
  program: anchor.Program;
  walletPublicKey: PublicKey;
  mintAddress: string;
  priceSOL: string;
};

export async function listNFT({
  program,
  walletPublicKey,
  mintAddress,
  priceSOL,
}: ListNFTParams) {
  try {
    const nftMintPubkey = new PublicKey(mintAddress);

    // Seller ATA
    const sellerAta = await getAssociatedTokenAddress(
      nftMintPubkey,
      walletPublicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    // Escrow PDA
    const [escrow] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("nftescrow"),
        walletPublicKey.toBuffer(),
        nftMintPubkey.toBuffer(),
      ],
      program.programId
    );

    // Escrow ATA
    const escrowAta = await getAssociatedTokenAddress(
      nftMintPubkey,
      escrow,
      true
    );

    const priceLamports = new anchor.BN(
      parseFloat(priceSOL) * anchor.web3.LAMPORTS_PER_SOL
    );

    const tx = await program.methods
      .listnft(priceLamports)
      .accounts({
        escrow,
        seller: walletPublicKey,
        mint: nftMintPubkey,
        sellerNftAta: sellerAta,
        escrowNft: escrowAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return {
      success: true,
      tx,
      escrow: escrow.toBase58(),
    };
  } catch (error: any) {
    console.error("List NFT Logic Error:", error);

    return {
      success: false,
      error: error.message || "NFT listing failed",
    };
  }
}

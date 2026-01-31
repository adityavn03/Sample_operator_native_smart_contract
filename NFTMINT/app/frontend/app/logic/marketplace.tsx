import * as anchor from "@coral-xyz/anchor";

type LoadMarketplaceParams = {
  program: anchor.Program;
  heliusApiKey: string;
};

export async function loadMarketplaceListings({
  program,
  heliusApiKey,
}: LoadMarketplaceParams) {
  try {
    // Fetch all escrow accounts
    const escrows = await (program.account as any).nftEscrow.all();

    const listings = await Promise.all(
      escrows.map(async (escrow: any) => {
        try {
          const mintAddress = escrow.account.mint.toString();

          // Fetch metadata from Helius DAS
          const response = await fetch(
            `https://devnet.helius-rpc.com/?api-key=${heliusApiKey}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                jsonrpc: "2.0",
                id: "nft-fetch",
                method: "getAsset",
                params: {
                  id: mintAddress,
                },
              }),
            }
          );

          const data = await response.json();

          let metadata = null;

          if (data.result) {
            const nftData = data.result;

            // Fallback metadata fetch
            if (
              !nftData.content?.links?.image &&
              nftData.content?.json_uri
            ) {
              const uri = nftData.content.json_uri.replace(
                "ipfs://",
                "https://gateway.pinata.cloud/ipfs/"
              );

              const metaRes = await fetch(uri);
              metadata = await metaRes.json();
            }

            return {
              escrowAddress: escrow.publicKey.toString(),
              mint: mintAddress,
              seller: escrow.account.seller.toString(),
              price:
                escrow.account.price.toNumber() /
                anchor.web3.LAMPORTS_PER_SOL,
              isSold: escrow.account.isSold,
              name:
                nftData.content?.metadata?.name ||
                metadata?.name ||
                "Unnamed NFT",
              image:
                nftData.content?.links?.image ||
                metadata?.image ||
                null,
              metadata: nftData.content?.metadata || metadata,
            };
          }

          return null;
        } catch (err) {
          console.error("Listing parse error:", err);
          return null;
        }
      })
    );

    return {
      success: true,
      listings: listings.filter((l) => l !== null),
    };
  } catch (error: any) {
    console.error("Marketplace Logic Error:", error);

    return {
      success: false,
      error: error.message || "Marketplace fetch failed",
    };
  }
}

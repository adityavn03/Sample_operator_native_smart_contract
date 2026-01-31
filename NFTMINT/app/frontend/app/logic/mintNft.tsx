import { clusterApiUrl } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createNft, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { percentAmount } from "@metaplex-foundation/umi";
import { generateSigner } from "@metaplex-foundation/umi";

type MintNFTParams = {
  wallet: any;
  name: string;
  description: string;
  imageFile: File;
  attributes: any[];
  pinataJwt: string;
};

/* ---------------- PINATA HELPERS ---------------- */

const uploadToPinata = async (file: File, jwt: string) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: formData,
    }
  );

  const data = await res.json();
  return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
};

const uploadJsonToPinata = async (json: any, jwt: string) => {
  const res = await fetch(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        pinataContent: json,
      }),
    }
  );

  const data = await res.json();
  return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
};

/* ---------------- MAIN MINT FUNCTION ---------------- */

export async function mintNFT({
  wallet,
  name,
  description,
  imageFile,
  attributes,
  pinataJwt,
}: MintNFTParams) {
  try {
    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    // Upload image
    const imageUri = await uploadToPinata(imageFile, pinataJwt);

    // Create metadata
    const metadata = {
      name,
      symbol: "NNFT",
      description,
      image: imageUri,
      attributes: attributes.filter(
        (a) => a.trait_type && a.value
      ),
    };

    // Upload metadata
    const metadataUri = await uploadJsonToPinata(metadata, pinataJwt);

    // Setup UMI
    const umi = createUmi(clusterApiUrl("devnet"))
      .use(walletAdapterIdentity(wallet))
      .use(mplTokenMetadata());

    const mint = generateSigner(umi);

    // Mint NFT
    await createNft(umi, {
      mint,
      name,
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(5),
      tokenOwner: umi.identity.publicKey,
      isMutable: false,
    }).sendAndConfirm(umi);

    return {
      success: true,
      mintAddress: mint.publicKey.toString(),
      imageUri,
      metadataUri,
    };
  } catch (error: any) {
    console.error("Mint NFT Logic Error:", error);

    return {
      success: false,
      error: error.message || "Mint NFT failed",
    };
  }
}

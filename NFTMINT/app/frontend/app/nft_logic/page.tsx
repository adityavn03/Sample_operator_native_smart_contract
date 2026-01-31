"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { clusterApiUrl, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createNft, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { percentAmount } from "@metaplex-foundation/umi";
import { generateSigner } from "@metaplex-foundation/umi";

import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { buyNFT } from "../logic/buyNft";
import { cancelListing } from "../logic/cancelListing";
import { listNFT } from "../logic/listNft";
import { loadMarketplaceListings } from "../logic/marketplace";
import { mintNFT } from "../logic/mintNft";
import {
  fetchMetadataFromUri,
  getNFTImage,
  getNFTName,
} from "../utils/metadata";

import {
  uploadFileToPinata,
  uploadJsonToPinata,
} from "../utils/pinata";




import idl from "../idl/idlnft/nft_escrow.json"

const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJjODVhNTcyOC1iYThiLTQ3MmMtYThlZi1lZDcyMTAyM2QyZDIiLCJlbWFpbCI6ImFkaXR5YS52bjA1QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiI2YTU0YTIxYjI1OWUwMzFkN2IwZCIsInNjb3BlZEtleVNlY3JldCI6ImVjZjc1NGEyZTc0NWQ0MTk0OWIzZmNiNWY3OTJmOTlkZGQ4YjQxYzM4N2I0MjI5OTgyNDU1YzQ0MzkzZjg0YTUiLCJleHAiOjE3OTc5MjM2Mzl9.DHmndCayocaYZ6gQ2xnxkX-eKkvKpwoPT5abFuCMOxE";

export default function NFTMarketplace() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  // Tab state
  const [activeTab, setActiveTab] = useState<"mint" | "collection" | "marketplace">("mint");

  // NFT Metadata
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [price, setPrice] = useState("1.0");
  const [attributes, setAttributes] = useState<
    { trait_type: string; value: string }[]
  >([{ trait_type: "", value: "" }]);

  // State
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [mintedNFT, setMintedNFT] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // NFT Collection state
  const [nfts, setNfts] = useState<any[]>([]);
  const [loadingNfts, setLoadingNfts] = useState<boolean>(false);
  const [nftMetadata, setNftMetadata] = useState<{ [key: string]: any }>({});

  // Marketplace state
  const [listedNFTs, setListedNFTs] = useState<any[]>([]);
  const [loadingMarketplace, setLoadingMarketplace] = useState(false);

  // Listing state for collection NFTs
  const [listingNFT, setListingNFT] = useState<string | null>(null);
  const [listPrice, setListPrice] = useState<string>("1.0");

  // Canceling state
  const [cancelingListing, setCancelingListing] = useState<string | null>(null);

  // Smart contract setup
  const provider = new anchor.AnchorProvider(connection, wallet as any, {
    commitment: "confirmed",
  });
  const program = new Program(idl as anchor.Idl, provider);
  const program_id = new PublicKey(idl.address);

  /* =====================================================
     FETCH METADATA FROM URI
  ===================================================== */
  const fetchMetadataFromUri = async (uri: string) => {
    try {
      let fetchUrl = uri;
      if (uri.startsWith('ipfs://')) {
        fetchUrl = uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
      }
      
      const response = await fetch(fetchUrl);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error fetching metadata from URI:', error);
      return null;
    }
  };

  /* =====================================================
     LOAD MARKETPLACE LISTINGS
  ===================================================== */
  const loadMarketplace = async () => {
  try {
    setLoadingMarketplace(true);

    const result = await loadMarketplaceListings({
      program,
      heliusApiKey: "a2d0cfd1-c261-4063-8549-0df94bbf1a35",
    });

    if (!result.success) {
      throw new Error(result.error);
    }
    if (!result.listings) {
      throw new Error(result.error);
    }

    setListedNFTs(result.listings);

  } catch (err: any) {
    console.error("Marketplace Handler Error:", err);
  } finally {
    setLoadingMarketplace(false);
  }
};


  // Load marketplace when tab is opened
  useEffect(() => {
    if (activeTab === "marketplace") {
      loadMarketplace();
    }
  }, [activeTab]);

  // Load NFTs when wallet connects
  useEffect(() => {
    async function loadNFTs() {
      if (!publicKey) {
        setNfts([]);
        return;
      }

      setLoadingNfts(true);
      try {
        const response = await fetch(
          `https://devnet.helius-rpc.com/?api-key=a2d0cfd1-c261-4063-8549-0df94bbf1a35`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: "nft-fetch",
              method: "getAssetsByOwner",
              params: {
                ownerAddress: publicKey.toString(),
                page: 1,
                limit: 1000,
              },
            }),
          }
        );

        const data = await response.json();

        if (data.result && data.result.items) {
          const nftItems = data.result.items.filter(
            (item: any) =>
              item.interface === "V1_NFT" ||
              item.interface === "ProgrammableNFT" ||
              !item.interface
          );
          setNfts(nftItems);
          
          // Fetch metadata for NFTs without images
          for (const nft of nftItems) {
            const hasImage = nft.content?.links?.image || nft.content?.files?.[0]?.uri;
            if (!hasImage && nft.content?.json_uri) {
              const metadata = await fetchMetadataFromUri(nft.content.json_uri);
              if (metadata) {
                setNftMetadata(prev => ({
                  ...prev,
                  [nft.id]: metadata
                }));
              }
            }
          }
        } else {
          setNfts([]);
        }
      } catch (error) {
        console.error("Failed to load NFTs:", error);
        setNfts([]);
      } finally {
        setLoadingNfts(false);
      }
    }

    loadNFTs();
  }, [publicKey]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    target.style.display = "none";
    if (target.parentElement) {
      target.parentElement.innerHTML =
        '<div class="flex items-center justify-center h-full text-gray-400 text-4xl">🖼️</div>';
    }
  };

  /* =====================================================
     ATTRIBUTE HANDLERS
  ===================================================== */

  const updateAttribute = (
    index: number,
    field: "trait_type" | "value",
    value: string
  ) => {
    const updated = [...attributes];
    updated[index][field] = value;
    setAttributes(updated);
  };

  const addAttribute = () => {
    setAttributes([...attributes, { trait_type: "", value: "" }]);
  };

  /* =====================================================
     PINATA UPLOAD FUNCTIONS
  ===================================================== */

  

  

  /* =====================================================
     MINT NFT WITH METADATA
  ===================================================== */

  const mintNFTWithMetadata = async () => {
    if (!wallet.publicKey || !wallet.signMessage) {
      throw new Error("Wallet not connected");
    }

    if (!imageFile) {
      throw new Error("Please select an image");
    }

    if (!name) {
      throw new Error("Please enter an NFT name");
    }

    setStatus("📤 Uploading image to IPFS...");
    const imageUri = await uploadFileToPinata(imageFile, PINATA_JWT);

    console.log("Image uploaded:", imageUri);

    setStatus("📝 Uploading metadata to IPFS...");
    const metadata = {
      name,
      symbol: "NNFT",
      description,
      image: imageUri,
      attributes: attributes.filter((a) => a.trait_type && a.value),
    };

    const metadataUri = await uploadJsonToPinata(metadata, PINATA_JWT);

    console.log("Metadata uploaded:", metadataUri);

    setStatus("🎨 Creating NFT with Metaplex...");
    const umi = createUmi(clusterApiUrl("devnet"))
      .use(walletAdapterIdentity(wallet))
      .use(mplTokenMetadata());

    const mint = generateSigner(umi);

    await createNft(umi, {
      mint,
      name,
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(5),
      tokenOwner: umi.identity.publicKey,
      isMutable: false,
    }).sendAndConfirm(umi);

    console.log("NFT minted:", mint.publicKey.toString());

    return {
      mintAddress: mint.publicKey.toString(),
      imageUri,
      metadataUri,
    };
  };

 

  /* =====================================================
     MINT AND LIST
  ===================================================== */

  const handleMintAndList = async () => {
  try {
    setLoading(true);
    setError(null);
    setStatus("🚀 Minting NFT...");

    const mintResult = await mintNFT({
      wallet,
      name,
      description,
      imageFile: imageFile!,
      attributes,
      pinataJwt: PINATA_JWT,
    });

    if (!mintResult.success) {
      throw new Error(mintResult.error);
    }
    

    setStatus("🏪 Listing NFT...");

    const listResult = await listNFT({
      program,
      walletPublicKey: wallet.publicKey!,
      mintAddress: mintResult.mintAddress!,
      priceSOL: price,
    });

    if (!listResult.success) {
      throw new Error(listResult.error);
    }

    setMintedNFT({
      mintAddress: mintResult.mintAddress,
      imageUri: mintResult.imageUri,
      metadataUri: mintResult.metadataUri,
      escrow: listResult.escrow,
    });

    setStatus("✅ NFT minted and listed successfully!");

    loadMarketplace();

  } catch (err: any) {
    console.error("Mint Handler Error:", err);
    setError(err.message || "Mint failed");
    setStatus("");
  } finally {
    setLoading(false);
  }
};


  

  /* =====================================================
     BUY NFT FUNCTION
  ===================================================== */

  const handleBuyNFT = async (listing: any) => {
  try {
    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    setLoading(true);
    setError(null);
    setStatus("💰 Processing NFT purchase...");

    const result = await buyNFT({
      program,
      walletPublicKey: wallet.publicKey,
      listing,
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    console.log("NFT Purchased TX:", result.tx);

    setStatus("✅ NFT purchased successfully!");

    // Refresh marketplace
    setTimeout(() => {
      loadMarketplace();
    }, 2000);

  } catch (err: any) {
    console.error("Buy Handler Error:", err);
    setError(err.message || "Purchase failed");
    setStatus("");
  } finally {
    setLoading(false);
  }
};
  

const handleListNFT = async (mintAddress: string, priceSOL: string) => {
  try {
    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    setLoading(true);
    setError(null);
    setStatus("🏪 Listing NFT on marketplace...");

    const result = await listNFT({
      program,
      walletPublicKey: wallet.publicKey,
      mintAddress,
      priceSOL,
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    console.log("NFT Listed TX:", result.tx);

    setStatus("✅ NFT listed successfully!");
    setListingNFT(null);

    // Refresh marketplace
    setTimeout(() => {
      loadMarketplace();
    }, 2000);

  } catch (err: any) {
    console.error("List Handler Error:", err);
    setError(err.message || "Listing failed");
    setStatus("");
  } finally {
    setLoading(false);
  }
};


  /* =====================================================
     CANCEL LISTING FUNCTION (NEW)
  ===================================================== */

  const handleCancelListing = async (listing: any) => {
  try {
    setCancelingListing(listing.escrowAddress);
    setError(null);
    setStatus("🔄 Canceling listing...");

    const result = await cancelListing({
      program,
      listing,
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    console.log("Listing canceled TX:", result.tx);

    setStatus("✅ Listing canceled! NFT returned to your wallet.");

    // Refresh marketplace
    setTimeout(() => {
      loadMarketplace();
    }, 2000);

  } catch (err: any) {
    console.error("Cancel Handler Error:", err);
    setError(err.message || "Cancel listing failed");
    setStatus("");
  } finally {
    setCancelingListing(null);
  }
};


  /* =====================================================
     GET NFT DATA
  ===================================================== */
{nfts.map((nft: any) => {

  // Metadata fallback (IPFS JSON)
  const fallbackMetadata = nftMetadata[nft.id];

  // Final resolved values
  const imageUrl = getNFTImage(nft, fallbackMetadata);
  const nftName = getNFTName(nft, fallbackMetadata);

  const isListing = listingNFT === nft.id;

  return (
    <div
      key={nft.id}
      className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-xl hover:border-black transition-all duration-300 transform hover:-translate-y-1"
    >

      {/* NFT IMAGE */}
      <div className="aspect-square bg-gray-100 relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={nftName}
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-gray-500">Loading...</p>
            </div>
          </div>
        )}
      </div>

      {/* NFT INFO */}
      <div className="p-3">
        <p className="font-semibold text-gray-900 truncate mb-1">
          {nftName}
        </p>

        {nft.content?.metadata?.symbol && (
          <p className="text-sm text-gray-500 truncate mb-2">
            {nft.content.metadata.symbol}
          </p>
        )}

        {/* LISTING UI */}
        {isListing ? (
          <div className="space-y-2 mt-2">

            <input
              type="number"
              step="0.1"
              value={listPrice}
              onChange={(e) => setListPrice(e.target.value)}
              placeholder="Price in SOL"
              className="w-full border-2 border-black p-2 rounded text-sm"
            />

            <div className="flex gap-2">
              <button
                onClick={() => handleListNFT(nft.id, listPrice)}
                className="flex-1 bg-black text-white py-2 rounded text-sm"
              >
                Confirm
              </button>

              <button
                onClick={() => setListingNFT(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded text-sm"
              >
                Cancel
              </button>
            </div>

          </div>
        ) : (
          <button
            onClick={() => {
              setListingNFT(nft.id);
              setListPrice("1.0");
            }}
            className="w-full bg-black text-white py-2 rounded text-sm mt-2"
          >
            List for Sale
          </button>
        )}

      </div>
    </div>
  );
})}



  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-black mb-2">
            NFT Marketplace
          </h1>
          <p className="text-gray-600 text-lg">
            Create, collect, and trade unique digital assets
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-md border-2 border-black">
            <button
              onClick={() => setActiveTab("mint")}
              className={`px-6 py-3 rounded-md font-semibold transition-all ${
                activeTab === "mint"
                  ? "bg-black text-white"
                  : "text-black hover:bg-gray-100"
              }`}
            >
              Mint & List
            </button>
            <button
              onClick={() => setActiveTab("marketplace")}
              className={`px-6 py-3 rounded-md font-semibold transition-all ${
                activeTab === "marketplace"
                  ? "bg-black text-white"
                  : "text-black hover:bg-gray-100"
              }`}
            >
              Marketplace ({listedNFTs.length})
            </button>
            <button
              onClick={() => setActiveTab("collection")}
              className={`px-6 py-3 rounded-md font-semibold transition-all ${
                activeTab === "collection"
                  ? "bg-black text-white"
                  : "text-black hover:bg-gray-100"
              }`}
            >
              My Collection ({nfts.length})
            </button>
          </div>
        </div>

        {/* Mint & List Tab */}
        {activeTab === "mint" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mint Form */}
            <div className="border-2 border-black rounded-lg p-6 space-y-4 bg-white shadow-lg">
              <h2 className="text-2xl font-bold text-black">Create NFT</h2>

              <input
                className="w-full border-2 border-black p-3 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                placeholder="NFT Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <textarea
                className="w-full border-2 border-black p-3 rounded h-24 focus:outline-none focus:ring-2 focus:ring-gray-400"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="border-2 border-black rounded p-3">
                <label className="text-sm font-semibold text-black mb-2 block">
                  Upload Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full"
                />
              </div>

              <input
                type="number"
                step="0.1"
                className="w-full border-2 border-black p-3 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                placeholder="Price in SOL"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />

              <div>
                <h3 className="font-semibold mb-3 text-black">Attributes</h3>
                {attributes.map((attr, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      className="border-2 border-black p-2 rounded w-1/2 focus:outline-none focus:ring-2 focus:ring-gray-400"
                      placeholder="Trait Type"
                      value={attr.trait_type}
                      onChange={(e) =>
                        updateAttribute(i, "trait_type", e.target.value)
                      }
                    />
                    <input
                      className="border-2 border-black p-2 rounded w-1/2 focus:outline-none focus:ring-2 focus:ring-gray-400"
                      placeholder="Value"
                      value={attr.value}
                      onChange={(e) =>
                        updateAttribute(i, "value", e.target.value)
                      }
                    />
                  </div>
                ))}
                <button
                  onClick={addAttribute}
                  className="text-sm font-medium text-black underline hover:no-underline"
                >
                  + Add Attribute
                </button>
              </div>

              <button
                onClick={handleMintAndList}
                disabled={loading || !wallet.connected}
                className="w-full bg-black text-white p-3 rounded font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Processing..." : "Mint & List NFT"}
              </button>
            </div>

            {/* Status Column */}
            <div className="space-y-4">
              {(loading || status) && (
                <div className="border-2 border-black rounded-lg p-6 bg-white shadow-lg">
                  <h3 className="font-bold text-black mb-3">Status</h3>
                  {loading && (
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-5 h-5 border-3 border-black border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-black font-medium">
                        Processing...
                      </span>
                    </div>
                  )}
                  {status && <p className="text-gray-700 text-sm">{status}</p>}
                </div>
              )}

              {error && (
                <div className="border-2 border-red-500 bg-red-50 rounded-lg p-4">
                  <p className="font-semibold text-red-700">Error:</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {mintedNFT && (
                <div className="border-2 border-black rounded-lg p-6 bg-white shadow-lg">
                  <h3 className="font-bold text-black mb-3">NFT Details ✅</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-semibold text-black">Mint Address:</p>
                      <p className="text-gray-700 break-all font-mono text-xs">
                        {mintedNFT.mintAddress}
                      </p>
                    </div>
                    {mintedNFT.escrow && (
                      <div>
                        <p className="font-semibold text-black">
                          Escrow Address:
                        </p>
                        <p className="text-gray-700 break-all font-mono text-xs">
                          {mintedNFT.escrow}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-black">Price:</p>
                      <p className="text-gray-700">{price} SOL</p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={mintedNFT.imageUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-black underline hover:no-underline text-xs"
                      >
                        View Image
                      </a>
                      <a
                        href={mintedNFT.metadataUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-black underline hover:no-underline text-xs"
                      >
                        View Metadata
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {!wallet.connected && (
                <div className="border-2 border-yellow-500 bg-yellow-50 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm font-medium">
                    ⚠️ Please connect your wallet to continue
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Marketplace Tab */}
        {activeTab === "marketplace" && (
          <div className="bg-white rounded-lg p-8 shadow-lg border-2 border-black">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">🏪</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                NFT Marketplace
              </h2>
              <p className="text-gray-600 mb-4">
                {loadingMarketplace
                  ? "Loading listings..."
                  : `${listedNFTs.length} NFT${listedNFTs.length !== 1 ? "s" : ""} listed`}
              </p>
              <button
                onClick={loadMarketplace}
                disabled={loadingMarketplace}
                className="bg-black text-white px-6 py-2 rounded font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                🔄 Refresh Marketplace
              </button>
            </div>

            {loadingMarketplace ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : listedNFTs.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-lg mb-2">
                  No NFTs listed yet
                </p>
                <p className="text-gray-400 text-sm">
                  Be the first to list an NFT!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {listedNFTs.map((listing: any) => (
                  <div
                    key={listing.escrowAddress}
                    className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-xl hover:border-black transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className="aspect-square bg-gray-100 relative">
                      {listing.image ? (
                        <img
                          src={listing.image}
                          alt={listing.name}
                          className="w-full h-full object-cover"
                          onError={handleImageError}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-4xl">
                          🖼️
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-black text-white px-3 py-1 rounded-full text-sm font-bold">
                        {listing.price} SOL
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-gray-900 truncate mb-1">
                        {listing.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate mb-2">
                        Seller: {listing.seller.slice(0, 4)}...{listing.seller.slice(-4)}
                      </p>
                      {publicKey?.toString() !== listing.seller ? (
                        <button
                          onClick={() => handleBuyNFT(listing)}
                          disabled={loading || !wallet.connected}
                          className="w-full bg-black text-white py-2 rounded font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors text-sm"
                        >
                          Buy Now
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCancelListing(listing)}
                          disabled={cancelingListing === listing.escrowAddress || !wallet.connected}
                          className="w-full bg-red-600 text-white py-2 rounded font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors text-sm"
                        >
                          {cancelingListing === listing.escrowAddress ? "Canceling..." : "Cancel Listing"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Collection Tab */}
        {activeTab === "collection" && (
          <div className="bg-white rounded-lg p-8 shadow-lg border-2 border-black">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">🖼️</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Your NFT Collection
              </h2>
              <p className="text-gray-600 mb-4">
                {loadingNfts
                  ? "Loading your NFTs..."
                  : `${nfts.length} NFT${nfts.length !== 1 ? "s" : ""} found`}
              </p>
              <button
                onClick={() => window.location.reload()}
                disabled={loadingNfts}
                className="bg-black text-white px-6 py-2 rounded font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                🔄 Refresh Collection
              </button>
            </div>

            {!publicKey ? (
              <div className="text-center py-12 bg-red-50 rounded-lg border-2 border-red-200">
                <p className="text-red-700 text-lg">
                  ⚠️ Please connect your wallet to view NFTs
                </p>
              </div>
            ) : loadingNfts ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : nfts.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500 text-lg mb-2">
                  No NFTs found in this wallet
                </p>
                <p className="text-gray-400 text-sm">
                  Your NFTs in wallet will appear here (listed NFTs are in Marketplace)
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {nfts.map((nft: any) => {
                  const imageUrl = getNFTImage(nft);
                  const nftName = getNFTName(nft);
                  const isListing = listingNFT === nft.id;
                  
                  return (
                    <div
                      key={nft.id}
                      className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-xl hover:border-black transition-all duration-300 transform hover:-translate-y-1"
                    >
                      <div className="aspect-square bg-gray-100 relative">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={nftName}
                            className="w-full h-full object-cover"
                            onError={handleImageError}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <div className="w-8 h-8 border-4 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                              <p className="text-xs text-gray-500">Loading...</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-semibold text-gray-900 truncate mb-1">
                          {nftName}
                        </p>
                        {nft.content?.metadata?.symbol && (
                          <p className="text-sm text-gray-500 truncate mb-2">
                            {nft.content.metadata.symbol}
                          </p>
                        )}
                        
                        {isListing ? (
                          <div className="space-y-2 mt-2">
                            <input
                              type="number"
                              step="0.1"
                              value={listPrice}
                              onChange={(e) => setListPrice(e.target.value)}
                              placeholder="Price in SOL"
                              className="w-full border-2 border-black p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleListNFT(nft.id, listPrice)}
                                disabled={loading || !listPrice}
                                className="flex-1 bg-black text-white py-2 rounded font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors text-sm"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setListingNFT(null)}
                                disabled={loading}
                                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded font-semibold hover:bg-gray-300 transition-colors text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setListingNFT(nft.id);
                              setListPrice("1.0");
                            }}
                            className="w-full bg-black text-white py-2 rounded font-semibold hover:bg-gray-800 transition-colors text-sm mt-2"
                          >
                            List for Sale
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
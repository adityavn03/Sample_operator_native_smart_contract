/* ================================
   IPFS NORMALIZER
================================ */

export const normalizeIpfsUrl = (uri: string) => {
  if (!uri) return null;

  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
  }

  return uri;
};

/* ================================
   FETCH METADATA JSON
================================ */

export const fetchMetadataFromUri = async (uri: string) => {
  try {
    const fetchUrl = normalizeIpfsUrl(uri);

    if (!fetchUrl) return null;

    const response = await fetch(fetchUrl);

    if (!response.ok) {
      throw new Error("Metadata fetch failed");
    }

    return await response.json();
  } catch (error) {
    console.error("Metadata Fetch Error:", error);
    return null;
  }
};

/* ================================
   EXTRACT IMAGE (DAS + FALLBACK)
================================ */

export const getNFTImage = (nft: any, fallbackMetadata?: any) => {
  return (
    nft?.content?.links?.image ||
    nft?.content?.files?.[0]?.uri ||
    fallbackMetadata?.image ||
    null
  );
};

/* ================================
   EXTRACT NAME
================================ */

export const getNFTName = (nft: any, fallbackMetadata?: any) => {
  return (
    nft?.content?.metadata?.name ||
    fallbackMetadata?.name ||
    "Unnamed NFT"
  );
};

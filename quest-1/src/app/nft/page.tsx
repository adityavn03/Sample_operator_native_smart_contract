// ============================================
// SOLANA NFT MINTING - COMPLETE GUIDE
// ============================================

// INSTALLATION REQUIREMENTS:
// npm install @solana/web3.js @metaplex-foundation/js @metaplex-foundation/mpl-token-metadata
// npm install @solana/spl-token

import { 
  Connection, 
  clusterApiUrl, 
  Keypair, 
  PublicKey,
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { 
  Metaplex, 
  keypairIdentity, 
  bundlrStorage,
  toMetaplexFile
} from '@metaplex-foundation/js';
import { 
  reateCreateMetadataAccountV3Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID
} from '@metaplex-foundation/mpl-token-metadata';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import * as fs from 'fs';

export default function Nft(){

// ============================================
// METHOD 1: Using Metaplex SDK (Recommended)
// ============================================

async function mintNFTWithMetaplex() {
  console.log('🚀 Starting NFT Mint with Metaplex...\n');

  // 1. Setup Connection
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  
  // 2. Load or Create Wallet
  // For production, load from secure storage
  // For testing, you can generate a new keypair
  const wallet = Keypair.generate();
  
  // Request airdrop for testing (devnet only)
  console.log('💰 Requesting airdrop...');
  const airdropSignature = await connection.requestAirdrop(
    wallet.publicKey,
    2000000000 // 2 SOL
  );
  await connection.confirmTransaction(airdropSignature);
  console.log('✅ Airdrop confirmed\n');

  // 3. Initialize Metaplex
  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(wallet))
    .use(bundlrStorage());

  // 4. Upload Image (example with local file or Buffer)
  console.log('📤 Uploading image...');
  
  // Example: Create a simple image buffer (in practice, read from file)
  const imageBuffer = Buffer.from('your-image-data-here');
  const imageFile = toMetaplexFile(imageBuffer, 'nft-image.png');
  
  const imageUri = await metaplex.storage().upload(imageFile);
  console.log('✅ Image uploaded:', imageUri, '\n');

  // 5. Upload Metadata JSON
  console.log('📤 Uploading metadata...');
  const { uri: metadataUri } = await metaplex.nfts().uploadMetadata({
    name: "My First Solana NFT",
    description: "This is my first NFT on Solana!",
    image: imageUri,
    attributes: [
      { trait_type: "Background", value: "Blue" },
      { trait_type: "Rarity", value: "Common" }
    ],
    properties: {
      files: [
        {
          type: "image/png",
          uri: imageUri,
        },
      ],
      category: "image",
    },
  });
  console.log('✅ Metadata uploaded:', metadataUri, '\n');

  // 6. Mint NFT
  console.log('🎨 Minting NFT...');
  const { nft } = await metaplex.nfts().create({
    uri: metadataUri,
    name: "My First Solana NFT",
    sellerFeeBasisPoints: 500, // 5% royalty
    symbol: "MYNFT",
  });

  console.log('✅ NFT Minted Successfully!');
  console.log('NFT Address:', nft.address.toString());
  console.log('Metadata URI:', metadataUri);
  console.log('View on Solscan:', `https://solscan.io/token/${nft.address.toString()}?cluster=devnet`);
  
  return nft;
}

// ============================================
// METHOD 2: Manual NFT Minting (Lower Level)
// ============================================

async function mintNFTManual() {
  console.log('🚀 Starting Manual NFT Mint...\n');

  // 1. Setup
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const payer = Keypair.generate();

  // Airdrop
  console.log('💰 Requesting airdrop...');
  const airdropSig = await connection.requestAirdrop(payer.publicKey, 2000000000);
  await connection.confirmTransaction(airdropSig);
  console.log('✅ Airdrop confirmed\n');

  // 2. Create Mint Account
  console.log('🏭 Creating mint account...');
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey, // mint authority
    payer.publicKey, // freeze authority
    0 // 0 decimals for NFT
  );
  console.log('✅ Mint created:', mint.toString(), '\n');

  // 3. Create Token Account
  console.log('💼 Creating token account...');
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );
  console.log('✅ Token account created:', tokenAccount.address.toString(), '\n');

  // 4. Mint 1 Token (NFT)
  console.log('🎨 Minting token...');
  await mintTo(
    connection,
    payer,
    mint,
    tokenAccount.address,
    payer.publicKey,
    1 // mint 1 token
  );
  console.log('✅ Token minted\n');

  // 5. Create Metadata Account
  console.log('📝 Creating metadata...');
  
  const metadataUri = "https://arweave.net/your-metadata-uri"; // Upload metadata first
  
  const [metadataAddress] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  const createMetadataInstruction = createCreateMetadataAccountV3Instruction(
    {
      metadata: metadataAddress,
      mint: mint,
      mintAuthority: payer.publicKey,
      payer: payer.publicKey,
      updateAuthority: payer.publicKey,
    },
    {
      createMetadataAccountArgsV3: {
        data: {
          name: 'My Manual NFT',
          symbol: 'MNFT',
          uri: metadataUri,
          sellerFeeBasisPoints: 500,
          creators: [
            {
              address: payer.publicKey,
              verified: true,
              share: 100,
            },
          ],
          collection: null,
          uses: null,
        },
        isMutable: true,
        collectionDetails: null,
      },
    }
  );

  const transaction = new Transaction().add(createMetadataInstruction);
  const signature = await sendAndConfirmTransaction(connection, transaction, [payer]);
  
  console.log('✅ Metadata created!');
  console.log('Transaction signature:', signature);
  console.log('Mint address:', mint.toString());
  console.log('View on Solscan:', `https://solscan.io/token/${mint.toString()}?cluster=devnet`);
}

// ============================================
// METHOD 3: Minting NFT Collection
// ============================================

async function mintNFTCollection() {
  console.log('🚀 Starting NFT Collection Mint...\n');

  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const wallet = Keypair.generate();

  // Airdrop
  const airdropSig = await connection.requestAirdrop(wallet.publicKey, 2000000000);
  await connection.confirmTransaction(airdropSig);

  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(wallet))
    .use(bundlrStorage());

  // 1. Create Collection NFT
  console.log('📦 Creating collection...');
  const { nft: collectionNft } = await metaplex.nfts().create({
    uri: "https://arweave.net/collection-metadata",
    name: "My NFT Collection",
    sellerFeeBasisPoints: 500,
    symbol: "COLL",
    isCollection: true,
  });
  console.log('✅ Collection created:', collectionNft.address.toString(), '\n');

  // 2. Mint NFTs in Collection
  console.log('🎨 Minting NFTs in collection...');
  const nfts = [];
  
  for (let i = 1; i <= 3; i++) {
    const { nft } = await metaplex.nfts().create({
      uri: `https://arweave.net/nft-${i}-metadata`,
      name: `Collection NFT #${i}`,
      sellerFeeBasisPoints: 500,
      symbol: "CNFT",
      collection: collectionNft.address,
    });
    
    // Verify the NFT in the collection
    await metaplex.nfts().verifyCollection({
      mintAddress: nft.address,
      collectionMintAddress: collectionNft.address,
    });
    
    nfts.push(nft);
    console.log(`✅ NFT #${i} minted:`, nft.address.toString());
  }

  console.log('\n✅ Collection complete!');
  console.log('Collection Address:', collectionNft.address.toString());
}

// ============================================
// UTILITY: Create Metadata JSON
// ============================================

function createMetadataJSON(name: string, description: string, imageUri: string) {
  return {
    name: name,
    symbol: "NFT",
    description: description,
    image: imageUri,
    attributes: [
      { trait_type: "Background", value: "Blue" },
      { trait_type: "Eyes", value: "Green" },
      { trait_type: "Rarity", value: "Rare" }
    ],
    properties: {
      files: [
        {
          uri: imageUri,
          type: "image/png"
        }
      ],
      category: "image",
      creators: [
        {
          address: "YOUR_WALLET_ADDRESS",
          share: 100
        }
      ]
    }
  };
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('===========================================');
  console.log('   SOLANA NFT MINTING EXAMPLES');
  console.log('===========================================\n');

  try {
    // Choose which method to run:
    
    // Option 1: Metaplex SDK (Easiest)
    await mintNFTWithMetaplex();
    
    // Option 2: Manual Method (More control)
    // await mintNFTManual();
    
    // Option 3: Collection Minting
    // await mintNFTCollection();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Uncomment to run:
// main();

// ============================================
// IMPORTANT NOTES:
// ============================================
// 1. Replace 'devnet' with 'mainnet-beta' for production
// 2. Never expose your private key in code
// 3. Use environment variables for sensitive data
// 4. Upload images to Arweave, IPFS, or similar storage
// 5. Test on devnet before deploying to mainnet
// 6. Consider gas fees on mainnet
// ============================================

}
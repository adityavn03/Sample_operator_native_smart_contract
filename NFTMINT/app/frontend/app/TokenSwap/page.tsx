"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";

import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createMintToInstruction,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

import idl from "../idl/idlswap/escrow_application.json";

type EscrowAccount = {
  publicKey: PublicKey;
  account: {
    maker: PublicKey;
    taker: PublicKey;
    mintMaker: PublicKey;
    mintTaker: PublicKey;
    amountMaker: anchor.BN;
    amountTaker: anchor.BN;
    depositMaker: boolean;
    depositTaker: boolean;
    bump: number;
    escrowId: anchor.BN;  // ← Added this field
  };
};

export default function EscrowUI() {
  // ---------------- Wallet & Connection ----------------
  const { connection } = useConnection();
  const wallet = useWallet();

  // ---------------- State ----------------
  const [escrows, setEscrows] = useState<EscrowAccount[]>([]);
  const [selectedEscrow, setSelectedEscrow] = useState<EscrowAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"maker" | "taker">("maker");

  // Maker state
  const [makerMintKeypair, setMakerMintKeypair] = useState<Keypair | null>(null);
  const [takerMintInput, setTakerMintInput] = useState("");
  const [makerAmount, setMakerAmount] = useState("100");
  const [takerAmount, setTakerAmount] = useState("100");
  const [escrowId, setEscrowId] = useState("1");  // ← Added escrow ID
  const [escrowCreated, setEscrowCreated] = useState(false);

  // Taker state
  const [takerMintKeypair, setTakerMintKeypair] = useState<Keypair | null>(null);
  const [mintAmount, setMintAmount] = useState("1000");

  // ---------------- Anchor Setup ----------------
  const provider = new anchor.AnchorProvider(
    connection,
    wallet as any,
    { commitment: "processed" }
  );

  const program = new Program(idl as anchor.Idl, provider);

  // ---------------- Load Escrows ----------------
  const fetchEscrows = async () => {
    try {
      const accounts = await (program.account as any).escrow.all();
      setEscrows(accounts);
    } catch (err) {
      console.error("Fetch escrow error:", err);
    }
  };

  useEffect(() => {
    if (wallet.publicKey) {
      fetchEscrows();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.publicKey]);

  // ============================================
  // MAKER SIDE FUNCTIONS
  // ============================================

  // STEP 1: Create Maker Mint
  const createMakerMint = async () => {
    try {
      setLoading(true);
      if (!wallet.publicKey) return;

      const makerMint = Keypair.generate();
      const rent = await getMinimumBalanceForRentExemptMint(connection);

      const txMint = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: wallet.publicKey,
          newAccountPubkey: makerMint.publicKey,
          space: MINT_SIZE,
          lamports: rent,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          makerMint.publicKey,
          6,
          wallet.publicKey,
          wallet.publicKey
        )
      );

      const signature = await wallet.sendTransaction(txMint, connection, {
        signers: [makerMint],
      });
      
      await connection.confirmTransaction(signature, 'confirmed');

      setMakerMintKeypair(makerMint);

      alert(
        `✅ Maker Mint Created!\n\n` +
        `Mint Address: ${makerMint.publicKey.toBase58()}\n\n` +
        `Next: Mint tokens to yourself (Step 2)`
      );
    } catch (err) {
      console.error(err);
      alert("❌ Mint creation failed");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Mint Tokens to Maker
  const mintTokensToMaker = async () => {
    try {
      setLoading(true);
      if (!wallet.publicKey || !makerMintKeypair) return;

      const makerAta = await getAssociatedTokenAddress(
        makerMintKeypair.publicKey,
        wallet.publicKey
      );

      const txAta = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          makerAta,
          wallet.publicKey,
          makerMintKeypair.publicKey
        ),
        createMintToInstruction(
          makerMintKeypair.publicKey,
          makerAta,
          wallet.publicKey,
          100_000_000 // 100 tokens with 6 decimals
        )
      );

      const signature = await wallet.sendTransaction(txAta, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      alert("✅ Successfully minted 100 tokens to your wallet!");
    } catch (err) {
      console.error(err);
      alert("❌ Minting failed");
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Initialize Escrow
  const initializeEscrow = async () => {
    try {
      setLoading(true);
      if (!wallet.publicKey || !makerMintKeypair || !takerMintInput) return;

      const takerMintPubkey = new PublicKey(takerMintInput);
      const escrowIdNum = new anchor.BN(escrowId);

      // ✅ CORRECTED: Derive PDA with all 4 seeds including escrow_id
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          wallet.publicKey.toBuffer(),
          makerMintKeypair.publicKey.toBuffer(),
          escrowIdNum.toArrayLike(Buffer, "le", 8),  // ← FIXED: Added escrow_id
        ],
        program.programId
      );

      console.log("Initializing escrow with PDA:", escrowPda.toBase58());

      await program.methods
        .inizialiseEscrow(
          escrowIdNum,  // ← FIXED: Pass escrow_id as first parameter
          new anchor.BN(Number(makerAmount) * 1_000_000),
          new anchor.BN(Number(takerAmount) * 1_000_000)
        )
        .accounts({
          escrow: escrowPda,
          maker: wallet.publicKey,
          taker: wallet.publicKey,
          mintMaker: makerMintKeypair.publicKey,
          mintTaker: takerMintPubkey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setEscrowCreated(true);
      alert("✅ Escrow initialized successfully!");
      await fetchEscrows();
    } catch (err) {
      console.error(err);
      alert("❌ Escrow initialization failed. Check the taker mint address!");
    } finally {
      setLoading(false);
    }
  };

  // STEP 4: Deposit Maker Tokens
  const depositMakerTokens = async () => {
    try {
      setLoading(true);
      if (!wallet.publicKey || !makerMintKeypair) return;

      const escrowIdNum = new anchor.BN(escrowId);

      // ✅ CORRECTED: Derive PDA with all 4 seeds
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          wallet.publicKey.toBuffer(),
          makerMintKeypair.publicKey.toBuffer(),
          escrowIdNum.toArrayLike(Buffer, "le", 8),  // ← FIXED: Added escrow_id
        ],
        program.programId
      );

      const makerAta = await getAssociatedTokenAddress(
        makerMintKeypair.publicKey,
        wallet.publicKey
      );

      const escrowMakeAta = await getAssociatedTokenAddress(
        makerMintKeypair.publicKey,
        escrowPda,
        true
      );

      await program.methods
        .depositMaker()
        .accounts({
          escrow: escrowPda,
          maker: wallet.publicKey,
          mintAta: makerAta,
          escrowMakeAta: escrowMakeAta,
          mintMaker: makerMintKeypair.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      alert("✅ Maker tokens deposited!\n\nEscrow is ready. Now wait for the taker to deposit.");
      await fetchEscrows();
    } catch (err) {
      console.error(err);
      alert("❌ Deposit failed");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // TAKER SIDE FUNCTIONS
  // ============================================

  // STEP 1: Create Taker Mint
  const createTakerMint = async () => {
    try {
      setLoading(true);
      if (!wallet.publicKey) return;

      const takerMint = Keypair.generate();
      const rent = await getMinimumBalanceForRentExemptMint(connection);

      const txMint = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: wallet.publicKey,
          newAccountPubkey: takerMint.publicKey,
          space: MINT_SIZE,
          lamports: rent,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          takerMint.publicKey,
          6,
          wallet.publicKey,
          wallet.publicKey
        )
      );

      const signature = await wallet.sendTransaction(txMint, connection, {
        signers: [takerMint],
      });
      
      await connection.confirmTransaction(signature, 'confirmed');

      setTakerMintKeypair(takerMint);

      alert(
        `✅ Taker Mint Created!\n\n` +
        `Mint Address: ${takerMint.publicKey.toBase58()}\n\n` +
        `⚠️ IMPORTANT: Share this address with the maker!\n` +
        `They need it to create the escrow.`
      );
    } catch (err) {
      console.error(err);
      alert("❌ Mint creation failed");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Mint Tokens to Taker
  const mintTokensToTaker = async () => {
    try {
      setLoading(true);
      if (!wallet.publicKey || !takerMintKeypair) return;

      const takerAta = await getAssociatedTokenAddress(
        takerMintKeypair.publicKey,
        wallet.publicKey
      );

      const ataExists = await connection.getAccountInfo(takerAta);
      const tx = new Transaction();
      
      if (!ataExists) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            takerAta,
            wallet.publicKey,
            takerMintKeypair.publicKey
          )
        );
      }

      tx.add(
        createMintToInstruction(
          takerMintKeypair.publicKey,
          takerAta,
          wallet.publicKey,
          Number(mintAmount) * 1_000_000
        )
      );

      const signature = await wallet.sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      alert(`✅ Successfully minted ${mintAmount} tokens to your wallet!`);
    } catch (err) {
      console.error(err);
      alert("❌ Minting failed");
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Deposit Taker Tokens
  const depositTakerTokens = async () => {
    try {
      setLoading(true);
      if (!wallet.publicKey || !selectedEscrow) return;

      const escrow = selectedEscrow.publicKey;
      const takerMint = selectedEscrow.account.mintTaker;

      const payAta = await getAssociatedTokenAddress(takerMint, wallet.publicKey);
      
      const escrowTakerAta = await getAssociatedTokenAddress(
        takerMint,
        escrow,
        true
      );

      await program.methods
        .depositTaker()
        .accounts({
          escrow,
          taker: wallet.publicKey,
          mintTakerAta: payAta,
          escrowTakerAta: escrowTakerAta,
          mintTaker: takerMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      alert("✅ Taker tokens deposited!\n\nNow wait for the maker to execute the swap.");
      await fetchEscrows();
    } catch (err) {
      console.error(err);
      alert("❌ Deposit failed. Make sure you have enough tokens!");
    } finally {
      setLoading(false);
    }
  };

  // STEP 4: Execute Swap (Maker only)
  const executeSwap = async () => {
    try {
      setLoading(true);
      if (!wallet.publicKey || !selectedEscrow) return;

      const escrow = selectedEscrow.publicKey;
      const data = selectedEscrow.account;

      const makerMint = data.mintMaker;
      const takerMint = data.mintTaker;

      // Get the ATAs we need
      const makerReceiveAta = await getAssociatedTokenAddress(takerMint, data.maker);
      const takerReceiveAta = await getAssociatedTokenAddress(makerMint, data.taker);

      // Create ATAs if needed
      const txAta = new Transaction();

      const makerReceiveExists = await connection.getAccountInfo(makerReceiveAta);
      if (!makerReceiveExists) {
        txAta.add(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            makerReceiveAta,
            data.maker,
            takerMint
          )
        );
      }

      const takerReceiveExists = await connection.getAccountInfo(takerReceiveAta);
      if (!takerReceiveExists) {
        txAta.add(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            takerReceiveAta,
            data.taker,
            makerMint
          )
        );
      }

      if (txAta.instructions.length > 0) {
        const signature = await wallet.sendTransaction(txAta, connection);
        await connection.confirmTransaction(signature, 'confirmed');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const escrowMakerAta = await getAssociatedTokenAddress(makerMint, escrow, true);
      const escrowTakerAta = await getAssociatedTokenAddress(takerMint, escrow, true);

      await program.methods
        .execute()
        .accounts({
          escrow,
          maker: data.maker,
          makeAta: makerReceiveAta,
          takerAta: takerReceiveAta,
          escrowMakerAta,
          escrowTakeAta: escrowTakerAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      alert("🎉 Swap Completed Successfully!\n\nTokens have been exchanged and escrow closed.");
      setSelectedEscrow(null);
      await fetchEscrows();
    } catch (err) {
      console.error(err);
      alert("❌ Swap execution failed");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // UI RENDERING
  // ============================================

  if (!wallet.publicKey) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      }}>
        <div style={{ 
          background: "white", 
          padding: "60px 80px", 
          borderRadius: 16, 
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          textAlign: "center"
        }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🔒</div>
          <h2 style={{ margin: "0 0 16px 0", fontSize: 28, color: "#1a202c" }}>Connect Wallet</h2>
          <p style={{ margin: 0, color: "#718096", fontSize: 16 }}>Please connect your wallet to continue</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "40px 20px"
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ 
          textAlign: "center", 
          marginBottom: 40,
          color: "white"
        }}>
          <h1 style={{ 
            fontSize: 48, 
            margin: "0 0 12px 0",
            fontWeight: 700,
            textShadow: "0 2px 10px rgba(0,0,0,0.2)"
          }}>
            🔄 Token Escrow
          </h1>
          <p style={{ 
            fontSize: 18, 
            margin: 0,
            opacity: 0.9
          }}>
            Secure peer-to-peer token swaps on Solana
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{ 
          display: "flex", 
          gap: 16, 
          marginBottom: 32,
          justifyContent: "center"
        }}>
          <button
            onClick={() => setActiveTab("maker")}
            style={{
              padding: "14px 32px",
              border: "none",
              background: activeTab === "maker" ? "white" : "rgba(255,255,255,0.2)",
              color: activeTab === "maker" ? "#667eea" : "white",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 16,
              borderRadius: 8,
              transition: "all 0.3s ease",
              boxShadow: activeTab === "maker" ? "0 4px 12px rgba(0,0,0,0.15)" : "none"
            }}
          >
            👨‍💼 Maker (Create)
          </button>
          <button
            onClick={() => setActiveTab("taker")}
            style={{
              padding: "14px 32px",
              border: "none",
              background: activeTab === "taker" ? "white" : "rgba(255,255,255,0.2)",
              color: activeTab === "taker" ? "#667eea" : "white",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 16,
              borderRadius: 8,
              transition: "all 0.3s ease",
              boxShadow: activeTab === "taker" ? "0 4px 12px rgba(0,0,0,0.15)" : "none"
            }}
          >
            🤝 Taker (Join)
          </button>
        </div>

        {/* Main Content Card */}
        <div style={{
          background: "white",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          overflow: "hidden"
        }}>
          {/* MAKER SIDE */}
          {activeTab === "maker" && (
            <div style={{ padding: 40 }}>
              <h2 style={{ margin: "0 0 8px 0", fontSize: 28, color: "#1a202c" }}>Create Escrow</h2>
              <p style={{ margin: "0 0 32px 0", color: "#718096", fontSize: 15 }}>
                Follow these steps to create and fund an escrow offer
              </p>

              {/* Step 1: Create Mint */}
              <div style={{ 
                marginBottom: 24,
                padding: 24,
                background: "#f7fafc",
                borderRadius: 12,
                border: "2px solid #e2e8f0"
              }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ 
                    width: 32, 
                    height: 32, 
                    borderRadius: "50%", 
                    background: makerMintKeypair ? "#48bb78" : "#cbd5e0",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    marginRight: 12
                  }}>
                    1
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, color: "#2d3748" }}>Create Your Token Mint</h3>
                </div>
                <p style={{ margin: "0 0 16px 0", color: "#4a5568", fontSize: 14, paddingLeft: 44 }}>
                  Create the token mint for your side of the trade
                </p>
                {!makerMintKeypair ? (
                  <div style={{ paddingLeft: 44 }}>
                    <button
                      onClick={createMakerMint}
                      disabled={loading}
                      style={{
                        padding: "12px 28px",
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        cursor: loading ? "not-allowed" : "pointer",
                        fontWeight: 600,
                        fontSize: 15,
                        transition: "transform 0.2s",
                        opacity: loading ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = "translateY(-2px)")}
                      onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                    >
                      Create Token Mint
                    </button>
                  </div>
                ) : (
                  <div style={{ 
                    marginLeft: 44,
                    padding: 16, 
                    background: "white",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0"
                  }}>
                    <div style={{ color: "#48bb78", fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
                      ✓ Token Mint Created
                    </div>
                    <div style={{
                      fontSize: 12,
                      wordBreak: "break-all",
                      fontFamily: "monospace",
                      color: "#4a5568"
                    }}>
                      {makerMintKeypair.publicKey.toBase58()}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Mint Tokens */}
              <div style={{ 
                marginBottom: 24,
                padding: 24,
                background: "#f7fafc",
                borderRadius: 12,
                border: "2px solid #e2e8f0",
                opacity: !makerMintKeypair ? 0.5 : 1
              }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ 
                    width: 32, 
                    height: 32, 
                    borderRadius: "50%", 
                    background: "#cbd5e0",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    marginRight: 12
                  }}>
                    2
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, color: "#2d3748" }}>Mint Tokens to Yourself</h3>
                </div>
                <p style={{ margin: "0 0 16px 0", color: "#4a5568", fontSize: 14, paddingLeft: 44 }}>
                  Mint 100 tokens to your wallet for the escrow
                </p>
                <div style={{ paddingLeft: 44 }}>
                  <button
                    onClick={mintTokensToMaker}
                    disabled={loading || !makerMintKeypair}
                    style={{
                      padding: "12px 28px",
                      background: !makerMintKeypair ? "#cbd5e0" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      cursor: (!makerMintKeypair || loading) ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      fontSize: 15,
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    Mint 100 Tokens
                  </button>
                </div>
              </div>

              {/* Step 3: Initialize Escrow */}
              <div style={{ 
                marginBottom: 24,
                padding: 24,
                background: "#f7fafc",
                borderRadius: 12,
                border: "2px solid #e2e8f0",
                opacity: !makerMintKeypair ? 0.5 : 1
              }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ 
                    width: 32, 
                    height: 32, 
                    borderRadius: "50%", 
                    background: escrowCreated ? "#48bb78" : "#cbd5e0",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    marginRight: 12
                  }}>
                    3
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, color: "#2d3748" }}>Initialize Escrow</h3>
                </div>
                <div style={{ paddingLeft: 44 }}>
                  <div style={{ 
                    padding: 12, 
                    background: "#fef5e7", 
                    borderRadius: 8, 
                    marginBottom: 16,
                    border: "1px solid #f6e05e"
                  }}>
                    <p style={{ margin: 0, color: "#d97706", fontSize: 13, fontWeight: 600 }}>
                      ⚠️ You need the Taker's mint address first!
                    </p>
                    <p style={{ margin: "4px 0 0 0", color: "#92400e", fontSize: 12 }}>
                      The taker must create their mint and share the address with you.
                    </p>
                  </div>

                  {/* ✅ NEW: Escrow ID Input */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ 
                      display: "block", 
                      marginBottom: 8,
                      fontWeight: 600,
                      color: "#4a5568",
                      fontSize: 14
                    }}>
                      Escrow ID (unique identifier)
                    </label>
                    <input
                      type="number"
                      value={escrowId}
                      onChange={(e) => setEscrowId(e.target.value)}
                      placeholder="1"
                      disabled={!makerMintKeypair}
                      style={{
                        padding: "12px 16px",
                        width: "200px",
                        border: "2px solid #e2e8f0",
                        borderRadius: 8,
                        fontSize: 14,
                        boxSizing: "border-box",
                        outline: "none"
                      }}
                    />
                    <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#718096" }}>
                      Use a unique number for each escrow (default: 1)
                    </p>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ 
                      display: "block", 
                      marginBottom: 8,
                      fontWeight: 600,
                      color: "#4a5568",
                      fontSize: 14
                    }}>
                      Taker's Token Mint Address
                    </label>
                    <input
                      type="text"
                      value={takerMintInput}
                      onChange={(e) => setTakerMintInput(e.target.value)}
                      placeholder="Paste taker's mint address here..."
                      disabled={!makerMintKeypair}
                      style={{
                        padding: "12px 16px",
                        width: "100%",
                        border: "2px solid #e2e8f0",
                        borderRadius: 8,
                        fontSize: 13,
                        fontFamily: "monospace",
                        boxSizing: "border-box",
                        outline: "none",
                        transition: "border-color 0.2s"
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = "#667eea"}
                      onBlur={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{
                        display: "block",
                        marginBottom: 8,
                        fontWeight: 600,
                        color: "#4a5568",
                        fontSize: 14
                      }}>
                        You Offer (tokens)
                      </label>
                      <input
                        type="number"
                        value={makerAmount}
                        onChange={(e) => setMakerAmount(e.target.value)}
                        disabled={!makerMintKeypair}
                        style={{
                          padding: "12px 16px",
                          width: "100%",
                          border: "2px solid #e2e8f0",
                          borderRadius: 8,
                          fontSize: 14,
                          boxSizing: "border-box",
                          outline: "none"
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{
                        display: "block",
                        marginBottom: 8,
                        fontWeight: 600,
                        color: "#4a5568",
                        fontSize: 14
                      }}>
                        You Request (tokens)
                      </label>
                      <input
                        type="number"
                        value={takerAmount}
                        onChange={(e) => setTakerAmount(e.target.value)}
                        disabled={!makerMintKeypair}
                        style={{
                          padding: "12px 16px",
                          width: "100%",
                          border: "2px solid #e2e8f0",
                          borderRadius: 8,
                          fontSize: 14,
                          boxSizing: "border-box",
                          outline: "none"
                        }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={initializeEscrow}
                    disabled={loading || !makerMintKeypair || !takerMintInput || escrowCreated}
                    style={{
                      padding: "12px 28px",
                      background: (!makerMintKeypair || !takerMintInput || escrowCreated) ? "#cbd5e0" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      cursor: (!makerMintKeypair || !takerMintInput || escrowCreated || loading) ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      fontSize: 15,
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    {escrowCreated ? "✅ Escrow Initialized" : "Initialize Escrow"}
                  </button>
                </div>
              </div>

              {/* Step 4: Deposit Tokens */}
              <div style={{ 
                marginBottom: 24,
                padding: 24,
                background: "#f7fafc",
                borderRadius: 12,
                border: "2px solid #e2e8f0",
                opacity: !escrowCreated ? 0.5 : 1
              }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ 
                    width: 32, 
                    height: 32, 
                    borderRadius: "50%", 
                    background: "#cbd5e0",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    marginRight: 12
                  }}>
                    4
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, color: "#2d3748" }}>Deposit Your Tokens</h3>
                </div>
                <p style={{ margin: "0 0 16px 0", color: "#4a5568", fontSize: 14, paddingLeft: 44 }}>
                  Transfer your tokens into the escrow account
                </p>
                <div style={{ paddingLeft: 44 }}>
                  <button
                    onClick={depositMakerTokens}
                    disabled={loading || !escrowCreated}
                    style={{
                      padding: "12px 28px",
                      background: !escrowCreated ? "#cbd5e0" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      cursor: (!escrowCreated || loading) ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      fontSize: 15,
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    Deposit Tokens
                  </button>
                </div>
              </div>

              {/* Step 5: Execute Swap */}
              <div style={{ 
                padding: 24,
                background: "#fef5e7",
                borderRadius: 12,
                border: "2px solid #f6e05e"
              }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ 
                    width: 32, 
                    height: 32, 
                    borderRadius: "50%", 
                    background: "#f59e0b",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    marginRight: 12
                  }}>
                    5
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, color: "#2d3748" }}>Execute Swap</h3>
                </div>
                <p style={{ margin: "0 0 16px 0", color: "#92400e", fontSize: 14, paddingLeft: 44 }}>
                  Wait for the taker to deposit, then complete the swap
                </p>
                
                <div style={{ paddingLeft: 44 }}>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: 15, color: "#2d3748" }}>Your Escrows:</h4>
                  
                  {escrows.filter(e => e.account.maker.equals(wallet.publicKey!)).length === 0 ? (
                    <p style={{ color: "#a0aec0", fontSize: 14 }}>No escrows created yet</p>
                  ) : (
                    <div style={{ display: "grid", gap: 12 }}>
                      {escrows.filter(e => e.account.maker.equals(wallet.publicKey!)).map((e, i) => (
                        <div
                          key={i}
                          style={{
                            padding: 16,
                            background: "white",
                            borderRadius: 8,
                            border: "1px solid #e2e8f0"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, color: "#718096", marginBottom: 6 }}>
                                Escrow ID: {e.account.escrowId.toString()} | {e.publicKey.toBase58().slice(0, 8)}...
                              </div>
                              <div style={{ fontSize: 13, marginBottom: 4 }}>
                                <span style={{ 
                                  display: "inline-block",
                                  padding: "4px 10px",
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  marginRight: 8,
                                  background: e.account.depositMaker ? "#c6f6d5" : "#fed7d7",
                                  color: e.account.depositMaker ? "#22543d" : "#742a2a"
                                }}>
                                  You: {e.account.depositMaker ? "✅ Deposited" : "❌ Pending"}
                                </span>
                                <span style={{ 
                                  display: "inline-block",
                                  padding: "4px 10px",
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background: e.account.depositTaker ? "#c6f6d5" : "#fed7d7",
                                  color: e.account.depositTaker ? "#22543d" : "#742a2a"
                                }}>
                                  Taker: {e.account.depositTaker ? "✅ Deposited" : "❌ Pending"}
                                </span>
                              </div>
                            </div>
                            {e.account.depositMaker && e.account.depositTaker && (
                              <button
                                onClick={() => { setSelectedEscrow(e); executeSwap(); }}
                                disabled={loading}
                                style={{
                                  padding: "10px 24px",
                                  background: "linear-gradient(135deg, #48bb78 0%, #38a169 100%)",
                                  color: "white",
                                  border: "none",
                                  borderRadius: 8,
                                  cursor: loading ? "not-allowed" : "pointer",
                                  fontWeight: 600,
                                  fontSize: 14,
                                  marginLeft: 16
                                }}
                              >
                                🎉 Execute Swap
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAKER SIDE - Similar structure, keeping original code */}
          {activeTab === "taker" && (
            <div style={{ padding: 40 }}>
              <h2 style={{ margin: "0 0 8px 0", fontSize: 28, color: "#1a202c" }}>Join Escrow</h2>
              <p style={{ margin: "0 0 32px 0", color: "#718096", fontSize: 15 }}>
                Follow these steps to join and complete an escrow swap
              </p>

              {/* Taker Steps - keeping original implementation */}
              <div style={{ 
                marginBottom: 24,
                padding: 24,
                background: "#f7fafc",
                borderRadius: 12,
                border: "2px solid #e2e8f0"
              }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ 
                    width: 32, 
                    height: 32, 
                    borderRadius: "50%", 
                    background: takerMintKeypair ? "#48bb78" : "#cbd5e0",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    marginRight: 12
                  }}>
                    1
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, color: "#2d3748" }}>Create Your Token Mint</h3>
                </div>
                <p style={{ margin: "0 0 16px 0", color: "#4a5568", fontSize: 14, paddingLeft: 44 }}>
                  Create the token mint for your side of the trade
                </p>
                {!takerMintKeypair ? (
                  <div style={{ paddingLeft: 44 }}>
                    <button
                      onClick={createTakerMint}
                      disabled={loading}
                      style={{
                        padding: "12px 28px",
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        cursor: loading ? "not-allowed" : "pointer",
                        fontWeight: 600,
                        fontSize: 15,
                        transition: "transform 0.2s",
                        opacity: loading ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = "translateY(-2px)")}
                      onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                    >
                      Create Token Mint
                    </button>
                  </div>
                ) : (
                  <div style={{ paddingLeft: 44 }}>
                    <div style={{ 
                      padding: 16, 
                      background: "white",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      marginBottom: 12
                    }}>
                      <div style={{ color: "#48bb78", fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
                        ✓ Token Mint Created
                      </div>
                      <div style={{
                        fontSize: 12,
                        wordBreak: "break-all",
                        fontFamily: "monospace",
                        color: "#4a5568"
                      }}>
                        {takerMintKeypair.publicKey.toBase58()}
                      </div>
                    </div>
                    <div style={{ 
                      padding: 12, 
                      background: "#fef5e7", 
                      borderRadius: 8,
                      border: "1px solid #f6e05e"
                    }}>
                      <p style={{ margin: 0, color: "#d97706", fontSize: 13, fontWeight: 600 }}>
                        ⚠️ Share this address with the maker!
                      </p>
                      <p style={{ margin: "4px 0 0 0", color: "#92400e", fontSize: 12 }}>
                        They need it to create the escrow.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ 
                marginBottom: 24,
                padding: 24,
                background: "#f7fafc",
                borderRadius: 12,
                border: "2px solid #e2e8f0",
                opacity: !takerMintKeypair ? 0.5 : 1
              }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ 
                    width: 32, 
                    height: 32, 
                    borderRadius: "50%", 
                    background: "#cbd5e0",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    marginRight: 12
                  }}>
                    2
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, color: "#2d3748" }}>Mint Tokens to Yourself</h3>
                </div>
                <p style={{ margin: "0 0 16px 0", color: "#4a5568", fontSize: 14, paddingLeft: 44 }}>
                  Mint tokens to your wallet for the swap
                </p>
                <div style={{ paddingLeft: 44 }}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{
                      display: "block",
                      marginBottom: 8,
                      fontWeight: 600,
                      color: "#4a5568",
                      fontSize: 14
                    }}>
                      Amount to Mint
                    </label>
                    <input
                      type="number"
                      value={mintAmount}
                      onChange={(e) => setMintAmount(e.target.value)}
                      disabled={!takerMintKeypair}
                      style={{
                        padding: "12px 16px",
                        width: "200px",
                        border: "2px solid #e2e8f0",
                        borderRadius: 8,
                        fontSize: 14,
                        outline: "none"
                      }}
                    />
                  </div>
                  <button
                    onClick={mintTokensToTaker}
                    disabled={loading || !takerMintKeypair}
                    style={{
                      padding: "12px 28px",
                      background: !takerMintKeypair ? "#cbd5e0" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      cursor: (!takerMintKeypair || loading) ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      fontSize: 15,
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    Mint Tokens
                  </button>
                </div>
              </div>

              <div style={{ 
                marginBottom: 24,
                padding: 24,
                background: "#f7fafc",
                borderRadius: 12,
                border: "2px solid #e2e8f0"
              }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ 
                    width: 32, 
                    height: 32, 
                    borderRadius: "50%", 
                    background: selectedEscrow ? "#48bb78" : "#cbd5e0",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    marginRight: 12
                  }}>
                    3
                  </div>
                  <h3 style={{ margin: 0, fontSize: 18, color: "#2d3748" }}>Select an Escrow</h3>
                </div>
                <p style={{ margin: "0 0 16px 0", color: "#4a5568", fontSize: 14, paddingLeft: 44 }}>
                  Choose an available escrow created by the maker
                </p>
                
                <div style={{ paddingLeft: 44 }}>
                  {escrows.length === 0 ? (
                    <p style={{ color: "#a0aec0", fontSize: 14 }}>No escrows available</p>
                  ) : (
                    <div style={{ display: "grid", gap: 12 }}>
                      {escrows.map((e, i) => (
                        <div
                          key={i}
                          style={{
                            padding: 16,
                            background: selectedEscrow?.publicKey.equals(e.publicKey) ? "#ebf4ff" : "white",
                            borderRadius: 8,
                            border: selectedEscrow?.publicKey.equals(e.publicKey) ? "2px solid #667eea" : "1px solid #e2e8f0",
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                          onClick={() => setSelectedEscrow(e)}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 10 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, color: "#718096", marginBottom: 8 }}>
                                ID: {e.account.escrowId.toString()} | Creator: {e.account.maker.toBase58().slice(0, 8)}...
                              </div>
                              <div style={{ fontSize: 13, color: "#4a5568", marginBottom: 4 }}>
                                Offering: <strong>{(e.account.amountMaker.toNumber() / 1_000_000).toFixed(2)}</strong> tokens
                              </div>
                              <div style={{ fontSize: 13, color: "#4a5568" }}>
                                Requesting: <strong>{(e.account.amountTaker.toNumber() / 1_000_000).toFixed(2)}</strong> tokens
                              </div>
                            </div>
                            <div style={{ 
                              padding: "6px 12px",
                              background: e.account.depositMaker ? "#c6f6d5" : "#fed7d7",
                              color: e.account.depositMaker ? "#22543d" : "#742a2a",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600
                            }}>
                              {e.account.depositMaker ? "✅ Funded" : "❌ Not Funded"}
                            </div>
                          </div>
                          {selectedEscrow?.publicKey.equals(e.publicKey) && (
                            <div style={{ 
                              marginTop: 10,
                              padding: 10,
                              background: "#667eea",
                              color: "white",
                              borderRadius: 6,
                              fontSize: 12,
                              textAlign: "center",
                              fontWeight: 600
                            }}>
                              ✓ Selected
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {selectedEscrow && (
                <div style={{ 
                  padding: 24,
                  background: "#fef5e7",
                  borderRadius: 12,
                  border: "2px solid #f6e05e"
                }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: "50%", 
                      background: selectedEscrow.account.depositTaker ? "#48bb78" : "#cbd5e0",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      marginRight: 12
                    }}>
                      4
                    </div>
                    <h3 style={{ margin: 0, fontSize: 18, color: "#2d3748" }}>Deposit & Wait</h3>
                  </div>
                  
                  <div style={{ paddingLeft: 44 }}>
                    <p style={{ margin: "0 0 16px 0", color: "#92400e", fontSize: 14 }}>
                      Deposit your tokens and wait for the maker to execute the swap
                    </p>

                    {!selectedEscrow.account.depositTaker && (
                      <button
                        onClick={depositTakerTokens}
                        disabled={loading}
                        style={{
                          padding: "12px 28px",
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          color: "white",
                          border: "none",
                          borderRadius: 8,
                          cursor: loading ? "not-allowed" : "pointer",
                          fontWeight: 600,
                          fontSize: 15,
                          marginBottom: 16,
                          opacity: loading ? 0.6 : 1
                        }}
                      >
                        Deposit Your Tokens
                      </button>
                    )}

                    <div style={{ 
                      padding: 16, 
                      background: "white", 
                      borderRadius: 8,
                      border: "1px solid #e2e8f0"
                    }}>
                      <p style={{ margin: "0 0 10px 0", fontSize: 14, fontWeight: 600, color: "#2d3748" }}>
                        Current Status:
                      </p>
                      <div style={{ marginBottom: 6 }}>
                        <span style={{ 
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          marginRight: 8,
                          background: selectedEscrow.account.depositMaker ? "#c6f6d5" : "#fed7d7",
                          color: selectedEscrow.account.depositMaker ? "#22543d" : "#742a2a"
                        }}>
                          Maker: {selectedEscrow.account.depositMaker ? "✅ Deposited" : "❌ Not Deposited"}
                        </span>
                      </div>
                      <div>
                        <span style={{ 
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          background: selectedEscrow.account.depositTaker ? "#c6f6d5" : "#fed7d7",
                          color: selectedEscrow.account.depositTaker ? "#22543d" : "#742a2a"
                        }}>
                          You: {selectedEscrow.account.depositTaker ? "✅ Deposited" : "❌ Not Deposited"}
                        </span>
                      </div>
                      {selectedEscrow.account.depositMaker && selectedEscrow.account.depositTaker && (
                        <div style={{ 
                          marginTop: 12,
                          padding: 12,
                          background: "#c6f6d5",
                          borderRadius: 6,
                          color: "#22543d",
                          fontSize: 13,
                          fontWeight: 600,
                          textAlign: "center"
                        }}>
                          ✅ Both parties deposited! Waiting for maker to execute the swap...
                        </div>
                      )}
                    </div>

                    <div style={{ 
                      marginTop: 16,
                      padding: 12, 
                      background: "#fff3cd", 
                      borderRadius: 8,
                      border: "1px solid #ffeaa7"
                    }}>
                      <p style={{ margin: 0, color: "#856404", fontSize: 12 }}>
                        ⚠️ <strong>Note:</strong> Only the maker can execute the swap. Once both parties have deposited, the maker will complete the transaction.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{ 
            background: "white", 
            padding: 40, 
            borderRadius: 16,
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            textAlign: "center"
          }}>
            <div style={{ 
              width: 50, 
              height: 50, 
              border: "4px solid #f3f3f3",
              borderTop: "4px solid #667eea",
              borderRadius: "50%",
              margin: "0 auto 20px",
              animation: "spin 1s linear infinite"
            }} />
            <h3 style={{ margin: 0, color: "#1a202c" }}>⏳ Processing Transaction...</h3>
            <p style={{ margin: "8px 0 0 0", color: "#718096", fontSize: 14 }}>Please wait</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
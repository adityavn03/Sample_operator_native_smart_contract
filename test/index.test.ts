import * as borsh from "borsh";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { expect, test } from "bun:test";

// 🧱 Account struct (for on-chain storage)
class Counterstruct {
  count: number;
  constructor({ count }: { count: number }) {
    this.count = count;
  }
}

const schema: borsh.Schema = {
  struct: {
    count: "i32",
  },
};

// 🧩 Better approach: Use borsh decorators or simple manual serialization
// Since borsh enum schemas can be tricky in TypeScript, here's the cleanest solution:

enum InstructionType {
  Increase = 0,
  Decrease = 1,
}

// Helper functions using manual serialization (most reliable)
function createIncreaseInstruction(val: number): Buffer {
  const buffer = Buffer.alloc(5);
  buffer.writeUInt8(InstructionType.Increase, 0);
  buffer.writeUInt32LE(val, 1);
  console.log(buffer.toBase64())
  return buffer;
}

function createDecreaseInstruction(val: number): Buffer {
  const buffer = Buffer.alloc(5);
  buffer.writeUInt8(InstructionType.Decrease, 0);
  buffer.writeUInt32LE(val, 1);
  return buffer;
}

// 🚀 Setup
const dataAccLen = borsh.serialize(schema, new Counterstruct({ count: 0 })).length;
const dataAcc = Keypair.generate();
const adminAcc = Keypair.generate();
const connection = new Connection("http://127.0.0.1:8899", "confirmed");
const programId = new PublicKey("9rvkLtLpgichH3ivqEvAx71Jd2D6s1WysXzbsgUBv9Mi");

// 🧾 Create data account test
test("creating the dataaccount onchain", async () => {
  console.log("Requesting airdrop...");
  const signature = await connection.requestAirdrop(
    adminAcc.publicKey,
    2 * LAMPORTS_PER_SOL
  );

  await connection.confirmTransaction(signature, "confirmed");

  const rentLamports = await connection.getMinimumBalanceForRentExemption(dataAccLen);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: adminAcc.publicKey,
      newAccountPubkey: dataAcc.publicKey,
      lamports: rentLamports,
      space: dataAccLen,
      programId,
    })
  );

  const sig = await connection.sendTransaction(tx, [adminAcc, dataAcc]);
  await connection.confirmTransaction(sig, "confirmed");

  const accInfo = await connection.getAccountInfo(dataAcc.publicKey);
  expect(accInfo).not.toBeNull();
  console.log("✅ Data account created successfully!");
}, { timeout: 20000 });

// 🧠 Test: Send Increase instruction
test("increase counter value", async () => {
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: dataAcc.publicKey, isSigner: false, isWritable: true },
    ],
    programId,
    data: createIncreaseInstruction(20),
  });

  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [adminAcc]);
  await connection.confirmTransaction(sig, "confirmed");

  const accInfo = await connection.getAccountInfo(dataAcc.publicKey);
  const counter = borsh.deserialize(schema, accInfo!.data) as Counterstruct;
  console.log("Counter after increase:", counter.count);
}, { timeout: 20000 });

// 🧠 Test: Send Decrease instruction
test("decrease counter value", async () => {
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: dataAcc.publicKey, isSigner: false, isWritable: true },
    ],
    programId,
    data: createDecreaseInstruction(5),
  });

  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [adminAcc]);
  await connection.confirmTransaction(sig, "confirmed");

  const accInfo = await connection.getAccountInfo(dataAcc.publicKey);
  const counter = borsh.deserialize(schema, accInfo!.data) as Counterstruct;
  console.log("Counter after decrease:", counter.count);
}, { timeout: 20000 });
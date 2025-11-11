import * as borsh from "borsh";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { expect, test } from "bun:test";

class Counterstruct {
  count: number;
  constructor({ count }: { count: number }) {
    this.count = count;
  }
}

const schema: borsh.Schema = {
  struct: {
    count: "u32",
  },
};

const dataAccLen = borsh.serialize(schema, new Counterstruct({ count: 0 })).length;
console.log("Serialized example:", borsh.serialize(schema, new Counterstruct({ count: 124 })));

const dataAcc = Keypair.generate();
const adminAcc = Keypair.generate();

const connection = new Connection("http://127.0.0.1:8899", "confirmed");

const programId = new PublicKey("9rvkLtLpgichH3ivqEvAx71Jd2D6s1WysXzbsgUBv9Mi");

test(
  "creating the dataaccount onchain",
  async () => {
    console.log("Requesting airdrop...");
    const signature = await connection.requestAirdrop(adminAcc.publicKey, 2 * LAMPORTS_PER_SOL);

    for (let i = 0; i < 10; i++) {
      const balance = await connection.getBalance(adminAcc.publicKey);
      if (balance > 0) break;
      console.log(`Waiting for airdrop confirmation... (${i + 1}/10)`);
      await new Promise((r) => setTimeout(r, 1000));
    }

    const userBal = await connection.getBalance(adminAcc.publicKey);
    console.log("Admin balance:", userBal / LAMPORTS_PER_SOL);
    expect(userBal).toBeGreaterThan(0);

    const rentLamports = await connection.getMinimumBalanceForRentExemption(dataAccLen);
    console.log("Rent Exemption (lamports):", rentLamports);

    // 🧾 Create account instruction
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
    console.log("Transaction Signature:", sig);

    await connection.confirmTransaction(sig, "confirmed");

    const accInfo = await connection.getAccountInfo(dataAcc.publicKey);
    expect(accInfo).not.toBeNull();
    if (!accInfo){
        return
    }

    console.log("✅ Data account created successfully!");
    const counter = borsh.deserialize(schema, accInfo.data) as Counterstruct;
    console.log(counter);
    console.log(typeof(counter));
    console.log(counter.count);
    expect(counter.count).toBe(0);
  },
  { timeout: 20000 }

);


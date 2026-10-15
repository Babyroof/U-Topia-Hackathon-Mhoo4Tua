import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import deployedContracts from "~~/contracts/deployedContracts";
import scaffoldConfig from "~~/scaffold.config";

/**
 * Keeper: releases every conditional transfer whose time has come.
 * Same job Chainlink Automation would do in production (checkUpkeep -> performUpkeep).
 *
 * Key: KEEPER_PRIVATE_KEY in .env.local / Vercel env (a throwaway testnet wallet with a little AVAX).
 * On the local chain we fall back to Anvil's public test account #0 (never use it on a real network).
 */
const ANVIL_TEST_KEY_0 = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

export async function POST() {
  try {
    const chain = scaffoldConfig.targetNetworks[0];
    const vault = (deployedContracts as any)[chain.id]?.ConditionalVault;
    if (!vault) return NextResponse.json({ error: "ConditionalVault not deployed on this chain" }, { status: 404 });

    const key = process.env.KEEPER_PRIVATE_KEY ?? (chain.id === foundry.id ? ANVIL_TEST_KEY_0 : undefined);
    if (!key) return NextResponse.json({ error: "KEEPER_PRIVATE_KEY is not set" }, { status: 500 });

    const publicClient = createPublicClient({ chain, transport: http() });
    const [needed, performData] = (await publicClient.readContract({
      address: vault.address,
      abi: vault.abi,
      functionName: "checkUpkeep",
      args: ["0x"],
    })) as [boolean, `0x${string}`];

    if (!needed) return NextResponse.json({ released: false });

    const walletClient = createWalletClient({
      account: privateKeyToAccount(key as `0x${string}`),
      chain,
      transport: http(),
    });
    const hash = await walletClient.writeContract({
      address: vault.address,
      abi: vault.abi,
      functionName: "performUpkeep",
      args: [performData],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return NextResponse.json({ released: true, hash });
  } catch (e) {
    console.error("keeper failed", e);
    return NextResponse.json({ error: "keeper failed" }, { status: 500 });
  }
}

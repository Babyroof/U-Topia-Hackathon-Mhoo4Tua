/**
 * Keeper: every 30s, releases every conditional deal whose unlock time has come.
 * Same job Chainlink Automation would do in production (checkUpkeep -> performUpkeep).
 *
 *   yarn keeper
 *
 * Key: KEEPER_PRIVATE_KEY in packages/nextjs/.env.local (a throwaway testnet wallet with a little AVAX).
 * On the local chain it falls back to Anvil's public test account #0.
 */
import deployedContracts from "../contracts/deployedContracts";
import scaffoldConfig from "../scaffold.config";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

const INTERVAL_MS = 30_000;
const ANVIL_TEST_KEY_0 = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

try {
  (process as unknown as { loadEnvFile: (path: string) => void }).loadEnvFile(".env.local");
} catch {
  // no .env.local: fine on the local chain
}

const chain = scaffoldConfig.targetNetworks[0];
const vault = (deployedContracts as any)[chain.id]?.ConditionalVault;
if (!vault) throw new Error(`ConditionalVault is not deployed on ${chain.name}`);

const key = process.env.KEEPER_PRIVATE_KEY ?? (chain.id === foundry.id ? ANVIL_TEST_KEY_0 : undefined);
if (!key) throw new Error("Set KEEPER_PRIVATE_KEY in packages/nextjs/.env.local");

const account = privateKeyToAccount(key as `0x${string}`);
const publicClient = createPublicClient({ chain, transport: http() });
const walletClient = createWalletClient({ account, chain, transport: http() });

const tick = async () => {
  try {
    const [needed, performData] = (await publicClient.readContract({
      address: vault.address,
      abi: vault.abi,
      functionName: "checkUpkeep",
      args: ["0x"],
    })) as [boolean, `0x${string}`];
    if (!needed) return;

    const hash = await walletClient.writeContract({
      address: vault.address,
      abi: vault.abi,
      functionName: "performUpkeep",
      args: [performData],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`${new Date().toISOString()} released due deals, tx ${hash}`);
  } catch (e) {
    console.error(`${new Date().toISOString()} keeper tick failed:`, e instanceof Error ? e.message : e);
  }
};

console.log(`Keeper watching ${chain.name} vault ${vault.address} every ${INTERVAL_MS / 1000}s as ${account.address}`);
void tick();
setInterval(tick, INTERVAL_MS);

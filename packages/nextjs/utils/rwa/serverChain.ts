import { createPublicClient, http } from "viem";
import deployedContracts from "~~/contracts/deployedContracts";
import scaffoldConfig from "~~/scaffold.config";

/** Server-side read access to RWAToken on the app's target network. */
export const getRwaReader = () => {
  const chain = scaffoldConfig.targetNetworks[0];
  const rwa = (deployedContracts as any)[chain.id]?.RWAToken;
  if (!rwa) return null;
  const client = createPublicClient({ chain, transport: http() });

  const getRequest = (requestId: bigint) =>
    client.readContract({
      address: rwa.address,
      abi: rwa.abi,
      functionName: "getRequest",
      args: [requestId],
    }) as Promise<{
      requester: string;
      partner: string;
      details: string;
    }>;

  return { getRequest };
};

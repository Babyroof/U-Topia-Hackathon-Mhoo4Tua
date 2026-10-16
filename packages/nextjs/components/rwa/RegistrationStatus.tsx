"use client";

import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

/** Whether the on-chain owner matches the owner registered at the land office. */
export const RegistrationStatus = ({ tokenId }: { tokenId: bigint }) => {
  const { data: needsRegistration } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "needsRegistration",
    args: [tokenId],
  });
  if (needsRegistration === undefined) return null;

  return needsRegistration ? (
    <div className="alert alert-warning py-2 text-sm">
      <span>
        <b>Waiting for land-office registration.</b> Go to the land office to register the transfer so it takes legal
        effect.
      </span>
    </div>
  ) : (
    <span className="badge badge-success badge-outline self-start">Matches the deed</span>
  );
};

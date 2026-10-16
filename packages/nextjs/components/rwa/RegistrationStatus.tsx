"use client";

import { BuildingLibraryIcon, CheckBadgeIcon } from "@heroicons/react/24/outline";
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
    <div className="notice notice-info">
      <span className="notice-icon">
        <BuildingLibraryIcon className="h-5 w-5" />
      </span>
      <span className="text-sm">
        <b className="block">Waiting for land-office registration</b>
        Register the transfer at the land office so it takes legal effect.
      </span>
    </div>
  ) : (
    <span className="badge badge-success gap-1 self-start">
      <CheckBadgeIcon className="h-4 w-4" /> Matches the deed
    </span>
  );
};

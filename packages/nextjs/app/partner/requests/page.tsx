"use client";

import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { RoleGate } from "~~/components/rwa/RoleGate";
import { assetIcon, formatTime, sameAddress } from "~~/components/rwa/utils";
import { useScaffoldReadContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

const PendingRequests = () => {
  const { address } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const { data: requests } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "getAllRequests" });
  const pending = (requests ?? []).filter(r => r.status === 1 && sameAddress(r.partner, address));

  return (
    <div className="flex flex-col items-center grow px-4 py-10 gap-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl mb-2">Pending requests ({pending.length})</h1>
        <p className="opacity-80 m-0">Open a request to check the deed details and photos, then approve or reject.</p>
      </div>
      {pending.length === 0 ? (
        <p className="opacity-60">Nothing to review.</p>
      ) : (
        <div className="flex flex-col gap-2 w-full max-w-2xl">
          {pending.map(r => (
            <Link
              key={r.id.toString()}
              href={`/partner/requests/${r.id}`}
              className="flex items-center justify-between gap-3 bg-base-100 border border-base-300 rounded-xl px-4 py-3 hover:bg-base-200"
            >
              <div className="min-w-0">
                <div className="font-semibold truncate">
                  {assetIcon(r.assetType)} {r.name}
                </div>
                <div className="text-xs opacity-60 flex items-center gap-1 flex-wrap">
                  <Address address={r.requester} chain={targetNetwork} size="xs" onlyEnsOrAddress disableAddressLink />·{" "}
                  {formatTime(r.createdAt)}
                </div>
              </div>
              <span className="btn btn-sm btn-primary shrink-0">Review</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

const PartnerRequestsPage: NextPage = () => (
  <RoleGate role="partner">
    <PendingRequests />
  </RoleGate>
);

export default PartnerRequestsPage;

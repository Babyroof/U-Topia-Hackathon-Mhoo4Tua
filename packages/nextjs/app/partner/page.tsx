"use client";

import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { useRole } from "~~/components/Header";
import { RoleGate } from "~~/components/rwa/RoleGate";
import { REQUEST_BADGE, REQUEST_STATUS, assetIcon, formatTime, sameAddress } from "~~/components/rwa/utils";
import { useScaffoldReadContract, useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

const PartnerDesk = () => {
  const { address } = useAccount();
  const { partnerName } = useRole();
  const { targetNetwork } = useTargetNetwork();

  const { data: requests } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "getAllRequests" });
  const { data: redemptions } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "getAllRedemptions",
  });
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "RWAToken" });

  const mine = (requests ?? []).filter(r => sameAddress(r.partner, address));
  const pendingCount = mine.filter(r => r.status === 1).length;
  const processed = mine
    .filter(r => r.status !== 1)
    .slice()
    .reverse();
  const withdrawals = (redemptions ?? []).filter(r => r.status === 1 && sameAddress(r.issuer, address));

  const confirmWithdrawal = async (id: bigint) => {
    try {
      await writeContractAsync({ functionName: "confirmRedeem", args: [id] });
    } catch (e) {
      console.error("confirmRedeem failed", e);
    }
  };

  return (
    <div className="flex flex-col items-center grow px-4 py-10 gap-8">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl mb-2">Partner desk: {partnerName || "Partner"}</h1>
        <p className="opacity-80 m-0">Check the paper deed off-chain, then approve to issue one NFT for one deed.</p>
      </div>

      <Link
        href="/partner/requests"
        className="w-full max-w-2xl flex items-center justify-between bg-base-100 border border-base-300 rounded-xl px-5 py-4 hover:bg-base-200"
      >
        <span className="font-semibold">Pending requests</span>
        <span className="badge badge-warning badge-lg">{pendingCount}</span>
      </Link>

      <div className="w-full max-w-2xl">
        <h2 className="text-2xl mb-3">Withdrawal requests ({withdrawals.length})</h2>
        {withdrawals.length === 0 ? (
          <p className="opacity-60">No one is waiting to withdraw a deed.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {withdrawals.map(r => (
              <div key={r.id.toString()} className="card bg-base-100 border border-base-300">
                <div className="card-body gap-2 p-5">
                  <h3 className="text-xl m-0">NFT #{r.tokenId.toString()}</h3>
                  <div className="text-sm flex items-center gap-2 flex-wrap">
                    Holder <Address address={r.holder} chain={targetNetwork} size="sm" />
                    <span className="opacity-60">requested {formatTime(r.requestedAt)}</span>
                  </div>
                  <p className="text-sm opacity-70 m-0">
                    Check the holder&apos;s ID, then confirm. The NFT is burned and the deed is paper-only again.
                  </p>
                  <div className="flex justify-end">
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={isMining}
                      onClick={() => confirmWithdrawal(r.id)}
                    >
                      Confirm withdrawal
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {processed.length > 0 && (
        <div className="w-full max-w-2xl">
          <h2 className="text-2xl mb-3">Processed</h2>
          <div className="flex flex-col gap-2">
            {processed.map(r => (
              <div key={r.id.toString()} className="flex items-center justify-between bg-base-100 rounded-xl px-4 py-3">
                <div>
                  <div className="font-semibold">
                    {assetIcon(r.assetType)} {r.name}
                  </div>
                  <div className="text-xs opacity-60">
                    {r.status === 2 && `NFT #${r.tokenId.toString()}`}
                    {r.status === 3 && `Reason: ${r.rejectReason}`}
                  </div>
                </div>
                <span className={`badge ${REQUEST_BADGE[r.status] ?? "badge-ghost"}`}>
                  {REQUEST_STATUS[r.status] ?? "?"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const PartnerPage: NextPage = () => (
  <RoleGate role="partner">
    <PartnerDesk />
  </RoleGate>
);

export default PartnerPage;

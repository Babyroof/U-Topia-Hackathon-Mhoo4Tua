"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { ApprovalRecord } from "~~/components/rwa/ApprovalRecord";
import { AssetIcon } from "~~/components/rwa/AssetIcon";
import { DeedInfo } from "~~/components/rwa/DeedInfo";
import { DeedPhotos } from "~~/components/rwa/DeedPhotos";
import { RequestSteps } from "~~/components/rwa/FlowSteps";
import { REQUEST_BADGE, REQUEST_STATUS, formatTime, sameAddress } from "~~/components/rwa/utils";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { type PhotoSide, decodeDeed } from "~~/utils/rwa/deed";

const MyRequestsPage: NextPage = () => {
  const { address } = useAccount();
  const { data: requests } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "getAllRequests" });

  const mine = (requests ?? [])
    .filter(r => sameAddress(r.requester, address))
    .slice()
    .reverse();

  return (
    <div className="flex flex-col items-center grow px-4 py-10 gap-6">
      <div className="w-full max-w-2xl flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl mb-2">My requests</h1>
          <p className="opacity-80 m-0">Every tokenize request from this wallet and where it stands.</p>
        </div>
        <Link href="/tokenize" className="btn btn-primary btn-sm">
          + New request
        </Link>
      </div>

      {!address ? (
        <p className="opacity-70">Connect your wallet to see your requests.</p>
      ) : mine.length === 0 ? (
        <p className="opacity-60">No requests yet.</p>
      ) : (
        <div className="flex flex-col gap-3 w-full max-w-2xl">
          {mine.map(r => {
            const details = decodeDeed(r.details);
            const sides = Object.keys(details?.photos ?? {}) as PhotoSide[];
            return (
              <details key={r.id.toString()} className="collapse collapse-arrow bg-base-100 border border-base-300">
                <summary className="collapse-title">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">
                        <AssetIcon assetType={r.assetType} /> {r.name}
                      </div>
                      <div className="text-xs opacity-60">Submitted {formatTime(r.createdAt)}</div>
                    </div>
                    <span className={`badge shrink-0 ${REQUEST_BADGE[r.status] ?? "badge-ghost"}`}>
                      {REQUEST_STATUS[r.status] ?? "?"}
                    </span>
                  </div>
                  <div className="mt-3">
                    <RequestSteps status={r.status} />
                  </div>
                  {r.status === 3 && (
                    <div className="notice notice-error mt-3 py-2 text-sm">
                      <span>
                        <b>Rejected because:</b> {r.rejectReason || "No reason given"}
                      </span>
                    </div>
                  )}
                  {r.status === 2 && (
                    <div className="text-sm text-success mt-2">
                      NFT issued. See it in{" "}
                      <Link href="/vault" className="link">
                        My Vault
                      </Link>
                    </div>
                  )}
                </summary>
                <div className="collapse-content flex flex-col gap-3">
                  <DeedInfo serial={r.serial} details={details} />
                  <DeedPhotos requestId={r.id} sides={sides} />
                  {r.status === 2 && (
                    <ApprovalRecord requestId={r.id} partner={r.partner} tokenId={r.tokenId} details={r.details} />
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyRequestsPage;

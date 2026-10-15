"use client";

import { useState } from "react";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { keccak256, toBytes } from "viem";
import { useAccount } from "wagmi";
import { DeedInfo } from "~~/components/rwa/DeedInfo";
import { DeedPhotos } from "~~/components/rwa/DeedPhotos";
import { RoleGate } from "~~/components/rwa/RoleGate";
import { assetIcon, formatTime, sameAddress } from "~~/components/rwa/utils";
import { useScaffoldReadContract, useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { type PhotoSide, decodeDeed } from "~~/utils/rwa/deed";

type Request = {
  id: bigint;
  requester: string;
  assetType: string;
  name: string;
  serial: string;
  details: string;
  createdAt: bigint;
};

/** One pending request. Keyed by request id, so the reject reason never carries over to another request. */
const RequestReview = ({ request }: { request: Request }) => {
  const { targetNetwork } = useTargetNetwork();
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reasonError, setReasonError] = useState("");
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "RWAToken" });
  const { data: serialUsed } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "serialUsed",
    args: [keccak256(toBytes(request.serial))],
  });

  const details = decodeDeed(request.details);
  const sides = Object.keys(details?.photos ?? {}) as PhotoSide[];

  const approve = async () => {
    try {
      await writeContractAsync({ functionName: "approveRequest", args: [request.id] });
    } catch (e) {
      console.error("approveRequest failed", e);
    }
  };

  const reject = async () => {
    if (!reason.trim()) {
      setReasonError("Add a reason. The requester will see it.");
      return;
    }
    try {
      await writeContractAsync({ functionName: "rejectRequest", args: [request.id, reason.trim()] });
      setReason("");
      setRejecting(false);
    } catch (e) {
      console.error("rejectRequest failed", e);
    }
  };

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body gap-3">
        <div className="flex justify-between items-start gap-3">
          <h3 className="font-bold text-lg m-0">
            {assetIcon(request.assetType)} {request.name}
          </h3>
          <span className="badge badge-warning shrink-0">Pending</span>
        </div>
        <div className="text-sm flex items-center gap-2 flex-wrap">
          Requested by <Address address={request.requester} chain={targetNetwork} size="sm" />
          <span className="opacity-60">submitted {formatTime(request.createdAt)}</span>
        </div>
        <DeedInfo serial={request.serial} details={details} />
        <p className={`text-sm m-0 ${serialUsed ? "text-error" : "text-success"}`}>
          {serialUsed
            ? "✗ This deed number already has an NFT. It cannot be approved."
            : "✓ This deed number has never been issued an NFT"}
        </p>
        <DeedPhotos requestId={request.id} sides={sides} />

        {rejecting ? (
          <div className="flex flex-col gap-2 bg-error/5 rounded-lg p-3">
            <label className="label-text font-semibold" htmlFor={`reason-${request.id}`}>
              Reason for rejecting (the requester will see this)
            </label>
            <input
              id={`reason-${request.id}`}
              className={`input input-bordered input-sm w-full ${reasonError ? "input-error" : ""}`}
              placeholder="e.g. Photo is unreadable / Deed is mortgaged"
              value={reason}
              onChange={e => {
                setReason(e.target.value);
                setReasonError("");
              }}
            />
            {reasonError && <span className="text-sm text-error">{reasonError}</span>}
            <div className="flex gap-2 justify-end">
              <button
                className="btn btn-sm btn-ghost"
                disabled={isMining}
                onClick={() => {
                  setRejecting(false);
                  setReason("");
                  setReasonError("");
                }}
              >
                Back
              </button>
              <button className="btn btn-sm btn-error" disabled={isMining} onClick={reject}>
                Confirm reject
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 justify-end flex-wrap">
            <button className="btn btn-sm btn-outline btn-error" disabled={isMining} onClick={() => setRejecting(true)}>
              Reject
            </button>
            {!serialUsed && (
              <button className="btn btn-sm btn-success" disabled={isMining} onClick={approve}>
                {isMining ? <span className="loading loading-spinner loading-xs" /> : "Approve & issue NFT"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const PendingRequests = () => {
  const { address } = useAccount();
  const { data: requests } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "getAllRequests" });
  const pending = (requests ?? []).filter(r => r.status === 1 && sameAddress(r.partner, address));

  return (
    <div className="flex flex-col items-center grow px-4 py-10 gap-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl mb-2">Pending requests ({pending.length})</h1>
        <p className="opacity-80 m-0">
          Check the paper deed and the requester&apos;s ID first, then approve to issue the NFT.
        </p>
      </div>
      {pending.length === 0 ? (
        <p className="opacity-60">Nothing to review.</p>
      ) : (
        <div className="flex flex-col gap-4 w-full max-w-2xl">
          {pending.map(r => (
            <RequestReview key={r.id.toString()} request={r} />
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

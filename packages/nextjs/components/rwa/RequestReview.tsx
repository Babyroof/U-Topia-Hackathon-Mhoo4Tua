"use client";

import { useState } from "react";
import { Address } from "@scaffold-ui/components";
import { keccak256, toBytes } from "viem";
import { APPROVAL_CHECKLIST, ApprovalRecord } from "~~/components/rwa/ApprovalRecord";
import { DeedInfo } from "~~/components/rwa/DeedInfo";
import { DeedPhotos } from "~~/components/rwa/DeedPhotos";
import { REQUEST_BADGE, REQUEST_STATUS, assetIcon, formatTime } from "~~/components/rwa/utils";
import { useScaffoldReadContract, useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { type PhotoSide, decodeDeed } from "~~/utils/rwa/deed";

export type TokenizeRequest = {
  id: bigint;
  requester: string;
  partner: string;
  assetType: string;
  name: string;
  serial: string;
  details: string;
  status: number;
  tokenId: bigint;
  createdAt: bigint;
  rejectReason: string;
};

/** Full review of one request. Mount with key={id} so the reason and checklist never carry over to another request. */
export const RequestReview = ({ request }: { request: TokenizeRequest }) => {
  const { targetNetwork } = useTargetNetwork();
  const [checked, setChecked] = useState<boolean[]>(APPROVAL_CHECKLIST.map(() => false));
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
  const pending = request.status === 1;
  const allChecked = checked.every(Boolean);

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
      <div className="card-body gap-4">
        <div className="flex justify-between items-start gap-3">
          <h2 className="font-bold text-xl m-0">
            {assetIcon(request.assetType)} {request.name}
          </h2>
          <span className={`badge shrink-0 ${REQUEST_BADGE[request.status] ?? "badge-ghost"}`}>
            {REQUEST_STATUS[request.status]}
          </span>
        </div>
        <div className="text-sm flex items-center gap-2 flex-wrap">
          Requested by <Address address={request.requester} chain={targetNetwork} size="sm" />
          <span className="opacity-60">submitted {formatTime(request.createdAt)}</span>
        </div>
        <DeedInfo serial={request.serial} details={details} />
        {pending && (
          <p className={`text-sm m-0 ${serialUsed ? "text-error" : "text-success"}`}>
            {serialUsed
              ? "✗ This deed number already has an NFT. It cannot be approved."
              : "✓ This deed number has never been issued an NFT"}
          </p>
        )}
        <DeedPhotos requestId={request.id} sides={sides} />

        {request.status === 2 && (
          <ApprovalRecord
            requestId={request.id}
            partner={request.partner}
            tokenId={request.tokenId}
            details={request.details}
          />
        )}
        {request.status === 3 && <p className="text-error m-0">Rejected: {request.rejectReason}</p>}

        {pending && !serialUsed && (
          <div className="flex flex-col gap-1 bg-base-200 rounded-lg p-3">
            <span className="font-semibold text-sm">Before approving, confirm:</span>
            {APPROVAL_CHECKLIST.map((item, i) => (
              <label key={item} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm checkbox-primary"
                  checked={checked[i]}
                  onChange={e => setChecked(c => c.map((v, j) => (j === i ? e.target.checked : v)))}
                />
                {item}
              </label>
            ))}
          </div>
        )}

        {pending &&
          (rejecting ? (
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
            <div className="flex gap-2 justify-end items-center flex-wrap">
              {!serialUsed && !allChecked && (
                <span className="text-xs opacity-60">Tick all three checks to approve</span>
              )}
              <button
                className="btn btn-sm btn-outline btn-error"
                disabled={isMining}
                onClick={() => setRejecting(true)}
              >
                Reject
              </button>
              {!serialUsed && (
                <button className="btn btn-sm btn-success" disabled={isMining || !allChecked} onClick={approve}>
                  {isMining ? <span className="loading loading-spinner loading-xs" /> : "Approve & issue NFT"}
                </button>
              )}
            </div>
          ))}
      </div>
    </div>
  );
};

"use client";

import { useState } from "react";
import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { REQUEST_BADGE, REQUEST_STATUS, assetIcon, formatTime, sameAddress } from "~~/components/rwa/utils";
import { useScaffoldReadContract, useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

const PartnerPage: NextPage = () => {
  const { address } = useAccount();
  const { targetNetwork } = useTargetNetwork();

  const { data: isPartner } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "isPartner",
    args: [address],
  });
  const { data: myName } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "partnerName",
    args: [address],
  });
  const { data: requests } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "getAllRequests" });

  const { data: redemptions } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "getAllRedemptions",
  });
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "RWAToken" });
  const handovers = (redemptions ?? []).filter(r => r.status === 1 && sameAddress(r.issuer, address));

  const confirmHandover = async (id: bigint) => {
    try {
      await writeContractAsync({ functionName: "confirmRedeem", args: [id] });
    } catch (e) {
      console.error("confirmRedeem failed", e);
    }
  };

  const [rejectReason, setRejectReason] = useState("Could not verify the original");

  const mine = (requests ?? []).filter(r => sameAddress(r.partner, address));
  const pending = mine.filter(r => r.status === 1);
  const processed = mine
    .filter(r => r.status !== 1)
    .slice()
    .reverse();

  const approve = async (id: bigint) => {
    try {
      await writeContractAsync({ functionName: "approveRequest", args: [id] });
    } catch (e) {
      console.error("approveRequest failed", e);
    }
  };

  const reject = async (id: bigint) => {
    try {
      await writeContractAsync({ functionName: "rejectRequest", args: [id, rejectReason] });
    } catch (e) {
      console.error("rejectRequest failed", e);
    }
  };

  if (address && isPartner === false) {
    return (
      <div className="flex flex-col items-center grow px-4 py-16">
        <div className="w-full max-w-xl card bg-base-100 border border-base-300">
          <div className="card-body">
            <h1 className="text-3xl m-0">Partner desk</h1>
            <p className="opacity-80">
              This desk is for verified custodians who check real items and issue tokens. This wallet isn&apos;t a
              partner. The platform admin can add partners from the Admin page.
            </p>
            <div className="flex gap-2">
              <Link href="/vault" className="btn btn-primary btn-sm">
                Go to my vault
              </Link>
              <Link href="/tokenize" className="btn btn-ghost btn-sm">
                Tokenize an asset
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center grow px-4 py-10 gap-8">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl mb-2">Partner desk</h1>
        <p className="opacity-80">
          Verify the real item or document off-chain, void or stamp the paper original, then approve to mint the NFT.
        </p>
        {address && (
          <div className={`badge mt-3 ${isPartner ? "badge-success" : "badge-error"}`}>
            {isPartner ? `Signed in as partner: ${myName || "Partner"}` : "This wallet is not an approved partner"}
          </div>
        )}
      </div>

      <div className="w-full max-w-2xl">
        <h2 className="text-2xl mb-3">Pending requests ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="opacity-60">Nothing to review.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map(r => (
              <div key={r.id.toString()} className="card bg-base-100 border border-base-300">
                <div className="card-body gap-2">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h3 className="font-bold text-lg">
                        {assetIcon(r.assetType)} {r.name}
                      </h3>
                      <p className="text-sm opacity-70">
                        {r.assetType}, no. <span className="serial">{r.serial}</span>, requested{" "}
                        {formatTime(r.createdAt)}
                      </p>
                    </div>
                    <span className="badge badge-warning">Pending</span>
                  </div>
                  <div className="text-sm flex items-center gap-2 flex-wrap">
                    Requested by <Address address={r.requester} chain={targetNetwork} size="sm" />
                  </div>
                  {r.imageURI && (
                    <a className="link text-sm" href={r.imageURI} target="_blank" rel="noreferrer">
                      View photo
                    </a>
                  )}
                  <div className="flex gap-2 justify-end mt-2 flex-wrap">
                    <input
                      className="input input-bordered input-sm grow min-w-0"
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      aria-label="Reject reason"
                    />
                    <button
                      className="btn btn-sm btn-outline btn-error"
                      disabled={isMining}
                      onClick={() => reject(r.id)}
                    >
                      Reject
                    </button>
                    <button className="btn btn-sm btn-success" disabled={isMining} onClick={() => approve(r.id)}>
                      Approve & mint NFT
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-full max-w-2xl">
        <h2 className="text-2xl mb-3">Handover requests ({handovers.length})</h2>
        {handovers.length === 0 ? (
          <p className="opacity-60">No one is waiting to collect an item.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {handovers.map(r => (
              <div key={r.id.toString()} className="card bg-base-100 border border-base-300">
                <div className="card-body gap-2 p-5">
                  <div className="flex justify-between items-start gap-3">
                    <h3 className="text-xl m-0">Token #{r.tokenId.toString()}</h3>
                    <span className="badge badge-warning">Waiting for handover</span>
                  </div>
                  <div className="text-sm flex items-center gap-2 flex-wrap">
                    Holder <Address address={r.holder} chain={targetNetwork} size="sm" />
                    <span className="opacity-60">requested {formatTime(r.requestedAt)}</span>
                  </div>
                  <p className="text-sm opacity-70 m-0">
                    Check the holder&apos;s ID, hand over the item, then confirm. Confirming burns the token for good.
                  </p>
                  <div className="flex justify-end">
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={isMining}
                      onClick={() => confirmHandover(r.id)}
                    >
                      Item handed over, burn token
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
                    No. {r.serial}
                    {r.status === 2 && `, token #${r.tokenId.toString()}`}
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

export default PartnerPage;

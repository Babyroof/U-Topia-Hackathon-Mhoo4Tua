"use client";

import { useEffect, useState } from "react";
import { AddressInput } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import { LAND, REQUEST_BADGE, REQUEST_STATUS, assetIcon, formatTime, sameAddress } from "~~/components/rwa/utils";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const TokenizePage: NextPage = () => {
  const { address } = useAccount();

  const [partner, setPartner] = useState("");
  const [name, setName] = useState("");
  const [serial, setSerial] = useState("");
  const [imageURI, setImageURI] = useState("");

  const { data: partners } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "getPartners" });
  // Default the partner field to the first partner the platform registered
  useEffect(() => {
    if (!partner && partners && partners.length > 0) setPartner(partners[0]);
  }, [partners, partner]);

  const partnerAddress = isAddress(partner) ? partner : undefined;
  const { data: isPartner } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "isPartner",
    args: [partnerAddress],
  });
  const { data: partnerName } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "partnerName",
    args: [partnerAddress],
  });
  const { data: requests } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "getAllRequests" });

  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "RWAToken" });

  const assetType = LAND.value;
  const canSubmit = !!address && !!partnerAddress && !!isPartner && name.trim() !== "" && serial.trim() !== "";

  const handleSubmit = async () => {
    if (!partnerAddress) return;
    try {
      await writeContractAsync({
        functionName: "requestTokenize",
        args: [partnerAddress, assetType, name.trim(), serial.trim(), imageURI.trim()],
      });
      setName("");
      setSerial("");
      setImageURI("");
    } catch (e) {
      console.error("requestTokenize failed", e);
    }
  };

  const myRequests = (requests ?? [])
    .filter(r => sameAddress(r.requester, address))
    .slice()
    .reverse();

  return (
    <div className="flex flex-col items-center grow px-4 py-10 gap-8">
      <div className="w-full max-w-xl">
        <h1 className="text-4xl mb-2">Tokenize an asset</h1>
        <p className="opacity-80">
          Ask a trusted partner to verify your real item. Once approved, one NFT (1:1) is minted to your wallet.
        </p>
      </div>

      <div className="card bg-base-100 border border-base-300 w-full max-w-xl">
        <div className="card-body gap-4">
          <div className="flex items-center gap-3 bg-base-200 rounded-lg px-4 py-3">
            <span className="text-2xl" aria-hidden>
              {LAND.icon}
            </span>
            <div>
              <p className="m-0 font-semibold">Land title deed</p>
              <p className="m-0 text-xs opacity-70">The paper deed is held by the partner once the token is issued.</p>
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className="label-text font-semibold">Plot description</span>
            <input
              className="input input-bordered w-full"
              placeholder={LAND.namePlaceholder}
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="label-text font-semibold">{LAND.serialLabel}</span>
            <input
              className="input input-bordered w-full"
              placeholder="e.g. 12345"
              value={serial}
              onChange={e => setSerial(e.target.value)}
            />
            <span className="text-xs opacity-60">Each number can be tokenized only once, ever.</span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="label-text font-semibold">Photo link (optional)</span>
            <input
              className="input input-bordered w-full"
              placeholder="https://..."
              value={imageURI}
              onChange={e => setImageURI(e.target.value)}
            />
          </label>

          <div className="flex flex-col gap-1">
            <span className="label-text font-semibold">Verifying partner</span>
            <AddressInput value={partner} onChange={setPartner} placeholder="Partner address" />
            {partnerAddress && (
              <span className={`text-sm ${isPartner ? "text-success" : "text-error"}`}>
                {isPartner ? `✓ ${partnerName || "Approved partner"}` : "✗ This address is not an approved partner"}
              </span>
            )}
          </div>

          <button className="btn btn-primary mt-2" disabled={!canSubmit || isMining} onClick={handleSubmit}>
            {isMining ? <span className="loading loading-spinner loading-sm" /> : "Request tokenization"}
          </button>
          {!address && <p className="text-sm text-center opacity-70">Connect your wallet to continue.</p>}
        </div>
      </div>

      <ol className="w-full max-w-xl list-decimal pl-5 text-sm opacity-80 flex flex-col gap-1 m-0">
        <li>You send this request. Nothing is minted yet.</li>
        <li>You bring the item or document to the partner. They check it and your ID.</li>
        <li>The partner approves. One token appears in My Vault, and the paper original is stamped void.</li>
      </ol>

      <div className="w-full max-w-xl">
        <h2 className="text-2xl mb-3">My requests</h2>
        {myRequests.length === 0 ? (
          <p className="opacity-60">No requests yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {myRequests.map(r => (
              <div key={r.id.toString()} className="flex items-center justify-between bg-base-100 rounded-xl px-4 py-3">
                <div>
                  <div className="font-semibold">
                    {assetIcon(r.assetType)} {r.name}
                  </div>
                  <div className="text-xs opacity-60">
                    No. {r.serial}, requested {formatTime(r.createdAt)}
                    {r.status === 2 && `, token #${r.tokenId.toString()}`}
                  </div>
                </div>
                <span className={`badge ${REQUEST_BADGE[r.status] ?? "badge-ghost"}`}>
                  {REQUEST_STATUS[r.status] ?? "?"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenizePage;

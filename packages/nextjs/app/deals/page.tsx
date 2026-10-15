"use client";

import { useState } from "react";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { DEAL_BADGE, DEAL_STATUS, assetIcon, formatCountdown, formatTime, sameAddress } from "~~/components/rwa/utils";
import { useChainNow } from "~~/hooks/rwa/useChainNow";
import { useScaffoldReadContract, useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

type Deal = {
  id: bigint;
  from: string;
  to: string;
  tokenId: bigint;
  unlockTime: bigint;
  status: number;
  createdAt: bigint;
};

const DealCard = ({ deal }: { deal: Deal }) => {
  const { address } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const chainNow = useChainNow();

  // getAsset reverts if the NFT was later redeemed (burned); then we just show the id
  const { data: asset } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "getAsset",
    args: [deal.tokenId],
  });
  const { data: canRelease } = useScaffoldReadContract({
    contractName: "ConditionalVault",
    functionName: "canRelease",
    args: [deal.id],
  });
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "ConditionalVault" });

  const secondsLeft = Number(deal.unlockTime) - chainNow;
  const isLocked = deal.status === 1;
  const isSender = sameAddress(deal.from, address);
  const isReceiver = sameAddress(deal.to, address);

  const release = async () => {
    try {
      await writeContractAsync({ functionName: "release", args: [deal.id] });
    } catch (e) {
      console.error("release failed", e);
    }
  };
  const cancel = async () => {
    try {
      await writeContractAsync({ functionName: "cancel", args: [deal.id] });
    } catch (e) {
      console.error("cancel failed", e);
    }
  };

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body gap-3 p-5">
        <div className="flex justify-between items-start gap-2">
          <div>
            <h3 className="text-xl m-0">
              {assetIcon(asset?.assetType)} {asset?.name ?? `NFT #${deal.tokenId.toString()}`}
            </h3>
            {asset && (
              <p className="text-xs opacity-60">
                {asset.assetType}, no. <span className="serial">{asset.serial}</span>
              </p>
            )}
          </div>
          <span className={`badge ${DEAL_BADGE[deal.status] ?? "badge-ghost"}`}>{DEAL_STATUS[deal.status] ?? "?"}</span>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm items-center">
          <span className="opacity-60">From</span>
          <span className="flex items-center gap-1">
            <Address address={deal.from} chain={targetNetwork} size="sm" />
            {isSender && <span className="badge badge-xs">you</span>}
          </span>
          <span className="opacity-60">To</span>
          <span className="flex items-center gap-1">
            <Address address={deal.to} chain={targetNetwork} size="sm" />
            {isReceiver && <span className="badge badge-xs">you</span>}
          </span>
          <span className="opacity-60">Unlocks</span>
          <span>{formatTime(deal.unlockTime)}</span>
        </div>

        {isLocked && (
          <div className="flex items-center justify-between bg-base-200 rounded-xl px-4 py-3">
            <span className="text-sm opacity-70">
              {secondsLeft > 0 ? "Releases automatically in" : "Releasing to receiver…"}
            </span>
            <span className="font-display text-2xl">{formatCountdown(secondsLeft)}</span>
          </div>
        )}

        {isLocked && (
          <div className="card-actions justify-end">
            {isSender && secondsLeft > 0 && (
              <button className="btn btn-sm btn-ghost" disabled={isMining} onClick={cancel}>
                Cancel & take back
              </button>
            )}
            <button className="btn btn-sm btn-primary" disabled={!canRelease || isMining} onClick={release}>
              {isMining ? <span className="loading loading-spinner loading-xs" /> : "Release now"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const TABS = ["Incoming", "Sent by me", "All"] as const;

const DealsPage: NextPage = () => {
  const { address } = useAccount();
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const { data: deals } = useScaffoldReadContract({ contractName: "ConditionalVault", functionName: "getAllDeals" });

  const list = (deals ?? [])
    .filter(d =>
      tab === "Incoming" ? sameAddress(d.to, address) : tab === "Sent by me" ? sameAddress(d.from, address) : true,
    )
    .slice()
    .reverse();

  return (
    <div className="flex flex-col items-center grow px-4 py-10 gap-6">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl mb-2">Conditional transfers</h1>
        <p className="opacity-80">
          Each asset stays locked until its date, then goes to the receiver on its own. Nobody, the sender included, can
          sell or pledge it in the meantime.
        </p>
      </div>

      <div role="tablist" className="tabs tabs-box self-start md:self-center">
        {TABS.map(t => (
          <button key={t} role="tab" className={`tab ${tab === t ? "tab-active" : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="opacity-60">No transfers here yet.</p>
      ) : (
        <div className="grid gap-4 w-full max-w-4xl md:grid-cols-2">
          {list.map(d => (
            <DealCard key={d.id.toString()} deal={d} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DealsPage;

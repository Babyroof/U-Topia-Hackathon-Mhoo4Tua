"use client";

import { useState } from "react";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { AssetIcon } from "~~/components/rwa/AssetIcon";
import { DealSteps } from "~~/components/rwa/FlowSteps";
import { RegistrationStatus } from "~~/components/rwa/RegistrationStatus";
import { DEAL_BADGE, DEAL_STATUS, formatCountdown, formatTime, sameAddress } from "~~/components/rwa/utils";
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
  deadline: bigint;
  price: bigint;
  paid: boolean;
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
  const isSale = deal.price > 0n;
  const priceText = `${formatEther(deal.price)} AVAX`;
  const awaitingPayment = isLocked && isSale && !deal.paid;
  const deadlinePassed = chainNow > Number(deal.deadline);
  const canPay = awaitingPayment && isReceiver && !deadlinePassed;
  const canReclaim = awaitingPayment && isSender && deadlinePassed;
  const canCancel = isLocked && isSender && secondsLeft > 0 && !deal.paid;

  const release = async () => {
    try {
      await writeContractAsync({ functionName: "release", args: [deal.id] });
    } catch (e) {
      console.error("release failed", e);
    }
  };
  const pay = async () => {
    try {
      await writeContractAsync({ functionName: "pay", args: [deal.id], value: deal.price });
    } catch (e) {
      console.error("pay failed", e);
    }
  };
  const reclaim = async () => {
    try {
      await writeContractAsync({ functionName: "reclaim", args: [deal.id] });
    } catch (e) {
      console.error("reclaim failed", e);
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
              <AssetIcon assetType={asset?.assetType} /> {asset?.name ?? `NFT #${deal.tokenId.toString()}`}
            </h3>
            {asset && (
              <p className="text-xs opacity-60">
                {asset.assetType}, no. <span className="serial">{asset.serial}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`badge ${DEAL_BADGE[deal.status] ?? "badge-ghost"}`}>
              {DEAL_STATUS[deal.status] ?? "?"}
            </span>
            {isSale && (
              <span className={`badge badge-sm ${deal.paid ? "badge-success" : "badge-warning badge-outline"}`}>
                {deal.paid ? "Paid" : "Awaiting payment"}
              </span>
            )}
          </div>
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
          {isSale && (
            <>
              <span className="opacity-60">Price</span>
              <span className="font-semibold">{priceText}</span>
              <span className="opacity-60">Pay by</span>
              <span>{formatTime(deal.deadline)}</span>
            </>
          )}
        </div>

        {isLocked &&
          (awaitingPayment && deadlinePassed ? (
            <div className="flex items-center justify-between bg-base-200 rounded-xl px-4 py-3">
              <span className="text-sm opacity-70">
                Payment deadline passed.{isSender ? " You can take the deed back." : ""}
              </span>
            </div>
          ) : awaitingPayment ? (
            <div className="flex items-center justify-between gap-3 bg-base-200 rounded-xl px-4 py-3">
              <span className="text-sm opacity-70">
                {secondsLeft > 0
                  ? "Moves once it's paid and the date is reached. Date reached in"
                  : "The date is reached. Moves as soon as it's paid. Payment closes in"}
              </span>
              <span className="font-bold text-2xl tabular-nums whitespace-nowrap">
                {formatCountdown(secondsLeft > 0 ? secondsLeft : Number(deal.deadline) - chainNow)}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-base-200 rounded-xl px-4 py-3">
              <span className="text-sm opacity-70">
                {secondsLeft > 0 ? "Unlocks automatically in" : "Unlocking now…"}
              </span>
              <span className="font-bold text-2xl tabular-nums">{formatCountdown(secondsLeft)}</span>
            </div>
          ))}

        <DealSteps deal={deal} now={chainNow} viewer={isSender ? "sender" : isReceiver ? "receiver" : "other"} />
        {deal.status === 2 && isReceiver && <RegistrationStatus tokenId={deal.tokenId} />}

        {isLocked && (canCancel || canPay || canReclaim || canRelease) && (
          <div className="card-actions justify-end items-center">
            {canCancel && (
              <button className="btn btn-sm btn-ghost" disabled={isMining} onClick={cancel}>
                Cancel & take back
              </button>
            )}
            {canReclaim && (
              <button className="btn btn-sm btn-outline" disabled={isMining} onClick={reclaim}>
                {isMining ? <span className="loading loading-spinner loading-xs" /> : "Take it back"}
              </button>
            )}
            {canPay && (
              <button className="btn btn-sm btn-primary" disabled={isMining} onClick={pay}>
                {isMining ? <span className="loading loading-spinner loading-xs" /> : `Pay ${priceText}`}
              </button>
            )}
            {canRelease && (
              <>
                <span className="text-xs opacity-60">Normally the system releases it automatically.</span>
                <button className="btn btn-sm btn-primary" disabled={isMining} onClick={release}>
                  {isMining ? <span className="loading loading-spinner loading-xs" /> : "Release now"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const TABS = ["Incoming", "Sent by me"] as const;

const DealsPage: NextPage = () => {
  const { address } = useAccount();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Incoming");
  const { data: deals } = useScaffoldReadContract({ contractName: "ConditionalVault", functionName: "getAllDeals" });

  const list = (deals ?? [])
    .filter(d => (tab === "Incoming" ? sameAddress(d.to, address) : sameAddress(d.from, address)))
    .slice()
    .reverse();

  return (
    <div className="flex flex-col items-center grow px-4 py-10 gap-6">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl mb-2">My deals</h1>
        <p className="opacity-80">
          Each asset stays locked until its date, then goes to the receiver on its own. For a sale, it moves once the
          buyer has paid too, and the AVAX goes to the seller in the same step. Nobody, the sender included, can sell or
          pledge it in the meantime.
        </p>
      </div>

      <div role="tablist" className="tabs tabs-box self-start md:self-center">
        {TABS.map(t => (
          <button key={t} role="tab" className={`tab ${tab === t ? "tab-active" : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {!address ? (
        <p className="opacity-70">Connect your wallet to see your deals.</p>
      ) : list.length === 0 ? (
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import { Certificate } from "~~/components/rwa/Certificate";
import { InfoTip } from "~~/components/rwa/Field";
import { RegistrationStatus } from "~~/components/rwa/RegistrationStatus";
import { SendDealForm } from "~~/components/rwa/SendDealForm";
import { useScaffoldReadContract, useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

export const WITHDRAW_INFO =
  "Withdraw from the system: the partner confirms, the NFT is burned and the paper deed is the only record again. Only the holder can do this, and not while the deed is locked in a deal.";

export const AssetCard = ({ tokenId, intent }: { tokenId: bigint; intent?: "send" | "sell" }) => {
  const { targetNetwork } = useTargetNetwork();
  const { data: asset } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "getAsset",
    args: [tokenId],
  });
  const { data: issuerName } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "partnerName",
    args: [asset?.issuer],
  });
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "RWAToken" });
  const [mode, setMode] = useState<"idle" | "send" | "withdraw">(intent ? "send" : "idle");

  // chosen from "What can you do next?": open the transfer form on this deed
  useEffect(() => {
    if (intent) setMode("send");
  }, [intent]);

  const withdraw = async () => {
    try {
      await writeContractAsync({ functionName: "requestRedeem", args: [tokenId] });
    } catch (e) {
      console.error("requestRedeem failed", e);
    }
  };

  return (
    <Certificate
      tokenId={tokenId}
      assetType={asset?.assetType}
      name={asset?.name}
      serial={asset?.serial}
      issuerName={issuerName}
      issuedAt={asset?.issuedAt}
      issuer={asset && <Address address={asset.issuer} chain={targetNetwork} size="xs" />}
    >
      <RegistrationStatus tokenId={tokenId} />
      <Link href={`/deed/${tokenId}`} className="link text-sm self-start">
        View details & history
      </Link>

      {mode === "idle" && (
        <div className="flex gap-2 justify-end flex-wrap">
          <button className="btn btn-sm btn-ghost" onClick={() => setMode("withdraw")}>
            Withdraw from the system
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => setMode("send")}>
            Send with a condition
          </button>
        </div>
      )}

      {mode === "send" && (
        <SendDealForm
          key={intent ?? "send"}
          tokenId={tokenId}
          serial={asset?.serial}
          startAsSale={intent === "sell"}
          onClose={() => setMode("idle")}
        />
      )}

      {mode === "withdraw" && (
        <div className="flex flex-col gap-2 bg-warning/10 rounded-lg p-3">
          <p className="text-sm m-0 flex items-start gap-1">
            <span>
              <b>{issuerName || "The partner"}</b> checks your ID and confirms. Then the NFT is burned and the paper
              deed is the only record again. The NFT is held while you wait; you can cancel until the partner confirms.
            </span>
            <InfoTip text={WITHDRAW_INFO} />
          </p>
          <div className="flex gap-2 justify-end">
            <button className="btn btn-sm btn-ghost" onClick={() => setMode("idle")} disabled={isMining}>
              Back
            </button>
            <button className="btn btn-sm btn-warning" disabled={isMining} onClick={withdraw}>
              {isMining ? <span className="loading loading-spinner loading-xs" /> : "Request withdrawal"}
            </button>
          </div>
        </div>
      )}
    </Certificate>
  );
};

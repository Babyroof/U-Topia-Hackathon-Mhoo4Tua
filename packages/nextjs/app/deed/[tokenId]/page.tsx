"use client";

import { useParams } from "next/navigation";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { DeedInfo } from "~~/components/rwa/DeedInfo";
import { RegistrationStatus } from "~~/components/rwa/RegistrationStatus";
import { Timeline } from "~~/components/rwa/Timeline";
import { formatTime } from "~~/components/rwa/utils";
import { useDeedTimeline } from "~~/hooks/rwa/useDeedTimeline";
import { useScaffoldReadContract, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { decodeDeed } from "~~/utils/rwa/deed";

const DeedPage: NextPage = () => {
  const { tokenId: raw } = useParams<{ tokenId: string }>();
  const tokenId = /^\d{1,9}$/.test(raw ?? "") ? BigInt(raw) : undefined;
  const { targetNetwork } = useTargetNetwork();
  const timeline = useDeedTimeline();

  const { data: exists } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "exists",
    args: [tokenId],
  });
  const { data: asset } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "getAsset",
    args: [exists ? tokenId : undefined],
  });
  const { data: owner } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "ownerOf",
    args: [exists ? tokenId : undefined],
  });
  const { data: issuerName } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "partnerName",
    args: [asset?.issuer],
  });

  const entries = tokenId === undefined ? [] : timeline.filter(e => e.tokenId === tokenId);

  return (
    <div className="flex flex-col items-center grow px-4 py-10 gap-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl mb-2">{asset?.name ?? `Deed NFT #${raw}`}</h1>
        {exists === false && <p className="opacity-70">This NFT does not exist or was withdrawn from the system.</p>}
      </div>
      {asset && tokenId !== undefined && (
        <div className="card bg-base-100 border border-base-300 w-full max-w-2xl">
          <div className="card-body gap-3">
            <DeedInfo serial={asset.serial} details={decodeDeed(asset.details)} />
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm items-center">
              <span className="opacity-60">Held by</span>
              {owner && <Address address={owner} chain={targetNetwork} size="sm" />}
              <span className="opacity-60">Issued by</span>
              <span>
                {issuerName || "Partner"} on {formatTime(asset.issuedAt)}
              </span>
            </div>
            <RegistrationStatus tokenId={tokenId} />
          </div>
        </div>
      )}
      <div className="w-full max-w-2xl">
        <h2 className="text-2xl mb-3">History</h2>
        <Timeline entries={entries} />
      </div>
    </div>
  );
};

export default DeedPage;

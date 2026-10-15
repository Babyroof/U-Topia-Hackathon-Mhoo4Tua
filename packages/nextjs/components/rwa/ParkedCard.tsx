"use client";

import { Certificate } from "~~/components/rwa/Certificate";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

/** An asset the owner asked to collect: held by the contract until the partner confirms the handover. */
export const ParkedCard = ({ redemptionId, tokenId }: { redemptionId: bigint; tokenId: bigint }) => {
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

  const cancel = async () => {
    try {
      await writeContractAsync({ functionName: "cancelRedeem", args: [redemptionId] });
    } catch (e) {
      console.error("cancelRedeem failed", e);
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
      imageURI={asset?.imageURI}
      stampText="Awaiting handover"
    >
      <p className="text-sm m-0">
        Collect the item from <b>{issuerName || "the partner"}</b>. They burn this token once it&apos;s in your hands.
        Only they can do that.
      </p>
      <div className="flex justify-end">
        <button className="btn btn-sm btn-ghost" disabled={isMining} onClick={cancel}>
          Keep it in my vault instead
        </button>
      </div>
    </Certificate>
  );
};

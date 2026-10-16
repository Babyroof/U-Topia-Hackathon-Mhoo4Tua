"use client";

import { Address } from "@scaffold-ui/components";
import { formatTime } from "~~/components/rwa/utils";
import { useScaffoldEventHistory, useScaffoldReadContract, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { decodeDeed } from "~~/utils/rwa/deed";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-eth";

export const APPROVAL_CHECKLIST = [
  "The deed matches the land office register",
  "The requester is the registered owner (ID checked)",
  "No encumbrance on the deed (mortgage, seizure)",
];

/**
 * Who approved a request, when, what they confirmed, and the hashes of the deed photos they checked.
 * Everything is read from the chain; the checklist is enforced by the partner page before approval is possible.
 */
export const ApprovalRecord = ({
  requestId,
  partner,
  tokenId,
  details,
}: {
  requestId: bigint;
  partner: string;
  tokenId: bigint;
  details: string;
}) => {
  const { targetNetwork } = useTargetNetwork();
  const { data: partnerName } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "partnerName",
    args: [partner],
  });
  // getLogs is fine at demo scale on Fuji; production would read these from an indexer (e.g. Ponder)
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const { data: events } = useScaffoldEventHistory({
    contractName: "RWAToken",
    eventName: "RequestApproved",
    filters: { requestId },
    blockData: true,
  });
  const approval = events?.[0] as { transactionHash?: string; blockData?: { timestamp: bigint } } | undefined;
  const txLink = approval?.transactionHash
    ? getBlockExplorerTxLink(targetNetwork.id, approval.transactionHash) ||
      `/blockexplorer/transaction/${approval.transactionHash}`
    : "";
  const photos = Object.entries(decodeDeed(details)?.photos ?? {});

  return (
    <div className="flex flex-col gap-2 bg-success/5 border border-success/30 rounded-lg p-3 text-sm">
      <span className="font-semibold">Approval record · NFT #{tokenId.toString()}</span>
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 items-center">
        <span className="opacity-60">Approved by</span>
        <span className="flex items-center gap-2 flex-wrap">
          {partnerName || "Partner"} <Address address={partner} chain={targetNetwork} size="xs" />
        </span>
        <span className="opacity-60">Approved at</span>
        <span>
          {approval?.blockData ? formatTime(approval.blockData.timestamp) : "…"}
          {txLink && (
            <a href={txLink} target="_blank" rel="noreferrer" className="link ml-2">
              View transaction ↗
            </a>
          )}
        </span>
      </div>
      <ul className="list-none p-0 m-0 flex flex-col gap-0.5">
        {APPROVAL_CHECKLIST.map(item => (
          <li key={item}>✓ {item}</li>
        ))}
      </ul>
      {photos.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className="opacity-60">Checked documents (sha256)</span>
          {photos.map(([side, photo]) => (
            <code key={side} className="text-xs break-all">
              {side}: {photo?.sha256}
            </code>
          ))}
        </div>
      )}
    </div>
  );
};

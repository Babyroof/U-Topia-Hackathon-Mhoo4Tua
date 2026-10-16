import { useMemo } from "react";
import { formatEther } from "viem";
import { useScaffoldEventHistory, useScaffoldReadContract, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-eth";

export type TimelineKind =
  | "requested"
  | "approved"
  | "rejected"
  | "dealCreated"
  | "paid"
  | "reclaimed"
  | "released"
  | "cancelled"
  | "registered"
  | "withdrawRequested"
  | "withdrawCancelled"
  | "withdrawn";

export type TimelineEntry = {
  key: string;
  kind: TimelineKind;
  text: string;
  time?: number;
  blockNumber: bigint;
  txLink: string;
  tokenId?: bigint;
  requestId?: bigint;
  /**
   * Wallets this event concerns, in a fixed order per kind:
   * requested/approved/rejected [requester] · deal kinds [sender, receiver] · paid [seller, buyer]
   * registered [new owner] · withdraw kinds [holder]
   */
  parties: string[];
  /** partner (issuer) this event concerns */
  partner?: string;
  /** conditional-transfer deal this event belongs to */
  dealId?: bigint;
  /** human name of the deed, e.g. "Deed no. 00000, …" */
  deedName?: string;
  /** paid events: amount in AVAX, formatted */
  amount?: string;
};

const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "?");

// getLogs is fine at demo scale on Fuji; production would read these from an indexer (e.g. Ponder)
const useEvents = (contractName: "RWAToken" | "ConditionalVault", eventName: string) =>
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  useScaffoldEventHistory({ contractName, eventName: eventName as any, watch: true, blockData: true } as any).data as
    | any[]
    | undefined;

/**
 * The life of every deed, from on-chain events: request → approve → deal A→B → unlock → registration (→ withdrawal).
 * Every entry has its time and a block-explorer (Snowtrace on Fuji) link.
 */
export const useDeedTimeline = () => {
  const { targetNetwork } = useTargetNetwork();
  const { data: requests } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "getAllRequests" });
  const { data: deals } = useScaffoldReadContract({ contractName: "ConditionalVault", functionName: "getAllDeals" });
  const { data: redemptions } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "getAllRedemptions",
  });

  const requested = useEvents("RWAToken", "TokenizeRequested");
  const approved = useEvents("RWAToken", "RequestApproved");
  const rejected = useEvents("RWAToken", "RequestRejected");
  const registered = useEvents("RWAToken", "RegistrationConfirmed");
  const withdrawRequested = useEvents("RWAToken", "RedeemRequested");
  const withdrawCancelled = useEvents("RWAToken", "RedeemCancelled");
  const withdrawn = useEvents("RWAToken", "Redeemed");
  const dealCreated = useEvents("ConditionalVault", "DealCreated");
  const released = useEvents("ConditionalVault", "Released");
  const cancelled = useEvents("ConditionalVault", "Cancelled");
  const paid = useEvents("ConditionalVault", "Paid");
  const reclaimed = useEvents("ConditionalVault", "Reclaimed");

  return useMemo(() => {
    const request = (id?: bigint) => (id === undefined ? undefined : requests?.[Number(id)]);
    const deal = (id?: bigint) => (id === undefined ? undefined : deals?.[Number(id)]);
    const redemption = (id?: bigint) => (id === undefined ? undefined : redemptions?.[Number(id)]);
    const issuerOf = (tokenId?: bigint) => requests?.find(r => r.status === 2 && r.tokenId === tokenId)?.partner;

    const entries: TimelineEntry[] = [];
    const add = (
      list: any[] | undefined,
      kind: TimelineKind,
      build: (args: any) => Omit<TimelineEntry, "key" | "kind" | "time" | "blockNumber" | "txLink">,
    ) =>
      (list ?? []).forEach(e => {
        if (!e?.args) return;
        entries.push({
          key: `${e.transactionHash}-${e.logIndex}`,
          kind,
          time: e.blockData ? Number(e.blockData.timestamp) : undefined,
          blockNumber: e.blockNumber,
          txLink: e.transactionHash
            ? getBlockExplorerTxLink(targetNetwork.id, e.transactionHash) ||
              `/blockexplorer/transaction/${e.transactionHash}`
            : "",
          ...build(e.args),
        });
      });

    add(requested, "requested", a => ({
      text: `Tokenize requested: ${request(a.requestId)?.name ?? `request #${a.requestId}`}`,
      requestId: a.requestId,
      parties: [a.requester],
      partner: a.partner,
    }));
    add(approved, "approved", a => ({
      text: `Approved by the partner, NFT #${a.tokenId} issued`,
      requestId: a.requestId,
      tokenId: a.tokenId,
      parties: [request(a.requestId)?.requester ?? ""],
      partner: request(a.requestId)?.partner,
    }));
    add(rejected, "rejected", a => ({
      text: `Rejected: ${a.reason}`,
      requestId: a.requestId,
      parties: [request(a.requestId)?.requester ?? ""],
      partner: request(a.requestId)?.partner,
    }));
    add(dealCreated, "dealCreated", a => ({
      dealId: a.id,
      text: `${a.price > 0n ? `Sale for ${formatEther(a.price)} AVAX` : "Deal"} created ${short(a.from)} → ${short(a.to)}, unlocks ${new Date(Number(a.unlockTime) * 1000).toLocaleString()}`,
      tokenId: a.tokenId,
      parties: [a.from, a.to],
      partner: issuerOf(a.tokenId),
    }));
    add(released, "released", a => ({
      dealId: a.id,
      text: `Unlocked: NFT moved to ${short(a.to)}, waiting for land-office registration`,
      tokenId: deal(a.id)?.tokenId,
      parties: [deal(a.id)?.from ?? "", a.to],
      partner: issuerOf(deal(a.id)?.tokenId),
    }));
    add(paid, "paid", a => ({
      dealId: a.id,
      text: `Paid ${formatEther(a.amount)} AVAX`,
      amount: formatEther(a.amount),
      tokenId: deal(a.id)?.tokenId,
      parties: [deal(a.id)?.from ?? "", a.payer],
      partner: issuerOf(deal(a.id)?.tokenId),
    }));
    add(reclaimed, "reclaimed", a => ({
      dealId: a.id,
      text: "Sale expired unpaid, NFT returned to the seller",
      tokenId: deal(a.id)?.tokenId,
      parties: [deal(a.id)?.from ?? "", deal(a.id)?.to ?? ""],
      partner: issuerOf(deal(a.id)?.tokenId),
    }));
    add(cancelled, "cancelled", a => ({
      dealId: a.id,
      text: "Deal cancelled, NFT returned to the sender",
      tokenId: deal(a.id)?.tokenId,
      parties: [deal(a.id)?.from ?? "", deal(a.id)?.to ?? ""],
      partner: issuerOf(deal(a.id)?.tokenId),
    }));
    add(registered, "registered", a => ({
      text: `Transfer registered at the land office for ${short(a.owner)}`,
      tokenId: a.tokenId,
      parties: [a.owner],
      partner: a.issuer,
    }));
    add(withdrawRequested, "withdrawRequested", a => ({
      text: "Withdrawal requested",
      tokenId: a.tokenId,
      parties: [a.holder],
      partner: issuerOf(a.tokenId),
    }));
    add(withdrawCancelled, "withdrawCancelled", a => ({
      text: "Withdrawal cancelled, NFT back with the holder",
      tokenId: a.tokenId,
      parties: [redemption(a.redemptionId)?.holder ?? ""],
      partner: issuerOf(a.tokenId),
    }));
    add(withdrawn, "withdrawn", a => ({
      text: "Withdrawn from the system: NFT burned, paper deed only",
      tokenId: a.tokenId,
      parties: [a.holder],
      partner: a.issuer,
    }));

    // link request events to the token they produced, so a deed's history starts at its request
    entries.forEach(e => {
      if (e.tokenId === undefined && e.requestId !== undefined) {
        const r = request(e.requestId);
        if (r?.status === 2) e.tokenId = r.tokenId;
      }
      const source =
        (e.requestId !== undefined ? request(e.requestId) : undefined) ??
        requests?.find(r => r.status === 2 && r.tokenId === e.tokenId);
      e.deedName = source?.name ?? (e.tokenId !== undefined ? `Deed NFT #${e.tokenId}` : undefined);
    });

    return entries.sort((a, b) => Number(b.blockNumber - a.blockNumber) || b.key.localeCompare(a.key));
  }, [
    targetNetwork.id,
    requests,
    deals,
    redemptions,
    requested,
    approved,
    rejected,
    registered,
    withdrawRequested,
    withdrawCancelled,
    withdrawn,
    dealCreated,
    released,
    cancelled,
    paid,
    reclaimed,
  ]);
};

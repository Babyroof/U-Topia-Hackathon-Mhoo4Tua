import type { TimelineEntry } from "~~/hooks/rwa/useDeedTimeline";

const same = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "someone");

/**
 * What this event means for the wallet `me`, worded from their side; null when it isn't news for them.
 * Your own actions (you created the deal, you approved the request) are never notifications.
 */
export const notificationFor = (e: TimelineEntry, me: string): string | null => {
  const deed = e.deedName ?? "your deed";
  const [first, second] = e.parties;
  const isPartner = same(e.partner, me);

  switch (e.kind) {
    case "requested":
      return isPartner && !same(first, me) ? `New deed request from ${short(first)}: ${deed}` : null;
    case "approved":
      return same(first, me) ? `Approved: ${deed}. The NFT is in your vault.` : null;
    case "rejected":
      return same(first, me) ? `Rejected: ${deed}. ${e.text.replace(/^Rejected: /, "Reason: ")}` : null;
    case "dealCreated":
      return same(second, me) ? `${short(first)} locked ${deed} for you` : null;
    case "paid":
      return same(first, me) ? `${short(second)} paid ${e.amount ?? ""} AVAX for ${deed}` : null;
    case "released":
      if (same(second, me)) return `${deed} is now yours. Register the transfer at the land office.`;
      if (same(first, me)) return `${deed} was delivered to ${short(second)}`;
      if (isPartner) return `${deed} is waiting for transfer registration`;
      return null;
    case "cancelled":
      return same(second, me) ? `${short(first)} cancelled the deal for ${deed}` : null;
    case "reclaimed":
      return same(second, me) ? `The sale of ${deed} expired unpaid and went back to the seller` : null;
    case "registered":
      return same(first, me) && !isPartner ? `Transfer registered at the land office: ${deed}` : null;
    case "withdrawRequested":
      return isPartner && !same(first, me) ? `${short(first)} asked to withdraw ${deed}` : null;
    case "withdrawn":
      return same(first, me) && !isPartner ? `${deed} was withdrawn. The paper deed is the only record now.` : null;
    default:
      return null;
  }
};

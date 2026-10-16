"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { BellIcon } from "@heroicons/react/24/outline";
import { Timeline } from "~~/components/rwa/Timeline";
import { sameAddress } from "~~/components/rwa/utils";
import { type TimelineEntry, useDeedTimeline } from "~~/hooks/rwa/useDeedTimeline";

const storageKey = (address: string) => `rwa-seen-block-${address.toLowerCase()}`;

/** Events that are news for this wallet (as owner, receiver or partner). */
const relevant = (e: TimelineEntry, me: string) => {
  const isParty = e.parties.some(p => sameAddress(p, me));
  const isPartner = sameAddress(e.partner, me);
  switch (e.kind) {
    case "approved":
    case "rejected":
    case "registered":
      return isParty;
    case "dealCreated":
    case "cancelled":
    case "reclaimed":
      return sameAddress(e.parties[1], me);
    case "paid":
      return sameAddress(e.parties[0], me);
    case "released":
      return isParty || isPartner;
    case "requested":
    case "withdrawRequested":
      return isPartner;
    default:
      return false;
  }
};

export const NotificationBell = () => {
  const { address } = useAccount();
  const timeline = useDeedTimeline();
  const [seenBlock, setSeenBlock] = useState(0n);

  useEffect(() => {
    if (!address) return;
    try {
      setSeenBlock(BigInt(localStorage.getItem(storageKey(address)) ?? "0"));
    } catch {
      setSeenBlock(0n);
    }
  }, [address]);

  if (!address) return null;
  const mine = timeline.filter(e => relevant(e, address)).slice(0, 20);
  const unseen = mine.filter(e => e.blockNumber > seenBlock).length;

  const markSeen = () => {
    const latest = mine[0]?.blockNumber ?? seenBlock;
    setSeenBlock(latest);
    try {
      localStorage.setItem(storageKey(address), latest.toString());
    } catch {
      // storage blocked: the count just resets on reload
    }
  };

  return (
    <div className="dropdown dropdown-end mr-2">
      <button
        tabIndex={0}
        className="btn btn-ghost btn-sm btn-circle relative"
        aria-label="Notifications"
        onClick={markSeen}
      >
        <BellIcon className="h-5 w-5" />
        {unseen > 0 && <span className="badge badge-error badge-xs absolute -top-1 -right-1">{unseen}</span>}
      </button>
      <div
        tabIndex={0}
        className="dropdown-content z-30 mt-2 w-80 max-h-96 overflow-y-auto bg-base-100 border border-base-300 rounded-box p-4 shadow-lg"
      >
        <p className="font-semibold mb-3 mt-0">Notifications</p>
        <Timeline entries={mine} showDeedLink />
      </div>
    </div>
  );
};

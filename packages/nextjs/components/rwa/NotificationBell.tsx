"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { BellIcon } from "@heroicons/react/24/outline";
import { Timeline } from "~~/components/rwa/Timeline";
import { useDeedTimeline } from "~~/hooks/rwa/useDeedTimeline";
import { notificationFor } from "~~/utils/rwa/notifications";

const storageKey = (address: string) => `rwa-seen-block-${address.toLowerCase()}`;

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
  const mine = timeline
    .map(e => ({ ...e, text: notificationFor(e, address) ?? "" }))
    .filter(e => e.text)
    .slice(0, 20);
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
    <div className="dropdown dropdown-end">
      <button
        tabIndex={0}
        className="btn btn-circle bg-base-100 border-0 shadow-sm relative"
        aria-label="Notifications"
        onClick={markSeen}
      >
        <BellIcon className="h-5 w-5" />
        {unseen > 0 && <span className="badge badge-error badge-sm text-white absolute -top-1 -right-1">{unseen}</span>}
      </button>
      <div
        tabIndex={0}
        className="dropdown-content z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] max-h-96 overflow-y-auto bg-base-100 border border-base-300 rounded-box p-4 shadow-lg"
      >
        <p className="font-semibold mb-3 mt-0">Notifications</p>
        {mine.length === 0 ? (
          <p className="opacity-70 m-0">Nothing new for this wallet.</p>
        ) : (
          <Timeline entries={mine} showDeedLink />
        )}
      </div>
    </div>
  );
};

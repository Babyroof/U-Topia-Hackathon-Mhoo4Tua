"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { Timeline } from "~~/components/rwa/Timeline";
import { sameAddress } from "~~/components/rwa/utils";
import { useDeedTimeline } from "~~/hooks/rwa/useDeedTimeline";

const HistoryPage: NextPage = () => {
  const { address } = useAccount();
  const timeline = useDeedTimeline();
  const [deed, setDeed] = useState("all");

  const mine = timeline.filter(e => e.parties.some(p => sameAddress(p, address)) || sameAddress(e.partner, address));
  const deedIds = [...new Set(mine.filter(e => e.tokenId !== undefined).map(e => e.tokenId!.toString()))];
  const shown = deed === "all" ? mine : mine.filter(e => e.tokenId?.toString() === deed);

  return (
    <div className="flex flex-col items-center grow px-4 py-10 gap-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl mb-2">History</h1>
        <p className="opacity-80 m-0">
          The path of every deed you were part of: request → approval → deal → unlock → land-office registration. Each
          step links to the transaction on the block explorer.
        </p>
      </div>
      {!address ? (
        <p className="opacity-70">Connect your wallet to see your history.</p>
      ) : (
        <div className="w-full max-w-2xl flex flex-col gap-4">
          <select
            className="select select-bordered select-sm self-start"
            value={deed}
            onChange={e => setDeed(e.target.value)}
          >
            <option value="all">All deeds</option>
            {deedIds.map(id => (
              <option key={id} value={id}>
                Deed NFT #{id}
              </option>
            ))}
          </select>
          <Timeline entries={shown} showDeedLink />
        </div>
      )}
    </div>
  );
};

export default HistoryPage;

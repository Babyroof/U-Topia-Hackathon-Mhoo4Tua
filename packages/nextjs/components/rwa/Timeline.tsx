import Link from "next/link";
import { formatTime } from "~~/components/rwa/utils";
import type { TimelineEntry, TimelineKind } from "~~/hooks/rwa/useDeedTimeline";

const DOT: Record<TimelineKind, string> = {
  requested: "bg-info",
  approved: "bg-success",
  rejected: "bg-error",
  dealCreated: "bg-warning",
  released: "bg-success",
  cancelled: "bg-neutral",
  registered: "bg-primary",
  withdrawRequested: "bg-warning",
  withdrawCancelled: "bg-neutral",
  withdrawn: "bg-neutral",
};

/** A vertical list of on-chain events, newest first, each with its time and explorer link. */
export const Timeline = ({ entries, showDeedLink }: { entries: TimelineEntry[]; showDeedLink?: boolean }) =>
  entries.length === 0 ? (
    <p className="opacity-60">Nothing yet.</p>
  ) : (
    <ol className="list-none p-0 m-0 flex flex-col">
      {entries.map(e => (
        <li key={e.key} className="flex gap-3 border-l-2 border-base-300 pl-4 pb-4 relative">
          <span className={`absolute -left-[7px] top-1.5 w-3 h-3 rounded-full ${DOT[e.kind]}`} aria-hidden />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm">{e.text}</span>
            <span className="text-xs opacity-60 flex gap-2 flex-wrap">
              {e.time ? formatTime(e.time) : `block ${e.blockNumber}`}
              {e.txLink && (
                <a href={e.txLink} target="_blank" rel="noreferrer" className="link">
                  View transaction ↗
                </a>
              )}
              {showDeedLink && e.tokenId !== undefined && (
                <Link href={`/deed/${e.tokenId}`} className="link">
                  Deed NFT #{e.tokenId.toString()}
                </Link>
              )}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );

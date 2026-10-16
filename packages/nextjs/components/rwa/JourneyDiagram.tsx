"use client";

import { useAccount } from "wagmi";
import { sameAddress } from "~~/components/rwa/utils";
import { useDeedTimeline } from "~~/hooks/rwa/useDeedTimeline";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

type NodeState = "done" | "here" | "todo";
type NodeId =
  | "submit"
  | "approved"
  | "vault"
  | "keep"
  | "send"
  | "sendUnlock"
  | "sendRegistered"
  | "sell"
  | "sellPaid"
  | "sellUnlock"
  | "sellRegistered";

const LABELS: Record<NodeId, string> = {
  submit: "Submit",
  approved: "Approved",
  vault: "Deed in vault",
  keep: "Keep it (done)",
  send: "Send with a condition",
  sendUnlock: "Unlock",
  sendRegistered: "Registered",
  sell: "Sell",
  sellPaid: "Buyer pays",
  sellUnlock: "Unlock",
  sellRegistered: "Registered",
};

const SR: Record<NodeState, string> = { done: "completed", here: "you are here", todo: "not yet" };

/** Where the connected wallet is in the lifecycle: the furthest step reached on its latest path. */
const useJourney = (): Partial<Record<NodeId, NodeState>> => {
  const { address } = useAccount();
  const timeline = useDeedTimeline();
  const { data: requests } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "getAllRequests" });
  const { data: deals } = useScaffoldReadContract({ contractName: "ConditionalVault", functionName: "getAllDeals" });
  if (!address) return {};

  const mine = (requests ?? []).filter(r => sameAddress(r.requester, address));
  const reached: NodeId[] = [];
  if (mine.length) reached.push("submit");
  if (mine.some(r => r.status === 2)) reached.push("approved", "vault");

  const deal = [...(deals ?? [])]
    .reverse()
    .find(d => (sameAddress(d.from, address) || sameAddress(d.to, address)) && d.status !== 3 && d.status !== 4);
  if (deal) {
    const sale = deal.price > 0n;
    reached.push(sale ? "sell" : "send");
    if (sale && deal.paid) reached.push("sellPaid");
    if (deal.status === 2) {
      reached.push(sale ? "sellUnlock" : "sendUnlock");
      const released = timeline.find(e => e.kind === "released" && e.dealId === deal.id);
      const registered = timeline.some(
        e => e.kind === "registered" && e.tokenId === deal.tokenId && released && e.blockNumber >= released.blockNumber,
      );
      if (registered) reached.push(sale ? "sellRegistered" : "sendRegistered");
    }
  } else if (reached.includes("vault")) {
    reached.push("keep");
  }

  return Object.fromEntries(reached.map((id, i) => [id, i === reached.length - 1 ? "here" : "done"]));
};

const Node = ({ id, state = "todo" }: { id: NodeId; state?: NodeState }) => (
  <div
    className={`rounded-xl border px-3 py-2 text-sm text-center font-medium ${
      state === "here"
        ? "bg-primary text-primary-content border-primary shadow-md"
        : state === "done"
          ? "bg-primary/10 border-primary/30"
          : "bg-base-100 border-base-300 opacity-80"
    }`}
    aria-current={state === "here" ? "step" : undefined}
  >
    {LABELS[id]}
    <span className="sr-only"> ({SR[state]})</span>
  </div>
);

const Down = () => (
  <span className="text-center opacity-60 leading-none" aria-hidden>
    ↓
  </span>
);

/** Full deed lifecycle as a branching flow: Submit → Approved → Deed in vault, then keep / send / sell. */
export const JourneyDiagram = () => {
  const s = useJourney();
  const branch = (title: string, ids: NodeId[]) => (
    <li className="flex flex-col gap-1.5">
      <span className="sr-only">{title}:</span>
      {ids.map((id, i) => (
        <div key={id} className="flex flex-col gap-1.5">
          {i > 0 && <Down />}
          <Node id={id} state={s[id]} />
        </div>
      ))}
    </li>
  );

  return (
    <figure className="m-0 flex flex-col gap-2" aria-label="Deed lifecycle">
      <ol className="list-none p-0 m-0 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
        {(["submit", "approved", "vault"] as NodeId[]).map((id, i) => (
          <li key={id} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 sm:flex-1">
            {i > 0 && (
              <span className="text-center opacity-60" aria-hidden>
                <span className="sm:hidden">↓</span>
                <span className="hidden sm:inline">→</span>
              </span>
            )}
            <div className="sm:flex-1">
              <Node id={id} state={s[id]} />
            </div>
          </li>
        ))}
      </ol>
      <p className="text-center text-xs opacity-70 m-0" aria-hidden>
        then choose one ↓
      </p>
      <ul className="list-none p-0 m-0 grid gap-3 sm:grid-cols-3">
        {branch("Keep it", ["keep"])}
        {branch("Send with a condition", ["send", "sendUnlock", "sendRegistered"])}
        {branch("Sell", ["sell", "sellPaid", "sellUnlock", "sellRegistered"])}
      </ul>
      <figcaption className="text-xs opacity-70 mt-1">
        {Object.values(s).includes("here")
          ? "Highlighted: where you are now. Keeping the deed in your vault is a complete end state."
          : "Connect your wallet to see where you are. Keeping the deed in your vault is a complete end state."}
      </figcaption>
    </figure>
  );
};

"use client";

import { formatTime } from "~~/components/rwa/utils";
import type { TimelineEntry } from "~~/hooks/rwa/useDeedTimeline";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

type StepState = "done" | "current" | "failed" | "todo";
type Step = { label: string; state: StepState; time?: number };

const STEP_CLASS: Record<StepState, string> = {
  done: "step-primary",
  current: "step-primary",
  failed: "step-error",
  todo: "",
};

const SR_STATE: Record<StepState, string> = {
  done: "completed",
  current: "current stage",
  failed: "did not happen",
  todo: "not yet",
};

/** A small progress tracker: where this item is now (with times when known), plus what happens next. */
const Steps = ({ steps, next, title }: { steps: Step[]; next: string; title: string }) => (
  <div className="flex flex-col gap-2 bg-base-200/60 rounded-2xl p-3">
    <ol className="steps steps-horizontal w-full text-xs" aria-label={title}>
      {steps.map(s => (
        <li
          key={s.label}
          className={`step ${STEP_CLASS[s.state]} ${s.state === "current" ? "font-semibold" : ""}`}
          data-content={s.state === "done" ? "✓" : s.state === "failed" ? "✕" : undefined}
          aria-current={s.state === "current" ? "step" : undefined}
        >
          <span className="flex flex-col items-center">
            <span>{s.label}</span>
            <span className="sr-only">: {SR_STATE[s.state]}</span>
            {s.time ? <span className="opacity-70 font-normal">{formatTime(s.time)}</span> : null}
          </span>
        </li>
      ))}
    </ol>
    <p className="text-sm m-0">
      <span className="font-semibold">What&apos;s next: </span>
      {next}
    </p>
  </div>
);

const states = (count: number, current: number, failedAt?: number): StepState[] =>
  Array.from({ length: count }, (_, i) =>
    failedAt === i ? "failed" : i < current ? "done" : i === current ? "current" : "todo",
  );

/** Tokenize request: submitted → partner checks → NFT issued. */
export const RequestSteps = ({ status }: { status: number }) => {
  const labels = ["Submitted", "Partner checks", "NFT issued"];
  const s = status === 2 ? states(3, 3) : status === 3 ? states(3, 1, 1) : states(3, 1);
  const next =
    status === 2
      ? "Done. Your NFT is in My vault. You can now send it with a condition."
      : status === 3
        ? "The partner rejected it (see the reason). Fix the issue and submit a new request."
        : "Bring the paper deed and your ID to the partner. They check it, then approve here.";
  return <Steps title="Request progress" steps={labels.map((label, i) => ({ label, state: s[i] }))} next={next} />;
};

type DealLike = {
  tokenId: bigint;
  status: number;
  price: bigint;
  paid: boolean;
  unlockTime: bigint;
  deadline: bigint;
};

/**
 * Deal status timeline: Created → Condition met (or Buyer paid) → Unlocked → Transfer registered.
 * `events` are this deed's on-chain timeline entries, used for the times of each stage.
 * `viewer` decides the wording ("you" as sender or receiver).
 */
export const DealSteps = ({
  deal,
  now,
  viewer,
  events = [],
}: {
  deal: DealLike & { id: bigint; createdAt: bigint };
  now: number;
  viewer: "sender" | "receiver" | "other";
  events?: TimelineEntry[];
}) => {
  const { data: needsRegistration } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "needsRegistration",
    args: [deal.status === 2 ? deal.tokenId : undefined],
  });
  const isSale = deal.price > 0n;
  const unlockReached = now >= Number(deal.unlockTime);

  const forDeal = (kind: TimelineEntry["kind"]) => events.find(e => e.kind === kind && e.dealId === deal.id);
  const paidAt = forDeal("paid");
  const releasedAt = forDeal("released");
  const registeredAt =
    releasedAt &&
    events.find(e => e.kind === "registered" && e.tokenId === deal.tokenId && e.blockNumber >= releasedAt.blockNumber);

  let current: number;
  let failedAt: number | undefined;
  let next: string;

  if (deal.status === 3 || deal.status === 4) {
    current = 1;
    failedAt = 1;
    next =
      deal.status === 3
        ? "The sender cancelled before the unlock time. The deed went back to them."
        : "The buyer didn't pay in time. The deed went back to the seller.";
  } else if (deal.status === 2) {
    current = needsRegistration ? 3 : 4;
    next = needsRegistration
      ? viewer === "receiver"
        ? "Go to the land office to register the transfer. The partner then marks it as registered."
        : "The receiver registers the transfer at the land office; the partner then confirms it."
      : "Complete. The NFT and the land office register match.";
  } else if (isSale && !deal.paid) {
    current = 1;
    next =
      viewer === "receiver"
        ? "Pay the price before the payment deadline. The deed moves to you once paid and the date is reached."
        : "Waiting for the buyer to pay. If they don't pay by the deadline, you can take the deed back.";
  } else if (!unlockReached) {
    current = isSale ? 2 : 1;
    next = "Nothing to do. On the unlock date the deed moves to the receiver automatically.";
  } else {
    current = 2;
    next = "Unlocking now. The system releases it automatically within a minute.";
  }

  const st = states(4, current, failedAt);
  const conditionTime = isSale ? paidAt?.time : unlockReached ? Number(deal.unlockTime) : undefined;
  const steps: Step[] = [
    { label: "Created", state: st[0], time: Number(deal.createdAt) },
    {
      label: isSale ? "Buyer paid" : "Condition met",
      state: st[1],
      time: st[1] === "done" ? conditionTime : undefined,
    },
    { label: "Unlocked", state: st[2], time: releasedAt?.time },
    { label: "Transfer registered", state: st[3], time: registeredAt?.time },
  ];
  return <Steps title="Deal status" steps={steps} next={next} />;
};

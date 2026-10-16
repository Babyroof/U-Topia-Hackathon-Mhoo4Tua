"use client";

import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

type StepState = "done" | "current" | "failed" | "todo";
type Step = { label: string; state: StepState };

const STEP_CLASS: Record<StepState, string> = {
  done: "step-primary",
  current: "step-primary",
  failed: "step-error",
  todo: "",
};

/** A small progress tracker: where this item is now, plus one plain sentence on what happens next. */
const Steps = ({ steps, next }: { steps: Step[]; next: string }) => (
  <div className="flex flex-col gap-2 bg-base-200/60 rounded-2xl p-3">
    <ul className="steps steps-horizontal w-full text-xs">
      {steps.map(s => (
        <li
          key={s.label}
          className={`step ${STEP_CLASS[s.state]} ${s.state === "current" ? "font-semibold" : ""}`}
          data-content={s.state === "done" ? "✓" : s.state === "failed" ? "✕" : undefined}
        >
          {s.label}
        </li>
      ))}
    </ul>
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
  return <Steps steps={labels.map((label, i) => ({ label, state: s[i] }))} next={next} />;
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
 * Conditional transfer: locked → (paid) → unlocked → registered at the land office.
 * `viewer` decides the wording ("you" as sender or receiver).
 */
export const DealSteps = ({
  deal,
  now,
  viewer,
}: {
  deal: DealLike;
  now: number;
  viewer: "sender" | "receiver" | "other";
}) => {
  const { data: needsRegistration } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "needsRegistration",
    args: [deal.status === 2 ? deal.tokenId : undefined],
  });
  const isSale = deal.price > 0n;
  const labels = isSale
    ? ["Locked", "Paid", "Unlocked", "Registered"]
    : ["Locked", "Waiting for date", "Unlocked", "Registered"];
  const unlockReached = now >= Number(deal.unlockTime);

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

  const s = states(4, current, failedAt);
  return <Steps steps={labels.map((label, i) => ({ label, state: s[i] }))} next={next} />;
};

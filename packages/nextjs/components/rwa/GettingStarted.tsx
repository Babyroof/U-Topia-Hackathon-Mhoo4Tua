"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { openTutorial } from "~~/components/rwa/Tutorial";
import { sameAddress } from "~~/components/rwa/utils";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

/** Your journey so far, as a checklist with the next step highlighted. Hides itself once everything is done. */
export const GettingStarted = () => {
  const { address } = useAccount();
  const { data: requests } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "getAllRequests" });
  const { data: deals } = useScaffoldReadContract({ contractName: "ConditionalVault", functionName: "getAllDeals" });

  const mine = (requests ?? []).filter(r => sameAddress(r.requester, address));
  const myDeals = (deals ?? []).filter(d => sameAddress(d.from, address) || sameAddress(d.to, address));

  const steps = [
    { label: "Connect your wallet", done: !!address, href: "/vault" },
    { label: "Submit a land title deed", done: mine.length > 0, href: "/tokenize" },
    { label: "Get it approved by a partner", done: mine.some(r => r.status === 2), href: "/requests" },
    { label: "Send it with a condition (or sell it)", done: myDeals.length > 0, href: "/vault" },
    { label: "See it unlock and register the transfer", done: myDeals.some(d => d.status === 2), href: "/deals" },
  ];
  const doneCount = steps.filter(s => s.done).length;
  if (doneCount === steps.length) return null;
  const nextIndex = steps.findIndex(s => !s.done);

  return (
    <div className="surface p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl m-0">Getting started</h2>
        <button className="link text-sm" onClick={openTutorial}>
          How it works
        </button>
      </div>
      <div className="flex items-center gap-3">
        <progress className="progress progress-primary w-full" value={doneCount} max={steps.length} />
        <span className="text-sm font-semibold whitespace-nowrap">
          {doneCount} / {steps.length}
        </span>
      </div>
      <ol className="list-none p-0 m-0 flex flex-col gap-2">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-center gap-3">
            {s.done ? (
              <CheckCircleIcon className="h-6 w-6 text-success shrink-0" />
            ) : (
              <span
                className={`h-6 w-6 shrink-0 rounded-full border-2 grid place-items-center text-xs font-bold ${
                  i === nextIndex ? "border-primary text-primary" : "border-base-300 opacity-60"
                }`}
              >
                {i + 1}
              </span>
            )}
            {i === nextIndex ? (
              <Link href={s.href} className="font-semibold link link-primary">
                {s.label} →
              </Link>
            ) : (
              <span className={s.done ? "line-through opacity-60" : "opacity-80"}>{s.label}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
};

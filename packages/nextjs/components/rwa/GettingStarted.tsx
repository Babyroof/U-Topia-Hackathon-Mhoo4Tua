"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { openTutorial } from "~~/components/rwa/Tutorial";
import { sameAddress } from "~~/components/rwa/utils";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const dismissKey = (address: string) => `rwa-onboarding-dismissed-${address.toLowerCase()}`;

/** Onboarding progress for the vault page; also used to decide when to show "What can you do next?". */
export const useOnboarding = () => {
  const { address } = useAccount();
  const { data: requests } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "getAllRequests" });
  const { data: tokenIds } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "tokensOf",
    args: [address],
  });
  const mine = (requests ?? []).filter(r => sameAddress(r.requester, address));
  return {
    loading: !!address && (requests === undefined || tokenIds === undefined),
    connected: !!address,
    submitted: mine.length > 0,
    approved: (tokenIds?.length ?? 0) > 0,
    pending: mine.filter(r => r.status === 1).length,
  };
};

/**
 * Three required steps to get a deed into the vault. Anything after that (send, sell) is optional,
 * so it lives in "What can you do next?" instead of here.
 */
export const GettingStarted = () => {
  const { address } = useAccount();
  const { loading, connected, submitted, approved, pending } = useOnboarding();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!address) return;
    try {
      setDismissed(localStorage.getItem(dismissKey(address)) === "1");
    } catch {
      setDismissed(false);
    }
  }, [address]);

  const dismiss = () => {
    setDismissed(true);
    try {
      if (address) localStorage.setItem(dismissKey(address), "1");
    } catch {
      // storage blocked: hidden until reload
    }
  };

  if (dismissed) return null;

  if (loading) {
    return <div className="surface p-5 h-56 animate-pulse" aria-busy="true" aria-label="Loading your progress" />;
  }

  const steps = [
    { label: "Connect your wallet", done: connected, href: "/vault" },
    { label: "Submit a land title deed", done: submitted, href: "/tokenize" },
    { label: "Get it approved by a partner", done: approved, href: "/requests" },
  ];
  const doneCount = steps.filter(s => s.done).length;
  const currentIndex = steps.findIndex(s => !s.done);

  if (currentIndex === -1) {
    return (
      <section className="surface p-5 flex items-start gap-3" aria-labelledby="onboarding-done">
        <CheckCircleIcon className="h-7 w-7 text-success shrink-0" aria-hidden />
        <div className="grow">
          <h2 id="onboarding-done" className="text-lg m-0">
            Your deed is in your vault. You&apos;re all set.
          </h2>
          <p className="m-0 mt-1 text-sm opacity-80">Keeping it there is a complete, safe end state.</p>
        </div>
        <button className="btn btn-ghost btn-sm btn-circle" onClick={dismiss} aria-label="Dismiss getting started">
          <XMarkIcon className="h-5 w-5" />
        </button>
      </section>
    );
  }

  return (
    <section className="surface p-5 flex flex-col gap-3" aria-labelledby="onboarding-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="onboarding-title" className="text-xl m-0">
          Getting started
        </h2>
        <button className="link text-sm" onClick={openTutorial}>
          How it works
        </button>
      </div>
      <div className="flex items-center gap-3">
        <progress
          className="progress progress-primary w-full"
          value={doneCount}
          max={steps.length}
          aria-label={`${doneCount} of ${steps.length} steps done`}
        />
        <span className="text-sm font-semibold whitespace-nowrap" aria-hidden>
          {doneCount} / {steps.length}
        </span>
      </div>
      <ol className="list-none p-0 m-0 flex flex-col gap-2">
        {steps.map((s, i) => {
          const current = i === currentIndex;
          return (
            <li key={s.label} className="flex items-start gap-3" aria-current={current ? "step" : undefined}>
              {s.done ? (
                <CheckCircleIcon className="h-6 w-6 text-success shrink-0" aria-hidden />
              ) : (
                <span
                  className={`h-6 w-6 shrink-0 rounded-full border-2 grid place-items-center text-xs font-bold ${
                    current ? "border-primary text-primary" : "border-base-300 opacity-70"
                  }`}
                  aria-hidden
                >
                  {i + 1}
                </span>
              )}
              <div className="flex flex-col">
                <span className="sr-only">{s.done ? "Completed: " : current ? "Current step: " : "Not started: "}</span>
                {current && i !== 2 ? (
                  <Link href={s.href} className="font-semibold link link-primary">
                    {s.label} →
                  </Link>
                ) : (
                  <span className={s.done ? "opacity-80" : current ? "font-semibold" : "opacity-80"}>{s.label}</span>
                )}
                {current && i === 2 && pending > 0 && (
                  <Link href="/requests" className="text-sm link">
                    Waiting for partner review ({pending} pending)
                  </Link>
                )}
                {current && i === 2 && pending === 0 && (
                  <Link href="/tokenize" className="text-sm link">
                    No request waiting for review. Submit a new one
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

"use client";

import { ArrowsRightLeftIcon, BanknotesIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";

export type DeedIntent = "send" | "sell";

/**
 * Optional things to do once a deed is in the vault. Three equal choices, no progress bar:
 * keeping the deed is a finished state, not a step left undone.
 */
export const WhatNext = ({ onChoose }: { onChoose: (intent: DeedIntent) => void }) => {
  const card = "surface p-5 flex flex-col gap-2 h-full";
  const icon = "h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center";

  return (
    <section aria-labelledby="what-next" className="flex flex-col gap-3">
      <div>
        <h2 id="what-next" className="text-xl m-0">
          What can you do next?
        </h2>
        <p className="m-0 mt-1 text-sm opacity-80">All optional. Pick one whenever you need it.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className={card}>
          <span className={icon} aria-hidden>
            <ShieldCheckIcon className="h-6 w-6" />
          </span>
          <h3 className="text-lg m-0">Keep it</h3>
          <p className="m-0 text-sm opacity-80 grow">Your deed stays safe in your vault. Nothing else to do.</p>
          <a href="#my-deeds" className="link text-sm self-start">
            View my deeds
          </a>
        </div>
        <div className={card}>
          <span className={icon} aria-hidden>
            <ArrowsRightLeftIcon className="h-6 w-6" />
          </span>
          <h3 className="text-lg m-0">Send with a condition</h3>
          <p className="m-0 text-sm opacity-80 grow">Transfer only when the other side meets your terms.</p>
          <button className="btn btn-primary btn-sm self-start" onClick={() => onChoose("send")}>
            Set up a transfer
          </button>
        </div>
        <div className={card}>
          <span className={icon} aria-hidden>
            <BanknotesIcon className="h-6 w-6" />
          </span>
          <h3 className="text-lg m-0">Sell it</h3>
          <p className="m-0 text-sm opacity-80 grow">Set a price and let a buyer pay to unlock it.</p>
          <button className="btn btn-primary btn-sm self-start" onClick={() => onChoose("sell")}>
            Set a price
          </button>
        </div>
      </div>
    </section>
  );
};

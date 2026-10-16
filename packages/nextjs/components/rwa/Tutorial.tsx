"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import {
  ArrowsRightLeftIcon,
  BuildingLibraryIcon,
  DocumentCheckIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { sameAddress } from "~~/components/rwa/utils";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const SEEN_KEY = "rwa-tutorial-seen";
export const OPEN_TUTORIAL_EVENT = "rwa:open-tutorial";

const PAGES = [
  {
    icon: ExclamationTriangleIcon,
    title: "Why this exists",
    text: "A paper deed can be lost or forged, and the same deed can be pledged or sold twice. We make sure everyone sees the same answer to one question: who holds this deed?",
  },
  {
    icon: DocumentCheckIcon,
    title: "What is a token (NFT)?",
    text: "A digital certificate that can exist only once. One NFT stands for one paper deed. It lives in your wallet, and every move is recorded for everyone to check.",
  },
  {
    icon: BuildingLibraryIcon,
    title: "Who is the verification partner?",
    text: "A land office that checks the paper deed is genuine, and that you are its owner, before it issues the NFT. Only partners approved by the platform can issue.",
  },
  {
    icon: ArrowsRightLeftIcon,
    title: "What happens next?",
    text: "Your deed is safe in the vault. Now you choose what to do with it.",
    choices: true,
  },
];

const HANDOVER_STEPS = [
  "They check it's real and accept (or pay).",
  "The digital key moves to their wallet.",
  "They take it to the Land Office to register.",
];

/** Which card matches the connected wallet: an open deal it is part of, else a deed it holds. */
const useWhereYouAre = (): "keep" | "handover" | undefined => {
  const { address } = useAccount();
  const { data: tokenIds } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "tokensOf",
    args: [address],
  });
  const { data: deals } = useScaffoldReadContract({ contractName: "ConditionalVault", functionName: "getAllDeals" });
  if (!address) return undefined;
  if (deals?.some(d => d.status === 1 && (sameAddress(d.from, address) || sameAddress(d.to, address)))) {
    return "handover";
  }
  return tokenIds?.length ? "keep" : undefined;
};

const HereBadge = () => <span className="badge badge-primary badge-sm shrink-0">You are here</span>;

const Choices = () => {
  const here = useWhereYouAre();
  const card = (active: boolean) =>
    `rounded-2xl border p-4 flex flex-col gap-2 ${active ? "border-primary bg-primary/5" : "border-base-300"}`;
  const icon = "h-9 w-9 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0";

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <section className={card(here === "keep")} aria-current={here === "keep" ? "step" : undefined}>
          <div className="flex items-center gap-3">
            <span className={icon} aria-hidden>
              <ShieldCheckIcon className="h-5 w-5" />
            </span>
            <h3 className="text-lg m-0 grow">Keep it</h3>
            {here === "keep" && <HereBadge />}
          </div>
          <p className="m-0 text-sm opacity-80">That&apos;s it. Your deed stays safe, and only you can move it.</p>
        </section>
        <section className={card(here === "handover")} aria-current={here === "handover" ? "step" : undefined}>
          <div className="flex items-center gap-3">
            <span className={icon} aria-hidden>
              <ArrowsRightLeftIcon className="h-5 w-5" />
            </span>
            <h3 className="text-lg m-0 grow">Hand it over</h3>
            {here === "handover" && <HereBadge />}
          </div>
          <p className="m-0 text-sm opacity-80">Send it, or sell it for a price.</p>
          <ol className="m-0 pl-5 text-sm list-decimal flex flex-col gap-1">
            {HANDOVER_STEPS.map(step => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      </div>
      <p className="m-0 text-sm opacity-70">You can take your paper deed out of the vault any time.</p>
    </div>
  );
};

export const openTutorial = () => window.dispatchEvent(new Event(OPEN_TUTORIAL_EVENT));

/** 4-page intro (the last page shows the two choices and which one you are on) shown on the first visit; reopen any time from the "How it works" menu. */
export const Tutorial = () => {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
    } catch {
      // storage blocked: don't force the intro
    }
    const show = () => {
      setPage(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_TUTORIAL_EVENT, show);
    return () => window.removeEventListener(OPEN_TUTORIAL_EVENT, show);
  }, []);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // ignore
    }
  };

  if (!open) return null;
  const last = page === PAGES.length - 1;

  const Icon = PAGES[page].icon;

  return (
    <div
      className="modal modal-open modal-bottom sm:modal-middle"
      role="dialog"
      aria-modal="true"
      aria-label="How it works"
    >
      <div
        className={`modal-box ${"choices" in PAGES[page] ? "max-w-2xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-6 sm:p-8`}
      >
        <div
          className={`w-14 h-14 rounded-2xl bg-primary/10 text-primary place-items-center mb-4 ${
            "choices" in PAGES[page] ? "hidden sm:grid" : "grid"
          }`}
        >
          <Icon className="h-7 w-7" />
        </div>
        <h2 className="text-2xl mt-0 mb-3">{PAGES[page].title}</h2>
        <p className="opacity-80 m-0 leading-relaxed">{PAGES[page].text}</p>
        {"choices" in PAGES[page] && <Choices />}
        <div className="flex gap-1.5 mt-6" aria-label={`Step ${page + 1} of ${PAGES.length}`}>
          {PAGES.map((p, i) => (
            <span
              key={p.title}
              className={`h-1.5 rounded-full transition-all ${i === page ? "w-6 bg-primary" : "w-1.5 bg-base-300"}`}
            />
          ))}
        </div>
        <div className="modal-action justify-between mt-6">
          <button className="btn btn-ghost" onClick={close}>
            Skip
          </button>
          <div className="flex gap-2">
            {page > 0 && (
              <button className="btn" onClick={() => setPage(p => p - 1)}>
                Back
              </button>
            )}
            <button className="btn btn-primary px-6" onClick={last ? close : () => setPage(p => p + 1)}>
              {last ? "Get started" : "Next"}
            </button>
          </div>
        </div>
      </div>
      <div className="modal-backdrop bg-black/40" onClick={close} />
    </div>
  );
};

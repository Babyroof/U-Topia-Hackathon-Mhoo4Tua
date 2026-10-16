"use client";

import { useEffect, useState } from "react";
import {
  ArrowsRightLeftIcon,
  BuildingLibraryIcon,
  DocumentCheckIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { JourneyDiagram } from "~~/components/rwa/JourneyDiagram";

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
    title: "The full journey",
    text: "Once your deed is in the vault you can simply keep it, or send it with a condition, or sell it. A transfer still has to be registered at the land office. You can also withdraw a deed from the system at any time you hold it.",
    diagram: true,
  },
];

export const openTutorial = () => window.dispatchEvent(new Event(OPEN_TUTORIAL_EVENT));

/** 4-page intro (the last page shows the branching lifecycle and where you are in it) shown on the first visit; reopen any time from the "How it works" menu. */
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
        className={`modal-box ${"diagram" in PAGES[page] ? "max-w-2xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-6 sm:p-8`}
      >
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-4">
          <Icon className="h-7 w-7" />
        </div>
        <h2 className="text-2xl mt-0 mb-3">{PAGES[page].title}</h2>
        <p className="opacity-80 m-0 leading-relaxed">{PAGES[page].text}</p>
        {"diagram" in PAGES[page] && (
          <div className="mt-5">
            <JourneyDiagram />
          </div>
        )}
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

"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "rwa-tutorial-seen";
export const OPEN_TUTORIAL_EVENT = "rwa:open-tutorial";

const PAGES = [
  {
    title: "Why this exists",
    text: "A paper deed can be lost or forged, and the same deed can be pledged or sold twice. We make sure everyone sees the same answer to one question: who holds this deed?",
  },
  {
    title: "What is a token (NFT)?",
    text: "A digital certificate that can exist only once. One NFT stands for one paper deed. It lives in your wallet, and every move is recorded for everyone to check.",
  },
  {
    title: "Who is the verification partner?",
    text: "A land office that checks the paper deed is genuine, and that you are its owner, before it issues the NFT. Only partners approved by the platform can issue.",
  },
  {
    title: "Timed transfers and withdrawing",
    text: "Lock a deed for someone until a date: when the time comes it moves to them automatically, and you can cancel before then. The new owner still registers the transfer at the land office. You can also withdraw a deed from the system: the partner confirms, the NFT is burned and the paper deed is the only record again.",
  },
];

export const openTutorial = () => window.dispatchEvent(new Event(OPEN_TUTORIAL_EVENT));

/** 4-page intro shown on the first visit; reopen any time from the "How it works" menu. */
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

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true">
      <div className="modal-box max-w-lg">
        <p className="text-xs opacity-60 m-0">
          {page + 1} / {PAGES.length}
        </p>
        <h3 className="text-2xl mt-1 mb-3">{PAGES[page].title}</h3>
        <p className="opacity-80 m-0">{PAGES[page].text}</p>
        <div className="modal-action justify-between">
          <button className="btn btn-ghost btn-sm" onClick={close}>
            Skip
          </button>
          <div className="flex gap-2">
            {page > 0 && (
              <button className="btn btn-sm" onClick={() => setPage(p => p - 1)}>
                Back
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={last ? close : () => setPage(p => p + 1)}>
              {last ? "Get started" : "Next"}
            </button>
          </div>
        </div>
      </div>
      <div className="modal-backdrop" onClick={close} />
    </div>
  );
};

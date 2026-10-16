"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useRole } from "~~/components/Header";

const COPY = {
  partner: {
    title: "For verification partners only",
    text: "This page is where partners check and approve deeds. This wallet isn't a partner; only the platform admin can add partners.",
  },
  admin: {
    title: "For the platform admin only",
    text: "Only the admin wallet can add or deactivate partners. Partners can't add other partners.",
  },
};

/** Shows the page only to the right role; everyone else gets a plain explanation instead of dead buttons. */
export const RoleGate = ({ role, children }: { role: "partner" | "admin"; children: ReactNode }) => {
  const { address } = useAccount();
  const { isPartner, isAdmin, isLoading } = useRole();
  const allowed = role === "partner" ? isPartner : isAdmin;

  if (address && !isLoading && allowed) return <>{children}</>;

  return (
    <div className="flex flex-col items-center grow px-4 py-16">
      <div className="w-full max-w-xl card bg-base-100 border border-base-300">
        <div className="card-body">
          {!address ? (
            <p className="m-0 opacity-80">Connect your wallet first.</p>
          ) : isLoading ? (
            <span className="loading loading-spinner" />
          ) : (
            <>
              <h1 className="text-2xl m-0">{COPY[role].title}</h1>
              <p className="opacity-80">{COPY[role].text}</p>
              <Link href="/vault" className="btn btn-primary btn-sm self-start">
                Go to My Vault
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

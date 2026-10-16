"use client";

import { useState } from "react";
import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { ArrowsRightLeftIcon, ClockIcon, DocumentPlusIcon } from "@heroicons/react/24/outline";
import { useRole } from "~~/components/Header";
import { AssetCard } from "~~/components/rwa/AssetCard";
import { GettingStarted, useOnboarding } from "~~/components/rwa/GettingStarted";
import { ParkedCard } from "~~/components/rwa/ParkedCard";
import { Timeline } from "~~/components/rwa/Timeline";
import { type DeedIntent, WhatNext } from "~~/components/rwa/WhatNext";
import { sameAddress } from "~~/components/rwa/utils";
import { useDeedTimeline } from "~~/hooks/rwa/useDeedTimeline";
import { useScaffoldReadContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

const ACTIONS = [
  { href: "/tokenize", label: "Tokenize", icon: DocumentPlusIcon },
  { href: "/deals", label: "Deals", icon: ArrowsRightLeftIcon },
  { href: "/history", label: "History", icon: ClockIcon },
];

const VaultPage: NextPage = () => {
  const { address } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const { role, partnerName } = useRole();
  const timeline = useDeedTimeline();
  const { approved } = useOnboarding();
  const [intent, setIntent] = useState<DeedIntent>();

  const choose = (next: DeedIntent) => {
    setIntent(next);
    document.getElementById("my-deeds")?.scrollIntoView({ behavior: "smooth" });
  };

  const { data: tokenIds } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "tokensOf",
    args: [address],
  });
  const { data: deals } = useScaffoldReadContract({ contractName: "ConditionalVault", functionName: "getAllDeals" });
  const { data: redemptions } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "getAllRedemptions",
  });
  const waiting = (redemptions ?? []).filter(r => r.status === 1 && sameAddress(r.holder, address));
  const lockedByMe = (deals ?? []).filter(d => d.status === 1 && sameAddress(d.from, address)).length;
  const incoming = (deals ?? []).filter(d => d.status === 1 && sameAddress(d.to, address)).length;
  const recent = timeline.filter(e => e.parties.some(p => sameAddress(p, address))).slice(0, 5);

  if (!address) {
    return (
      <div className="flex flex-col items-center grow px-4 py-16">
        <div className="surface w-full max-w-md p-8 text-center flex flex-col gap-3">
          <h1 className="text-3xl m-0">Welcome to RWA Vault</h1>
          <p className="opacity-70 m-0">Connect your wallet (MetaMask or Core) to see your deeds.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 lg:py-10 flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="flex flex-col gap-4">
          <div>
            <p className="m-0 text-sm opacity-60">Welcome!</p>
            <div className="text-2xl font-bold">
              {role === "partner" ? partnerName || "Partner" : <Address address={address} chain={targetNetwork} />}
            </div>
          </div>

          <div className="surface p-6">
            <p className="m-0 opacity-70">Deeds in your vault</p>
            <p className="m-0 mt-1 text-6xl font-bold tracking-tight tabular-nums">{tokenIds?.length ?? 0}</p>
            <div className="grid grid-cols-2 gap-4 mt-5">
              <div>
                <p className="m-0 text-sm opacity-60">Locked in deals</p>
                <p className="m-0 text-xl font-bold">{lockedByMe}</p>
              </div>
              <div>
                <p className="m-0 text-sm opacity-60">On the way to you</p>
                <p className="m-0 text-xl font-bold">{incoming}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {ACTIONS.map(a => (
              <Link
                key={a.href}
                href={a.href}
                className="surface py-3 flex items-center justify-center gap-2 font-semibold hover:bg-base-300/40"
              >
                <a.icon className="h-5 w-5 text-primary" /> {a.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <GettingStarted />
          <h2 className="text-xl m-0">Recent activity</h2>
          <div className="surface p-5">
            <Timeline entries={recent} showDeedLink />
            {recent.length > 0 && (
              <Link href="/history" className="link text-sm">
                See all history
              </Link>
            )}
          </div>
        </section>
      </div>

      {approved && <WhatNext onChoose={choose} />}

      <section id="my-deeds" className="flex flex-col gap-3 scroll-mt-24">
        <h2 className="text-xl m-0">My deeds</h2>
        {intent && (tokenIds?.length ?? 0) > 1 && (
          <p className="m-0 text-sm opacity-80" role="status">
            {intent === "sell" ? "Selling" : "Sending"}: the form is open on your first deed. Use “Send with a
            condition” on another deed to pick a different one.
          </p>
        )}
        {(!tokenIds || tokenIds.length === 0) && waiting.length === 0 ? (
          <div className="surface p-8 text-center flex flex-col items-center gap-3">
            <p className="m-0 opacity-70">No deeds yet. Tokenize your first land title deed to get started.</p>
            <Link href="/tokenize" className="btn btn-primary">
              Tokenize a deed
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {waiting.map(r => (
              <ParkedCard key={`r-${r.id.toString()}`} redemptionId={r.id} tokenId={r.tokenId} />
            ))}
            {(tokenIds ?? []).map((id, i) => (
              <AssetCard key={id.toString()} tokenId={id} intent={i === 0 ? intent : undefined} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default VaultPage;

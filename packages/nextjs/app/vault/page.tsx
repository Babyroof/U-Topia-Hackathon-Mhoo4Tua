"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { AssetCard } from "~~/components/rwa/AssetCard";
import { ParkedCard } from "~~/components/rwa/ParkedCard";
import { sameAddress } from "~~/components/rwa/utils";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const VaultPage: NextPage = () => {
  const { address } = useAccount();

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

  return (
    <div className="flex flex-col items-center grow px-4 py-10 gap-6">
      <div className="w-full max-w-5xl">
        <h1 className="text-4xl mb-2">My vault</h1>
        <p className="opacity-80">Your tokenized assets. One NFT per real item, verified by a partner.</p>
      </div>

      {(lockedByMe > 0 || incoming > 0) && (
        <Link href="/deals" className="alert w-full max-w-5xl border-secondary">
          <span>
            {lockedByMe > 0 && `${lockedByMe} of your assets locked for someone. `}
            {incoming > 0 && `${incoming} on the way to you. `}
            View transfers
          </span>
        </Link>
      )}

      {!address ? (
        <p className="opacity-70">Connect your wallet to see your assets.</p>
      ) : (!tokenIds || tokenIds.length === 0) && waiting.length === 0 ? (
        <div className="text-center opacity-70">
          <p className="mb-3">Nothing in your vault yet. Start by tokenizing something you own.</p>
          <Link href="/tokenize" className="btn btn-primary btn-sm">
            Tokenize your first asset
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 w-full max-w-5xl md:grid-cols-2">
          {waiting.map(r => (
            <ParkedCard key={`r-${r.id.toString()}`} redemptionId={r.id} tokenId={r.tokenId} />
          ))}
          {(tokenIds ?? []).map(id => (
            <AssetCard key={id.toString()} tokenId={id} deals={deals ?? []} />
          ))}
        </div>
      )}
    </div>
  );
};

export default VaultPage;

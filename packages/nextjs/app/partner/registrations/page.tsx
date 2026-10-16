"use client";

import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { RoleGate } from "~~/components/rwa/RoleGate";
import { useScaffoldReadContract, useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

const RegistrationRow = ({ tokenId }: { tokenId: bigint }) => {
  const { targetNetwork } = useTargetNetwork();
  const { data: asset } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "getAsset",
    args: [tokenId],
  });
  const { data: owner } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "ownerOf",
    args: [tokenId],
  });
  const { data: registeredOwner } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "registeredOwner",
    args: [tokenId],
  });
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "RWAToken" });

  const confirm = async () => {
    try {
      await writeContractAsync({ functionName: "confirmRegistration", args: [tokenId] });
    } catch (e) {
      console.error("confirmRegistration failed", e);
    }
  };

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body gap-2 p-5">
        <div className="flex justify-between items-start gap-3">
          <Link href={`/deed/${tokenId}`} className="text-lg font-semibold link link-hover">
            {asset?.name ?? `NFT #${tokenId}`}
          </Link>
          <span className="badge badge-warning shrink-0">Waiting for registration</span>
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm items-center">
          <span className="opacity-60">From (registered)</span>
          {registeredOwner && <Address address={registeredOwner} chain={targetNetwork} size="sm" />}
          <span className="opacity-60">To (new holder)</span>
          {owner && <Address address={owner} chain={targetNetwork} size="sm" />}
        </div>
        <p className="text-sm opacity-70 m-0">
          Press this once the land office has registered the transfer to the new holder.
        </p>
        <div className="flex justify-end">
          <button className="btn btn-sm btn-primary" disabled={isMining} onClick={confirm}>
            Registered
          </button>
        </div>
      </div>
    </div>
  );
};

const Registrations = () => {
  const { address } = useAccount();
  const { data: pending } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "pendingRegistrations",
    args: [address],
  });

  return (
    <div className="flex flex-col items-center grow px-4 py-10 gap-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl mb-2">Waiting for transfer registration ({pending?.length ?? 0})</h1>
        <p className="opacity-80 m-0">
          These deeds changed hands on-chain. The transfer only takes legal effect once it is registered at the land
          office.
        </p>
      </div>
      {!pending || pending.length === 0 ? (
        <p className="opacity-60">Nothing waiting.</p>
      ) : (
        <div className="flex flex-col gap-3 w-full max-w-2xl">
          {pending.map(id => (
            <RegistrationRow key={id.toString()} tokenId={id} />
          ))}
        </div>
      )}
    </div>
  );
};

const RegistrationsPage: NextPage = () => (
  <RoleGate role="partner">
    <Registrations />
  </RoleGate>
);

export default RegistrationsPage;

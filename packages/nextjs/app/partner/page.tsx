"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { useRole } from "~~/components/Header";
import { RoleGate } from "~~/components/rwa/RoleGate";
import { REQUEST_BADGE, REQUEST_STATUS, formatTime, sameAddress } from "~~/components/rwa/utils";
import { useScaffoldReadContract, useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

const Stat = ({ label, value, href }: { label: string; value: number; href?: string }) => {
  const body = (
    <div className="stat bg-base-100 border border-base-300 rounded-xl h-full">
      <div className="stat-title whitespace-normal">{label}</div>
      <div className="stat-value text-3xl">{value}</div>
    </div>
  );
  return href ? (
    <Link href={href} className="hover:opacity-80">
      {body}
    </Link>
  ) : (
    body
  );
};

const Dashboard = () => {
  const { address } = useAccount();
  const router = useRouter();
  const { partnerName } = useRole();
  const { targetNetwork } = useTargetNetwork();

  const { data: requests } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "getAllRequests" });
  const { data: deals } = useScaffoldReadContract({ contractName: "ConditionalVault", functionName: "getAllDeals" });
  const { data: registrations } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "pendingRegistrations",
    args: [address],
  });
  const { data: redemptions } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "getAllRedemptions",
  });
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "RWAToken" });

  const mine = (requests ?? []).filter(r => sameAddress(r.partner, address));
  const issuedIds = new Set(mine.filter(r => r.status === 2).map(r => r.tokenId));
  const lockedDeals = (deals ?? []).filter(d => d.status === 1 && issuedIds.has(d.tokenId)).length;
  const withdrawals = (redemptions ?? []).filter(r => r.status === 1 && sameAddress(r.issuer, address));

  // one row per requester: how many deeds issued, latest request status and date
  const users = Object.values(
    mine.reduce<Record<string, { wallet: string; deeds: number; latest: (typeof mine)[number] }>>((acc, r) => {
      const key = r.requester.toLowerCase();
      const row = acc[key] ?? { wallet: r.requester, deeds: 0, latest: r };
      if (r.status === 2) row.deeds++;
      if (r.createdAt >= row.latest.createdAt) row.latest = r;
      acc[key] = row;
      return acc;
    }, {}),
  ).sort((a, b) => Number(b.latest.createdAt - a.latest.createdAt));

  const confirmWithdrawal = async (id: bigint) => {
    try {
      await writeContractAsync({ functionName: "confirmRedeem", args: [id] });
    } catch (e) {
      console.error("confirmRedeem failed", e);
    }
  };

  return (
    <div className="flex flex-col items-center grow px-4 py-10 gap-8">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl mb-2">Dashboard: {partnerName || "Partner"}</h1>
        <p className="opacity-80 m-0">Everything people brought to you, read from the chain.</p>
      </div>

      <div className="grid gap-3 w-full max-w-4xl grid-cols-2 md:grid-cols-5">
        <Stat label="Pending requests" value={mine.filter(r => r.status === 1).length} href="/partner/requests" />
        <Stat label="NFTs issued" value={issuedIds.size} />
        <Stat label="Locked in deals" value={lockedDeals} />
        <Stat label="Waiting for registration" value={registrations?.length ?? 0} href="/partner/registrations" />
        <Stat label="Rejected" value={mine.filter(r => r.status === 3).length} />
      </div>

      {withdrawals.length > 0 && (
        <div className="w-full max-w-4xl">
          <h2 className="text-2xl mb-3">Withdrawal requests ({withdrawals.length})</h2>
          <div className="flex flex-col gap-3">
            {withdrawals.map(r => (
              <div key={r.id.toString()} className="card bg-base-100 border border-base-300">
                <div className="card-body gap-2 p-5">
                  <Link href={`/deed/${r.tokenId}`} className="text-xl link link-hover">
                    NFT #{r.tokenId.toString()}
                  </Link>
                  <div className="text-sm flex items-center gap-2 flex-wrap">
                    Holder <Address address={r.holder} chain={targetNetwork} size="sm" />
                    <span className="opacity-60">requested {formatTime(r.requestedAt)}</span>
                  </div>
                  <p className="text-sm opacity-70 m-0">
                    Check the holder&apos;s ID, then confirm. The NFT is burned and the deed is paper-only again.
                  </p>
                  <div className="flex justify-end">
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={isMining}
                      onClick={() => confirmWithdrawal(r.id)}
                    >
                      Confirm withdrawal
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl">
        <h2 className="text-2xl mb-3">People who tokenized with you</h2>
        {users.length === 0 ? (
          <p className="opacity-60">No requests yet.</p>
        ) : (
          <div className="overflow-x-auto bg-base-100 border border-base-300 rounded-lg">
            <table className="table">
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>Deeds issued</th>
                  <th>Latest status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr
                    key={u.wallet}
                    className="hover:bg-base-200 cursor-pointer"
                    onClick={() => router.push(`/partner/requests/${u.latest.id}`)}
                  >
                    <td>
                      <Address address={u.wallet} chain={targetNetwork} size="sm" disableAddressLink />
                    </td>
                    <td>{u.deeds}</td>
                    <td>
                      <span className={`badge ${REQUEST_BADGE[u.latest.status]}`}>
                        {REQUEST_STATUS[u.latest.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">{formatTime(u.latest.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const PartnerPage: NextPage = () => (
  <RoleGate role="partner">
    <Dashboard />
  </RoleGate>
);

export default PartnerPage;

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { RequestReview } from "~~/components/rwa/RequestReview";
import { RoleGate } from "~~/components/rwa/RoleGate";
import { sameAddress } from "~~/components/rwa/utils";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const RequestDetail = () => {
  const { address } = useAccount();
  const { requestId } = useParams<{ requestId: string }>();
  const valid = /^\d{1,9}$/.test(requestId ?? "");
  const { data: requests } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "getAllRequests" });
  const request = valid ? requests?.[Number(requestId)] : undefined;

  return (
    <div className="flex flex-col items-center grow px-4 py-10 gap-4">
      <div className="w-full max-w-2xl">
        <Link href="/partner/requests" className="link text-sm">
          ← Pending requests
        </Link>
      </div>
      <div className="w-full max-w-2xl">
        {!requests ? (
          <span className="loading loading-spinner" />
        ) : !request ? (
          <p className="opacity-70">Request not found.</p>
        ) : !sameAddress(request.partner, address) ? (
          <p className="opacity-70">This request was sent to a different partner.</p>
        ) : (
          <RequestReview key={request.id.toString()} request={request} />
        )}
      </div>
    </div>
  );
};

const RequestDetailPage: NextPage = () => (
  <RoleGate role="partner">
    <RequestDetail />
  </RoleGate>
);

export default RequestDetailPage;

"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { sameAddress } from "~~/components/rwa/utils";
import { useScaffoldReadContract, useScaffoldWatchContractEvent } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

/** Pops a notification when one of my requests is approved or rejected, or (for partners) a new request arrives. Renders nothing. */
export const RequestNotifier = () => {
  const { address } = useAccount();
  const { data: requests } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "getAllRequests" });
  const requestsRef = useRef(requests);
  useEffect(() => {
    requestsRef.current = requests;
  }, [requests]);

  const isMine = (requestId?: bigint) =>
    requestId !== undefined && sameAddress(requestsRef.current?.[Number(requestId)]?.requester, address);

  useScaffoldWatchContractEvent({
    contractName: "RWAToken",
    eventName: "RequestApproved",
    onLogs: logs =>
      logs.forEach(log => {
        if (isMine(log.args.requestId)) notification.success("Your deed request was approved. The NFT is in My Vault.");
      }),
  });

  useScaffoldWatchContractEvent({
    contractName: "RWAToken",
    eventName: "RequestRejected",
    onLogs: logs =>
      logs.forEach(log => {
        if (isMine(log.args.requestId)) notification.error(`Your deed request was rejected: ${log.args.reason}`);
      }),
  });

  useScaffoldWatchContractEvent({
    contractName: "RWAToken",
    eventName: "TokenizeRequested",
    onLogs: logs =>
      logs.forEach(log => {
        if (sameAddress(log.args.partner, address)) notification.info("New deed request waiting for your review.");
      }),
  });

  return null;
};

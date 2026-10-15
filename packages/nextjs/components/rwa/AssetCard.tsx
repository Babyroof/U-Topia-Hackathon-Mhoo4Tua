"use client";

import { useState } from "react";
import { Address, AddressInput } from "@scaffold-ui/components";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import { Certificate } from "~~/components/rwa/Certificate";
import { formatTime, sameAddress } from "~~/components/rwa/utils";
import { addressError, hasErrors, unlockTimeError } from "~~/components/rwa/validation";
import { useChainNow } from "~~/hooks/rwa/useChainNow";
import {
  useDeployedContractInfo,
  useScaffoldReadContract,
  useScaffoldWriteContract,
  useTargetNetwork,
} from "~~/hooks/scaffold-eth";

type HistoryDeal = {
  id: bigint;
  from: string;
  to: string;
  tokenId: bigint;
  unlockTime: bigint;
  status: number;
  createdAt: bigint;
};

const UNLOCK_OPTIONS = [
  { label: "In 1 minute (demo)", seconds: 60 },
  { label: "In 5 minutes", seconds: 300 },
  { label: "Tomorrow", seconds: 86400 },
  { label: "In 30 days", seconds: 30 * 86400 },
  { label: "In 1 year", seconds: 365 * 86400 },
  { label: "On a date I pick", seconds: 0 },
];

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export const AssetCard = ({ tokenId, deals }: { tokenId: bigint; deals: readonly HistoryDeal[] }) => {
  const { address } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const chainNow = useChainNow();

  const { data: asset } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "getAsset",
    args: [tokenId],
  });
  const { data: issuerName } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "partnerName",
    args: [asset?.issuer],
  });

  const { data: rwaInfo } = useDeployedContractInfo({ contractName: "RWAToken" });
  const { data: vaultInfo } = useDeployedContractInfo({ contractName: "ConditionalVault" });
  const { writeContractAsync: writeRwa, isMining: rwaMining } = useScaffoldWriteContract({ contractName: "RWAToken" });
  const { writeContractAsync: writeVault, isMining: vaultMining } = useScaffoldWriteContract({
    contractName: "ConditionalVault",
  });

  const [mode, setMode] = useState<"idle" | "send" | "redeem">("idle");
  const [receiver, setReceiver] = useState("");
  const [unlockOption, setUnlockOption] = useState(UNLOCK_OPTIONS[0].seconds);
  const [customDate, setCustomDate] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const busy = rwaMining || vaultMining;
  const history = deals.filter(d => d.tokenId === tokenId);

  const unlockTime =
    unlockOption > 0 ? chainNow + unlockOption : customDate ? Math.floor(new Date(customDate).getTime() / 1000) : 0;
  const errors = { receiver: addressError(receiver, address), time: unlockTimeError(unlockTime, chainNow) };

  const resetSend = () => {
    setMode("idle");
    setReceiver("");
    setUnlockOption(UNLOCK_OPTIONS[0].seconds);
    setCustomDate("");
    setSubmitted(false);
  };

  const handleSend = async () => {
    setSubmitted(true);
    if (hasErrors(errors) || !rwaInfo || !vaultInfo || !isAddress(receiver)) return;
    try {
      // 1) let the vault hold this NFT, 2) lock it for the receiver
      await writeRwa({ functionName: "approve", args: [vaultInfo.address, tokenId] });
      await writeVault({
        functionName: "createDeal",
        args: [tokenId, receiver, BigInt(unlockTime)],
      });
      resetSend();
    } catch (e) {
      console.error("send failed", e);
    }
  };

  const handleRedeem = async () => {
    try {
      await writeRwa({ functionName: "requestRedeem", args: [tokenId] });
    } catch (e) {
      console.error("redeem failed", e);
    }
  };

  return (
    <Certificate
      tokenId={tokenId}
      assetType={asset?.assetType}
      name={asset?.name}
      serial={asset?.serial}
      issuerName={issuerName}
      issuedAt={asset?.issuedAt}
      issuer={asset && <Address address={asset.issuer} chain={targetNetwork} size="xs" />}
    >
      {history.length > 0 && (
        <ol className="list-none p-0 m-0 text-xs opacity-75 flex flex-col gap-1">
          {history.map(d => (
            <li key={d.id.toString()}>
              {d.status === 1 && `Locked for ${short(d.to)} on ${formatTime(d.createdAt)}`}
              {d.status === 2 && (sameAddress(d.to, address) ? "Received by you" : `Sent to ${short(d.to)}`)}
              {d.status === 3 && "Lock cancelled, returned to owner"}
            </li>
          ))}
        </ol>
      )}

      {mode === "idle" && (
        <div className="flex gap-2 justify-end">
          <button className="btn btn-sm btn-ghost" onClick={() => setMode("redeem")}>
            Get the real item
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => setMode("send")}>
            Send with a condition
          </button>
        </div>
      )}

      {mode === "send" && (
        <div className="flex flex-col gap-2 bg-base-200 rounded-lg p-3">
          <span className="text-sm font-semibold">Send to</span>
          <AddressInput value={receiver} onChange={setReceiver} placeholder="Receiver's wallet address" />
          {submitted && errors.receiver && <span className="text-sm text-error">{errors.receiver}</span>}
          <label className="text-sm font-semibold mt-1" htmlFor={`when-${tokenId}`}>
            Release it
          </label>
          <select
            id={`when-${tokenId}`}
            className="select select-sm w-full"
            value={unlockOption}
            onChange={e => setUnlockOption(Number(e.target.value))}
          >
            {UNLOCK_OPTIONS.map(o => (
              <option key={o.label} value={o.seconds}>
                {o.label}
              </option>
            ))}
          </select>
          {unlockOption === 0 && (
            <input
              type="datetime-local"
              className="input input-sm w-full"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
            />
          )}
          {submitted && errors.time ? (
            <span className="text-sm text-error">{errors.time}</span>
          ) : (
            unlockTime > 0 && <p className="text-xs opacity-70 m-0">Unlocks {formatTime(unlockTime)}</p>
          )}
          <p className="text-xs opacity-60 m-0">
            Your wallet asks twice: once to let the vault hold it, once to lock it. Until then nobody, you included, can
            sell or pledge it.
          </p>
          <div className="flex gap-2 justify-end">
            <button className="btn btn-sm btn-ghost" onClick={resetSend} disabled={busy}>
              Back
            </button>
            <button className="btn btn-sm btn-primary" disabled={busy} onClick={handleSend}>
              {busy ? <span className="loading loading-spinner loading-xs" /> : "Lock and send"}
            </button>
          </div>
        </div>
      )}

      {mode === "redeem" && (
        <div className="flex flex-col gap-2 bg-warning/10 rounded-lg p-3">
          <p className="text-sm m-0">
            <b>{issuerName || "The partner"}</b> will hand you the real item. The token is held while you wait, and the
            partner burns it once you have the item. You can cancel until then.
          </p>
          <div className="flex gap-2 justify-end">
            <button className="btn btn-sm btn-ghost" onClick={() => setMode("idle")} disabled={busy}>
              Back
            </button>
            <button className="btn btn-sm btn-warning" disabled={busy} onClick={handleRedeem}>
              {busy ? <span className="loading loading-spinner loading-xs" /> : "Request handover"}
            </button>
          </div>
        </div>
      )}
    </Certificate>
  );
};

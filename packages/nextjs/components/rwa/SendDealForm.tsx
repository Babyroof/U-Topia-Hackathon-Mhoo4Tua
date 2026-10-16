"use client";

import { useState } from "react";
import { AddressInput } from "@scaffold-ui/components";
import { isAddress } from "viem";
import { useAccount } from "wagmi";
import { Field } from "~~/components/rwa/Field";
import { formatTime, sameAddress } from "~~/components/rwa/utils";
import { addressError, hasErrors, unlockTimeError } from "~~/components/rwa/validation";
import { useChainNow } from "~~/hooks/rwa/useChainNow";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const TWO_SIGN_INFO =
  "Step 1 lets the vault contract hold this NFT (like handing a key to an escrow). Step 2 creates the deal and locks it. Your wallet asks for each step separately. If you already allowed the vault before, step 1 is skipped.";

const toLocalInput = (ts: number) => {
  const d = new Date(ts * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** Lock a deed NFT for a receiver until a date: one button, two wallet signatures shown as steps. */
export const SendDealForm = ({
  tokenId,
  serial,
  onClose,
}: {
  tokenId: bigint;
  serial?: string;
  onClose: () => void;
}) => {
  const { address } = useAccount();
  const chainNow = useChainNow();
  const [receiver, setReceiver] = useState("");
  const [when, setWhen] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2>(0);

  const { data: rwaInfo } = useDeployedContractInfo({ contractName: "RWAToken" });
  const { data: vaultInfo } = useDeployedContractInfo({ contractName: "ConditionalVault" });
  const { data: approved } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "getApproved",
    args: [tokenId],
  });
  const { data: approvedForAll } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "isApprovedForAll",
    args: [address, vaultInfo?.address],
  });
  const { writeContractAsync: writeRwa } = useScaffoldWriteContract({ contractName: "RWAToken" });
  const { writeContractAsync: writeVault } = useScaffoldWriteContract({ contractName: "ConditionalVault" });

  const unlockTime = when ? Math.floor(new Date(when).getTime() / 1000) : undefined;
  const errors = { receiver: addressError(receiver, address), time: unlockTimeError(unlockTime, chainNow) };
  const vaultAllowed = !!approvedForAll || sameAddress(approved, vaultInfo?.address);
  const busy = step !== 0;

  const createDeal = async () => {
    setSubmitted(true);
    if (hasErrors(errors) || !rwaInfo || !vaultInfo || !isAddress(receiver) || !unlockTime) return;
    try {
      if (!vaultAllowed) {
        setStep(1);
        await writeRwa({ functionName: "approve", args: [vaultInfo.address, tokenId] });
      }
      setStep(2);
      await writeVault({ functionName: "createDeal", args: [tokenId, receiver, BigInt(unlockTime)] });
      onClose();
    } catch (e) {
      console.error("createDeal failed", e);
    } finally {
      setStep(0);
    }
  };

  return (
    <div className="flex flex-col gap-3 bg-base-200 rounded-lg p-3">
      <Field label="Send to" error={submitted ? errors.receiver : undefined}>
        <AddressInput value={receiver} onChange={setReceiver} placeholder="Receiver's wallet address (0x…)" />
      </Field>

      <Field
        label="Unlock date and time"
        info="When this time comes, the deed NFT moves to the receiver automatically. Until then it is locked: nobody, you included, can sell or pledge it. You can cancel before this time."
        error={submitted ? errors.time : undefined}
      >
        <div className="flex gap-2 flex-wrap">
          <input
            type="datetime-local"
            className="input input-sm input-bordered grow"
            min={toLocalInput(chainNow)}
            value={when}
            onChange={e => setWhen(e.target.value)}
          />
          <button
            className="btn btn-sm btn-outline"
            type="button"
            onClick={() => setWhen(toLocalInput(chainNow + 120))}
          >
            In 2 min (demo)
          </button>
        </div>
      </Field>

      {unlockTime && !errors.time && isAddress(receiver) && !errors.receiver && (
        <p className="text-sm m-0 bg-base-100 rounded p-2">
          On <b>{formatTime(unlockTime)}</b>, deed no. <b>{serial ?? `#${tokenId}`}</b> moves to wallet{" "}
          <b>{short(receiver)}</b> automatically.
        </p>
      )}

      <Field label="Why two signatures?" info={TWO_SIGN_INFO}>
        <ul className="steps steps-horizontal text-xs w-full">
          <li className={`step ${vaultAllowed || step >= 1 ? "step-primary" : ""}`}>
            1/2 Allow the vault to hold the NFT{vaultAllowed ? " (done)" : ""}
          </li>
          <li className={`step ${step === 2 ? "step-primary" : ""}`}>2/2 Create the deal</li>
        </ul>
      </Field>

      <div className="flex gap-2 justify-end">
        <button className="btn btn-sm btn-ghost" onClick={onClose} disabled={busy}>
          Back
        </button>
        <button className="btn btn-sm btn-primary" disabled={busy} onClick={createDeal}>
          {busy ? (
            <>
              <span className="loading loading-spinner loading-xs" /> Step {step}/2
            </>
          ) : (
            "Create deal"
          )}
        </button>
      </div>
    </div>
  );
};

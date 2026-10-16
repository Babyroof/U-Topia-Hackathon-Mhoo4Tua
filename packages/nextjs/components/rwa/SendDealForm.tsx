"use client";

import { useState } from "react";
import { AddressInput } from "@scaffold-ui/components";
import { isAddress, parseEther } from "viem";
import { useAccount } from "wagmi";
import { Field, InfoTip } from "~~/components/rwa/Field";
import { formatTime, sameAddress } from "~~/components/rwa/utils";
import { addressError, hasErrors, priceError, unlockTimeError } from "~~/components/rwa/validation";
import { useChainNow } from "~~/hooks/rwa/useChainNow";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const TWO_SIGN_INFO =
  "Step 1 lets the vault contract hold this NFT (like handing a key to an escrow). Step 2 creates the deal and locks it. Your wallet asks for each step separately. If you already allowed the vault before, step 1 is skipped.";

const toLocalInput = (ts: number) => {
  const d = new Date(ts * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** How long the buyer has to pay, counted from the unlock time (so the deadline is always after it). */
const PAY_WINDOWS = [
  { label: "10 minutes (demo)", seconds: 10 * 60 },
  { label: "1 day", seconds: 24 * 60 * 60 },
  { label: "7 days", seconds: 7 * 24 * 60 * 60 },
] as const;

const SALE_INFO =
  "Turn this into a sale: the buyer pays the price in AVAX to the vault contract. The deed only moves once the buyer has paid and the unlock time is reached, and the AVAX goes to you in the same step. If the buyer doesn't pay by the deadline, you can take the deed back.";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** Lock a deed NFT for a receiver until a date: one button, two wallet signatures shown as steps. */
export const SendDealForm = ({
  tokenId,
  serial,
  onClose,
  startAsSale = false,
}: {
  tokenId: bigint;
  serial?: string;
  onClose: () => void;
  /** open with "Sell it" already on (from the "Sell it" choice on the vault page) */
  startAsSale?: boolean;
}) => {
  const { address } = useAccount();
  const chainNow = useChainNow();
  const [receiver, setReceiver] = useState("");
  const [when, setWhen] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [isSale, setIsSale] = useState(startAsSale);
  const [price, setPrice] = useState("");
  const [payWindow, setPayWindow] = useState<number>(PAY_WINDOWS[0].seconds);

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
  const errors = {
    receiver: addressError(receiver, address),
    time: unlockTimeError(unlockTime, chainNow),
    price: isSale ? priceError(price) : undefined,
  };
  const deadline = isSale && unlockTime ? unlockTime + payWindow : undefined;
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
      const saleDeadline = isSale && deadline ? BigInt(deadline) : 0n;
      const salePrice = isSale ? parseEther(price.trim()) : 0n;
      await writeVault({
        functionName: "createDeal",
        args: [tokenId, receiver, BigInt(unlockTime), saleDeadline, salePrice],
      });
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

      <label className="label cursor-pointer justify-start gap-3">
        <input
          type="checkbox"
          className="toggle toggle-primary toggle-sm"
          checked={isSale}
          onChange={e => setIsSale(e.target.checked)}
        />
        <span className="label-text font-semibold">Sell it</span>
        <InfoTip text={SALE_INFO} />
      </label>

      {isSale && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Field
            label="Price (AVAX)"
            className="grow"
            info="The exact amount the buyer must pay. It is held by the vault contract and sent to you when the deed moves."
            error={submitted ? errors.price : undefined}
          >
            <input
              type="text"
              inputMode="decimal"
              className="input input-sm input-bordered"
              placeholder="e.g. 0.5"
              value={price}
              onChange={e => setPrice(e.target.value)}
            />
          </Field>
          <Field
            label="Buyer must pay by"
            className="grow"
            info="Counted from the unlock time. If the buyer hasn't paid by then, you can take the deed back."
          >
            <select
              className="select select-sm select-bordered"
              value={payWindow}
              onChange={e => setPayWindow(Number(e.target.value))}
            >
              {PAY_WINDOWS.map(w => (
                <option key={w.seconds} value={w.seconds}>
                  {w.label} after unlock
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      {unlockTime && !errors.time && isAddress(receiver) && !errors.receiver && !errors.price && (
        <p className="text-sm m-0 bg-base-100 rounded p-2">
          {isSale && deadline ? (
            <>
              Once the buyer pays <b>{price.trim()} AVAX</b> (by <b>{formatTime(deadline)}</b>) and{" "}
              <b>{formatTime(unlockTime)}</b> is reached, deed no. <b>{serial ?? `#${tokenId}`}</b> moves to wallet{" "}
              <b>{short(receiver)}</b> and the AVAX goes to you.
            </>
          ) : (
            <>
              On <b>{formatTime(unlockTime)}</b>, deed no. <b>{serial ?? `#${tokenId}`}</b> moves to wallet{" "}
              <b>{short(receiver)}</b> automatically.
            </>
          )}
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

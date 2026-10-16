"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { keccak256, toBytes } from "viem";
import { useAccount } from "wagmi";
import { Field, InfoTip } from "~~/components/rwa/Field";
import { ImageUpload } from "~~/components/rwa/ImageUpload";
import { LAND, sameAddress } from "~~/components/rwa/utils";
import { hasErrors, numberError, requiredError } from "~~/components/rwa/validation";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { type DeedPhoto, deedTitle, encodeDeed } from "~~/utils/rwa/deed";
import { contractErrorName } from "~~/utils/rwa/errors";

const PARTNER_INFO = "A verification partner is a land office that checks the deed is genuine before an NFT is issued.";

const EMPTY_FORM = {
  serial: "",
  landNo: "",
  surveyPage: "",
  tambon: "",
  amphoe: "",
  province: "",
  rai: "",
  ngan: "",
  wa: "",
};
type FormField = keyof typeof EMPTY_FORM;

const PartnerChoice = ({
  partner,
  selected,
  onSelect,
}: {
  partner: string;
  selected: boolean;
  onSelect: (p: string) => void;
}) => {
  const { data: active } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "isPartner",
    args: [partner],
  });
  const { data: name } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "partnerName",
    args: [partner],
  });

  return (
    <label
      className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${
        active ? "cursor-pointer border-base-300" : "opacity-50 cursor-not-allowed border-dashed border-base-300"
      } ${selected ? "border-primary bg-primary/5" : ""}`}
    >
      <input
        type="radio"
        name="partner"
        className="radio radio-sm radio-primary mt-1"
        checked={selected}
        disabled={!active}
        onChange={() => onSelect(partner)}
      />
      <span className="flex flex-col">
        <span className="font-semibold">{name || "Unnamed partner"}</span>
        {!active && <span className="text-xs">Unavailable: the platform admin has deactivated this partner</span>}
      </span>
    </label>
  );
};

const TokenizePage: NextPage = () => {
  const { address } = useAccount();
  const [form, setForm] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState<{ front?: DeedPhoto; back?: DeedPhoto }>({});
  const [partner, setPartner] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [serialTaken, setSerialTaken] = useState(false);
  const [done, setDone] = useState(false);

  const set = (field: FormField) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    if (field === "serial") setSerialTaken(false);
    setDone(false);
  };

  const { data: partners } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "getPartners" });
  const { data: partnerActive } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "isPartner",
    args: [partner || undefined],
  });
  useEffect(() => {
    if (!partner && partners?.length === 1) setPartner(partners[0]);
  }, [partners, partner]);

  const serial = form.serial.trim();
  const { data: serialUsed } = useScaffoldReadContract({
    contractName: "RWAToken",
    functionName: "serialUsed",
    args: [serial ? keccak256(toBytes(serial)) : undefined],
  });
  const { data: requests } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "getAllRequests" });
  const alreadyPending = (requests ?? []).some(
    r => r.status === 1 && r.serial === serial && sameAddress(r.requester, address),
  );

  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "RWAToken" });

  const errors = {
    serial:
      requiredError(form.serial, "the deed number") ??
      (serialUsed || serialTaken ? "This deed number already has an NFT. It can only be issued once." : undefined) ??
      (alreadyPending ? "You already have a pending request for this deed number." : undefined),
    landNo: requiredError(form.landNo, "the parcel number"),
    surveyPage: requiredError(form.surveyPage, "the survey page"),
    tambon: requiredError(form.tambon, "the sub-district"),
    amphoe: requiredError(form.amphoe, "the district"),
    province: requiredError(form.province, "the province"),
    rai: numberError(form.rai, { label: "Rai" }),
    ngan: numberError(form.ngan, { label: "Ngan", max: 3 }),
    wa: numberError(form.wa, { label: "Square wa", max: 99.9 }),
    front: photos.front ? undefined : "Upload a photo of the front of the deed",
    back: photos.back ? undefined : "Upload a photo of the back of the deed",
    partner: !partner
      ? "Choose the partner who will check your deed"
      : partnerActive === false
        ? "This partner is deactivated"
        : undefined,
  };
  const show = (field: keyof typeof errors) => (submitted ? errors[field] : undefined);

  const handleSubmit = async () => {
    setSubmitted(true);
    if (hasErrors(errors) || !address) return;
    const details = {
      landNo: form.landNo.trim(),
      surveyPage: form.surveyPage.trim(),
      tambon: form.tambon.trim(),
      amphoe: form.amphoe.trim(),
      province: form.province.trim(),
      area: { rai: form.rai.trim(), ngan: form.ngan.trim(), wa: form.wa.trim() },
      photos,
    };
    try {
      await writeContractAsync({
        functionName: "requestTokenize",
        args: [partner, LAND.value, deedTitle(serial, details), serial, encodeDeed(details)],
      });
      setForm(EMPTY_FORM);
      setPhotos({});
      setSubmitted(false);
      setDone(true);
    } catch (e) {
      if (contractErrorName(e) === "SerialAlreadyTokenized") setSerialTaken(true);
      console.error("requestTokenize failed", e);
    }
  };

  const input = (field: FormField, placeholder: string, inputMode?: "numeric" | "decimal") => (
    <input
      className={`input input-bordered w-full ${show(field) ? "input-error" : ""}`}
      placeholder={placeholder}
      value={form[field]}
      onChange={set(field)}
      inputMode={inputMode}
    />
  );

  return (
    <div className="flex flex-col items-center grow px-4 py-10 gap-6">
      <div className="w-full max-w-xl">
        <h1 className="text-4xl mb-2 flex items-center gap-2">
          Tokenize a land title deed
          <InfoTip text="Tokenize = turn your paper deed into a digital certificate (NFT). There is only ever one, standing for one deed." />
        </h1>
        <p className="opacity-80">
          Fill in your deed and send it to a partner to check. Once approved, one NFT (1:1) arrives in your wallet. You
          can submit several deeds at once.
        </p>
      </div>

      {done && (
        <div className="notice notice-success w-full max-w-xl">
          <span>
            Request sent. Track it in{" "}
            <Link href="/requests" className="link">
              My requests
            </Link>
          </span>
        </div>
      )}

      <div className="card bg-base-100 border border-base-300 w-full max-w-xl">
        <div className="card-body gap-4">
          <div className="flex items-center gap-3 bg-base-200 rounded-lg px-4 py-3">
            <span className="text-2xl" aria-hidden>
              {LAND.icon}
            </span>
            <p className="m-0 font-semibold">{LAND.label}</p>
          </div>

          <Field
            label="Deed number"
            helper="Printed at the top right of the deed. Don't make one up. Each number can be tokenized only once."
            error={show("serial")}
          >
            {input("serial", "e.g. 00000")}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Parcel number" error={show("landNo")}>
              {input("landNo", "e.g. 0")}
            </Field>
            <Field label="Survey page" error={show("surveyPage")}>
              {input("surveyPage", "e.g. 0")}
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Sub-district" error={show("tambon")}>
              {input("tambon", "[example]")}
            </Field>
            <Field label="District" error={show("amphoe")}>
              {input("amphoe", "[example]")}
            </Field>
            <Field label="Province" error={show("province")}>
              {input("province", "[example]")}
            </Field>
          </div>

          <div className="flex flex-col gap-1">
            <span className="label-text font-semibold">Area</span>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Rai" error={show("rai")}>
                {input("rai", "0", "numeric")}
              </Field>
              <Field label="Ngan" error={show("ngan")}>
                {input("ngan", "0", "numeric")}
              </Field>
              <Field label="Square wa" error={show("wa")}>
                {input("wa", "0", "decimal")}
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ImageUpload
              label="Deed photo, front"
              value={photos.front}
              onChange={front => setPhotos(p => ({ ...p, front }))}
              error={show("front")}
            />
            <ImageUpload
              label="Deed photo, back"
              value={photos.back}
              onChange={back => setPhotos(p => ({ ...p, back }))}
              error={show("back")}
            />
          </div>
          <span className="text-xs opacity-60 -mt-2">
            For the partner&apos;s officer to check. Not yet connected to the Department of Lands. Only you and the
            partner you pick can see the photos.
          </span>

          <Field label="Verification partner" info={PARTNER_INFO} error={show("partner")}>
            {!partners || partners.length === 0 ? (
              <span className="text-sm opacity-70">No partners yet. The platform admin has to add one first.</span>
            ) : (
              <div className="flex flex-col gap-2">
                {partners.map(p => (
                  <PartnerChoice key={p} partner={p} selected={sameAddress(p, partner)} onSelect={setPartner} />
                ))}
              </div>
            )}
          </Field>

          {address ? (
            <button className="btn btn-primary mt-2" disabled={isMining} onClick={handleSubmit}>
              {isMining ? <span className="loading loading-spinner loading-sm" /> : "Request tokenization"}
            </button>
          ) : (
            <p className="text-sm text-center opacity-70 m-0">Connect your wallet to send a request.</p>
          )}
          {submitted && hasErrors(errors) && (
            <p className="text-sm text-error text-center m-0">Some fields need fixing. See the red messages above.</p>
          )}
        </div>
      </div>

      <p className="text-sm opacity-70 m-0">Land title deeds only for now. Other document types will follow.</p>
    </div>
  );
};

export default TokenizePage;

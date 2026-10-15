"use client";

import { useState } from "react";
import { Address, AddressInput } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { Field } from "~~/components/rwa/Field";
import { RoleGate } from "~~/components/rwa/RoleGate";
import { sameAddress } from "~~/components/rwa/utils";
import { addressError, hasErrors, requiredError } from "~~/components/rwa/validation";
import { useScaffoldReadContract, useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";

const PartnerRow = ({ partner }: { partner: string }) => {
  const { targetNetwork } = useTargetNetwork();
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
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "RWAToken" });

  const toggle = async () => {
    try {
      await writeContractAsync({ functionName: "setPartner", args: [partner, name ?? "", !active] });
    } catch (e) {
      console.error("setPartner failed", e);
    }
  };

  return (
    <tr>
      <td className="font-semibold">{name || "Unnamed partner"}</td>
      <td>
        <Address address={partner} chain={targetNetwork} size="sm" />
      </td>
      <td>
        <span className={`badge ${active ? "badge-success" : "badge-ghost"}`}>{active ? "Active" : "Inactive"}</span>
      </td>
      <td className="text-right">
        <button className="btn btn-xs btn-ghost border-base-300" disabled={isMining} onClick={toggle}>
          {active ? "Deactivate" : "Reactivate"}
        </button>
      </td>
    </tr>
  );
};

const ManagePartners = () => {
  const { data: admin } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "admin" });
  const { data: partners } = useScaffoldReadContract({ contractName: "RWAToken", functionName: "getPartners" });
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "RWAToken" });

  const [newPartner, setNewPartner] = useState("");
  const [newName, setNewName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const alreadyListed = (partners ?? []).some(p => sameAddress(p, newPartner));
  const errors = {
    name: requiredError(newName, "the organisation's name"),
    address:
      addressError(newPartner) ??
      (sameAddress(newPartner, admin) ? "The admin wallet can't also be a partner" : undefined),
  };

  const addPartner = async () => {
    setSubmitted(true);
    if (hasErrors(errors)) return;
    try {
      await writeContractAsync({ functionName: "setPartner", args: [newPartner.trim(), newName.trim(), true] });
      setNewPartner("");
      setNewName("");
      setSubmitted(false);
    } catch (e) {
      console.error("setPartner failed", e);
    }
  };

  return (
    <div className="flex flex-col items-center grow px-4 py-10 gap-8">
      <div className="w-full max-w-3xl">
        <h1 className="text-4xl mb-2">Manage partners</h1>
        <p className="opacity-80 m-0">
          A partner is an organisation we have already agreed to work with. Use the wallet address the organisation sent
          you. Partners approve deed requests and confirm withdrawals, but they can&apos;t add other partners.
        </p>
      </div>

      <div className="card bg-base-100 border border-base-300 w-full max-w-3xl">
        <div className="card-body gap-3">
          <h2 className="text-2xl m-0">Add a partner</h2>
          <Field label="Organisation name" error={submitted ? errors.name : undefined}>
            <input
              className={`input input-bordered w-full ${submitted && errors.name ? "input-error" : ""}`}
              placeholder="e.g. [Example] Land Office"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
          </Field>
          <Field
            label="Partner wallet address"
            helper={alreadyListed ? "Already listed below: saving updates its name and reactivates it." : undefined}
            error={submitted ? errors.address : undefined}
          >
            <AddressInput value={newPartner} onChange={setNewPartner} placeholder="0x…" />
          </Field>
          <p className="text-xs opacity-60 m-0">In the pitch, call these target partners until a pilot is signed.</p>
          <div className="flex justify-end">
            <button className="btn btn-primary btn-sm" disabled={isMining} onClick={addPartner}>
              {alreadyListed ? "Save partner" : "Add partner"}
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-3xl">
        <h2 className="text-2xl mb-3">Partners ({partners?.length ?? 0})</h2>
        {!partners || partners.length === 0 ? (
          <p className="opacity-60">No partners yet. Add the first one above.</p>
        ) : (
          <div className="overflow-x-auto bg-base-100 border border-base-300 rounded-lg">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Wallet</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {partners.map(p => (
                  <PartnerRow key={p} partner={p} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const ManagePartnersPage: NextPage = () => (
  <RoleGate role="admin">
    <ManagePartners />
  </RoleGate>
);

export default ManagePartnersPage;
